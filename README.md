
# Basic Skill

- Python
- Git

# Clone 

```
git clone https://github.com/KuiMing/momagiclight
```

### ***NOTICE***
> Please `DON'T` push code to this repository, please create your own. 

# Azure Service
### ***NOTICE***
> If you get any permission issue, please ask the Azure account administrator.
> I'm not the Azure account administrator.

## Azure CLI

https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

- MacOS
```
brew update && brew install azure-cli
```
- Linux 
https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux?pivots=apt

## Azure Web App

1. Create the resource of Azure Web App:
   - https://portal.azure.com/#create/Microsoft.WebSite
   - Runtime stack: python3.7
   - Sku and size: select you really need, the minimun is B1.
2. Set username and password
```
az webapp deployment user set \
--user-name <username> --password <password>
```
3. Get git url

```
az webapp deployment source config-local-git \
--name <webappname> --resource-group <yourResourceGroup>
```
4. Set remote git url
```
cd momagiclight
git remote add azure <your_git_url>
```
   
## Azure IoT Hub

1. Create the resource of Azure IoT Hub from Azure portal.
2. Get the connection string: https://github.com/microsoft/vscode-azure-iot-toolkit/blob/master/resources/iot-hub-connection-string.md
3. Set the following environment variable in Azure Web App ([tutorial](https://learn.microsoft.com/en-us/azure/app-service/configure-common?tabs=portal&WT.mc_id=AZ-MVP-5003494)):
   - CONNECTION_STRING
   - IOTHUB: name of Azure IoT Hub service
   - ACCESS_KEY: follow step 2 and find the primary key

## Azure AD B2C

### ***NOTICE***
> Please Check the permission issue with the Azure account administrator.

1. Create an Azure Active Directory B2C tenant: https://learn.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-tenant?WT.mc_id=AZ-MVP-5003494

2. Configure authentication in a Python web app by using Azure AD B2C: https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-python-web-app?tabs=macos#step-1-configure-your-user-flow?WT.mc_id=AZ-MVP-5003494
3. Set the following environment variable in Azure Web App ([tutorial](https://learn.microsoft.com/en-us/azure/app-service/configure-common?tabs=portal&WT.mc_id=AZ-MVP-5003494)):
   - B2C_TENANT: name of your Azure AD B2C service
   - CLIENT_ID: follow [this](https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-python-web-app?tabs=macos#step-21-register-the-app)
   - CLIENT_SECRET: follow [this](https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-python-web-app?tabs=macos#step-22-create-a-web-app-client-secret)
   - SIGNUP: name of "Sign in and sign up user flow"
   - EDITPRO: name of "Profile editing user flow"
   - RESETPASS: name of "Password reset user flow"
   - TASK_READ: follow [this](https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-python-web-app?tabs=macos#step-63-grant-the-web-app-permissions)
   - TASK_WRITE: follow [this](https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-python-web-app?tabs=macos#step-63-grant-the-web-app-permissions)
### ***NOTICE***
> Eventually, the redirect URL should be `<YOUR Azure Web APP URL>/getAToken`, please recheck [Step 2.1](https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-python-web-app?tabs=macos#step-21-register-the-app) and [Step 7](https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-python-web-app?tabs=macos#step-7-deploy-your-application)


## Azure Cosmos DB API for MongoDB 
1. Create resource of Azure Cosmos DB API for MongoDB: 
  - https://learn.microsoft.com/en-us/azure/cosmos-db/try-free#create-your-try-azure-cosmos-db-account?WT.mc_id=AZ-MVP-5003494
  - Capacity mode: Serverless
2. Get Connection string: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/connect-account#get-the-mongodb-connection-string-by-using-the-quick-start
3. Set the following environment variable in Azure Web App ([tutorial](https://learn.microsoft.com/en-us/azure/app-service/configure-common?tabs=portal&WT.mc_id=AZ-MVP-5003494)):
   - CONNECTION_STRING

## Azure PUBSUB
1. Create resource of Azure PUBSUB:
   - https://learn.microsoft.com/zh-tw/azure/azure-web-pubsub/howto-develop-create-instance?WT.mc_id=AZ-MVP-5003494
2. Get Connection string
   - Go to Azure portal and find out the Azure Web PubSub instance.
   - Go to the Client URL Generator in Key blade.
   - Get Primary Connection string
3. Set the following environment variable in Azure Web App ([tutorial](https://learn.microsoft.com/en-us/azure/app-service/configure-common?tabs=portal&WT.mc_id=AZ-MVP-5003494)):
   - PUBSUB


## Azure VM
- Create resource of Azure Linux virtual machine
  - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-portal
  - Size: Standard B1s 
- Connect to a Linux VM: https://learn.microsoft.com/en-us/azure/virtual-machines/linux-vm-connect?tabs=Linux
- Open ports: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/nsg-quickstart-portal
  - port range: 5000
![](https://i.imgur.com/DiGMtkc.png)


- Upload code
  - Switch branch in your computer. In `momagiclight` folder:
  ```
  git checkout schedule
  ```
  - URL
    - Go to Azure portal and find out the Azure VM instance.
    - Get Public IP address in Overview
  - upload files
  ```
  scp -i <your_filename>.pem light_schedule.py <your_urser_name>@<your URL>:.
  scp -i <your_filename>.pem scheduler.py <your_urser_name>@<your URL>:.
  scp -i <your_filename>.pem scheduler_at.py <your_urser_name>@<your URL>:.
  ```
- Execute python code in VM
  - ssh into VM from your computer
  ```
  ssh -i <your_filename>.pem <your_urser_name>@<your URL>
  ```
  - In the VM, 
    - set environment variables
    - Edit `/etc/profile`
      - Run: `sudo nano /etc/profile`
      - In profile, add the followings at the end
  ```
  export MONGOURI=<your mongodb connection string>
  ```
  - Execute python code
  ```
  nohup python3 light_schedule.py &
  ```

# Micropython

Please do it in order.

## Development Board
- ESP32 C3F
  - Flash size: 2 MB



## Flash Micropython
There are two ways to flash Micropython into ESP32:

### Micropython Github
- Follow this: https://github.com/micropython/micropython/tree/master/ports/esp32
- Should specify the board: `make BOARD=GENERIC_C3`

### Flash with zip file

[Install](https://micropython.org/download/esp32/) esptool.py
[Download and unzip](https://drive.google.com/file/d/1mIaOUPIvabxxT8D4YXILkgNws9hS8yse/view?usp=sharing)
```bash
python3.7 esptool.py -p <your_port> -b 460800 --before default_reset --after hard_reset --chip esp32c3  write_flash --flash_mode dio --flash_size detect --flash_freq 80m 0x0 build-GENERIC_C3/bootloader/bootloader.bin 0x8000 build-GENERIC_C3/partition_table/partition-table.bin 0x10000 build-GENERIC_C3/micropython.bin 
```

### ***NOTICE***
> Your environment might not be the same with mine. If you find out any problem, you should check your environment and your type of ESP32 first, and try to solve your problems by your own.

## Tools for development board
- picocom: https://howtoinstall.co/en/picocom
- ampy: https://learn.adafruit.com/micropython-basics-load-files-and-run-code/install-ampy

## Prepare `config.json`

- Register Device in Azure IoT Hub
```
az iot hub device-identity create --device-id myDeviceId --hub-name {Your IoT Hub name}
```
- Get connection string
```
az iot hub device-identity connection-string show --device-id myDeviceId --hub-name {Your IoT Hub name} -o table
```
- Create `config.json`
```json
{
    "connection_string": "connection string of device for Azure IoT Hub"
}
```

## Upload micropython script and config

```bash
ampy --port <USB_PORT> put wifimgr.py
ampy --port <USB_PORT> put iothub.py
ampy --port <USB_PORT> put config.json
```
### ***NOTICE***
> All the files should be uploaded before `main.py`. If you want to reupload something to development board, you have to remove the `main.py` first, and then upload the files. Remove `main.py` in Micropython environment:
```python
import os
os.remove("main.py")
```


## Set Wifi

https://www.youtube.com/watch?v=Yqag1_PIp9s

### ***NOTICE***
> only tested on smartphone

## Micropython package

- Access to development board
```bash
sudo picocom -b 115200 <USB_PORT>
```
- In development board and run

```python
import upip
upip.install('micropython-iotc')
upip.install("Mqtt")
upip.install("micropython-umqtt.simple")
upip.install("itertools")
```
- Press `Ctrl + A` and `Ctrl + Q` to exit


## Upload `main.py`


```bash
ampy --port <USB_PORT> put main.py
```

## Diagram

![](https://i.imgur.com/xnv0piF.png)

### ***NOTICE***
> The code is based on this diagram, so please connect the LED to the GPIO pin as the diagram.
 
## Replug development board

After repluging, the development borad should work with the code. Or, you can use `picocom` to access to the development borad, and observe the log.

# Deploy 


## Deploy service to Azure Web App
- Go to `momagiclight` folder, and run
```
git push azure master
```
- If you want to check log:
https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-diagnostic-logs#in-azure-portal
