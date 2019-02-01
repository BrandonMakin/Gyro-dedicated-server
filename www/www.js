var socket, data, button_shoot, button_shock, button_accel;
function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  background(color(0, 90, 90));
  socket = io.connect();
  window.addEventListener("deviceorientation", handleMotionEvent, true);

  noStroke();

  data = { x: 1000, y: 1000, z: 1000 }

  button_shoot = createButton('SHOOT');
  button_shock = createButton('SHOCK');
  button_accel = createButton('ACCELERATE');

  button_shoot.position(0, 0);
  button_shock.position(width/5, 0);
  button_accel.position(4*width/5, 0);

  button_shoot.size(width/5, height)
  button_shock.size(3*width/5, height)
  button_accel.size(width/5, height)

  button_shoot.mousePressed(on_button_shoot);
  button_shock.mousePressed(on_button_shock);
  button_accel.mousePressed(on_button_accel);

  button_shoot.mouseReleased(on_button_shoot_release);
  button_shock.mouseReleased(on_button_shock_release);
  button_accel.mouseReleased(on_button_accel_release);

  button_shoot.style('background-color', "224422")
  button_shock.style('background-color', "40c080")
  button_accel.style('background-color', "224422")

  button_shoot.style('color', "ffffff")
  button_accel.style('color', "ffffff")

  //button_shoot
  //button_shock
  //button_accel

  //document.addEventListener('click', enableNoSleep, false);
}

function on_button_shoot()
{
  emit("bshoot", "on")
}

function on_button_shock()
{
  emit("bshock", "on")
}

function on_button_accel()
{
  emit("baccel", "on")
}

function on_button_shoot_release()
{
  emit("bshoot", "off")
}

function on_button_shock_release()
{
  emit("bshock", "off")
}

function on_button_accel_release()
{
  emit("baccel", "off")
}

//function newMovement(data)
//{
//  fill(255,0,100);
//  ellipse(abs(data.z)*3, abs(data.y)*3, 20, 20);
//}


//function draw()
//{
//  var newData = {
//    z: rotationZ,
//    y: rotationY,
//    x: rotationX
//  }
//  var threshold = 1
//  if (  abs(data.z - newData.z) > threshold ||
//        abs(data.y - newData.y) > threshold ||
//        abs(data.x - newData.x) > threshold )
//  {
//    print("sending data")
//    data = newData;
//    socket.emit('rotate', data);
//  }
//}

function handleMotionEvent(e)
{

  // print(e.absolute)
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
     emit('rotate', data);
  }
}

function emit(name, data)
{
  socket.emit(name, data);
}
