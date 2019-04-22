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
  var newData = {
    x: e.beta,
    y: e.gamma,
    z: e.alpha
  }
  var threshold = 1
  if (  abs(data.z - newData.z) > threshold ||
         abs(data.y - newData.y) > threshold ||
         abs(data.x - newData.x) > threshold )
  {
     // print("sending data")
     data = newData;
     socket.emit('rotate', data);
     print(data);
  }
     // console.log("rotate: " + data.x + ", " + data.y + ", " + data.z)
  }
}
