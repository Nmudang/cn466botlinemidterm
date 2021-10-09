const line = require('@line/bot-sdk');
const express = require('express');
const mqtt = require('mqtt');
const schedule = require('node-schedule');
const app = express();
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config()

let payloads = {'text' : 'text'};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
const lineConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};
const lineClient = new line.Client(lineConfig);

var mqttClient = mqtt.connect('mqtt://broker.hivemq.com');
mqttClient.on('connect', () => {
    console.log('connected mqtttttttttttttttttttttttttttttttttttttttttttttt')
    mqttClient.subscribe(['cn466/sensors/cucumber_4/#'], () => {
        console.log("Topic subscribeddddddddddddddddddddddddddddddddddddddddddd")
    });
});

mqttClient.on('message', (topic, payload) => {
    console.log('Received Message:', topic, payload.toString())
    payloads = JSON.parse(payload.toString());
    console.log(payloads);
    //lineClient.pushMessage('U08f0bbbec3cc9ea46afb87366a82763f', { type: 'text', text: 'hello, world' });
});


function sendAuto(temp) {
    lineClient.pushMessage('U6523d96032cb56af08dc8d058bdf7f8f', { type: 'text', text: temp });
}
// var myVar = setInterval(myTimer, 5000);

async function insertUser(user_id,sensor_id) {
    try {
        const client = await pool.connect();
        const result = await client.query(`INSERT INTO users (user_id, sensor_id) VALUES ('${user_id}', '${sensor_id}')`);
        client.release();
        return result
      } catch (err) {
        console.error(err);
        return 'error'
      }
}

async function insertTemp(temp,user_id,humidity,comfirm) {
    try {
        const client = await pool.connect();
        const result = await client.query(`INSERT INTO weathers (temperature, time,user_id,humidity,comfirm) VALUES ('${temp}', '$2 ,'${user_id}' ,'${humidity}' ,'${comfirm}')`);
        client.release();
        return result
      } catch (err) {
        console.error(err);
        return 'error'
      }
}

app.get('/dbuser', async (req, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM users');
      const results = { 'results': (result) ? result.rows : null};
      res.send(results);
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })

  app.get('/dbtemp', async (req, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM weathers');
      const results = { 'results': (result) ? result.rows : null};
      res.send(results);
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })

app.post('/callback', line.middleware(lineConfig), (req, res) => {
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

async function handleEvent(event) {
    //console.log('Got event ' + event);

    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }
    else if (event.type === 'message' && event.message.text === 'สมัครสมาชิก') {
        let echo = { type: 'text', text: event.source.userId };
        console.log("line 1")
        const rest = await insertUser(event.source.userId,`sensor_id ${event.source.userId}`); 
        console.log("line 2")
        const s = await axios.post(`https://api.line.me/v2/bot/user/${event.source.userId}/richmenu/richmenu-36dc575661f79878bd384f2ca84d121b`, {
            'richMenuId': 'richmenu-36dc575661f79878bd384f2ca84d121b'
        }, {
            headers: {
              'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
            }
          })
          console.log("line 3")
        return lineClient.replyMessage(event.replyToken, echo); 
    }
    else if (event.type === 'message' && event.message.text === 'เช็คอุณหภูมิ') {
        try {
            console.log('อะไรกันคับ')
            console.log(payloads)
            const rest = await insertTemp(payloads.temperature,event.source.userId,payloads.humidity,'NO');
            console.log(rest);
        }
        catch {
            console.log("no data")
        }
        let echo = {type: 'text', text: `อุณหภูมิ ${payloads.temperature} องศาเซลเซียส` }; 
        return lineClient.replyMessage(event.replyToken, echo); 
    }
    else{
        const echo = [
            { type: 'text', text: "hello " + event.source.userId },
            { type: 'text', text: event.message.text }
            //{ type: 'text', text: event.message.text }
        ];
        return lineClient.replyMessage(event.replyToken, echo);
    }
    
}

// initServices();
const port = process.env.PORT
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
  