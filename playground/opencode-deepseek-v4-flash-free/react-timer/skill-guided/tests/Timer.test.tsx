import { Timer } from "../src/Timer";
import { formatTime } from "../src/formatTime";
import { TimerDisplay } from "../src/TimerDisplay";
import { render } from "@testing-library/react";

describe("formatTime", () => {
  it("formats zero", () => {
    expect(formatTime(0)).toBe("00:00.0");
  });

  it("formats seconds", () => {
    expect(formatTime(5000)).toBe("00:05.0");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(125000)).toBe("02:05.0");
  });

  it("formats tenths", () => {
    expect(formatTime(1234)).toBe("00:01.2");
  });
});

describe("Timer", () => {
  it("starts and stops", () => {
    const onTick = jest.fn();
    const timer = new Timer(onTick);
    expect(timer.isRunning()).toBe(false);
    timer.start();
    expect(timer.isRunning()).toBe(true);
    timer.stop();
    expect(timer.isRunning()).toBe(false);
  });

  it("resets elapsed time", () => {
    const onTick = jest.fn();
    const timer = new Timer(onTick);
    timer.start();
    timer.reset();
    expect(timer.isRunning()).toBe(false);
    expect(timer.getElapsed()).toBe(0);
  });

  it("calls onTick after start", (done) => {
    const onTick = jest.fn(() => {
      timer.stop();
      expect(onTick).toHaveBeenCalled();
      done();
    });
    const timer = new Timer(onTick);
    timer.start();
  });
});

describe("TimerDisplay", () => {
  it("renders formatted time", () => {
    const { container } = render(<TimerDisplay time={5000} />);
    expect(container.querySelector(".display")?.textContent).toBe("00:05.0");
  });

  it("renders zero time", () => {
    const { container } = render(<TimerDisplay time={0} />);
    expect(container.querySelector(".display")?.textContent).toBe("00:00.0");
  });
});
