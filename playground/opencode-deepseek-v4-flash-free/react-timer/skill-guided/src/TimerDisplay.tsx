import React from "react";
import { formatTime } from "./formatTime";

interface TimerDisplayProps {
  time: number;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ time }) => {
  return React.createElement("div", { "data-testid": "display" }, formatTime(time));
};
