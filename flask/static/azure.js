/**
            * utilities to do sigv4
            * @class SigV4Utils
            */
// function SigV4Utils() { }

// SigV4Utils.getSignatureKey = function (key, date, region, service) {
//    var kDate = AWS.util.crypto.hmac('AWS4' + key, date, 'buffer');
//    var kRegion = AWS.util.crypto.hmac(kDate, region, 'buffer');
//    var kService = AWS.util.crypto.hmac(kRegion, service, 'buffer');
//    var kCredentials = AWS.util.crypto.hmac(kService, 'aws4_request', 'buffer');
//    return kCredentials;
// };

// SigV4Utils.getSignedUrl = function (host, region, credentials) {
//    var datetime = AWS.util.date.iso8601(new Date()).replace(/[:\-]|\.\d{3}/g, '');
//    var date = datetime.substr(0, 8);

//    var method = 'GET';
//    var protocol = 'wss';
//    var uri = '/mqtt';
//    var service = 'iotdevicegateway';
//    var algorithm = 'AWS4-HMAC-SHA256';

//    var credentialScope = date + '/' + region + '/' + service + '/' + 'aws4_request';
//    var canonicalQuerystring = 'X-Amz-Algorithm=' + algorithm;
//    canonicalQuerystring += '&X-Amz-Credential=' + encodeURIComponent(credentials.accessKeyId + '/' + credentialScope);
//    canonicalQuerystring += '&X-Amz-Date=' + datetime;
//    canonicalQuerystring += '&X-Amz-SignedHeaders=host';

//    var canonicalHeaders = 'host:' + host + '\n';
//    var payloadHash = AWS.util.crypto.sha256('', 'hex')
//    var canonicalRequest = method + '\n' + uri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;

//    var stringToSign = algorithm + '\n' + datetime + '\n' + credentialScope + '\n' + AWS.util.crypto.sha256(canonicalRequest, 'hex');
//    var signingKey = SigV4Utils.getSignatureKey(credentials.secretAccessKey, date, region, service);
//    var signature = AWS.util.crypto.hmac(signingKey, stringToSign, 'hex');

//    canonicalQuerystring += '&X-Amz-Signature=' + signature;
//    if (credentials.sessionToken) {
//       canonicalQuerystring += '&X-Amz-Security-Token=' + encodeURIComponent(credentials.sessionToken);
//    }

//    var requestUrl = protocol + '://' + host + uri + '?' + canonicalQuerystring;
//    return requestUrl;
// };

// Initialize the Amazon Cognito credentials provider
// AWS.config.region = 'us-east-1'; // Region
// var credentials = new AWS.CognitoIdentityCredentials({
//    IdentityPoolId: 'us-east-1:4968617b-8a07-460d-a780-3bceb489ba84',
// });

// var client;

// Getting AWS creds from Cognito is async, so we need to drive the rest of the mqtt client initialization in a callback
// credentials.get(function (err) {
//    if (err) {
//       console.log(err);
//       return;
//    }
//    var requestUrl = SigV4Utils.getSignedUrl('a2c3ixz6b99jrf-ats.iot.us-east-1.amazonaws.com', 'us-east-1', credentials);
//    initClient(requestUrl);
// });

// Connect the client, subscribe to the drawing topic, and publish a "hey I connected" message
// function initClient(requestUrl) {
//    var clientId = String(Math.random()).replace('.', '');
//    client = new Paho.MQTT.Client(requestUrl, clientId);
//    var connectOptions = {
//       onSuccess: function () {
//          console.log('connected');

//          // subscribe to the drawing
//          client.subscribe("your/mqtt/topic");

//          // publish a lifecycle event
//          message = new Paho.MQTT.Message('{"id":"' + credentials.identityId + '"}');
//          message.destinationName = 'your/mqtt/topic';
//          console.log(message);
//          client.send(message);
//       },
//       useSSL: true,
//       timeout: 3,
//       mqttVersion: 4,
//       onFailure: function () {
//          console.error('connect failed');
//       }
//    };
//    client.connect(connectOptions);

//    client.onMessageArrived = function (message) {

//       try {
//          console.log("msg arrived: " + message.payloadString);
//       } catch (e) {
//          console.log("error! " + e);
//       }

//    };

// }


function sendCommand(red, green, blue, name) {
   let xhr = new XMLHttpRequest();
   xhr.open("POST", "https://momagiclight.azurewebsites.net/led");
   // xhr.open("POST", "http://127.0.0.1:5000/led");
   xhr.setRequestHeader("Content-Type", "application/json");

   xhr.onload = () => console.log(xhr.responseText);

   let data = `{
 "request": "${red},${green},${blue},${name}"
}`;
   xhr.send(data);
}
// function sendCommand(red, green, blue) {
//    let xhr = new XMLHttpRequest();
//    xhr.open("GET", "http://127.0.0.1:5000/led?rgb=" + `${red},${green},${blue}`);

//    xhr.send();

//    xhr.onload = () => console.log(xhr.responseText);
// }
// Led Controller
function change_color(start, end, color_hex, bright, name) {
   if (color_hex == "party") {
      sendCommand("party", 0, 0, name);
   } else {
      red = Math.round(parseInt(color_hex.slice(1, 3), 16) * bright / 100);
      green = Math.round(parseInt(color_hex.slice(3, 5), 16) * bright / 100);
      blue = Math.round(parseInt(color_hex.slice(5, 7), 16) * bright / 100);
      console.log(`${red}, ${green}, ${blue}`)

      sendCommand(red, green, blue, name);
   }
}

// K to RGB
function temp_to_RGB(temp_k) {
   var red = 0
   var green = 0
   var blue = 0

   if (temp_k <= 66) {
      red = 255
      green = 99.4708025861 * Math.log(temp_k) - 161.1195681661

      if (temp_k <= 19) {
         blue = 0
      } else {
         blue = 138.5177312231 * Math.log(temp_k - 10) - 305.0447927307
      }
   } else {
      red = 329.698727446 * ((temp_k - 60) ** -0.1332047592)
      green = 288.1221695283 * ((temp_k - 60) ** -0.0755148492)
      blue = 255
   }

   red = red < 0 ? 0 : red;
   red = red > 255 ? 255 : red;
   green = green < 0 ? 0 : green;
   green = green > 255 ? 255 : green;
   blue = blue < 0 ? 0 : blue;
   blue = blue > 255 ? 255 : blue;

   console.log(`red: ${red}, green: ${green}, blue: ${blue}`)
   red_text = red > 9 ? Math.round(red).toString(16) : "0" + Math.round(red).toString(16);
   green_text = green > 9 ? Math.round(green).toString(16) : "0" + Math.round(green).toString(16);
   blue_text = blue > 9 ? Math.round(blue).toString(16) : "0" + Math.round(blue).toString(16);
   color = '#' + red_text + green_text + blue_text
   return color
}
