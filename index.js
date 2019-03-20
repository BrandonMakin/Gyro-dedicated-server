webPort = 8080
tcpPort = 8000
gdPort = 8001
let GD_CODE = Object.freeze({"connect":1, "disconnect":2, "button":3, "rotate":4, "send_game_id":7, "qr":8, "ping":9})

console.log("Server is starting up...")

const quaternion = require('quaternion')
const os = require('os')
let express = require('express')
let app = express()
let server = app.listen(webPort) // change back to 8000 later
app.use(express.static('www'))

let socket = require('socket.io')
let io = socket(server)
io.sockets.on('connection', newConnection)

var godotIp = "localhost"

app.get("/start", function(req, res)
{
  res.send("")
  console.log("A new game is starting")
  console.log("at ip: " + req.connection.remoteAddress)
  godotIp = req.connection.remoteAddress
  godotIp = godotIp.substr(7)
  sendToGodot("Hello", GD_CODE.send_game_id)
})

function newConnection(socket)
{
  console.log("New connection: " + socket.id)
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
//code to communicate with godot
var net = require('net')

// Stores the Godot Game host IP address, and Player IP addresses
var godotSocket
var clients = {}
let clientCount = 0

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
    console.log("New Connection")
    socket.pipe(socket)
})

// Event listener for close events
tcpServer.on('close', () => {
  console.log('Server disconnected')
})

// Event listner for error events
tcpServer.on('error', error => {
  console.log(`Error : ${error}`)
})

process.on('uncaughtException', function (err) {
  if (err.errno != 'ECONNRESET')
    throw err
  else
    console.log("(Ignoring error) " + err)
})

function sendToGodot(msg, code) { //code must be a member of GD_CODE expected to be a digit between 0-9
  msg = "" + code + msg
  bufferedMessage = Buffer.from(msg)
  console.log("------------------------------------")
  console.log("client.send(" + bufferedMessage + ", 0, " + bufferedMessage.length + ", " + gdPort
  + ", " + godotIp + ", function(err, bytes)")
  client.send(bufferedMessage, 0, bufferedMessage.length, gdPort, godotIp, function(err, bytes) {
      if (err) throw err
      console.log('UDP message sent to ' + gdPort +':'+ godotIp)
      // console.log('UDP message sent to localhost:'+ gdPort)
      // client.close()
  })
}

function get_quat(data, id)
{
    let rad = Math.PI / 180
    let quat = quaternion.fromEuler(data.z * rad, data.x * rad, data.y * rad, 'ZXY')
    quat.id = id
    return quat
}
