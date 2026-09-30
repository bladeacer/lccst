import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import os from "os";
import path from "path";
/** Variable that names the store file of the running host. */
const STORE_VARIABLE = "LCCST_TELEMETRY_DB";
/** Bytes that start the header of every SQLite database. */
const SQLITE_MAGIC = Buffer.from("SQLite format 3\0", "latin1");
/** Key pattern of a host that names its session in the tool call metadata. */
const SESSION_KEY_PATTERN = /session.*id|^sid$/i;
/**
 * Say whether a file starts with the header of a SQLite database.
 *
 * The data directory of the user holds many files that end in `.db` and that
 * are not SQLite databases. A manual page index of `man` is one such file. The
 * reader must not offer such a file to SQLite, because a read-only open of the
 * file succeeds and the first query then fails.
 */
export function isSqliteFile(filePath) {
    let handle = null;
    try {
        handle = fs.openSync(filePath, "r");
        const header = Buffer.alloc(SQLITE_MAGIC.length);
        const read = fs.readSync(handle, header, 0, header.length, 0);
        return read === header.length && header.equals(SQLITE_MAGIC);
    }
    catch {
        return false;
    }
    finally {
        if (handle !== null) {
            try {
                fs.closeSync(handle);
            }
            catch {
                // A handle that the platform already released needs no closing.
            }
        }
    }
}
/**
 * List the store files that the reader tries, in order.
 *
 * The function names no host. It collects the files that the process
 * environment names, and the files that sit one directory deep under the data
 * directory of the user. A host that keeps its sessions in a store of this
 * layout therefore works without a code change.
 *
 * The environment names a store on purpose, so the function keeps it whatever
 * its content is. A file found by the search is a guess, so the function keeps
 * only the files that start with the header of a SQLite database.
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
            const candidate = path.join(dataHome, host, file);
            if (isSqliteFile(candidate)) {
                candidates.push(candidate);
            }
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
        messageIds: [],
        models: [],
        text: ""
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
        if (message.text) {
            usage.text += `${message.text}\n`;
        }
        if (message.model && !usage.models.includes(message.model)) {
            usage.models.push(message.model);
        }
    }
    return usage;
}
/**
 * Say whether the model wrote the run token of the instructions.
 *
 * The instructions of a run carry a token. A model that received them repeats
 * the token in a reply. The check therefore reads the text of the model turns,
 * which the host store keeps next to the token counts of the turn.
 */
export function statesToken(usage, token) {
    if (!token) {
        return false;
    }
    return usage.text.includes(token);
}
/**
 * Read the model of one turn from the raw message data.
 *
 * A host stores the model in one of three shapes. A host may nest the model in
 * a `model` object with an `id` field, a host may keep the model as a plain
 * string, and a host may hold the identifiers in flat `modelID` and
 * `providerID` fields with no `model` object at all. The function accepts all
 * three, because a missing model fails the report.
 *
 * The function returns `null` for a message of another author, because only a
 * model turn names a model.
 */
export function readModel(role, data) {
    if (role !== "assistant") {
        return null;
    }
    const raw = data?.model;
    if (typeof raw === "string") {
        return raw;
    }
    const model = asRecord(raw);
    const id = model?.id ?? model?.modelID ?? data?.modelID;
    const provider = model?.providerID ?? data?.providerID;
    if (typeof id !== "string" || id.length === 0) {
        return null;
    }
    return typeof provider === "string" && provider.length > 0 ? `${provider}/${id}` : id;
}
/**
 * Read the text that the model wrote in one turn.
 *
 * No host stores the text under one key. A host that keeps the newest schema
 * holds a `content` list, a host that keeps an older schema holds a `parts`
 * list, and a host may hold neither and keep the text in a table of its own.
 * The function reads every list the message row offers, and it returns an
 * empty string for a turn of another author or a turn with no text.
 */
export function readText(role, data) {
    if (role !== "assistant") {
        return "";
    }
    const lines = [];
    for (const key of ["content", "parts"]) {
        for (const text of readTextParts(data?.[key])) {
            if (!lines.includes(text)) {
                lines.push(text);
            }
        }
    }
    return lines.join("\n");
}
/** Join the text parts of one list, skipping every part of another type. */
function readTextParts(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const lines = [];
    for (const part of value) {
        const record = asRecord(part);
        if (record?.type === "text" && typeof record.text === "string" && record.text.length > 0) {
            lines.push(record.text);
        }
    }
    return lines;
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
/**
 * Match the store tables. The newest schema wins.
 *
 * A host may keep the text of a turn in a table of its own instead of inside the
 * message row, so the function also names that table when it finds one.
 */
function detectSchema(store) {
    const names = new Set();
    const tables = store.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    for (const table of tables) {
        names.add(String(table.name));
    }
    // A host that splits the text of a turn keeps a table of parts that join on
    // the message identifier.
    const parts = names.has("part") ? "part" : null;
    if (names.has("session_v2") && names.has("session_message")) {
        return {
            sessions: "session_v2",
            messages: "session_message",
            roleColumn: "type",
            parts
        };
    }
    if (names.has("session") && names.has("message")) {
        return { sessions: "session", messages: "message", roleColumn: "data", parts };
    }
    if (names.has("session_message")) {
        return { sessions: "session", messages: "session_message", roleColumn: "type", parts };
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
            const embedded = readText(role, data);
            messages.push({
                id: String(row.id),
                role,
                timeCreated: readNumber(row.time_created),
                tokens: data?.tokens ?? null,
                model: readModel(role, data),
                text: embedded || readPartTable(store, schema, role, String(row.id))
            });
        }
    }
    return messages;
}
/**
 * Read the text of one turn from a table of parts.
 *
 * A host may keep no text inside the message row and store every turn of text
 * in a table that joins on the message identifier. The function returns an
 * empty string when the store holds no such table, or when the turn has no
 * text, so a caller never has to know which shape a host uses.
 */
function readPartTable(store, schema, role, messageId) {
    if (!schema.parts || role !== "assistant" || messageId.length === 0) {
        return "";
    }
    try {
        const rows = store
            .prepare(`SELECT data FROM ${schema.parts} WHERE message_id = ? ORDER BY time_created`)
            .all(messageId);
        const lines = [];
        for (const row of rows) {
            for (const text of readTextParts(asRecord(parseJson(row.data))?.parts)) {
                lines.push(text);
            }
            const direct = asRecord(parseJson(row.data));
            if (direct?.type === "text" && typeof direct.text === "string" && direct.text.length > 0) {
                lines.push(direct.text);
            }
        }
        return lines.join("\n");
    }
    catch {
        return "";
    }
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
