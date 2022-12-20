
// Azure Web PubSub

function addItem(item, owner) {
    item.id = owner.length;
    owner.unshift(item);
}

function connect(client, endpoint, onConnected, onMessage) {
    client.connecting = true;
    try {
        var markedEndpoint = endpoint.indexOf('?') > -1 ? endpoint + "&awps-live-demo=true" : endpoint + "?awps-live-demo=true"
        var websocket = client.connection = new WebSocket(markedEndpoint, 'json.webpubsub.azure.v1');
        websocket.onopen = e => {
            addItem({
                time: new Date().toISOString(),
                log: `Client WebSocket opened.`,
            }, client.logs);
            if (onConnected) onConnected(client);
            var ep_endpoint = new URL(endpoint.indexOf('?') > -1 ? endpoint.substring(0, endpoint.indexOf('?')) : endpoint);
            console.log("connected");
            app.join(data.client);
            // app.publish(data.client);
        };
        websocket.onclose = e => {
            this.connected = false;

            addItem({
                time: new Date().toISOString(),
                log: `Client WebSocket closed. Type: ${e.type}, code: ${e.code}, reason: ${e.reason}, wasClean: ${e.wasClean}.`,
            }, client.logs);
        };
        websocket.onmessage = e => {
            if (onMessage) onMessage(client, e);
        }
    } catch (err) {

        addItem({
            time: new Date().toISOString(),
            log: `Error: ${err}`,
        }, client.logs);
    }
}

function addAckLog(ack, client) {
    addItem({
        time: ack.time,
        log: `${ack.log}(ackId=${ack.ackId}) ${ack.status}`,
    }, client.logs);
}

function addAck(ack, client) {
    addItem(ack, client.acks);
    addAckLog(ack, client);
}

function ack(toAck, ackId, status) {
    var index = toAck.findIndex(i => i.ackId === ackId);
    if (index > -1) {
        var item = toAck[index];
        toAck.splice(index, 1);
        item.status = status.success ? "succeeded." : "error: " + status.error.name;
        return item;
    }
    return undefined;
}

var color_picker = document.getElementsByClassName("color_picker");
var bright_picker = document.getElementsByClassName("bright_picker");
var bright_display = document.getElementsByClassName("bright_display");
var light_mode = document.getElementsByClassName("light_mode");

// Use vue.js to connect websocket, join groups, publish and receive message 
const app = new Vue({
    el: '#app',
    data: data,
    methods: {
        join: function (client) {
            // when connected
            const ackId = ++client.ackId;
            client.connection.send(JSON.stringify(
                {
                    type: "joinGroup",
                    group: client.group,
                    ackId: ackId // ackId is optional, use ackId to make sure this action is executed
                }
            ));
            client.groupjoined = true;
            addAck({
                time: new Date().toISOString(),
                ackId: ackId,
                log: `Joining group ${client.group}`,
                status: "requested.",
            }, client);
            console.log("join");
        },
        publish: function (client) {
            const ackId = ++client.ackId;
            if (client.connection.readyState == client.connection.OPEN) {
                client.connection.send(JSON.stringify(
                    {
                        type: "sendToGroup",
                        group: client.group,
                        data: client.newMessage,
                        ackId: ackId
                    }
                ));
            } else {
                window.location.reload()
            }

            addAck({
                time: new Date().toISOString(),
                ackId: ackId,
                log: `Sending message to group ${client.group}`,
                status: "requested",
            }, client);
            // console.log(data.client.newMessage)
        },
        connect: function (client) {
            // close the previous connection if any and start a new connection
            if (client.connection) client.connection.close();
            console.log("connect")
            connect(client, client.endpoint, null,
                (client, msg) => {
                    let response = JSON.parse(msg.data);
                    if (response.type === "system") {
                        if (response.event === "connected") {
                            client.userId = response.userId;
                            client.connectionId = response.connectionId;
                            client.connected = true;
                            addItem({
                                time: new Date().toISOString(),
                                log: `${response.userId || ''}:${response.connectionId} connected.`,
                            }, client.logs);
                        }
                        else if (response.event === "disconnected")

                            addItem({
                                time: new Date().toISOString(),
                                log: `Disconnected. ${response.message}`,
                            }, client.logs);
                    }
                    else if (response.type === "ack") {
                        var toAck = ack(client.acks, response.ackId, response)
                        if (toAck) {
                            addAckLog(toAck, client);
                        }

                        if (!response.success) {
                            addItem({
                                time: new Date().toISOString(),
                                log: `Error: ${response.error.message}`,
                            }, client.logs);
                        }
                    }
                    else if (response.type === "message") {
                        let led_status = response.data.split("_")
                        let content = led_status[0];
                        let device = led_status[1];
                        var modes = {
                            "#ff00ff": "Party",
                            '#ff0000': "Taiwan",
                            "#ff9933": "India",
                            "#b97cd3": "Flower",
                            "#000000": "Close",
                            "#ffffff": "White",
                            "#ffb16e": "Reading",
                            "#a3bfff": "Movie"
                        }
                        console.log(device)
                        console.log(content)
                        for (let i = 0; i < color_picker.length; i++) {
                            if (color_picker[i].name === device) {
                                color_picker[i].value = content;
                                light_mode[i].innerHTML = "Quick button: ";
                                temp_display[i].innerHTML = "5000 K";
                                temp_picker[i].value = "50";
                                bright_display[i].innerHTML = "100";
                                bright_picker[i].value = "100";


                                if (modes[content] !== undefined) {
                                    light_mode[i].innerHTML = "Quick button: " + modes[content];
                                }
                                if (led_status.length === 3) {
                                    bright_display[i].innerHTML = led_status[2];
                                    bright_picker[i].value = led_status[2];
                                }
                                if (led_status.length === 4) {
                                    temp_display[i].innerHTML = led_status[2] + "00 K";
                                    temp_picker[i].value = led_status[2];
                                }
                            }
                        }
                        addItem({ from: `${response.group}`, content: content }, client.chat.messages);
                    }
                });
        },
        groupchanged: function (client) {
            client.groupjoined = false;
        }
    },
    mounted() {
        this.connect(data.client);
    }
});

// control.js

for (let i = 0; i < color_picker.length; i++) {
    color_picker[i].addEventListener('change', (event) => {
        change_color(color_picker[i].value, bright_picker[i].value, color_picker[i].name);
        light_mode[i].innerHTML = "Quick button:"
        console.log(color_picker[i].value);
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}
for (let i = 0; i < bright_picker.length; i++) {
    bright_picker[i].addEventListener('change', (event) => {
        change_color(color_picker[i].value, bright_picker[i].value, bright_picker[i].name);
        bright_display[i].innerHTML = bright_picker[i].value;
        data.client.newMessage = `${color_picker[i].value}_${color_picker[i].name}_${bright_picker[i].value}`;
        app.publish(data.client);
        // color_picker[i].value = value
    })
}

var temp_display = document.getElementsByClassName("temp_display");
var temp_picker = document.getElementsByClassName("temp_picker");
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
    color = '#' + red_text + green_text + blue_text;
    return color
}
for (let i = 0; i < temp_picker.length; i++) {
    temp_picker[i].addEventListener('change', (event) => {
        change_color(temp_to_RGB(temp_picker[i].value), bright_picker[i].value, temp_picker[i].name);
        temp_display[i].innerHTML = temp_picker[i].value + '00 K'
        color_picker[i].value = temp_to_RGB(temp_picker[i].value)
        light_mode[i].innerHTML = "Quick button: "
        data.client.newMessage = `${color_picker[i].value}_${color_picker[i].name}_${temp_picker[i].value}_temp`;
        app.publish(data.client)
    })
}

var close_btn = document.getElementsByClassName("close");
for (let i = 0; i < close_btn.length; i++) {
    close_btn[i].addEventListener('click', (event) => {
        change_color('#000000', 0, close_btn[i].name);
        color_picker[i].value = '#000000'
        light_mode[i].innerHTML = "Quick button: Close"
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}

var white_btn = document.getElementsByClassName("white");
for (let i = 0; i < white_btn.length; i++) {
    white_btn[i].addEventListener('click', (event) => {
        change_color('#FFFFFF', 100, white_btn[i].name);
        color_picker[i].value = '#FFFFFF'
        light_mode[i].innerHTML = "Quick button: White";
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}

var party_btn = document.getElementsByClassName("Party");
for (let i = 0; i < party_btn.length; i++) {
    party_btn[i].addEventListener('click', (event) => {
        change_color('Party', 100, party_btn[i].name);
        color_picker[i].value = '#FF00FF';
        light_mode[i].innerHTML = "Quick button: Party";
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}


var read_btn = document.getElementsByClassName("reading");
for (let i = 0; i < read_btn.length; i++) {
    read_btn[i].addEventListener('click', (event) => {
        change_color('#ffb16e', 100, read_btn[i].name);
        color_picker[i].value = '#ffb16e'
        light_mode[i].innerHTML = "Quick button: Reading";
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}

var movie_btn = document.getElementsByClassName("movie");
for (let i = 0; i < movie_btn.length; i++) {
    movie_btn[i].addEventListener('click', (event) => {
        change_color('#a3bfff', 100, movie_btn[i].name);
        color_picker[i].value = '#a3bfff'
        light_mode[i].innerHTML = "Quick button: Movie";
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}


var india_btn = document.getElementsByClassName("India");
for (let i = 0; i < india_btn.length; i++) {
    india_btn[i].addEventListener('click', (event) => {
        change_color("India", 100, india_btn[i].name);
        color_picker[i].value = '#FF9933';
        light_mode[i].innerHTML = "Quick button: India";
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}


var taiwan_btn = document.getElementsByClassName("Taiwan");
for (let i = 0; i < taiwan_btn.length; i++) {
    taiwan_btn[i].addEventListener('click', (event) => {
        change_color("Taiwan", 100, taiwan_btn[i].name);
        color_picker[i].value = '#FF0000';
        light_mode[i].innerHTML = "Quick button: Taiwan";
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}


var flower_btn = document.getElementsByClassName("Flower");
for (let i = 0; i < flower_btn.length; i++) {
    flower_btn[i].addEventListener('click', (event) => {
        change_color('Flower', 100, flower_btn[i].name);
        color_picker[i].value = '#B97CD3';
        light_mode[i].innerHTML = "Quick button: Flower";
        data.client.newMessage = color_picker[i].value + "_" + color_picker[i].name;
        app.publish(data.client);
    })
}