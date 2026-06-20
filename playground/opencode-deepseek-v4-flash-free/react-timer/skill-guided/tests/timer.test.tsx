import React from "react";
import { render, screen } from "@testing-library/react";
import { Timer, TimerDisplay, formatTime } from "../src/timer";

describe("formatTime", () => {
  it("formats zero", () => {
    expect(formatTime(0)).toBe("00:00.0");
  });

  it("formats seconds correctly", () => {
    expect(formatTime(5.3)).toBe("00:05.3");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125.7)).toBe("02:05.7");
  });

  it("handles decimal seconds", () => {
    expect(formatTime(1.05)).toBe("00:01.0");
  });
});

describe("Timer", () => {
  it("starts at zero", () => {
    const timer = new Timer();
    expect(timer.elapsed).toBe(0);
  });

  it("start() makes it running", () => {
    const timer = new Timer();
    timer.start();
    expect(timer.running).toBe(true);
  });

  it("stop() makes it not running", () => {
    const timer = new Timer();
    timer.start();
    timer.stop();
    expect(timer.running).toBe(false);
  });

  it("stop() on stopped timer is safe", () => {
    const timer = new Timer();
    timer.stop();
    expect(timer.running).toBe(false);
  });

  it("reset() stops and zeros", () => {
    const timer = new Timer();
    timer.start();
    timer.reset();
    expect(timer.running).toBe(false);
    expect(timer.elapsed).toBe(0);
  });

  it("fires onUpdate when time changes", (done) => {
    const timer = new Timer();
    timer.onUpdate = (elapsed: number) => {
      expect(elapsed).toBeGreaterThan(0);
      timer.stop();
      done();
    };
    timer.start();
  });

  it("multiple starts are idempotent", () => {
    const timer = new Timer();
    timer.start();
    timer.start();
    timer.start();
    expect(timer.running).toBe(true);
  });
});

describe("TimerDisplay", () => {
  it("renders initial time", () => {
    render(<TimerDisplay time={42.5} />);
    expect(screen.getByText("00:42.5")).toBeTruthy();
  });
});
