export class Timer {
  private startTime: number = 0;
  private elapsed: number = 0;
  private running: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTick: (ms: number) => void;

  constructor(onTick: (ms: number) => void) {
    this.onTick = onTick;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now() - this.elapsed;
    this.intervalId = setInterval(() => {
      this.elapsed = performance.now() - this.startTime;
      this.onTick(this.elapsed);
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
    this.onTick(0);
  }

  isRunning(): boolean {
    return this.running;
  }

  getElapsed(): number {
    return this.elapsed;
  }
}
