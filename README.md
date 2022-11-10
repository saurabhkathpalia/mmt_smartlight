# Smart Light Solution for AWS

## Contents

1. [Device Side](#device-side)
2. [AWS Service](#aws-service)
3. [Deploy and Usage](#deploy-and-usage)

## Device Side

### Device Information

* ESP32 
	* Ai-Thinker
	* NodeMCU CP2102
	* Flash Size: 32 MB
* Led Strip WS2813
	* 30 Led/m
	* Signal connect to Pin **19** on ESP32

### MicroPython

[Install](https://micropython.org/download/esp32/)
```
esptool.py --chip esp32 --port <usb port> erase_flash
esptool.py --chip esp32 --port <usb port> --baud 460800 write_flash -z 0x1000 <bin file path>
```

### Credentials

Please see detail in ["IoT Core - Credentials"](##iot-core---credentials)

### Transfer files into device - ampy

[ampy(Adafruit MicroPython Tool) github](https://github.com/scientifichackers/ampy)

Put files into the device:
```
ampy -p <usb port> mkdir /certs
ampy -p <usb port> put <private key path> /certs/private.pem.key
ampy -p <usb port> put <certificate path> /certs/certificate.pem.crt
ampy -p <usb port> put <python code path> /wifimgr.py
ampy -p <usb port> put <python code path> /main.py
```

### Debug - picocom

[picocom github](https://github.com/npat-efault/picocom)

You can use picocom to see the log of execution
```
picocom <usb port> -b 115200
```
## AWS Service

### IoT Core

Several components used in the project
* [Shadow](https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-shadows.html)
* [LWT to detect status](https://docs.aws.amazon.com/iot/latest/developerguide/device-shadow-comms-app.html)

### IoT Core - Credentials

* Several methods to create the credentails
	1. Use [JITP (Just In Time Provisioning)](https://docs.aws.amazon.com/iot/latest/developerguide/jit-provisioning.html) to create the credentials for the device
	2. Use [JITR (Just In Time Registration)](https://docs.aws.amazon.com/iot/latest/developerguide/auto-register-device-cert.html) to create the credentials for the device and then apply the relative policy on it manually.
	3. Manually create the credential on IoT Core and the put it to the device. [Doc](https://docs.aws.amazon.com/iot/latest/developerguide/device-certs-create.html)
* [Put the **private key** and **certificate** files into the device.](#transfer-files-into-device---ampy) 

### [Elastic Beanstalk](https://docs.aws.amazon.com/elastic-beanstalk/index.html)

We use Elastic Beanstalk to manage and delpoy the web application.

It has its own [CLI tool](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html). Use `pip install awsebcli` to install it.

1. Init and create EB in your project. Select python as the platform  and select the desired region.
	```
	eb init
	eb create
	```
2. Create a config file under `.ebextentions/`. Content like below:
	```
	option_settings:
	  aws:elasticbeanstalk:application:environment:
	    PYTHONPATH: "/var/app/current:$PYTHONPATH"
	  aws:elasticbeanstalk:container:python:
	    WSGIPath: "app:app"
	```
3. After pushing the code to CodeCommit, you just need to run `eb deploy` for deploing the latest code.

### [CodeCommit](https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html)

We use CodeCommit to manage and deploy the code. We don't need to do any manually change in it. When doing eb init it will automatically help us to create the relative repositories in it.

### [DynamoDB](https://docs.aws.amazon.com/dynamodb/index.html)

We use DynamoDB to store user-devices mapping.

1. Create table named `iot_cookie` in DynamoDB
2. Set the partition key to `user_id(String)`

### [EventBridge](https://docs.aws.amazon.com/eventbridge/)

We use EventBridge for schedule the Led in our service. EventBridge will trigger the Lambda to send the IoT MQTT message. The server will create the rule when user schedule a Led.

### [Lambda](https://docs.aws.amazon.com/lambda/index.html)

We use Lambda to transfer the EventBridge signal to IoT MQTT message to change the Led color.
1. Create the Lambda to send MQTT message to IoT Shadow.

### [Cognito](https://docs.aws.amazon.com/cognito/index.html)

We use user pool for login service
1. Create an User Pool
2. Add new app client and set the callback url to the service
	* **Remember to put / after the callback url**
3. Paste `cognitoLoginUrl`, `clientId` and `clientSecret` into `/static/aws.js`

Also we use identity pool to control the permission to IoT Core
1. Create an Identity Pool
2. Grant the required permission to the Roles
3. Paste the identity pool id into `/static/aws.js`

### [IAM](https://docs.aws.amazon.com/iam/index.html)

IAM is permission control service for AWS cloud.
1. Grant required permission to Elastic Beanstalk role. Such as: DynamoDB, Lambda, EventBridge.
2. Grant required permission to Lambda role. Such as: IoT Core Publish.
3. Grant required permission to Cognito role. Such as: IoT Core Publish.
4. etc...

### [CloudWatch](https://docs.aws.amazon.com/cloudwatch/index.html)

In AWS, we use CloudWatch to check service logs. If you need to debug or check error, you can try to look up the CloudWatch logs.

## Deploy and Usage

1. Set up the AWS cloud environment with above instructions.
2. Go to your project folder and run `eb deploy`.



