import React, { useState, useEffect, useRef, useCallback } from "react";

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

interface TimerDisplayProps {
  timer: Timer;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ timer }) => {
  const [state, setState] = useState<TimerState>({ seconds: 0, running: false });
  const timerRef = useRef(timer);

  useEffect(() => {
    const t = timerRef.current;
    const handler = (s: TimerState) => setState(s);
    t.onUpdate(handler);
    handler({ seconds: t.seconds, running: t.running });
  }, []);

  return (
    <div className="timer">
      <h1>Timer</h1>
      <div className="time" data-testid="display">{formatTime(state.seconds)}</div>
      <div className="controls">
        <button onClick={() => timerRef.current.start()} disabled={state.running}>
          Start
        </button>
        <button onClick={() => timerRef.current.stop()} disabled={!state.running}>
          Stop
        </button>
        <button onClick={() => timerRef.current.reset()}>
          Reset
        </button>
      </div>
    </div>
  );
};
