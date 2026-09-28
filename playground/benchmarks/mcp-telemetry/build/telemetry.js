import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Telemetry file that the server uses when the workspace holds none. */
export const PRIMARY_TELEMETRY = path.resolve(__dirname, "../../runtime-telemetry.json");
/** Variable that names the telemetry file of the running workspace. */
export const TELEMETRY_VARIABLE = "LCCST_TELEMETRY_FILE";
/** Manifest of each subproject, which the phase must create. */
export const PHASE_MANIFESTS = {
    "python-http-server": "pyproject.toml",
    "react-timer": "package.json",
    "go-login-crud": "go.mod"
};
/** Build one empty step of the breakdown. */
function emptyStep() {
    return { prompt_tokens: 0, completion_tokens: 0, cache_read_tokens: 0 };
}
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
/**
 * Locate the telemetry file of the running workspace.
 *
 * The variable wins, because the harness passes the path in the environment of
 * the server. Without the variable the file belongs in the working directory of
 * the server, which is the workspace of the run. The function must not fall back
 * to the file of this source tree: a run whose server lost the variable would
 * then write into the repository, and the phases of one run would land in the
 * file that another run reads.
 */
export function resolveTelemetryFile() {
    const configured = process.env[TELEMETRY_VARIABLE];
    if (configured) {
        return configured;
    }
    const workspaceTelemetry = path.resolve(process.cwd(), "runtime-telemetry.json");
    try {
        if (fs.statSync(process.cwd()).isDirectory()) {
            return workspaceTelemetry;
        }
    }
    catch {
        return workspaceTelemetry;
    }
    return PRIMARY_TELEMETRY;
}
/**
 * Locate the workspace of the run.
 *
 * A harness does not start a server in the directory of the run, so the working
 * directory of the server is not the workspace. The variable that names the
 * telemetry file sits in the workspace, so its directory is the workspace. The
 * function falls back to the working directory, which is the workspace for a
 * server that a harness starts in place.
 */
export function resolveWorkspace() {
    const configured = process.env[TELEMETRY_VARIABLE];
    if (configured) {
        return path.dirname(path.resolve(configured));
    }
    return process.cwd();
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
 * Check that a phase did its work before it records itself.
 *
 * A model can call the tool at any moment, and a call that arrives before the
 * work of the phase would end the measured span too early. The server
 * therefore reads the workspace and refuses a phase that holds no directory and
 * no manifest. The call records nothing, so the phase can still be measured
 * later.
 */
export function checkPhase(workspace, subproject, variant) {
    const directory = path.resolve(workspace, subproject, variant);
    const manifest = PHASE_MANIFESTS[subproject];
    if (!manifest) {
        return { ready: true, directory, reason: null };
    }
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        return {
            ready: false,
            directory,
            reason: `The workspace holds no ${subproject}/${variant} directory.`
        };
    }
    if (!fs.existsSync(path.join(directory, manifest))) {
        return {
            ready: false,
            directory,
            reason: `The workspace holds no ${manifest} in ${subproject}/${variant}.`
        };
    }
    return { ready: true, directory, reason: null };
}
/** Build one new phase record. */
function newPhase(boundary, fromTime) {
    return {
        subproject: boundary.subproject,
        variant: boundary.variant,
        from_time: fromTime,
        to_time: boundary.toTime,
        session_id: boundary.sessionId,
        settled: false,
        model_turns: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        cache_read_tokens: 0,
        model: null,
        token_seen: false
    };
}
/**
 * Link the spans of the phases so that they follow each other.
 *
 * Every phase starts at the end of the phase before it, and the first phase
 * starts at the beginning of the session. The spans therefore never overlap, so
 * the settle step counts every model turn once. A phase that a settle step has
 * already measured keeps its counts, and the link changes nothing for it.
 */
function linkSpans(phases) {
    return phases.map((phase, index) => ({
        ...phase,
        from_time: index === 0 ? 0 : phases[index - 1].to_time
    }));
}
/**
 * Record the boundary of one phase, or correct one that ended too early.
 *
 * The boundary carries no token counts. A host writes the counts of a turn when
 * the turn ends, so the counts of the last turn of a phase appear after the
 * tool call returns. The function therefore stores the time span, and
 * `settlePhase` measures the span later.
 *
 * A phase holds one record only. A second call for the same phase moves the end
 * of that record, so a model that called the tool too early repairs the phase
 * with one more call. A phase that a settle step has already measured keeps its
 * counts. The function sets the start of every span, so the caller passes no
 * start.
 */
export function recordPhase(data, boundary) {
    const index = data.phases.findIndex((phase) => phase.subproject === boundary.subproject && phase.variant === boundary.variant);
    if (index < 0) {
        const phase = newPhase(boundary, nextPhaseStart(data));
        return {
            data: { ...data, phases: [...data.phases, phase] },
            status: "recorded",
            count: data.phases.length + 1
        };
    }
    const known = data.phases[index];
    if (known.settled) {
        return { data, status: "settled", count: data.phases.length };
    }
    const moved = {
        ...known,
        to_time: boundary.toTime,
        session_id: boundary.sessionId ?? known.session_id
    };
    const phases = linkSpans(data.phases.map((phase, at) => (at === index ? moved : phase)));
    return { data: { ...data, phases }, status: "corrected", count: phases.length };
}
/** Read the start of the next phase, which is the end of the last one. */
export function nextPhaseStart(data) {
    return data.phases.length === 0 ? 0 : data.phases[data.phases.length - 1].to_time;
}
/**
 * State the result of one call to the record tool in words.
 *
 * The text must tell the model that a corrected phase is not an error, and that
 * a phase with measured counts must not be recorded again.
 */
export function phaseOutcomeText(phase, status, count) {
    if (status === "corrected") {
        return (`Corrected the end of ${phase}. The phase held a record, and the span now ends at ` +
            "this call. The host settles the token counts after the phase.");
    }
    if (status === "settled") {
        return (`The phase ${phase} holds measured counts, so the record did not change. ` +
            "Do not call the tool again for this phase.");
    }
    return (`Recorded the end of ${phase} as phase ${count}. ` +
        "The host settles the token counts after the phase.");
}
/** List the phases that the host has not settled yet. */
export function pendingPhases(data) {
    return data.phases.filter((phase) => !phase.settled);
}
/**
 * Add the measured counts of one phase to the record.
 *
 * The function ignores a phase that the host already settled, so the caller
 * can settle the same record more than once. The function copies the record, so
 * the record that it takes stays unchanged.
 */
export function settlePhase(data, index, usage, tokenSeen = false) {
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
        cache_read_tokens: usage.cacheReadTokens,
        model: usage.models[0] ?? null,
        token_seen: phase.token_seen || tokenSeen
    };
    const phases = data.phases.map((item, position) => (position === index ? settled : item));
    const known = data.breakdown?.[phase.subproject]?.[phase.variant] ?? emptyStep();
    const breakdown = { ...data.breakdown };
    breakdown[phase.subproject] = {
        ...(breakdown[phase.subproject] ?? { plain: emptyStep(), "skill-guided": emptyStep() }),
        [phase.variant]: {
            prompt_tokens: known.prompt_tokens + usage.promptTokens,
            completion_tokens: known.completion_tokens + usage.completionTokens,
            cache_read_tokens: known.cache_read_tokens + usage.cacheReadTokens
        }
    };
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
