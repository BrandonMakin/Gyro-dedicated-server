// Port for Players to Connect to:
webPort = 8080
// Port for Godot Game Hosts to connect to:
tcpPort = 8000

let GD_CODE = Object.freeze({"connect":1, "disconnect":2, "button":3, "rotate":4, "send_game_id":7, "qr":8, "ping":9})

console.log("Server is starting up...")

const quaternion = require('quaternion')
const os = require('os')

// Hosts web-page (Player controller) and creates server that listens for Players
let express = require('express')
let app = express()
let server = app.listen(webPort)
app.use(express.static('www'))

// High level framework for making asynchronus calls from Players interacting
// with the web-page (controller)
let socket = require('socket.io')
let io = socket(server)
io.sockets.on('connection', newConnection)

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
function newConnection(socket)
{
  console.log("New Player connected on PORT 8080: " + socket.id)
  sendToGodot(socket.id, GD_CODE.connect)

  socket.on('rotate', on_rotate)
  socket.on('disconnect', on_disconnect)
  socket.on('bshoot', on_button_shoot)
  socket.on('bshock', on_button_shock)
  socket.on('baccel', on_button_accel)

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
// TCP code that manages connection between AWS and Godot Host
// Data from Express sockets calling (sendToGodot) is sent through the TCP socket
// <godotSocket>

// Eventually for multiple games, I think you will want an array that stores
// all sockets returned from 'connection's made to PORT 8000
var net = require('net')

// Stores the Godot Game host IP addresses
var godotSocket
// var hosts = {}
// let hostCount = 0

// Stores the 'net.Server' object returned by 'net.createServer()'
var tcpServer = net.createServer().listen(8000)

// Event listener for connection events
tcpServer.on('connection', socket => {
    // identify host (for now first user to visit site or site/start --> only site/start)
    socket.name = socket.remoteAddress + ":" + socket.remotePort
    // save host connection (will send all controller data to this socket)
    godotSocket = socket
    // send welcome message to host
    socket.write("Welcome " + socket.name + "\n")
    socket.write("You are the Godot Game host")
    socket.write("You are being connected to from a REMOTE server")
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
function sendToGodot(msg, code) { //code must be a member of GD_CODE expected to be a digit between 0-9
  msg = "" + code + msg
  bufferedMessage = Buffer.from(msg)
  godotSocket.write(msg)
}

function get_quat(data, id)
{
    let rad = Math.PI / 180
    let quat = quaternion.fromEuler(data.z * rad, data.x * rad, data.y * rad, 'ZXY')
    quat.id = id
    return quat
}

process.on('uncaughtException', function (err) {
  if (err.errno != 'ECONNRESET')
    throw err
  else
    console.log("(Ignoring error) " + err)
})
