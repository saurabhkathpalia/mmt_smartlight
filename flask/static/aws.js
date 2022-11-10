// userPool check
const cognitoLoginUrl='https://momagic-smartlight.auth.us-east-1.amazoncognito.com'
const clientId='k74i0dg2e38kvishuctjts2em'
const clientSecret='1s1mijkm29cll7ngod6mql7pl4j70oqh83j97bps5dann90co04'
const searchParams = new URL(location).searchParams;

if (searchParams.get("code") !== null) {
	// remove the query parameters
	window.history.replaceState({}, document.title, "/");
   
   // exchange code for tokens
	const res = fetch(`${cognitoLoginUrl}/oauth2/token`, {
		method: "POST",
		headers: new Headers({"content-type": "application/x-www-form-urlencoded"}),
		body: Object.entries({
			"grant_type": "authorization_code",
			"client_id": clientId,
         "client_secret": clientSecret,
			"redirect_uri": `${window.location.origin}/`,
			"code": searchParams.get("code"),
		}).map(([k, v]) => `${k}=${v}`).join("&"),
	});
	if (!res.ok) {
		throw new Error(res);
	}
	const tokens = res.json();
}else {
		// // generate nonce and PKCE
      // const state = await generateNonce();
      // const codeVerifier = await generateNonce();
      // sessionStorage.setItem(`codeVerifier-${state}`, codeVerifier);
      // const codeChallenge = base64URLEncode(await sha256(codeVerifier));
      // redirect to login
      window.location = `${cognitoLoginUrl}/login?response_type=code&client_id=${clientId}&redirect_uri=${window.location.origin}/`;
}

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
AWS.config.region = 'us-east-1'; // Region
var credentials = new AWS.CognitoIdentityCredentials({
   IdentityPoolId: 'us-east-1:4968617b-8a07-460d-a780-3bceb489ba84',
});

var client;

// Getting AWS creds from Cognito is async, so we need to drive the rest of the mqtt client initialization in a callback
credentials.get(function (err) {
   if (err) {
      console.log(err);
      return;
   }
   var requestUrl = SigV4Utils.getSignedUrl('a2c3ixz6b99jrf-ats.iot.us-east-1.amazonaws.com', 'us-east-1', credentials);
   initClient(requestUrl);
});

// Connect the client, subscribe to the drawing topic, and publish a "hey I connected" message
function initClient(requestUrl) {
   var clientId = String(Math.random()).replace('.', '');
   client = new Paho.MQTT.Client(requestUrl, clientId);
   var connectOptions = {
      onSuccess: function () {
         console.log('connected');        
        for (place of places) {
         register_led(place['device_id']);
        }
      },
      useSSL: true,
      timeout: 3,
      mqttVersion: 4,
      onFailure: function () {
         console.error('connect failed');
      }
   };

   client.onMessageArrived = async function (message) {
      try {
        console.log(`msg arrived: ${message.payloadString}  from ${message.destinationName}`);
        led_i = message.destinationName.match(/led_(\w+)\/shadow/)[1]
        reported_message = JSON.parse(message.payloadString)["state"]["reported"]
        // change connected status 
        if ("connected" in reported_message) {
          connected = reported_message["connected"] == "true" ? " 🟢" : " 🔴";
          place_name = document.querySelectorAll(`#place_name[name='${led_i}']`)[0];
          place_name.innerHTML = place_name.innerHTML.slice(0,place_name.innerHTML.indexOf(':')+1)+connected;
        }
        // change color status
        if ("color" in reported_message) {
          color_list = reported_message["color"]
          red_text = color_list[0] > 15 ? Math.round(color_list[0]).toString(16) : "0" + Math.round(color_list[0]).toString(16);
          green_text = color_list[1] > 15 ? Math.round(color_list[1]).toString(16) : "0" + Math.round(color_list[1]).toString(16);
          blue_text = color_list[2] > 15 ? Math.round(color_list[2]).toString(16) : "0" + Math.round(color_list[2]).toString(16);
          color = '#' + red_text + green_text + blue_text;
          console.log(`${led_i} is ${color} now`);
          document.querySelectorAll(`#color_picker[name='${led_i}']`)[0].value = color;
        }
      } catch (e) {
        console.log("error! " + e);
      }
   };

   client.connect(connectOptions);
}

// fetch newest status for specific ID
function register_led(name) {
   console.log(`register ${name}`)
   client.subscribe(`$aws/things/led_${name}/shadow/update/accepted`, {onSuccess: () => {console.log('subscribed')}});
   var subscribeOptions = {
      onSuccess: function () {
         console.log('subscribed');
         message = new Paho.MQTT.Message('');
         message.destinationName = `$aws/things/led_${name}/shadow/get`;
         client.send(message);
      },
      onFailure: function() {
         console.error('subscribe failed');
      }
   }
   client.subscribe(`$aws/things/led_${name}/shadow/get/accepted`, subscribeOptions);
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

// timezone translator
function timezone_translator(weekdays, time, offset) {
   new_min = parseInt(time.substring(0,2))*60+parseInt(time.substring(2,4))+parseInt(offset)
   new_array = weekdays
   if (new_min < 0) {
      new_min += 1440
      new_array = []
      weekdays.forEach(w => {
         new_array.push(((parseInt(w)-1+7)%7).toString())
       })
   } else if (new_min > 1440) {
      new_min -= 1440
      new_array = []
      weekdays.forEach(w => {
         new_array.push(((parseInt(w)+1+7)%7).toString())
       })
   }
   new_time = parseInt(new_min/60).toString().padStart(2,0) + parseInt(new_min%60).toString().padStart(2,0)
   return [new_array.sort(), new_time]

}