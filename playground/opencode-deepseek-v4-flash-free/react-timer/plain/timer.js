let display = document.getElementById("display");
let startBtn = document.getElementById("startBtn");
let stopBtn = document.getElementById("stopBtn");
let resetBtn = document.getElementById("resetBtn");

let startTime = 0;
let running = false;
let interval = null;

function formatTime(seconds) {
  let mins = Math.floor(seconds / 60);
  let secs = seconds % 60;
  let tenths = Math.floor((seconds - Math.floor(seconds)) * 10);
  return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0") + "." + tenths;
}

function updateDisplay() {
  let elapsed = (Date.now() - startTime) / 1000;
  display.textContent = formatTime(elapsed);
}

startBtn.addEventListener("click", function() {
  if (!running) {
    running = true;
    startTime = Date.now();
    interval = setInterval(updateDisplay, 100);
  }
});

stopBtn.addEventListener("click", function() {
  if (running) {
    running = false;
    clearInterval(interval);
    interval = null;
  }
});

resetBtn.addEventListener("click", function() {
  running = false;
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  display.textContent = "00:00.0";
});
