let data = { x: 1000, y: 1000, z: 1000 } // deviceorientation data. Initial value is set to an impossible orientation value
let gameID;
let sendMessages = false;
const socket = io({autoConnect: false});
var color_scheme = -1

var color_schemes = [
	["#f59aa9", "#c74257", "#870b1f"],
	["#6d5ad5", "#2e16b1", "#190a6b"],
	["#ffff63", "#ffff00", "#c5c500"],
	["#4abd9d", "#00a779", "#006549"],
	["#e0a8ff", "#cf78ff", "#a90dff"],
	["#c0ffff", "#00ffff", "#008282"],
	["#ffffff", "#e7e7e7", "#aeaeae"],
	["#444444", "#222222", "#000000"],
	["#ff5c00", "#c54700", "#9b3800"],
	["#9feb5b", "#6be400", "#418a00"]
]

window.addEventListener("deviceorientation", onMotion, true);

function joinGame() {
  let element = document.getElementById("bstart")
  element.parentNode.removeChild(element);
  gameID = prompt("Enter your room id")

  socket.open();
}

socket.on('connect', () => {
  console.log("Socket connected. Attempting to connect to game with ID " + gameID);
  socket.emit("gameid", gameID, sendMessages, color_scheme);  //send boolean sendMessages as a way to tell whether we had previously connected with this server
  sendMessages = true;
});

socket.on('nonexistent_game', () => {
  sendMessages = false;
  gameID = prompt("Unknown room id. Please try again.\nEnter your room id")
  socket.emit("gameid", gameID, false);
  sendMessages = true;
})

socket.on('color_scheme', set_color_scheme)
function set_color_scheme(scheme_id) {
  color_scheme = scheme_id
  document.getElementById("b1").style.background = color_schemes[scheme_id][0]
  document.getElementById("b2").style.background = color_schemes[scheme_id][1]
  document.getElementById("b3").style.background = color_schemes[scheme_id][2]
}

function bStart(bname) {
  socket.emit(bname, "on")
  // console.log("Hello from " + bname);
}
function bEnd(bname) {
  socket.emit(bname, "off")
  // console.log("Goodbye from " + bname);

}

function onMotion(e) {
  var newData = {
    x: e.beta,
    y: e.gamma,
    z: e.alpha
  }
  var threshold = 1
  if (  Math.abs(data.z - newData.z) > threshold ||
         Math.abs(data.y - newData.y) > threshold ||
         Math.abs(data.x - newData.x) > threshold )
  {
     // print("sending data")
     data = newData;
     socket.emit('rotate', data);
  }
     // console.log("rotate: " + data.x + ", " + data.y + ", " + data.z)
}
