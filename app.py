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
from datetime import datetime
import msrest
from flask_session import Session  # https://pythonhosted.org/Flask-Session
import msal
import app_config
from werkzeug.middleware.proxy_fix import ProxyFix

# pylint: disable=missing-function-docstring
app = Flask(__name__)
app.config.from_object(app_config)
Session(app)
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

IOT_KEY = os.getenv("IOTKEY")  # for Azure
# IOTCOOKIE = os.getenv("IOTCOOKIE")
app.secret_key = 'momagic'
ACCESS_KEY = os.getenv("ACCESS_KEY")
THEME = json.load(open("theme.json", "r"))
CLIENT = MongoClient(os.getenv("MONGOURI"), retryWrites=False)
PUBSUB = os.getenv("PUBSUB")
CONNECTION_STRING = os.getenv("CONNECTION_STRING")
IOTHUB = IoTHubRegistryManager(CONNECTION_STRING)
IOTJOB = IoTHubJobManager.from_connection_string(CONNECTION_STRING)
URL = os.getenv("URL")
HUBNAME = os.getenv("mmthub")


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


COLLECT = get_collection("device")
SCHEDULE = get_collection(collection="schedule")
COOKIE = get_collection(collection="email_cookie")


def has_device(collect, email, device_id):
    count = collect.count_documents({"email": email, "device_id": device_id})
    return count > 0


def has_cookie(collect, cookie, email):
    count = collect.count_documents({"cookie": cookie, "email": email})
    return count > 0


def has_account(collect, email):
    count = collect.count_documents({"email": email})
    return count > 0


def list_device(collect, email, device_id=None):
    if device_id is None:
        return [
            post['data'] for post in collect.find({
                "email": email,
                "device_id": {
                    "$gt": ""
                }
            })
        ]
    return [
        post['data'] for post in collect.find({
            "email": email,
            "device_id": device_id
        })
    ]


def insert_data(collect, email, device_id, data):
    post = {"email": email, "device_id": device_id, "data": data}
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
    signature = b64encode(
        HMAC(b64decode(key), sign_key.encode('utf-8'), sha256).digest())

    rawtoken = {'sr': uri, 'sig': signature, 'se': str(int(ttl))}

    if policy_name is not None:
        rawtoken['skn'] = policy_name

    return 'SharedAccessSignature ' + parse.urlencode(rawtoken)


@app.route("/add", methods=["POST"])
def add_item():
    if request.method == "POST":
        # cookie = request.cookies.get('momagic')
        email = session['user']['emails'][0]
        device_id = request.values.get('device_id')
        if has_device(COLLECT, email, device_id):
            session['alert'] = "something"
            return redirect(url_for("start"))
        try:
            IOTHUB.get_device(device_id)
        except msrest.exceptions.HttpOperationError:
            session['alert'] = "nothing"
            return redirect(url_for("start"))
        place = request.values.get('place')
        item = dict(place=place, device_id=device_id, color="#000000", mode="")
        insert_data(COLLECT, email, device_id, item)
    return redirect(url_for("start"))


@app.route("/schedule", methods=["POST"])
def schedule():
    if request.method == "POST":
        data = json.loads(request.get_data())
        print(data['local'])
        cookie = request.cookies.get('momagic')
        post = dict(request=data['request'],
                    momagic=cookie,
                    local=data['local'])
        payload = json.dumps(post)
        print(payload)
        requests.request("POST", f"{URL}/schedule", data=payload)
    return redirect(url_for("start"))


@app.route("/remove", methods=["POST"])
def remove_job():
    if request.method == "POST":
        data = json.loads(request.get_data())['request']
        cookie = request.cookies.get('momagic')
        post = dict(request=data, momagic=cookie)
        payload = json.dumps(post)
        requests.request("POST", f"{URL}/remove", data=payload)
    return redirect(url_for("start"))


@app.route("/delete", methods=["GET", "POST"])
def delete_item():
    if request.method == "POST":
        # cookie = request.cookies.get('momagic')
        email = session['user']['emails'][0]
        device_id = request.values.get('device_id')
        if not has_device(COLLECT, email, device_id):
            session['alert'] = "nothing"
            return redirect(url_for("start"))
        COLLECT.find_one_and_delete({"email": email, "device_id": device_id})
    return redirect(url_for("start"))


def rgb_to_hex(rgb):
    return '#%02x%02x%02x' % rgb


def renew_config(req, email):

    item = list_device(COLLECT, email, req[-1])[0]
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
        req = rgb.split(',')
        try:
            email = session['user']['emails'][0]
        except KeyError:
            email = req[3]
            if not has_device(COLLECT, email, req[-1]):
                return "400"

    print(req[-1])

    payload = {
        "methodName": "LED",
        "responseTimeoutInSeconds": 200,
        "payload": "0,0,0"
    }


    url = "https://{1}.azure-devices.net/twins/{0}/methods?api-version=2018-06-30".\
        format(req[-1], HUBNAME)
    renew_config(req, email)
    if req[0].isdigit():
        payload["payload"] = ",".join(req[:3])
    else:
        print(req[0])
        payload["payload"] = THEME[req[0]]

    payload = json.dumps(payload)
    hostname = f'{HUBNAME}.azure-devices.net'
    policy_name = "iothubowner"
    sas_token = generate_sas_token(hostname, ACCESS_KEY, policy_name)
    headers = {'Content-Type': 'application/json', 'Authorization': sas_token}
    # return "ok"
    result = requests.request("POST", url, headers=headers, data=payload)
    if result.status_code != 200:
        return "400"
    return str(result.status_code)


def ordinal(n):
    return "%d%s" % (n, "tsnrhtdd"[(n // 10 % 10 != 1) *
                                   (n % 10 < 4) * n % 10::4])


def extract_schedule(data):
    date_time = data["request"].split(",")[4]
    req = ",".join(data["request"].split(",")[:3])
    date_time = datetime.strptime(date_time, "%Y-%m-%dT%H:%M:%S.%fZ")
    output = data["request"].split(",")
    cron_datetime = ""
    if output[5] == "hour":
        cron_datetime = f"at {output[-1]} minute(s) every hour"
    if output[5] == "day":
        data['local'], local_time = data['local'].split(",")
        cron_datetime = f"at {local_time} every day"
    if output[5] == "week":

        cron_datetime = f"at {date_time.hour}:{date_time.minute} every {output[-1]}"
    if output[5] == "month":
        day = ordinal(int(output[-1]))
        cron_datetime = f"at {date_time.hour}:{date_time.minute} on the {day} every month"
    job = f"Set RGB({req}) with {output[3]} {cron_datetime} from "
    return job, data['local']


def get_jobs(email):
    jobs = SCHEDULE.find({"momagic": email})
    job_list = []
    for i in jobs:
        data = i['request'].split(',')
        rgb = [int(j) for j in data[:3]]
        font = '#{:02x}{:02x}{:02x}'.format(*rgb)
        back = '#FFFFFF80'
        if sum(rgb) >= 255:
            back = '#0000004d'
        job, at_datetime = extract_schedule(i)
        job_list.append(
            dict(color=font,
                 back=back,
                 job=job,
                 record=i['request'],
                 at=at_datetime))
    return job_list


@app.route("/", methods=["GET", "POST"])
def start():
    if not session.get("user"):
        session["flow"] = _build_auth_code_flow(scopes=app_config.SCOPE)
        return redirect(session["flow"]["auth_uri"])
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
    reset_password = _build_auth_code_flow(
        authority=app_config.B2C_RESET_PASSWORD_AUTHORITY)["auth_uri"]
    profile = _build_auth_code_flow(
        authority=app_config.B2C_PROFILE_AUTHORITY)["auth_uri"]
    job_lists = []
    email = session['user']['emails'][0]
    print(cookie)
    print(email)
    if request.get_data("list"):
        job_lists = get_jobs(email)
    config = list_device(COLLECT, email)
    status = {"Disconnected": "❌", "Connected": "✅"}
    for ind, dev in enumerate(config):
        device = IOTHUB.get_device(dev['device_id'])
        config[ind]["status"] = status[device.connection_state]

    resp = make_response(
        render_template("index.html",
                        places=config,
                        alert=alert,
                        endpoint=endpoint['url'],
                        job_list=job_lists,
                        reset=reset_password,
                        profile=profile))
    session["alert"] = ""
    if not has_account(COLLECT, email):
        insert_data(COLLECT, email, device_id="", data=[])
    if not has_cookie(COOKIE, cookie, email):
        cookie = uuid.uuid1().hex
        COOKIE.insert_one({"email": email, "cookie": cookie})
        resp.set_cookie(key='momagic',
                        value=cookie,
                        expires=time() + 30 * 24 * 60 * 60)
    return resp


@app.route("/hello")
def hello():
    "hello world"
    return "Hello World!!!!!"


@app.route("/get")
def getcookie():
    framework = request.cookies.get('momagic')
    return 'The framework is ' + framework


@app.route(app_config.REDIRECT_PATH)
def authorized():
    try:
        cache = _load_cache()
        result = _build_msal_app(cache=cache).acquire_token_by_auth_code_flow(
            session.get("flow", {}), request.args)
        if "error" in result:
            return render_template("auth_error.html", result=result)
        session["user"] = result.get("id_token_claims")
        _save_cache(cache)
    except ValueError:  # Usually caused by CSRF
        pass  # Simply ignore them
    return redirect(url_for("start"))


@app.route("/logout")
def logout():
    session.clear()  # Wipe out user and its token cache from session
    return redirect(  # Also logout from your tenant's web session
        app_config.AUTHORITY + "/oauth2/v2.0/logout" +
        "?post_logout_redirect_uri=" + url_for("start", _external=True))


def _load_cache():
    cache = msal.SerializableTokenCache()
    if session.get("token_cache"):
        cache.deserialize(session["token_cache"])
    return cache


def _save_cache(cache):
    if cache.has_state_changed:
        session["token_cache"] = cache.serialize()


def _build_msal_app(cache=None, authority=None):
    return msal.ConfidentialClientApplication(
        app_config.CLIENT_ID,
        authority=authority or app_config.AUTHORITY,
        client_credential=app_config.CLIENT_SECRET,
        token_cache=cache)


def _build_auth_code_flow(authority=None, scopes=None):
    return _build_msal_app(authority=authority).initiate_auth_code_flow(
        scopes or [], redirect_uri=url_for("authorized", _external=True))


# pylint: disable=maybe-no-member
app.jinja_env.globals.update(
    _build_auth_code_flow=_build_auth_code_flow)  # Used in template

if __name__ == "__main__":

    app.run(debug=True)
