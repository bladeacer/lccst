import React from "react";
import { render, screen } from "@testing-library/react";
import { formatTime, Timer, TimerDisplay } from "../src/timer";

jest.useFakeTimers();

describe("formatTime", () => {
  it("formats zero", () => {
    expect(formatTime(0)).toBe("00:00.0");
  });

  it("formats seconds correctly", () => {
    expect(formatTime(5)).toBe("00:05.0");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(65)).toBe("01:05.0");
  });

  it("handles decimal seconds", () => {
    expect(formatTime(1.5)).toBe("00:01.5");
  });
});

describe("Timer", () => {
  let timer: Timer;

  beforeEach(() => {
    timer = new Timer();
  });

  it("starts at zero", () => {
    expect(timer.seconds).toBe(0);
    expect(timer.running).toBe(false);
  });

  it("start() makes it running", () => {
    timer.start();
    expect(timer.running).toBe(true);
  });

  it("stop() makes it not running", () => {
    timer.start();
    timer.stop();
    expect(timer.running).toBe(false);
  });

  it("stop() on stopped timer is safe", () => {
    timer.stop();
    expect(timer.running).toBe(false);
  });

  it("reset() stops and zeros", () => {
    timer.start();
    jest.advanceTimersByTime(500);
    timer.reset();
    expect(timer.seconds).toBe(0);
    expect(timer.running).toBe(false);
  });

  it("fires onUpdate when time changes", () => {
    const fn = jest.fn();
    timer.onUpdate(fn);
    timer.start();
    jest.advanceTimersByTime(350);
    timer.stop();
    expect(fn).toHaveBeenCalled();
    const lastCall = fn.mock.calls[fn.mock.calls.length - 1][0];
    expect(lastCall.seconds).toBeGreaterThan(0.2);
  });

  it("multiple starts are idempotent", () => {
    timer.start();
    timer.start();
    timer.start();
    jest.advanceTimersByTime(300);
    timer.stop();
    expect(timer.seconds).toBe(0.3);
  });
});

describe("TimerDisplay", () => {
  it("renders initial time", () => {
    const timer = new Timer();
    render(<TimerDisplay timer={timer} />);
    expect(screen.getByTestId("display").textContent).toBe("00:00.0");
  });
});
