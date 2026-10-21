import fs from "fs";
import path from "path";
import { readTelemetry, resolveTelemetryFile, settlePhase, writeTelemetry } from "./telemetry.js";
import { readTurnUsage, resolveStoreCandidates, statesToken } from "./usage.js";

/**
 * Read the run token of the instructions of a run.
 *
 * The run writes the token into the workspace, and it places the same token in
 * the instructions that the model receives. The settle step therefore knows
 * which text proves that the model read the instructions. The function returns
 * an empty string when the workspace holds no token.
 */
function readRunToken(directory: string): string {
  const file = path.join(directory, "prompt-token.txt");
  if (!fs.existsSync(file)) {
    return "";
  }
  return fs.readFileSync(file, "utf-8").trim();
}

/**
 * Settle the token counts of every phase that the host has not settled.
 *
 * A host writes the token counts of a turn when the turn ends, so the counts
 * of a phase appear only after the phase recorded its boundary. The command
 * runs after a benchmark run, and it measures every pending phase from the
 * store of the host that ran it. A phase that holds no model turn is measured
 * again, so a run that settles too early corrects itself.
 *
 * The command also reads the text of the model turns, because a turn that
 * states the run token proves that the model received the project
 * instructions. A run whose model never stated the token is a run that
 * measured a different prompt, and the report says so.
 *
 * Usage: `node settle.js [telemetry-file] [workspace-directory]`
 */
function settle(): void {
  const targetFile = process.argv[2] ?? resolveTelemetryFile();
  const directory = process.argv[3] ?? process.cwd();
  const token = readRunToken(directory);
  const candidates = resolveStoreCandidates();
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
      window: { fromTime: phase.from_time, toTime: phase.to_time },
      candidates
    });
    if (!usage) {
      process.stderr.write(
        `[Telemetry Debug] No host store holds session ${phase.session_id ?? "of the workspace"}.\n`
      );
      return;
    }
    settled = settlePhase(settled, index, usage, statesToken(usage, token));
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

  // Flag phases whose settled tokens exceed the session total. A phase that
  // reports more prompt tokens than the whole session held cannot be a real
  // measurement, and the report must not present it as one.
  const sessionTotal = settled.total_prompt_tokens + settled.total_completion_tokens + settled.total_cache_read_tokens;
  settled.phases.forEach((phase) => {
    if (!phase.settled) return;
    const phaseTotal = (phase.prompt_tokens || 0) + (phase.completion_tokens || 0) + (phase.cache_read_tokens || 0);
    if (sessionTotal > 0 && phaseTotal > sessionTotal) {
      phase.flag = (phase.flag || '') + 'phase_tokens_exceed_session_total;';
    }
  });

  const unsettled = settled.phases.filter((phase) => !phase.settled).length;
  const seen = settled.phases.some((phase) => phase.token_seen);
  if (token) {
    process.stdout.write(
      seen
        ? `Run token ${token} found in the model turns: the model received the instructions.\n`
        : `Run token ${token} found in no model turn: the report cannot confirm the instructions.\n`
    );
  } else {
    process.stdout.write("The workspace holds no run token: the prompt check did not run.\n");
  }
  process.stdout.write(
    `Telemetry settled: ${settled.phases.length} phases, ${settled.model_turns} model turns, ` +
      `${settled.total_tokens} tokens, ${unsettled} phases without counts.\n`
  );
  const flagged = settled.phases.filter((phase) => phase.flag).length;
  if (flagged > 0) {
    process.stderr.write(`[Telemetry] ${flagged} phase(s) flagged: ${settled.phases.filter((p) => p.flag).map((p) => `${p.subproject}/${p.variant}: ${p.flag}`).join('; ')}\n`);
  }
}

settle();
