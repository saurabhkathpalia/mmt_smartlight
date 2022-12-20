import os
import json
import time
import uuid
from pymongo import MongoClient
import requests
from flask import Flask, render_template, request, make_response, redirect, url_for, session
from base64 import b64encode, b64decode
from hashlib import sha256
from time import time
from urllib import parse
from hmac import HMAC
from azure.messaging.webpubsubservice import WebPubSubServiceClient
from azure.iot.hub import IoTHubRegistryManager, IoTHubJobManager
from azure.iot.hub.models import JobRequest, CloudToDeviceMethod
import subprocess

app = Flask(__name__)
IOT_KEY = os.getenv("IOTKEY")  # for Azure
IOTCOOKIE = os.getenv("IOTCOOKIE")
app.secret_key = 'momagic'
ACCESS_KEY = os.getenv("ACCESS_KEY")
THEME = json.load(open("theme.json", "r"))
CLIENT = MongoClient(os.getenv("MONGOURI"), retryWrites=False)
PUBSUB = os.getenv("PUBSUB")
CONNECTION_STRING = os.getenv("CONNECTION_STRING")
IOTHUB = IoTHubRegistryManager(CONNECTION_STRING)
IOTJOB = IoTHubJobManager.from_connection_string(CONNECTION_STRING)
URL = os.getenv("URL")


def device_method_job(job_id, device_id, execution_time, method_name, payload,
                      utc_start):
    print("")
    print("Scheduling job: " + str(job_id))

    job_request = JobRequest()
    job_request.job_id = job_id
    job_request.type = "scheduleDeviceMethod"
    job_request.start_time = utc_start
    job_request.cloud_to_device_method = CloudToDeviceMethod(
        method_name=method_name, payload=payload)
    job_request.max_execution_time_in_seconds = execution_time
    job_request.query_condition = "DeviceId in ['{}']".format(device_id)

    new_job_response = IOTJOB.create_scheduled_job(job_id, job_request)
    return new_job_response


def get_collection(db="iothub", collection="cookie"):
    database = CLIENT[db]
    collect = database[collection]
    return collect


COLLECT = get_collection()


def has_device(collect, cookie, device_id):
    count = collect.count_documents({"cookie": cookie, "device_id": device_id})
    return count > 0


def has_cookie(collect, cookie):
    count = collect.count_documents({"cookie": cookie})
    return count > 0


def list_device(collect, cookie, device_id=None):
    if device_id is None:
        return [
            post['data'] for post in collect.find({
                "cookie": cookie,
                "device_id": {
                    "$gt": ""
                }
            })
        ]
    return [
        post['data'] for post in collect.find({
            "cookie": cookie,
            "device_id": device_id
        })
    ]


def insert_data(collect, cookie, device_id, data):
    post = {"cookie": cookie, "device_id": device_id, "data": data}
    collect.insert_one(post)


def replace_data(collect, device_id, color, mode):
    collect.update_many({"device_id": device_id},
                        {"$set": {
                            "data.color": color,
                            "data.mode": mode
                        }})


def generate_sas_token(uri, key, policy_name, expiry=3600):
    ttl = time() + expiry
    sign_key = "%s\n%d" % ((parse.quote_plus(uri)), int(ttl))
    # print(sign_key)
    signature = b64encode(
        HMAC(b64decode(key), sign_key.encode('utf-8'), sha256).digest())

    rawtoken = {'sr': uri, 'sig': signature, 'se': str(int(ttl))}

    if policy_name is not None:
        rawtoken['skn'] = policy_name

    return 'SharedAccessSignature ' + parse.urlencode(rawtoken)


@app.route("/add", methods=["POST"])
def add_item():
    if request.method == "POST":
        cookie = request.cookies.get('momagic')
        device_id = request.values.get('device_id')
        if has_device(COLLECT, cookie, device_id):
            session['alert'] = "something"
            return redirect(url_for("start"))

        place = request.values.get('place')
        item = dict(place=place, device_id=device_id, color="#000000", mode="")
        insert_data(COLLECT, cookie, device_id, item)
        return redirect(url_for("start"))


@app.route("/schedule", methods=["POST"])
def schedule():
    if request.method == "POST":
        data = json.loads(request.get_data())['request']
        cookie = request.cookies.get('momagic')
        payload = json.dumps(dict(request=data, momagic=f"momagic={cookie}"))
        print(payload)
        # data = data.split(",")
        # device_id = data[3]
        # payload = ",".join(data[:3])
        # job_id = uuid.uuid4()
        # print(data[-1])
        # device_method_job(job_id, device_id, 60, "LED", payload, data[-1])

        requests.request("POST", f"{URL}/schedule", data=payload)

        return redirect(url_for("start"))


@app.route("/delete", methods=["GET", "POST"])
def delete_item():
    if request.method == "POST":
        cookie = request.cookies.get('momagic')
        device_id = request.values.get('device_id')
        if not has_device(COLLECT, cookie, device_id):
            session['alert'] = "nothing"
            return redirect(url_for("start"))
        COLLECT.find_one_and_delete({"cookie": cookie, "device_id": device_id})
        return redirect(url_for("start"))


def rgb_to_hex(rgb):
    return '#%02x%02x%02x' % rgb


def renew_config(req, cookie):

    item = list_device(COLLECT, cookie, req[-1])[0]
    mode = {
        "255,177,110": "Reading",
        "163,191,255": "Movie",
        "255,255,255": "White",
        "0,0,0": "Close"
    }
    color = {
        "Party": "#FF00FF",
        "Taiwan": '#FF0000',
        "India": "#FF9933",
        "Flower": "#b97cd3"
    }
    if req[0].isdigit():
        item["color"] = rgb_to_hex((int(req[0]), int(req[1]), int(req[2])))
        rgb = ",".join(req[:3])
        if rgb in mode.keys():
            item["mode"] = mode[rgb]
        else:
            item["mode"] = ""
    else:
        item["color"] = color[req[0]]
        item["mode"] = req[0]
    replace_data(COLLECT, req[-1], item["color"], item["mode"])


@app.route("/led", methods=["POST"])
def azure_hub_led():
    """
    Control LED with Azure IoT hub
    """
    if request.method == "POST":
        rgb = json.loads(request.get_data())['request']
        cookie = request.cookies.get('momagic')
    req = rgb.split(',')
    print(req[-1])

    payload = {
        "methodName": "LED",
        "responseTimeoutInSeconds": 200,
        "payload": "0,0,0"
    }


    url = "https://momagichub.azure-devices.net/twins/{0}/methods?api-version=2018-06-30".\
        format(req[-1])
    renew_config(req, cookie)
    if req[0].isdigit():
        payload["payload"] = ",".join(req[:3])
    else:
        print(req[0])
        payload["payload"] = THEME[req[0]]

    payload = json.dumps(payload)
    hostname = 'momagichub.azure-devices.net'
    policy_name = "iothubowner"
    sas_token = generate_sas_token(hostname, ACCESS_KEY, policy_name)
    headers = {'Content-Type': 'application/json', 'Authorization': sas_token}

    result = requests.request("POST", url, headers=headers, data=payload)
    if result.status_code != 200:
        return "400"
    return str(result.status_code)


# @app.route("/led", methods=["POST"])
def azure_central_led():
    """
    Control LED with Azure IoT Central
    """
    if request.method == "POST":
        rgb = json.loads(request.get_data())['request']
        cookie = request.cookies.get('momagic')
    req = rgb.split(',')
    print(req[-1])
    url = "https://miotcentral.azureiotcentral.com/api/devices/{0}/commands/LED?api-version=1.0".\
        format(req[-1])
    renew_config(req, cookie)
    if req[0].isdigit():
        payload = json.dumps({"request": ",".join(req[:3])})
    else:
        payload = json.dumps({"request": req[0]})

    headers = {'Content-Type': 'application/json', 'Authorization': IOT_KEY}

    requests.request("POST", url, headers=headers, data=payload)
    return payload


@app.route("/color", methods=["POST"])
def led_color():
    """
    Control LED with Azure IoT Central
    """

    if request.method == "POST":
        name = json.loads(request.get_data())['request']
        cookie = request.cookies.get('momagic')
    config = json.load(open(IOTCOOKIE, 'r'))
    devices = []
    for i in config[cookie]:
        devices.append(i['device_id'])
    item = config[cookie][devices.index(name)]
    return item['color']


@app.route("/", methods=["GET"])
def start():
    # pylint: disable=maybe-no-member
    client = WebPubSubServiceClient.from_connection_string(PUBSUB, "Hub")
    endpoint = client.get_client_access_token(
        roles=["webpubsub.joinLeaveGroup", "webpubsub.sendToGroup"],
        minutes_to_expire=1440)
    try:
        alert = session["alert"]
    except KeyError:
        alert = ""
    cookie = request.cookies.get('momagic')
    config = {}
    if has_cookie(COLLECT, cookie):
        config[cookie] = list_device(COLLECT, cookie)
        status = {"Disconnected": "❌", "Connected": "✅"}
        for ind, dev in enumerate(config[cookie]):
            device = IOTHUB.get_device(dev['device_id'])
            config[cookie][ind]["status"] = status[device.connection_state]
        resp = make_response(
            render_template("index.html",
                            places=config[cookie],
                            alert=alert,
                            endpoint=endpoint['url']))
        session["alert"] = ""
    else:
        cookie = None
    if not cookie:
        cookie = uuid.uuid1().hex
        config[cookie] = []
        insert_data(COLLECT, cookie, device_id="", data=[])
        resp = make_response(
            render_template("index.html",
                            place=config[cookie],
                            alert=alert,
                            endpoint=endpoint['url']))
        resp.set_cookie(key='momagic',
                        value=cookie,
                        expires=time() + 365 * 24 * 60 * 60)
    return resp


@app.route("/hello")
def hello():
    "hello world"
    return "Hello World!!!!!"


@app.route("/get")
def getcookie():
    framework = request.cookies.get('momagic')
    output = subprocess.check_output("git --version", shell=True)
    print(output.decode())
    return 'The framework is ' + framework


if __name__ == "__main__":

    app.run(debug=True)
