const https = require("https")
const fs = require("fs");
const options = {
  key: fs.readFileSync("keys/privkey.pem"),
  cert: fs.readFileSync("keys/fullchain.pem")
};

// Port for Players to Connect to:
webPort = 8080
httpsPort = 443
// Port for Godot Game Hosts to connect to:
tcpPort = 8000

// Map of all active games (Stores the Godot Game host IP addresses)
const games = new Map()
var godotSocket

let GD_CODE = Object.freeze({"connect":1, "disconnect":2, "button":3, "rotate":4, "send_game_id":7, "qr":8, "ping":9})

console.log("Server is starting up...")

const quaternion = require('quaternion')
const os = require('os')

// Hosts web-page (Player controller) and creates server that listens for Players
let express = require('express')
let app = express()
let server = app.listen(webPort)
app.use(express.static('www'))
https.createServer(options, app).listen(httpsPort);


// High level framework for making asynchronus calls from Players interacting
// with the web-page (controller)
let socket = require('socket.io')
let io = socket(server)
io.sockets.on('connection', on_connect)

// This is essentially replaced with having one port be for 'starting the game' (8000)
// And the other port open for 'player connections' (8080)

// replaces functionality of ('ec2amazonsheeit:8000 and ec2amazonsheeit:8000/start)
app.get("/start", function(req, res)
{
  res.send("")
  console.log("A new game is starting")
  console.log("at ip: " + req.connection.remoteAddress)
  godotIp = req.connection.remoteAddress
  godotIp = godotIp.substr(7)
  sendToGodot("Hello", GD_CODE.send_game_id)
})


// Communicates with 'www.js' buttons. Gets data from device and eventually
// sends to a Godot Host TCP socket
function on_connect(socket)
{
  let game_id;
  console.log("New Player connected on PORT 8080: " + socket.id)
  console.log(socket)
  // sendToGodot(socket.id, GD_CODE.connect)

  socket.on('gameid', join_game_by_id)
  socket.on('rotate', on_rotate)
  socket.on('disconnect', on_disconnect)
  socket.on('b1', on_button_1)
  socket.on('b2', on_button_2)
  socket.on('b3', on_button_3)

  // each game is given its own Socket.IO room
  function join_game_by_id(gid)
  {
    // console.log("A user is attempting to connect to a game with id " + game_id)
    if (games.has(gid)) {
      game_id = gid
      socket.join(game_id);
      sendToGodot(game_id, socket.id, GD_CODE.connect)
    } else {
      // console.log("A user attempted to connect to a nonexistent game id (" + game_id + ")")
      io.to(socket.id).emit("nonexistent_game")
    }
  }

  function on_rotate(data)
  {
    // Orientations: x=beta, y=gamma, z=alpha
    // Ignore alpha, only use gamma to determine correct adjustment for beta
    let angle = data.x
    let tilt = 0.5
    // Landscape-left, tilted away from user, counter-clockwise or clockwise
    if(data.y < 0 && data.x < 90 && data.x > -90){
      // Speed
      tilt = (((data.y + 90) / 90) / 2) + 0.5
    }
    // Landscape-left, tilted toward user, counter-clockwise
    if(data.y > 0 && data.x < -90){
      // Steering
      angle = -180 - data.x
      // Speed
      tilt = (data.y / 90) / 2
    }
    // Landscape-left, tilted toward user, clockwise
    if(data.y > 0 && data.x > 90){
      // Steering
      angle = 180 - data.x
      // Speed
      tilt = (data.y / 90) / 2
    }
    // Landscape-right, tilted away from user, counter-clockwise or clockwise
    if(data.y > 0 && data.x < 90 && data.x > -90){
      // Steering
      angle = -data.x
      // Speed
      tilt = (((90 - data.y) / 90) / 2) + 0.5
    }
    // Landscape-right, tilted toward user, counter-clockwise
    if(data.y < 0 && data.x > 90){
      // Steering
      angle = data.x - 180
      // Speed
      tilt = (Math.abs(data.y) / 90) / 2
    }
    // Landscape-right, tilted toward user, clockwise
    if(data.y < 0 && data.x < -90){
      // Steering
      angle = data.x + 180
      // Speed
      tilt = (Math.abs(data.y) / 90) / 2
    }
    // Set speed from tilt
    // // Uncomment to get a quaternion:
    // let quat = get_quat(data, socket.id)
    // let msg = JSON.stringify(quat)
    let msg = JSON.stringify({id:socket.id, a:angle, t:tilt})
    sendToGodot(game_id, msg, GD_CODE.rotate)
    // console.log(msg)
  }

  function on_disconnect(reason)
  {
    console.log("Player disconnected: " + socket.id + " (reason: " + reason + ")")
    sendToGodot(game_id, socket.id, GD_CODE.disconnect)
  }

  function on_button_1(data)
  {
      // console.log("BUTTON - shoot - " + data)
      sendToGodot(game_id, '{"n":"shoot","s":"' + data + '","i":"' + socket.id + '"}', GD_CODE.button)
  }
  function on_button_2(data)
  {
      // console.log("BUTTON - shock - " + data)
      sendToGodot(game_id, '{"n":"shock","s":"' + data + '","i":"' + socket.id + '"}', GD_CODE.button)
  }
  function on_button_3(data)
  {
      // console.log("BUTTON - accel - " + data)
      sendToGodot(game_id, '{"n":"accel","s":"' + data + '","i":"' + socket.id + '"}', GD_CODE.button)
  }
}

/////////////////////////////////////////////////////////////////////////
// TCP code that manages connection between AWS and Godot Host
// Data from Express sockets calling (sendToGodot) is sent through the TCP socket
// <godotSocket>

// Eventually for multiple games, I think you will want an array that stores
// all sockets returned from 'connection's made to PORT 8000
var net = require('net')

// Stores the 'net.Server' object returned by 'net.createServer()'
var tcpServer = net.createServer().listen(8000)

// Event listener for connection events
tcpServer.on('connection', socket => {
    // identify host (for now first user to visit site or site/start --> only site/start)
    socket.name = socket.remoteAddress + ":" + socket.remotePort
    // generate id to identify the game host in the future
    var new_id = id(5)
    // avoid dublicate ids
    if (games.has(new_id))
      return
    // save host connection (will send all controller data to this socket)
    games.set(new_id, socket)

    // send game id to host
    initializeGodot(new_id)
    // // send welcome message to host
    // socket.write("Welcome " + socket.name + "\n")
    // socket.write("You are the Godot Game host")
    // socket.write("You are being connected to from a REMOTE server")
    console.log("New TCP connection on PORT 8000: Godot Game")
    socket.pipe(socket)
})

// Event listener for close events
tcpServer.on('close', () => {
  console.log('Server disconnected')
})

// Event listner for error events
tcpServer.on('error', error => {
  console.log(`Error : {error}`)
})

// SENDS data to Godot via TCP Socket generated with NET (upon running game in Godot)
function sendToGodot(game_id, msg, code) { //code must be a member of GD_CODE expected to be a digit between 0-9
  msg = "" + code + msg
  bufferedMessage = Buffer.from(msg)
  // godotSocket.write(msg)
  if (games.has(game_id))
    games.get(game_id).write(msg)
  else
    console.log("Server attempted to send message to unknown game (" + game_id + ")")
}

// Tell a Godot host about its game id
function initializeGodot(game_id) {
  sendToGodot(game_id, game_id, GD_CODE.send_game_id)
}

function get_quat(data, id)
{
    let rad = Math.PI / 180
    let quat = quaternion.fromEuler(data.z * rad, data.x * rad, data.y * rad, 'ZXY')
    quat.id = id
    return quat
}

process.on('uncaughtException', function (err) {
  // if (err.errno != 'ECONNRESET')
  //   throw err
  // else
    console.log("(Ignoring error) " + err)
})

function id(length) {
  var text = "";
  var possible = "abcdefghjkmnpqrstuvwxyz123456789";  // id can consist of lower case letters and numbers, excluding: i,l,o,0 (to avoid ambiguity)

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
