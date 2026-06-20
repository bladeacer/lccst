function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(4, "0")}`;
}

function createTimer() {
  let seconds = 0;
  let interval = null;
  const listeners = [];

  function notify() {
    const val = formatTime(seconds);
    listeners.forEach(fn => fn(val));
  }

  return {
    start() {
      if (interval) return;
      interval = setInterval(() => { seconds += 0.1; notify(); }, 100);
    },
    stop() {
      clearInterval(interval);
      interval = null;
    },
    reset() {
      this.stop();
      seconds = 0;
      notify();
    },
    getSeconds() { return seconds; },
    onUpdate(fn) { listeners.push(fn); },
  };
}

if (typeof module !== "undefined") module.exports = { formatTime, createTimer };
