import machine
import network
import neopixel
import json
import re
import wifimgr
import uasyncio as asyncio
from umqtt.robust import MQTTClient
try:
  import usocket as socket
except:
  import socket

# Basic settings
CLIENT_ID = "SmartLightThing" # Need to be modified for new device
LED_NUMS = 5 # Need to be modified for led numbers
AWS_ENDPOINT = b'aa7l37sbfqnix-ats.iot.us-west-2.amazonaws.com' # Need to be modified for different IoT Core
KEY_FILE = '/certs/private.pem.key'
CERT_FILE = "/certs/certificate.pem.crt"

# Set NeoPixel ESP32 pin 19, ESP 8266 Pin 14
np = neopixel.NeoPixel(machine.Pin(19), 30)



# Wifi connection
wlan = wifimgr.get_connection()
if wlan is None:
    print("Could not initialize the network connection.")
    machine.reset()

# Main process
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('', 80))
    s.listen(5)

    with open(KEY_FILE, 'r') as f:
        key = f.read()
    with open(CERT_FILE, 'r') as f:
        cert = f.read()
    SSL_PARAMS = {'key': key,'cert': cert, 'server_side': False}
    mqtt = MQTTClient( CLIENT_ID, AWS_ENDPOINT, port = 8883, ssl = True, ssl_params = SSL_PARAMS )
    mqtt.set_last_will(f'things/{CLIENT_ID}/shadow/update', '{"state":{"reported":{"connected":"false"}}}', retain=False, qos=0)
    mqtt.connect(False)
    mqtt.publish(topic=f'$aws/things/{CLIENT_ID}/shadow/update', msg='{"state":{"reported":{"connected":"true"}}}', qos=0 )
    # callback function
    def callback_func(topic, message):
        print(topic, message)
        message_json = json.loads(message)
        for i in range(LED_NUMS):
            np[i] = (message_json['state']['color'][0], message_json['state']['color'][1], message_json['state']['color'][2])
        np.write()
        mqtt.publish(
            topic=f'$aws/things/{CLIENT_ID}/shadow/update', 
            msg=f'{{"state":{{"reported":{{"color":[{message_json['state']['color'][0]},{message_json['state']['color'][1]},{message_json['state']['color'][2]}]}} }} }}',
            qos=0 
            )
    mqtt.set_callback(callback_func)
    mqtt.subscribe(topic=f'$aws/things/{CLIENT_ID}/shadow/update/delta')
except:
    machine.reset()


async def repeated_ping(t):
    try:
        while True:
            mqtt.ping()
            print("MQTT ping sent")
            await asyncio.sleep(t)
    except:
        machine.reset()

async def main():
    try: 
        asyncio.create_task(repeated_ping(300))
        while True:
            mqtt.check_msg()
            await asyncio.sleep(0)
    except:
        machine.reset()

asyncio.run(main())


