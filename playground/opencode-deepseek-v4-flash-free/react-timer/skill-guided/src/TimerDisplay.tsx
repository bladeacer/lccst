import { formatTime } from "./formatTime";

interface TimerDisplayProps {
  time: number;
}

export function TimerDisplay({ time }: TimerDisplayProps) {
  return <div className="display">{formatTime(time)}</div>;
}
