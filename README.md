# Query_fine_dust_data_with-webpage_koss4week

* 3주차 과제 : 미세먼지 데이터 웹 페이지로 조회하기

# 구현 영상
https://user-images.githubusercontent.com/104904309/183556642-15e2c144-60a8-4d2f-bdc6-9d4cab58396c.mp4

# 코드 line by line

* app.js
```javascript
const express = require("express"); // 'express' 모듈 불러오기
const app = express(); // 'express' 호출, application 객체 리턴
const path = require("path"); // 'path' 모듈 불러오기
const bodyParser = require("body-parser"); // 'body-parser' 모듈 불러오기
const mqtt = require("mqtt"); // 'mqtt' 모듈 불러오기
const http = require("http"); // 'http' 모듈 불러오기
const mongoose = require("mongoose"); // 'mongoose' 모듈 불러오기
const Sensors = require("./models/sensors"); //'models'폴더의 'sensors' 파일 불러오기
const devicesRouter = require("./routes/devices"); //'routes'폴더의 'devices' 파일 불러오기
require("dotenv/config"); // url.env 파일 불러오기

app.use(express.static(__dirname + "/public")); // public 폴더를 static 파일 경로로 설정
app.use(bodyParser.json()); // 'application/json' 방식의 Content-type 데이터를 받기, 기본적으로 json을 사용하기를 원한다고 아리기
app.use(bodyParser.urlencoded({ extended: false })); // 객체 안의 객체를 파싱하지 않겠다는 의미, extended : 중접된 객체표현을 허용할지 말지
app.use("/devices", devicesRouter); // devicesRouter 사용

//MQTT접속 하기
const client = mqtt.connect("mqtt://192.168.232.84"); // 라즈베리파이 url 입력 (서버 주소)
client.on("connect", () => { // connect 이벤트 호출
  console.log("mqtt connect");
  client.subscribe("sensors"); // 메소드를 사용해 sensors구독
});

client.on("message", async (topic, message) => {
  var obj = JSON.parse(message); //  JSON 문자열의 구문을 분석
  var date = new Date(); // 현재 시간 가져오기
  var year = date.getFullYear(); // 현재 년도 가져오기
  var month = date.getMonth();  // 현재 월 가져오기
  var today = date.getDate();  // 현재 일 가져오기
  var hours = date.getHours(); // 현재 시간 가져오기
  var minutes = date.getMinutes(); // 현재 분 가져오기
  var seconds = date.getSeconds(); // 현재 초 가져오기
  obj.created_at = new Date(
    Date.UTC(year, month, today, hours, minutes, seconds) //  날짜 및 시간을 받기
  );
  // console.log(obj);

  const sensors = new Sensors({
    tmp: obj.tmp, // 센서에 온도 데이터 저장
    hum: obj.humi, // 센서에 습도 데이터 저장
    pm1: obj.pm1, // 센서에 pm1 데이터 저장
    pm2: obj.pm25, // 센서에 pm25 데이터 저장
    pm10: obj.pm10, // 센서에 pm10 데이터 저장
    created_at: obj.created_at, // 날짜 시간 정보 schema에 추가
  });

  try {
    const saveSensors = await sensors.save();
    console.log("insert OK"); // 센서 저장 성공
  } catch (err) { // 실패에 대한 오류 이벤트 제공
    console.log({ message: err });
  }
});
app.set("port", "3000"); // 포트 설정
var server = http.createServer(app); // 서버 생성
var io = require("socket.io")(server); // socket.io 모듈을 불러와 소켓 서버 생성
io.on("connection", (socket) => {
  // 웹에서 소켓을 이용한 sensors 센서데이터 모니터링
  socket.on("socket_evt_mqtt", function (data) {
    Sensors.find({})
      .sort({ _id: -1 }) // "_id"의 키 값으로 정렬 후 최근값부터 가져옴
      .limit(1) // 하나의 값을 가져옴
      .then((data) => {
        //console.log(JSON.stringify(data[0]));
        socket.emit("socket_evt_mqtt", JSON.stringify(data[0]));
      });
  });
  // 웹에서 소켓을 이용한 LED ON/OFF 제어하기
  socket.on("socket_evt_led", (data) => {
    var obj = JSON.parse(data); //  JSON 문자열의 구문을 분석
    client.publish("led_test", obj.led + ""); // led_test 토픽으로 publish
  });
});

// 웹서버 구동 및 DATABASE 구동
server.listen(3000, (err) => {
  if (err) {
    return console.log(err); // 웹 서버 구동 실패 에러 출력
  } else {
    console.log("server ready"); // 웹 서버 구동 성공 메시지 출력
    // Connection To DB
    mongoose.connect(
      process.env.MONGODB_URL, // url.env파일의 MONGODB_URL 값 가져오기
      { useNewUrlParser: true, useUnifiedTopology: true },
      () => console.log("connected to DB!")
    );
  }
});
```

* devices.js
```javascript
var express = require("express"); // express 모듈 불러오기
var router = express.Router(); // express 라우터 모듈 불러오기
const mqtt = require("mqtt"); // mqtt 모듈 불러오기
const Sensors = require("../models/sensors"); //'models'폴더의 'sensors' 파일 불러오기
// MQTT Server 접속
const client = mqtt.connect("mqtt://192.168.232.84"); // 라즈베리파이 url 입력 (서버 주소)
// 웹에서 rest-full 요청받는 부분(POST)
router.post("/led", function (req, res, next) {
  res.set("Content-Type", "text/json"); // 콘텐츠 유형 설정
  if (req.body.flag == "on") {
    // MQTT->led : 1
    client.publish("led_test", "1"); // led_test 토픽으로 publish, led : on
    res.send(JSON.stringify({ led: "on" })); // 값이나 객체를 JSON 문자열로 변환 후 데이터를 보냄
  } else { 
    client.publish("led_test", "2"); // led_test 토픽으로 publish, led : off
    res.send(JSON.stringify({ led: "off" })); // 값이나 객체를 JSON 문자열로 변환 후 데이터를 보냄
  }
});
module.exports = router; // router 객체를 참조
```

* MQTT.html

```HTML
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Insert title here</title>
    <script type="text/javascript" src="/socket.io/socket.io.js"></script><!--socket.io 모듈 사용-->
    <script src="http://code.jquery.com/jquery-3.3.1.min.js"></script> <!--jquery 사용-->
    <script type="text/javascript"> <!--기본 언어 설정-->
      var socket = null; // socket 선언, 초기화
      $;
      var timer = null; // timer 선언, 초기화
      $(document).ready(function () {  // 문서가 준비되면 객체의 로드가 완료되면 함수 실행
        socket = io.connect(); // 3000port
        // Node.js보낸 데이터를 수신하는 부분
        socket.on("socket_evt_mqtt", function (data) { // socket_evt_mqtt 이벤트 등록
          data = JSON.parse(data); //  JSON 문자열의 구문을 분석, 저장
          console.log(data);
          $(".mqttlist").html( // mqttlist 요소의 내용을 아래의 정보들로 바꾸기
            "<li>" +
              " tmp: " +
              data.tmp +
              "°C" +
              " hum: " +
              data.hum +
              "%" +
              " pm1: " +
              data.pm1 +
              " pm2.5: " +
              data.pm2 +
              " pm10: " +
              data.pm10 +
              "</li>"
          );
        });
        if (timer == null) {
          timer = window.setInterval("timer1()", 1000); // // 1초에 한번씩 요청하기위해 timer1 함수 실행
        }
      });
      function timer1() { // timer1 함수
        socket.emit("socket_evt_mqtt", JSON.stringify({})); // 서버쪽에서 socket_evt_mqtt 이벤트 발생시킴
        console.log("---------");
      }
      function ledOnOff(value) { // ledOnOff 함수
        // {"led":1}, {"led":2}
        socket.emit("socket_evt_led", JSON.stringify({ led: Number(value) }));
      }
      function ajaxledOnOff(value) {
        if (value == "1") var value = "on";
        else if (value == "2") var value = "off";
        $.ajax({
          url: "http://192.168.232.141:3000/devices/led", // local url
          type: "post",
          data: { flag: value },
          success: ledStatus, // ledStatus 함수
          error: function () {
            alert("error"); // "error" 알림창 띄우기
          },
        });
      }
      function ledStatus(obj) {
        $("#led").html("<font color='red'>" + obj.led + "</font> 되었습니다.");
      }
    </script>
  </head>
  <body>
    <h2>socket 이용한 센서 모니터링 서비스</h2>
    <div id="msg">
      <div id="mqtt_logs">
        <ul class="mqttlist"></ul>
      </div>
      <h2>socket 통신 방식(LED제어)</h2>
      <button onclick="ledOnOff(1)">LED_ON</button>
      <button onclick="ledOnOff(2)">LED_OFF</button>
      <h2>RESTfull Service 통신 방식(LED제어)</h2>
      <button onclick="ajaxledOnOff(1)">LED_ON</button>
      <button onclick="ajaxledOnOff(2)">LED_OFF</button>
      <div id="led">LED STATUS</div>
    </div>
  </body>
</html>
```
