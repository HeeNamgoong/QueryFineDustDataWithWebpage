var express = require("express");
var router = express.Router();
const mqtt = require("mqtt");
const Sensors = require("../models/sensors");
// MQTT Server 접속
const client = mqtt.connect("mqtt://192.168.232.84"); // 라즈베리파이 url
//웹에서 rest-full 요청받는 부분(POST)
router.post("/led", function (req, res, next) {
  res.set("Content-Type", "text/json");
  if (req.body.flag == "on") {
    // MQTT->led : 1
    client.publish("led_test", "1");
    res.send(JSON.stringify({ led: "on" }));
  } else {
    client.publish("led_test", "2");
    res.send(JSON.stringify({ led: "off" }));
  }
});
module.exports = router;