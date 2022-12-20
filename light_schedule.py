import os
from flask import Flask, request
import json
from datetime import datetime, timedelta
import subprocess
from pymongo import MongoClient
import uuid
app = Flask(__name__)

HOME = os.getenv("HOME")
URI = os.getenv("MONGOURI")
CLIENT = MongoClient(URI, retryWrites=False)
DB = CLIENT['iothub']
SCHEDULE = DB['schedule']
COOKIE = DB['email_cookie']


@app.route("/hello")
def hello():
    "hello world"
    return "Hello World!!!!!"


def extract_schedule(data, email):
    date_time = data["request"].split(",")[4]
    req_list = data["request"].split(",")
    rgb = ",".join(req_list[:3])
    req = f"{rgb},{email},{req_list[3]}"
    # req = ",".join(data["request"].split(",")[:4])
    date_time = datetime.strptime(date_time, "%Y-%m-%dT%H:%M:%S.%fZ")
    output = data["request"].split(",")
    if date_time >= datetime.now() + timedelta(minutes=1):
        at_datetime = date_time.strftime("%H:%M %m/%d/%Y")
    else:
        at_datetime = "now"
    cron_datetime = ""
    if output[5] == "hour":
        cron_datetime = f"{output[-1].zfill(2)} * * * *"
    if output[5] == "day":
        hour, mins = output[-1].split(":")
        cron_datetime = f"{mins.zfill(2)} {hour.zfill(2)} * * *"
    mins = str(date_time.minute).zfill(2)
    hour = str(date_time.hour).zfill(2)
    if output[5] == "week":
        weekday = [
            "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
            "Saturday"
        ]
        cron_datetime = f"{mins} {hour} * * {weekday.index(output[-1])}"
    if output[5] == "month":
        cron_datetime = f"{mins} {hour} {output[-1].zfill(2)} * *"
    return req, at_datetime, cron_datetime, output[5] == "one_time"


@app.route("/remove", methods=["POST"])
def remove_job():
    if request.method == "POST":

        data = json.loads(request.get_data())
        try:
            email = COOKIE.find_one({"cookie": data['momagic']})['email']
        except TypeError:
            return "400"
        print(data)
        # req, _, cron_datetime, _ = extract_schedule(data, email)
        post = dict(request=data['request'])
        result = SCHEDULE.find(post)
        for i in result:
            os.system(f"""atrm {i['job_id']}""")
            os.system(f"""
            crontab -l | grep -v "{i['cronid']}"  | crontab -
            """)
        SCHEDULE.delete_many(post)

    return "ok"


@app.route("/schedule", methods=["POST"])
def schedule():
    if request.method == "POST":

        data = json.loads(request.get_data())
        try:
            email = COOKIE.find_one({"cookie": data['momagic']})['email']
        except TypeError:
            return "400"
        print(data)
    print(email)
    req, at_datetime, cron_datetime, one_time = extract_schedule(data, email)

    if one_time:
        code = f"{HOME}/scheduler.py"
    else:
        code = f"{HOME}/scheduler_at.py --time '{cron_datetime}'"
    cronid = str(uuid.uuid4())
    py_command = f"""echo "/usr/bin/python3 {code} --setting {req} --cronid {cronid}" """
    at_command = f"at {at_datetime} 2>&1 "
    awk_command = """awk '/job/ {print $2}'"""
    command = f"{py_command}| {at_command}| {awk_command}"
    print(command)
    job_id = subprocess.check_output(command, shell=True)
    job_id = job_id.decode().replace("\n", "")
    post = dict(request=data['request'],
                momagic=email,
                job_id=job_id,
                cronid=cronid,
                local=data['local'])
    SCHEDULE.insert_one(post)
    # os.system(f"""
    # (crontab -l; echo "{date_time.minute} {date_time.hour} {date_time.day} {date_time.month} * /usr/bin/python3 {HOME}/scheduler.py --setting {req} --cookie {data['momagic']}")|awk '!x[$0]++'|crontab -
    # """)
    return "ok"


if __name__ == "__main__":

    app.run(debug=True, host="0.0.0.0", port="5000")
