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
