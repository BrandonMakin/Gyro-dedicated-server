/*
  Removes ability to drag window with touch gesture:
*/
document.ontouchmove = function(event){
  event.preventDefault();
}

/*
  Stops the screen from ever going to sleep:
*/
var noSleep = new NoSleep();
function enableNoSleep() {
  noSleep.enable();
  document.removeEventListener('click', enableNoSleep, false);
  // window.alert("Let's gooooooooo");
  startButton.remove()
}
