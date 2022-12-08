// credential related
function SigV4Utils() { }

SigV4Utils.getSignatureKey = function (key, date, region, service) {
   var kDate = AWS.util.crypto.hmac('AWS4' + key, date, 'buffer');
   var kRegion = AWS.util.crypto.hmac(kDate, region, 'buffer');
   var kService = AWS.util.crypto.hmac(kRegion, service, 'buffer');
   var kCredentials = AWS.util.crypto.hmac(kService, 'aws4_request', 'buffer');
   return kCredentials;
};

SigV4Utils.getSignedUrl = function (host, region, credentials) {
   var datetime = AWS.util.date.iso8601(new Date()).replace(/[:\-]|\.\d{3}/g, '');
   var date = datetime.substr(0, 8);

   var method = 'GET';
   var protocol = 'wss';
   var uri = '/mqtt';
   var service = 'iotdevicegateway';
   var algorithm = 'AWS4-HMAC-SHA256';

   var credentialScope = date + '/' + region + '/' + service + '/' + 'aws4_request';
   var canonicalQuerystring = 'X-Amz-Algorithm=' + algorithm;
   canonicalQuerystring += '&X-Amz-Credential=' + encodeURIComponent(credentials.accessKeyId + '/' + credentialScope);
   canonicalQuerystring += '&X-Amz-Date=' + datetime;
   canonicalQuerystring += '&X-Amz-SignedHeaders=host';

   var canonicalHeaders = 'host:' + host + '\n';
   var payloadHash = AWS.util.crypto.sha256('', 'hex')
   var canonicalRequest = method + '\n' + uri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;

   var stringToSign = algorithm + '\n' + datetime + '\n' + credentialScope + '\n' + AWS.util.crypto.sha256(canonicalRequest, 'hex');
   var signingKey = SigV4Utils.getSignatureKey(credentials.secretAccessKey, date, region, service);
   var signature = AWS.util.crypto.hmac(signingKey, stringToSign, 'hex');

   canonicalQuerystring += '&X-Amz-Signature=' + signature;
   if (credentials.sessionToken) {
      canonicalQuerystring += '&X-Amz-Security-Token=' + encodeURIComponent(credentials.sessionToken);
   }

   var requestUrl = protocol + '://' + host + uri + '?' + canonicalQuerystring;
   return requestUrl;
};

// Initialize the Amazon Cognito credentials provider
AWS.config.region = 'us-west-2'; // Region
var credentials = new AWS.CognitoIdentityCredentials({
   IdentityPoolId: 'us-west-2:2a93e19f-0da8-4014-80d6-7931ec7166b7',
});

var client;

// Getting AWS creds from Cognito is async, so we need to drive the rest of the mqtt client initialization in a callback
credentials.get(function (err) {
   if (err) {
      console.log(err);
      return;
   }
   var requestUrl = SigV4Utils.getSignedUrl('aa7l37sbfqnix-ats.iot.us-west-2.amazonaws.com', 'us-west-2', credentials);
   initClient(requestUrl);
});

// Connect the client, subscribe to the drawing topic, and publish a "hey I connected" message
function initClient(requestUrl) {
   var clientId = String(Math.random()).replace('.', '');
   client = new Paho.MQTT.Client(requestUrl, clientId);
   var connectOptions = {
      onSuccess: function () {
        console.log('connected');

        // subscribe to the drawing
        for (let led_i = 0; led_i < 30; led_i++) {
            client.subscribe(`$aws/things/led_${led_i}/shadow/update/accepted`);
        }

        //  // publish a lifecycle event
        //  message = new Paho.MQTT.Message('{"id":"' + credentials.identityId + '"}');
        //  message.destinationName = 'your/mqtt/topic';
        //  console.log(message);
        //  client.send(message);
      },
      useSSL: true,
      timeout: 3,
      mqttVersion: 4,
      onFailure: function () {
         console.error('connect failed');
      }
   };
   client.connect(connectOptions);

   client.onMessageArrived = async function (message) {
      try {
        console.log(`msg arrived: ${message.payloadString}  from ${message.destinationName}`);
        color_list = JSON.parse(message.payloadString)["state"]["reported"]["color"]
        red_text = color_list[0] > 15 ? Math.round(color_list[0]).toString(16) : "0" + Math.round(color_list[0]).toString(16);
        green_text = color_list[1] > 15 ? Math.round(color_list[1]).toString(16) : "0" + Math.round(color_list[1]).toString(16);
        blue_text = color_list[2] > 15 ? Math.round(color_list[2]).toString(16) : "0" + Math.round(color_list[2]).toString(16);
        color = '#' + red_text + green_text + blue_text;
        console.log(`${color}`);
        led_i = message.destinationName.match(/led_(\w+)\/shadow/)[1]
        document.querySelectorAll(`#color_picker[name='${led_i}']`)[0].value = color;
      } catch (e) {
        console.log("error! " + e);
      }
   };
}

// change color by sending the MQTT signals
function change_color(color_hex, bright, name) {
    red = Math.round(parseInt(color_hex.slice(1,3), 16)*bright/100);
    green = Math.round(parseInt(color_hex.slice(3,5), 16)*bright/100);
    blue = Math.round(parseInt(color_hex.slice(5,7), 16)*bright/100);
    console.log(`${red}, ${green}, ${blue}`);

    message = new Paho.MQTT.Message(JSON.stringify({state:{desired:{color:[red,green,blue]}}}));
    message.destinationName = `$aws/things/led_${name}/shadow/update`;
    console.log(`led ${name}'s color change to [${red},${green},${blue}]`);
    client.send(message);
 }


 
