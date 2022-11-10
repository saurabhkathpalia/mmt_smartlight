from ast import Return
from hashlib import new
import time
import uuid
import json
from flask import Flask, render_template, request, make_response, redirect, url_for, session
import boto3

app = Flask(__name__)
app.secret_key = 'momagic'
AWS_LAMBDA_NAME = 'SendCommand2IoTShadow'
AWS_REGION = 'us-east-1'

def timezone_translator(weekdays:str, time:str, offset:str) -> tuple:
    new_min = int(time[0:2])*60+int(time[2:4])+int(offset)
    weekday_list = ['MON','TUE','WED','THU','FRI','SAT','SUN']
    if new_min < 0:
        new_min += 1440
        temp_list = []
        for weekday in weekdays.split(','):
            temp_list.append(weekday_list[weekday_list.index(weekday)-1])
        weekdays = ",".join(temp_list)
    elif new_min > 1440:
        new_min -= 1440
        temp_list = []
        for weekday in weekdays.split(','):
            temp_list.append(weekday_list[(weekday_list.index(weekday)+1)%7])
        weekdays = ",".join(temp_list)  
    time = "{:02d}{:02d}".format(int(new_min/60),new_min%60)
    return (weekdays, time)

@app.route("/", methods=['GET'])
def start():
    iot_table = boto3.resource('dynamodb', region_name=AWS_REGION).Table('iot_cookie')
    try:
        alert = session['alert']
        session['alert'] = ""
    except KeyError:
        alert = ""
    # check if this cookie has value or not
    cookie = request.cookies.get('momagic','default_cookie')
    item_result = iot_table.get_item(Key={'user_id':cookie})
    places = []
    schedules = []
    if 'Item' in item_result:
        places = item_result['Item']['places']
        places_dict = {place['device_id']:place['place'] for place in places}
        if len(item_result['Item'].get('schedules',[])) > 0:
            schedules = []
            schedules_raw = item_result['Item']['schedules']
            WEEKDAY_DICT = {'SUN':'0','MON':'1','TUE':'2','WED':'3','THU':'4','FRI':'5','SAT':'6'}
            for schedule in schedules_raw:
                color_hex = schedule.split('-')[1].split('_')[1]
                weekday = schedule.split('-')[0].split('_')[0]
                schedules.append({
                    'color': '#'+color_hex,
                    'place': places_dict[schedule.split('-')[1].split('_')[0]],
                    'utcWeekdays': ','.join([WEEKDAY_DICT[weekday[i:i+3]] for i in range(0,len(weekday),3)]),
                    'utcTime': schedule.split('-')[0].split('_')[1],
                    'led_id':schedule.split('-')[1].split('_')[0],
                    'raw': schedule,
                })
    resp = make_response(
            render_template("index.html", places=places, alert=alert, schedules=schedules)
        )
    # check if user has cookie or not
    if 'momagic' not in request.cookies:
        cookie = uuid.uuid4().hex
        resp.set_cookie(key='momagic',
                        value=cookie,
                        expires=time.time() + 365 * 24 * 60 * 60)
    return resp

@app.route("/add", methods=['POST'])
def add_item():
    iot_table = boto3.resource('dynamodb', region_name=AWS_REGION).Table('iot_cookie')

    cookie = request.cookies.get('momagic')
    device_id = request.values.get('device_id')
    place = request.values.get('place')

    item_result = iot_table.get_item(Key={'user_id':cookie})
    if 'Item' in item_result: 
        place_list_format = ''
        places = item_result['Item']['places']
        devices = [i['device_id'] for i in places]
        if device_id in devices:
            session['alert'] = "something"
            return redirect(url_for("start"))
        iot_table.update_item(
            Key={'user_id':cookie},
            UpdateExpression="SET places = list_append(places, :place_list)",
            ExpressionAttributeValues={":place_list":[{"device_id":device_id, "place":place}]},
        )
    else:
        iot_table.put_item(Item={'user_id':cookie, 'places':[dict(place=place, device_id=device_id)]})

    return redirect(url_for("start"))


@app.route("/delete", methods=['POST'])
def delete_item():
    iot_table = boto3.resource('dynamodb', region_name=AWS_REGION).Table('iot_cookie')
    cookie = request.cookies.get('momagic')
    device_id = request.values.get('device_id')

    item_result = iot_table.get_item(Key={'user_id':cookie})

    places = item_result.get('Item',{}).get('places',[])
    devices = [i['device_id'] for i in places]
    if device_id not in devices:
        session['alert'] = "nothing"
        return redirect(url_for("start"))
    
    iot_table.update_item(
        Key={'user_id':cookie},
        UpdateExpression=f"REMOVE places[{devices.index(device_id)}]"
        )
    return redirect(url_for("start"))

@app.route("/schedule", methods=['POST'])
def schedule_endpoint():
    # TODO: check values, if submit without value then return error
    print(request.values)
    # create rule if needed
    WEEKDAY_DICT = {'0':'SUN','1':'MON','2':'TUE','3':'WED','4':'THU','5':'FRI','6':'SAT'}
    weekdays = ",".join([WEEKDAY_DICT[w] for w in request.values.get('utcWeekdays').split(',')])
    utc_time = request.values.get('utcTime')
    rule_name = f"{weekdays.replace(',','')}_{utc_time}"
    schedule_expression = f"cron({utc_time[2:4]} {utc_time[0:2]} ? * {weekdays} *)"
    rule_desc = f"every {weekdays} at {utc_time[0:2]}:{utc_time[2:4]}"
    eb_client = boto3.client('events', region_name=AWS_REGION)
    if not eb_client.list_rules(NamePrefix=rule_name)['Rules']:
        rule_arn = eb_client.put_rule(
            Name=rule_name,
            ScheduleExpression=schedule_expression,
            Description=rule_desc
        )['RuleArn']
    # create target
    led_id = request.values.get('scheDevice')
    color_hex = request.values.get('color').replace('#','')
    r = int(color_hex[0:2],16)
    g = int(color_hex[2:4],16)
    b = int(color_hex[4:6],16)
    target_id = f"{led_id}_{color_hex}"
    ld_client = boto3.client('lambda', region_name=AWS_REGION)
    AWS_LAMBDA_ARN = ld_client.get_function(FunctionName=AWS_LAMBDA_NAME)['Configuration']['FunctionArn']
    eb_client.put_targets(
        Rule=rule_name, 
        Targets=[
            {
                'Id':target_id,
                'Arn':AWS_LAMBDA_ARN,
                'Input': json.dumps({'led_id': led_id, 'red':r, 'green':g, 'blue':b})
            }
        ]
    )
    # add permission to trigger lambda
    response = ld_client.add_permission(
        FunctionName=AWS_LAMBDA_NAME,
        StatementId=rule_name,
        Action='lambda:InvokeFunction',
        Principal='events.amazonaws.com',
        SourceArn=rule_arn,
    )
    # add result to db
    iot_table = boto3.resource('dynamodb', region_name=AWS_REGION).Table('iot_cookie')
    cookie = request.cookies.get('momagic')
    iot_table.update_item(
        Key={'user_id':cookie},
        UpdateExpression="ADD schedules :schedule",
        ExpressionAttributeValues={":schedule":{f"{rule_name}-{target_id}"}},
    )
    return redirect(url_for("start"))

@app.route("/schedule-delete", methods=['POST'])
def delete_schedule_endpoint():
    # TODO: check values, if submit without value then return error
    schedule_list = request.values.getlist('deleteSchedule')
    eb_client = boto3.client('events', region_name=AWS_REGION)
    ld_client = boto3.client('lambda', region_name=AWS_REGION)
    for schedule in schedule_list:
        rule_name = schedule.split('-')[0]
        target_id = schedule.split('-')[1]
        # remove permission from lambda
        response = ld_client.remove_permission(
            FunctionName=AWS_LAMBDA_NAME,
            StatementId=rule_name,
        )
        # delete targets
        eb_client.remove_targets(Rule=rule_name, Ids=[target_id])
        # if rule doesn't have any target, then delete rule
        if len(eb_client.list_targets_by_rule(Rule=rule_name)['Targets']) == 0:
            eb_client.delete_rule(Name=rule_name)
        # remove items from db
        iot_table = boto3.resource('dynamodb', region_name=AWS_REGION).Table('iot_cookie')
        cookie = request.cookies.get('momagic')
        iot_table.update_item(
            Key={'user_id':cookie},
            UpdateExpression="DELETE schedules :schedule",
            ExpressionAttributeValues={":schedule":{schedule}},
        )
    return redirect(url_for("start"))

@app.route("/hello")
def hello():
    "hello world"
    return "Hello World!!!!!"


@app.route("/get")
def getcookie():
    framework = request.cookies.get('momagic')
    return 'The framework is ' + framework


if __name__ == '__main__':
    app.run(debug=True)
