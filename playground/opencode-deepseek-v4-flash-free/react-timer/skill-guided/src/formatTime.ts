export function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const tenths = Math.round((ms % 1000) / 100);
  return (
    String(mins).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0") +
    "." +
    tenths
  );
}
