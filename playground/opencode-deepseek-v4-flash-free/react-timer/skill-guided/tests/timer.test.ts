import { Timer } from "../src/timer";
import { formatTime } from "../src/formatTime";

jest.useFakeTimers();

describe("Timer", () => {
  let timer: Timer;

  beforeEach(() => {
    timer = new Timer();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    timer.stop();
  });

  it("starts at 0 elapsed", () => {
    expect(timer.getElapsed()).toBe(0);
    expect(timer.isRunning()).toBe(false);
  });

  it("starts running and tracks time", () => {
    timer.start();
    expect(timer.isRunning()).toBe(true);

    jest.setSystemTime(500);
    jest.advanceTimersByTime(500);
    expect(timer.getElapsed()).toBeGreaterThanOrEqual(500);
  });

  it("stops and preserves elapsed", () => {
    timer.start();
    jest.setSystemTime(300);
    jest.advanceTimersByTime(300);
    timer.stop();

    const elapsed = timer.getElapsed();
    expect(elapsed).toBeGreaterThanOrEqual(300);
    expect(timer.isRunning()).toBe(false);
  });

  it("resets elapsed to 0", () => {
    timer.start();
    jest.setSystemTime(200);
    jest.advanceTimersByTime(200);
    timer.reset();

    expect(timer.getElapsed()).toBe(0);
    expect(timer.isRunning()).toBe(false);
  });

  it("notifies listeners on tick", () => {
    const cb = jest.fn();
    timer.onTick(cb);

    timer.start();
    jest.setSystemTime(100);
    jest.advanceTimersByTime(100);

    expect(cb).toHaveBeenCalled();
  });
});

describe("formatTime", () => {
  it('returns "00:00.0" for 0 ms', () => {
    expect(formatTime(0)).toBe("00:00.0");
  });

  it("formats seconds correctly", () => {
    expect(formatTime(5000)).toBe("00:05.0");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125000)).toBe("02:05.0");
  });

  it("handles tenths of a second", () => {
    expect(formatTime(1234)).toBe("00:01.2");
  });

  it("uses Math.round to avoid float drift", () => {
    // This would produce 2 with floor, but 3 with round
    const result = formatTime(5300);
    expect(result).toBe("00:05.3");
  });
});
