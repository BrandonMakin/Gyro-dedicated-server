webPort = 80;
gdPort = 8001;
let GD_CODE = Object.freeze({"connect":1, "disconnect":2, "button":3, "rotate":4, "send_game_id":7, qr":8, "ping":9})

console.log("Server is starting up...")


const quaternion = require('quaternion');
const os = require('os');
let express = require('express');
let app = express();
let server = app.listen(8000);
app.use(express.static('www'));

let socket = require('socket.io');
let io = socket(server);
io.sockets.on('connection', newConnection);

app.get("/start", function(req, res)
{
  res.send("");
  console.log("A new game is starting")
  sendToGodot("Hello", GD_CODE.send_game_id)
})

function newConnection(socket)
{
  console.log("New connection: " + socket.id);
  sendToGodot(socket.id, GD_CODE.connect);

  socket.on('rotate', on_rotate);
  socket.on('disconnect', on_disconnect);
  socket.on('bshoot', on_button_shoot);
  socket.on('bshock', on_button_shock);
  socket.on('baccel', on_button_accel);

  function on_rotate(data)
  {
    // Orientations: x=beta, y=gamma, z=alpha
    // Ignore alpha, only use gamma to determine correct adjustment for beta
    let angle = data.x;
    let tilt = 0.5;
    // Landscape-left, tilted away from user, counter-clockwise or clockwise
    if(data.y < 0 && data.x < 90 && data.x > -90){
      // Speed
      tilt = (((data.y + 90) / 90) / 2) + 0.5;
    }
    // Landscape-left, tilted toward user, counter-clockwise
    if(data.y > 0 && data.x < -90){
      // Steering
      angle = -180 - data.x;
      // Speed
      tilt = (data.y / 90) / 2;
    }
    // Landscape-left, tilted toward user, clockwise
    if(data.y > 0 && data.x > 90){
      // Steering
      angle = 180 - data.x;
      // Speed
      tilt = (data.y / 90) / 2;
    }
    // Landscape-right, tilted away from user, counter-clockwise or clockwise
    if(data.y > 0 && data.x < 90 && data.x > -90){
      // Steering
      angle = -data.x;
      // Speed
      tilt = (((90 - data.y) / 90) / 2) + 0.5;
    }
    // Landscape-right, tilted toward user, counter-clockwise
    if(data.y < 0 && data.x > 90){
      // Steering
      angle = data.x - 180;
      // Speed
      tilt = (Math.abs(data.y) / 90) / 2;
    }
    // Landscape-right, tilted toward user, clockwise
    if(data.y < 0 && data.x < -90){
      // Steering
      angle = data.x + 180;
      // Speed
      tilt = (Math.abs(data.y) / 90) / 2;
    }
    // Set speed from tilt
    // console.log(Math.round(angle), Math.round(tilt * 100));

    // // Uncomment to get a quaternion:
    // let quat = get_quat(data, socket.id);
    // let msg = JSON.stringify(quat)
    let msg = JSON.stringify({id:socket.id, a:angle, t:tilt});
    sendToGodot(msg, GD_CODE.rotate)
  }

  function on_disconnect(reason)
  {
    console.log("Disconnected: " + socket.id + " (reason: " + reason + ")")
    sendToGodot(socket.id, GD_CODE.disconnect)
  }

  function on_button_shoot(data)
  {
      // console.log("BUTTON - shoot - " + data)
      sendToGodot('{"n":"shoot","s":"' + data + '","i":"' + socket.id + '"}', GD_CODE.button)
  }
  function on_button_shock(data)
  {
      // console.log("BUTTON - shock - " + data)
      sendToGodot('{"n":"shock","s":"' + data + '","i":"' + socket.id + '"}', GD_CODE.button)
  }
  function on_button_accel(data)
  {
      // console.log("BUTTON - accel - " + data)
      sendToGodot('{"n":"accel","s":"' + data + '","i":"' + socket.id + '"}', GD_CODE.button)
  }

}

/////////////////////////////////////////////////////////////////////////
//code to communicate with godot
let client = require('dgram').createSocket('udp4');

///////////////////////
// UNCOMMENT IF YOU WANT THE UDP CLIENT TO BE BOUND TO A SPECIFIC PORT
// client.bind({
//   port: 54345,
//   exclusive: false
// });

function sendToGodot(msg, code) { //code must be a member of GD_CODE; expected to be a digit between 0-9
  msg = "" + code + msg;
  // bufferedMessage = new Buffer('Hello, Go\ndot of mine.');
  bufferedMessage = new Buffer(msg);

  client.send(bufferedMessage, 0, bufferedMessage.length, gdPort, "localhost", function(err, bytes) {
      if (err) throw err;
      // console.log('UDP message sent to localhost:'+ gdPort);
      // client.close();
  });
}

function get_quat(data, id)
{
    let rad = Math.PI / 180;
    let quat = quaternion.fromEuler(data.z * rad, data.x * rad, data.y * rad, 'ZXY');
    quat.id = id;
    return quat
}
/////////////////////
// UNCOMMENT IF YOU WANT GODOT TO BE ABLE TO SEND UDP MESSAGES TO NODE
// client.on('message', (msg, rinfo) => {
//   console.log(`${msg}`);
// });
//
// client.on('listening', () => {
//   pong = true;
//   const address = client.address();
//   console.log(`udp server listening on port: ${address.port}`);
// });
/////////////////////////////////////////////////////////////////////////
