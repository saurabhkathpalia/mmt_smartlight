import json
import boto3

def lambda_handler(event, context):
    client = boto3.client(
        'iot-data',
        region_name='us-west-2',
        endpoint_url="https://aa7l37sbfqnix-ats.iot.us-west-2.amazonaws.com" # Need to be modified for different IoT Core
    )
    
    # Change topic, qos and payload
    response = client.publish(
            topic=f'$aws/things/led_{event["led_id"]}/shadow/update',
            qos=1,
            payload=json.dumps({"state":{"desired":{"color":[event["red"],event["green"],event["blue"]]}}})
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!'),
    }
