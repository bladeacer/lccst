import { readTelemetry, resolveTelemetryFile, settlePhase, writeTelemetry } from "./telemetry.js";
import { readTurnUsage } from "./usage.js";

/**
 * Settle the token counts of every phase that the host has not settled.
 *
 * A host writes the token counts of a turn when the turn ends, so the counts
 * of a phase appear only after the phase recorded its boundary. The command
 * runs after a benchmark run, and it measures every pending phase from the
 * store of the host that ran it. A phase that holds no model turn is measured
 * again, so a run that settles too early corrects itself.
 *
 * Usage: `node settle.js [telemetry-file] [workspace-directory]`
 */
function settle(): void {
  const targetFile = process.argv[2] ?? resolveTelemetryFile();
  const directory = process.argv[3] ?? process.cwd();
  const data = readTelemetry(targetFile);
  let settled = data;
  let pending = 0;

  data.phases.forEach((phase, index) => {
    if (phase.settled && phase.model_turns > 0) {
      return;
    }
    pending++;
    const usage = readTurnUsage({
      directory,
      sessionId: phase.session_id ?? undefined,
      window: { fromTime: phase.from_time, toTime: phase.to_time }
    });
    if (!usage) {
      process.stderr.write(
        `[Telemetry Debug] No host store holds session ${phase.session_id ?? "of the workspace"}.\n`
      );
      return;
    }
    settled = settlePhase(settled, index, usage);
    const step = settled.phases[index];
    if (step.model_turns === 0) {
      process.stderr.write(
        `[Telemetry] Phase ${step.subproject} (${step.variant}) holds no model turn. ` +
          "The host store has no turn in the span of the phase.\n"
      );
    }
    process.stderr.write(
      `[Telemetry] Settled ${step.subproject} (${step.variant}): ` +
        `prompt ${step.prompt_tokens}, completion ${step.completion_tokens}, ` +
        `cache read ${step.cache_read_tokens}, model turns ${step.model_turns}.\n`
    );
  });

  if (pending > 0) {
    writeTelemetry(targetFile, settled);
  }

  const unsettled = settled.phases.filter((phase) => !phase.settled).length;
  process.stdout.write(
    `Telemetry settled: ${settled.phases.length} phases, ${settled.model_turns} model turns, ` +
      `${settled.total_tokens} tokens, ${unsettled} phases without counts.\n`
  );
}

settle();
