const line = require('@line/bot-sdk');
const express = require('express');
const mqtt = require('mqtt');
const schedule = require('node-schedule');
require('dotenv').config()

const mqttOptions = {
    clean: true,
    reconnectPeriod: 1000
};

var mqttClient = mqtt.connect('mqtt://broker.hivemq.com');
mqttClient.on('connect', () => {
    console.log('connected mqtttttttttttttttttttttttttttttttttttttttttttttt')
    mqttClient.subscribe(['cn466/sensors/cucumber_4/#'], () => {
        console.log("Topic subscribeddddddddddddddddddddddddddddddddddddddddddd")
    });
});

const lineConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const lineClient = new line.Client(lineConfig);
mqttClient.on('message', (topic, payload) => {
    console.log('Received Message:', topic, payload.toString())
    //lineClient.pushMessage('U08f0bbbec3cc9ea46afb87366a82763f', { type: 'text', text: 'hello, world' });
});
const app = express();

function myTimer() {
    lineClient.pushMessage('U6523d96032cb56af08dc8d058bdf7f8f', { type: 'text', text: 'hello, world' });
}
// var myVar = setInterval(myTimer, 5000);

app.post('/callback', line.middleware(lineConfig), (req, res) => {
    console.log("helooooooooooooooooooooooo");
    if (req.body.destination) {
        console.log("Destination User ID: " + req.body.destination);
    }
    
    // req.body.events should be an array of events
    if (!Array.isArray(req.body.events)) {
        return res.status(500).end();
    }

    // handle events separately 
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.log("error jaaaaaaaa");
            console.error(err);
            res.status(500).end();
        });
});

function handleEvent(event) {
    console.log('Got event ' + event);
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }
  
    // create a echoing text message
    const echo = [
        { type: 'text', text: "hello " + event.source.userId },
        { type: 'text', text: event.message.text }
    ];
  
    // use reply API
    return lineClient.replyMessage(event.replyToken, echo);
}


async function initServices() { 
    const baseURL = process.env.BASE_URL;
    console.log('Set LINE webhook at ' + baseURL + '/callback');
    await lineClient.setWebhookEndpointUrl(baseURL + '/callback');
}

// initServices();
const port = process.env.PORT
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
  