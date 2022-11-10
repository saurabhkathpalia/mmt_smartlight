import json
import boto3

def lambda_handler(event, context):
    client = boto3.client(
        'iot-data',
        region_name='us-east-1',
        endpoint_url="https://a2c3ixz6b99jrf-ats.iot.us-east-1.amazonaws.com" # Need to be modified for different IoT Core
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
