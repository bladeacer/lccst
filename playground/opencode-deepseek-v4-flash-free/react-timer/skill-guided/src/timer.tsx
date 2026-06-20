import React from "react";

export function formatTime(seconds: number): string {
  const totalSecs = Math.floor(seconds);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const tenths = Math.floor((seconds - totalSecs) * 10 + 0.0001);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
}

export class Timer {
  private _elapsed: number = 0;
  private _running: boolean = false;
  private _interval: ReturnType<typeof setInterval> | null = null;
  private _onUpdate: ((elapsed: number) => void) | null = null;

  get elapsed(): number {
    return this._elapsed;
  }

  get running(): boolean {
    return this._running;
  }

  set onUpdate(cb: ((elapsed: number) => void) | null) {
    this._onUpdate = cb;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    const startTime = Date.now() - this._elapsed * 1000;
    this._interval = setInterval(() => {
      this._elapsed = (Date.now() - startTime) / 1000;
      this._onUpdate?.(this._elapsed);
    }, 100);
  }

  stop(): void {
    if (!this._running) return;
    this._running = false;
    if (this._interval !== null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  reset(): void {
    this.stop();
    this._elapsed = 0;
    this._onUpdate?.(0);
  }
}

interface TimerDisplayProps {
  time: number;
}

export function TimerDisplay({ time }: TimerDisplayProps): React.ReactElement {
  return <div>{formatTime(time)}</div>;
}
