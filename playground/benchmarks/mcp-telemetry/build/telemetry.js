import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Telemetry file that the server uses when the workspace holds none. */
export const PRIMARY_TELEMETRY = path.resolve(__dirname, "../../runtime-telemetry.json");
/** Variable that names the telemetry file of the running workspace. */
export const TELEMETRY_VARIABLE = "LCCST_TELEMETRY_FILE";
/** Build an empty telemetry record. */
export function emptyTelemetry() {
    return {
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_cache_read_tokens: 0,
        total_tokens: 0,
        model_turns: 0,
        active_mcps: ["lccst-telemetry"],
        phases: [],
        breakdown: {}
    };
}
/** Locate the telemetry file of the running workspace. */
export function resolveTelemetryFile() {
    const configured = process.env[TELEMETRY_VARIABLE];
    if (configured) {
        return configured;
    }
    const workspaceTelemetry = path.resolve(process.cwd(), "runtime-telemetry.json");
    return fs.existsSync(workspaceTelemetry) ? workspaceTelemetry : PRIMARY_TELEMETRY;
}
/** Read a telemetry file. A missing or damaged file starts a new record. */
export function readTelemetry(targetFile) {
    const data = emptyTelemetry();
    if (!fs.existsSync(targetFile)) {
        return data;
    }
    try {
        const content = fs.readFileSync(targetFile, "utf-8");
        if (content.trim()) {
            const parsed = JSON.parse(content);
            if (typeof parsed === "object" && parsed !== null) {
                return { ...data, ...parsed };
            }
        }
    }
    catch {
        process.stderr.write(`[Telemetry Debug] Overwriting bad schema index profiles.\n`);
    }
    return data;
}
/** Write a telemetry file. */
export function writeTelemetry(targetFile, data) {
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2));
}
/**
 * Append the boundary of one phase.
 *
 * The boundary carries no token counts. A host writes the counts of a turn
 * when the turn ends, so the counts of the last turn of a phase appear after
 * the tool call returns. The function therefore stores the time span, and
 * `settlePhases` measures the span later.
 */
export function addPhase(data, boundary) {
    const phase = {
        subproject: boundary.subproject,
        variant: boundary.variant,
        from_time: boundary.fromTime,
        to_time: boundary.toTime,
        session_id: boundary.sessionId,
        settled: false,
        model_turns: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        cache_read_tokens: 0
    };
    return { ...data, phases: [...data.phases, phase] };
}
/** Read the start of the next phase, which is the end of the last one. */
export function nextPhaseStart(data) {
    return data.phases.length === 0 ? 0 : data.phases[data.phases.length - 1].to_time;
}
/** List the phases that the host has not settled yet. */
export function pendingPhases(data) {
    return data.phases.filter((phase) => !phase.settled);
}
/**
 * Add the measured counts of one phase to the record.
 *
 * The function ignores a phase that the host already settled, so the caller
 * can settle the same record more than once.
 */
export function settlePhase(data, index, usage) {
    const phase = data.phases[index];
    if (!phase || phase.settled) {
        return data;
    }
    const settled = {
        ...phase,
        settled: true,
        model_turns: usage.messageIds.length,
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        cache_read_tokens: usage.cacheReadTokens
    };
    const phases = data.phases.map((item, position) => (position === index ? settled : item));
    const breakdown = data.breakdown ?? {};
    if (!breakdown[phase.subproject]) {
        breakdown[phase.subproject] = {
            plain: { prompt_tokens: 0, completion_tokens: 0, cache_read_tokens: 0 },
            "skill-guided": { prompt_tokens: 0, completion_tokens: 0, cache_read_tokens: 0 }
        };
    }
    const step = breakdown[phase.subproject][phase.variant];
    step.prompt_tokens += usage.promptTokens;
    step.completion_tokens += usage.completionTokens;
    step.cache_read_tokens += usage.cacheReadTokens;
    return {
        ...data,
        phases,
        breakdown,
        total_prompt_tokens: data.total_prompt_tokens + usage.promptTokens,
        total_completion_tokens: data.total_completion_tokens + usage.completionTokens,
        total_cache_read_tokens: data.total_cache_read_tokens + usage.cacheReadTokens,
        total_tokens: data.total_tokens + usage.promptTokens + usage.completionTokens + usage.cacheReadTokens,
        model_turns: data.model_turns + usage.messageIds.length
    };
}
