import { getDatabase, ref, set, child, get } from "firebase/database";
import line from '@line/bot-sdk';
import express from 'express';
import mqtt from 'mqtt';
import schedule from 'node-schedule';
const app = express();
import axios from 'axios';
import dotenv from 'dotenv';
// const { Pool } = require('pg');
// const axios = require('axios');
// require('dotenv').config()
dotenv.config()

let payloads = {'text' : 'text'};

/*const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});*/
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVtt1a92dKl1qHDyBBzfqLNgXeu4lY4CY",
  authDomain: "iot-bot-9440d.firebaseapp.com",
  databaseURL: "https://iot-bot-9440d-default-rtdb.firebaseio.com",
  projectId: "iot-bot-9440d",
  storageBucket: "iot-bot-9440d.appspot.com",
  messagingSenderId: "189551277276",
  appId: "1:189551277276:web:cd2c2b2046dc5c661eb019"
};

// Initialize Firebase
const firebase_app = initializeApp(firebaseConfig);

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
    // const rd = ((Math.random() * 50) + payloads.temperature).toFixed(2);
    if (payloads.temperature > 120) {
      sendAuto(rd)
    }
    //lineClient.pushMessage('U08f0bbbec3cc9ea46afb87366a82763f', { type: 'text', text: 'hello, world' });
});


async function sendAuto(temp) {
  new Date().toLocaleString( { timeZone: 'Asia/Bangkok' }).slice(0, 19).replace('T', ' ');
  
    let echo = {type: 'text', text: `อุณหภูมิ ${temp} องศาเซลเซียส *สูงเกินไป* ณ เวลา ${await new Date().toLocaleString( 'th-TH', { timeZone: 'Asia/Bangkok' }).slice(0, 19).replace('T', ' ')}` };
    const dbRef = ref(getDatabase());
    let results;
    await get(child(dbRef, `users/`)).then((snapshot) => {
      if (snapshot.exists()) {
        console.log(snapshot.val());
        results = snapshot.val();
      } else {
        console.log("No data available");
      }
    }).catch((error) => {
      console.error(error);
    });
    /*
    let results;
    try {
        const client = await pool.connect();
        const result = await client.query(`SELECT DISTINCT user_id FROM users`);
        results = { 'results': (result) ? result.rows : null};
        client.release();
    } catch (err) {
      console.error(err);
    }
    */
    let id = [];
    for (let i in results) {
      //console.log(results.results[i].user_id)
      //id.push(results.results[i].user_id);
      console.log(results[i].userId);
      id.push(results[i].userId);
      
    }
    
    const s = await axios.post(`https://api.line.me/v2/bot/message/multicast`, {
        'to': id,
        'messages':[echo]
        }, {
            headers: {
              'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          })

    // lineClient.pushMessage('U08f0bbbec3cc9ea46afb87366a82763f', echo);
}
// var myVar = setInterval(myTimer, 5000);

async function insertUser(user_id,sensor_id) {
    try {
        // const client = await pool.connect();
        // const result = await client.query(`INSERT INTO users (user_id, sensor_id) VALUES ('${user_id}', '${sensor_id}')`);
        // client.release();
        return result
      } catch (err) {
        console.error(err);
        return 'error'
      }
}

async function insertTemp(temp,user_id,humidity,comfirm) {
    try {
        const client = await pool.connect();
        const result = await client.query(`INSERT INTO weathers (temperature, time,user_id,humidity,comfirm) VALUES ('${temp}', '${new Date().toISOString().slice(0, 19).replace('T', ' ')}' ,'${user_id}' ,'${humidity}' ,'${comfirm}')`);
        client.release();
        return result
      } catch (err) {
        console.error(err);
        return 'error'
      }
}

function writeUserData(userId, sensor) {
  const db = getDatabase(firebase_app);
  set(ref(db, 'users/' + userId), {
    userId: userId,
    sensorId: sensor
  });
}

function writeTempData(userId, temperature, humidity, confirm) {
  const db = getDatabase(firebase_app);

  let d = new Date();
  let n = d.toString().slice(0, 25);
  try {
    n = n.replaceAll(' ','')
    n = n.replaceAll(':','') 
  } catch {
    n = n.replace(/ /g, '');
    n = n.replace(/:/g, '');
  }
  let shuffled = n.split('').sort(function(){return 0.5-Math.random()}).join('');

  set(ref(db, `temperatures/${userId}${shuffled}`), {
    temperature: temperature,
    humidity: humidity,
    time: d.toISOString().slice(0, 19).replace('T', ' '),
    confirm: confirm
  });
}
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
        // const rest = await insertUser(event.source.userId,`sensor_id ${event.source.userId}`);
        const rest = await writeUserData(event.source.userId,`sensor_id ${event.source.userId}`);
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
            // const rest = await insertTemp(payloads.temperature,event.source.userId,payloads.humidity,'NO');
            const rest = await writeTempData(event.source.userId, payloads.temperature,payloads.humidity,'NO');
        }
        catch (err){
            console.log(err)
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
//CHANNEL_SECRET=dbae6c96d49afa4de8907a03969d32bd
//CHANNEL_ACCESS_TOKEN=cITxs50Ywqi90dAXuSreyXRbo39UiK5xMlEaXjPpmIl9lVWmGfC+OrK5aNq0yOKQuM+Wepewm2Zy4ZOpno+h52dnXIt7WgOO2+baJi15dikC1RgjuuSb65no/xtf5wxaHHmu9X7RirnIUObShJ7VJwdB04t89/1O/w1cDnyilFU=