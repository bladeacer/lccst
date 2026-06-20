import React from "react";
import { render, screen } from "@testing-library/react";
import { TimerDisplay } from "../src/TimerDisplay";

describe("TimerDisplay", () => {
  it("renders formatted time from props", () => {
    render(React.createElement(TimerDisplay, { time: 5000 }));
    expect(screen.getByTestId("display").textContent).toBe("00:05.0");
  });

  it("renders 0 at start", () => {
    render(React.createElement(TimerDisplay, { time: 0 }));
    expect(screen.getByTestId("display").textContent).toBe("00:00.0");
  });

  it("displays correct format for 125000ms", () => {
    render(React.createElement(TimerDisplay, { time: 125000 }));
    expect(screen.getByTestId("display").textContent).toBe("02:05.0");
  });
});
