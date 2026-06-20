export class Timer {
  private startTime: number | null = null;
  private elapsed: number = 0;
  private running: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(ms: number) => void> = [];

  getElapsed(): number {
    return this.elapsed;
  }

  isRunning(): boolean {
    return this.running;
  }

  onTick(cb: (ms: number) => void): void {
    this.listeners.push(cb);
  }

  private notify(): void {
    for (const cb of this.listeners) {
      cb(this.elapsed);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = Date.now() - this.elapsed;
    this.intervalId = setInterval(() => {
      this.elapsed = Date.now() - this.startTime!;
      this.notify();
    }, 100);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset(): void {
    this.stop();
    this.elapsed = 0;
    this.notify();
  }
}
