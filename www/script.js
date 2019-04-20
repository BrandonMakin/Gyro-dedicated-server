let data = { x: 1000, y: 1000, z: 1000 } // deviceorientation data. Initial value is set to an impossible orientation value
let gameID;
let sendMessages = false;
let threshold = 1;
const socket = io({autoConnect: false});

window.addEventListener("deviceorientation", onMotion, true);

function joinGame() {
  let element = document.getElementById("bstart")
  element.parentNode.removeChild(element);
  gameID = prompt("Enter your room id")

  socket.open();
}

socket.on('connect', () => {
  console.log("Socket connected. Attempting to connect to game with ID " + gameID);
  socket.emit("gameid", gameID);
  sendMessages = true;
});

socket.on('nonexistent_game', () => {
  sendMessages = false;
  gameID = prompt("Unknown room id. Please try again.\nEnter your room id")
  socket.emit("gameid", gameID);
  sendMessages = true;
})

function bStart(bname) {
  socket.emit(bname, "on")
  // console.log("Hello from " + bname);
}
function bEnd(bname) {
  socket.emit(bname, "off")
  // console.log("Goodbye from " + bname);

}

function onMotion(e) {
  if (  Math.abs(data.x - e.beta ) > threshold ||
        Math.abs(data.y - e.gamma) > threshold ||
        Math.abs(data.z - e.alpha) > threshold )
  {
    data = {
      x: e.beta,
      y: e.gamma,
      z: e.alpha
    }
     socket.emit('rotate', data);
     // console.log("rotate: " + data.x + ", " + data.y + ", " + data.z)
  }
}
