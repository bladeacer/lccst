export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(4, "0")}`;
}

export interface TimerState {
  seconds: number;
  running: boolean;
}

export class Timer {
  private _seconds = 0;
  private _interval: ReturnType<typeof setInterval> | null = null;
  private _listeners: Array<(state: TimerState) => void> = [];

  get seconds(): number {
    return this._seconds;
  }

  get running(): boolean {
    return this._interval !== null;
  }

  onUpdate(fn: (state: TimerState) => void): void {
    this._listeners.push(fn);
  }

  private _notify(): void {
    const state: TimerState = { seconds: this._seconds, running: this.running };
    this._listeners.forEach(fn => fn(state));
  }

  start(): void {
    if (this._interval) return;
    this._interval = setInterval(() => {
      this._seconds = Math.round((this._seconds + 0.1) * 10) / 10;
      this._notify();
    }, 100);
  }

  stop(): void {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
      this._notify();
    }
  }

  reset(): void {
    this.stop();
    this._seconds = 0;
    this._notify();
  }
}
