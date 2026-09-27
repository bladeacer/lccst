import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import os from "os";
import path from "path";
/** Variable that names the store file of the running host. */
const STORE_VARIABLE = "LCCST_TELEMETRY_DB";
/** Key pattern of a host that names its session in the tool call metadata. */
const SESSION_KEY_PATTERN = /session.*id|^sid$/i;
/**
 * List the store files that the reader tries, in order.
 *
 * The function names no host. It collects the files that the process
 * environment names, and the files that sit one directory deep under the data
 * directory of the user. A host that keeps its sessions in a store of this
 * layout therefore works without a code change.
 */
export function resolveStoreCandidates(env = process.env, home = os.homedir()) {
    const dataHome = env.XDG_DATA_HOME ?? path.join(home, ".local", "share");
    const candidates = [];
    const configured = env[STORE_VARIABLE];
    if (configured) {
        candidates.push(configured);
    }
    for (const [name, value] of Object.entries(env).sort()) {
        if (name.endsWith("_DB") && name !== STORE_VARIABLE && value) {
            candidates.push(value);
        }
    }
    let hosts = [];
    try {
        hosts = fs.readdirSync(dataHome).sort();
    }
    catch {
        hosts = [];
    }
    for (const host of hosts) {
        let files = [];
        try {
            files = fs
                .readdirSync(path.join(dataHome, host))
                .filter((file) => file.endsWith(".db"))
                .sort();
        }
        catch {
            files = [];
        }
        for (const file of files) {
            candidates.push(path.join(dataHome, host, file));
        }
    }
    const seen = new Set();
    return candidates.filter((file) => {
        if (seen.has(file) || !fs.existsSync(file)) {
            return false;
        }
        seen.add(file);
        return true;
    });
}
/**
 * Measure the token usage of the model turns inside one time span.
 *
 * The function reads the store of the host that runs the phase. It returns
 * `null` when no store holds a session for the workspace, and it returns an
 * empty count when the host holds no turn in the span. A model cannot state
 * its own token usage, so the store of the host is the only source.
 *
 * The caller must measure a span after the phase ended. A host writes the
 * token counts of a turn when the turn ends, which is after the tool call of
 * that turn returns.
 */
export function readTurnUsage(query) {
    for (const candidate of query.candidates ?? resolveStoreCandidates()) {
        const store = openStore(candidate);
        if (!store) {
            continue;
        }
        try {
            const schema = detectSchema(store);
            if (!schema) {
                continue;
            }
            const sessionIds = resolveSessionIds(store, schema, query);
            if (sessionIds.length === 0) {
                continue;
            }
            return sumTurnUsage(readMessages(store, schema, sessionIds), query.window);
        }
        catch (error) {
            process.stderr.write(`[Telemetry Debug] Store read failed: ${String(error)}\n`);
        }
        finally {
            store.close();
        }
    }
    return null;
}
/**
 * Sum the token usage of the model turns inside one time span.
 *
 * The function is pure, so a unit test can call it with stored rows.
 */
export function sumTurnUsage(messages, window) {
    const usage = {
        promptTokens: 0,
        completionTokens: 0,
        cacheReadTokens: 0,
        messageIds: []
    };
    for (const message of messages) {
        const insideWindow = message.timeCreated > window.fromTime && message.timeCreated <= window.toTime;
        if (!insideWindow || message.role !== "assistant") {
            continue;
        }
        const tokens = readTokens(message.tokens);
        if (!tokens) {
            continue;
        }
        usage.promptTokens += tokens.input + tokens.cacheWrite;
        usage.completionTokens += tokens.output + tokens.reasoning;
        usage.cacheReadTokens += tokens.cacheRead;
        usage.messageIds.push(message.id);
    }
    return usage;
}
/**
 * Read the session identifier that the host sends in the tool call metadata.
 *
 * The function names no host. It accepts any metadata key that names a
 * session, because harnesses differ in the prefix of the key.
 */
export function readHostSessionId(meta) {
    const record = asRecord(meta);
    if (!record) {
        return undefined;
    }
    for (const [key, value] of Object.entries(record).sort()) {
        if (typeof value === "string" && value.length > 0 && SESSION_KEY_PATTERN.test(key)) {
            return value;
        }
    }
    return undefined;
}
/**
 * Open a store file for reading.
 *
 * The function returns `null` without a message, because the data directory
 * of the user holds many database files that are not session stores.
 */
function openStore(databasePath) {
    try {
        return new DatabaseSync(databasePath, { readOnly: true });
    }
    catch {
        return null;
    }
}
/** Match the store tables. The newest schema wins. */
function detectSchema(store) {
    const names = new Set();
    const tables = store.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    for (const table of tables) {
        names.add(String(table.name));
    }
    if (names.has("session_v2") && names.has("session_message")) {
        return { sessions: "session_v2", messages: "session_message", roleColumn: "type" };
    }
    if (names.has("session") && names.has("message")) {
        return { sessions: "session", messages: "message", roleColumn: "data" };
    }
    return null;
}
/**
 * Find the sessions of the running phase.
 *
 * The host session identifier wins, because the host names the session that
 * runs the tool. Without the identifier, the newest session of the workspace
 * directory runs the phase. Child sessions run as one unit, so a subagent
 * counts towards the same phase.
 */
function resolveSessionIds(store, schema, query) {
    const root = query.sessionId
        ? store.prepare(`SELECT id FROM ${schema.sessions} WHERE id = ?`).get(query.sessionId)
        : store
            .prepare(`SELECT id FROM ${schema.sessions} WHERE directory = ? ORDER BY time_updated DESC LIMIT 1`)
            .get(path.resolve(query.directory));
    if (!root) {
        return [];
    }
    const ids = [String(root.id)];
    // The loop walks the children that the loop itself appends.
    for (let index = 0; index < ids.length; index++) {
        const children = store
            .prepare(`SELECT id FROM ${schema.sessions} WHERE parent_id = ?`)
            .all(ids[index]);
        for (const child of children) {
            ids.push(String(child.id));
        }
    }
    return ids;
}
/** Read every message of the given sessions, oldest turn first. */
function readMessages(store, schema, sessionIds) {
    const typed = schema.roleColumn === "type";
    const columns = typed ? "id, type, time_created, data" : "id, time_created, data";
    const statement = store.prepare(`SELECT ${columns} FROM ${schema.messages} WHERE session_id = ? ORDER BY time_created`);
    const messages = [];
    for (const sessionId of sessionIds) {
        for (const row of statement.all(sessionId)) {
            const data = asRecord(parseJson(row.data));
            const role = typed ? String(row.type) : String(data?.role ?? "");
            messages.push({
                id: String(row.id),
                role,
                timeCreated: readNumber(row.time_created),
                tokens: data?.tokens ?? null
            });
        }
    }
    return messages;
}
/** Read the token object of one model turn. Returns `null` when it has none. */
function readTokens(value) {
    const raw = asRecord(value);
    const cache = asRecord(raw?.cache);
    if (!raw || typeof raw.input !== "number" || typeof raw.output !== "number") {
        return null;
    }
    return {
        input: raw.input,
        output: raw.output,
        reasoning: readNumber(raw.reasoning),
        cacheRead: readNumber(cache?.read),
        cacheWrite: readNumber(cache?.write)
    };
}
/** Read one number field. A missing field counts as zero. */
function readNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
/** Narrow a parsed value to a record. */
function asRecord(value) {
    return typeof value === "object" && value !== null
        ? value
        : null;
}
/** Parse one JSON payload. Returns `null` when the payload is not JSON. */
function parseJson(value) {
    if (typeof value !== "string") {
        return null;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
