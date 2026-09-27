import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import os from "os";
import path from "path";
import {
  readHostSessionId,
  readTurnUsage,
  resolveStoreCandidates,
  sumTurnUsage
} from "../playground/benchmarks/mcp-telemetry/src/usage.js";
import {
  addPhase,
  emptyTelemetry,
  nextPhaseStart,
  pendingPhases,
  readTelemetry,
  settlePhase,
  writeTelemetry
} from "../playground/benchmarks/mcp-telemetry/src/telemetry.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.error(`  FAIL: ${name}`); }
}

function withTempDir(fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lccst-telemetry-"));
  try { fn(dir); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function assistantTokens(input: number, output: number, reasoning = 0, read = 0, write = 0) {
  return { input, output, reasoning, cache: { read, write } };
}

function storedMessage(id: string, timeCreated: number, role: string, tokens: unknown) {
  return { id, role, timeCreated, tokens };
}

type Schema = "v1" | "v2" | "both";

function createStore(file: string, schema: Schema) {
  const store = new DatabaseSync(file);
  if (schema === "v1" || schema === "both") {
    store.exec("CREATE TABLE session (id text, directory text, parent_id text, time_updated integer)");
    store.exec("CREATE TABLE message (id text, session_id text, time_created integer, data text)");
  }
  if (schema === "v2" || schema === "both") {
    store.exec("CREATE TABLE session_v2 (id text, directory text, parent_id text, time_updated integer)");
    const columns = "id text, session_id text, type text, time_created integer, data text";
    store.exec(`CREATE TABLE session_message (${columns})`);
  }
  return store;
}

function addSession(
  store: DatabaseSync,
  schema: Schema,
  id: string,
  directory: string,
  parentId: string | null,
  timeUpdated: number
) {
  const table = schema === "v1" ? "session" : "session_v2";
  const columns = "(id, directory, parent_id, time_updated) VALUES (?, ?, ?, ?)";
  store.prepare(`INSERT INTO ${table} ${columns}`).run(id, directory, parentId, timeUpdated);
}

function addMessage(
  store: DatabaseSync,
  schema: Schema,
  id: string,
  sessionId: string,
  role: string,
  timeCreated: number,
  tokens: unknown
) {
  const data = JSON.stringify({ role, tokens });
  if (schema === "v1") {
    const columns = "(id, session_id, time_created, data) VALUES (?, ?, ?, ?)";
    store.prepare(`INSERT INTO message ${columns}`).run(id, sessionId, timeCreated, data);
    return;
  }
  const columns = "(id, session_id, type, time_created, data) VALUES (?, ?, ?, ?, ?)";
  store.prepare(`INSERT INTO session_message ${columns}`).run(id, sessionId, role, timeCreated, data);
}

console.log("LCCST: Telemetry unit tests\n");

// -- Window arithmetic -------------------------------------------
const none = sumTurnUsage([], { fromTime: 0, toTime: 10 });
assert(none.promptTokens === 0 && none.messageIds.length === 0, "no message -> no usage");

const windowed = sumTurnUsage(
  [
    storedMessage("m0", 5, "assistant", assistantTokens(100, 10)),
    storedMessage("m1", 10, "assistant", assistantTokens(20, 2, 1, 30, 3)),
    storedMessage("m2", 11, "assistant", assistantTokens(999, 99)),
    storedMessage("m3", 10, "user", assistantTokens(999, 99))
  ],
  { fromTime: 5, toTime: 10 }
);
assert(windowed.promptTokens === 23, "prompt counts input and cache write inside the window");
assert(windowed.completionTokens === 3, "completion counts output and reasoning");
assert(windowed.cacheReadTokens === 30, "cache read tokens are counted apart");
assert(windowed.messageIds.length === 1, "a turn outside the window and a user turn are skipped");

const withoutTokens = sumTurnUsage(
  [storedMessage("m4", 7, "assistant", null), storedMessage("m5", 7, "assistant", { output: 5 })],
  { fromTime: 0, toTime: 10 }
);
assert(withoutTokens.messageIds.length === 0, "a turn without a token object is skipped");

// -- Newest store schema ------------------------------------------
withTempDir((dir) => {
  const file = path.join(dir, "host.db");
  const store = createStore(file, "v2");
  addSession(store, "v2", "ses_other", dir, null, 10);
  addSession(store, "v2", "ses_sub", dir, "ses_main", 10);
  addSession(store, "v2", "ses_main", dir, null, 20);
  addMessage(store, "v2", "m1", "ses_sub", "assistant", 40, assistantTokens(50, 5));
  addMessage(store, "v2", "m2", "ses_main", "assistant", 50, assistantTokens(200, 20, 10, 100, 5));
  addMessage(store, "v2", "m3", "ses_main", "user", 45, null);
  store.close();

  const usage = readTurnUsage({
    directory: dir,
    window: { fromTime: 0, toTime: 60 },
    candidates: [file]
  });
  assert(usage !== null, "newest schema store is readable");
  assert(usage?.promptTokens === 255, "the newest session of the directory is measured");
  assert(usage?.completionTokens === 35, "a child session counts towards the phase");
  assert(usage?.cacheReadTokens === 100, "cache read tokens are counted");
  assert(usage?.messageIds.length === 2, "every model turn of the window is counted");

  const named = readTurnUsage({
    directory: path.join(dir, "other"),
    sessionId: "ses_sub",
    window: { fromTime: 0, toTime: 60 },
    candidates: [file]
  });
  assert(named?.promptTokens === 50, "a host session name wins over the directory");
});

// -- Legacy store schema -----------------------------------------
withTempDir((dir) => {
  const file = path.join(dir, "host.db");
  const store = createStore(file, "v1");
  addSession(store, "v1", "ses_old", dir, null, 5);
  addMessage(store, "v1", "m1", "ses_old", "assistant", 12, assistantTokens(11, 7, 3));
  addMessage(store, "v1", "m2", "ses_old", "user", 13, null);
  store.close();

  const usage = readTurnUsage({
    directory: dir,
    window: { fromTime: 10, toTime: 20 },
    candidates: [file]
  });
  assert(usage?.promptTokens === 11, "legacy store honours the window");
  assert(usage?.messageIds.length === 1, "legacy store counts one turn");
});

// -- Newest schema wins over the legacy schema --------------------
withTempDir((dir) => {
  const file = path.join(dir, "host.db");
  const store = createStore(file, "both");
  addSession(store, "v1", "ses_legacy", dir, null, 999);
  addMessage(store, "v1", "m1", "ses_legacy", "assistant", 5, assistantTokens(400, 40));
  addSession(store, "v2", "ses_new", dir, null, 1);
  addMessage(store, "v2", "m2", "ses_new", "assistant", 5, assistantTokens(60, 6));
  store.close();

  const usage = readTurnUsage({
    directory: dir,
    window: { fromTime: 0, toTime: 10 },
    candidates: [file]
  });
  assert(usage?.promptTokens === 60, "the newest schema wins when a store holds both schemas");
});

// -- Several hosts, no host names in the reader -------------------
withTempDir((dir) => {
  const first = path.join(dir, "alpha", "alpha.db");
  const second = path.join(dir, "beta", "beta.db");
  fs.mkdirSync(path.dirname(first));
  fs.mkdirSync(path.dirname(second));

  createStore(first, "v2").close();
  const host = createStore(second, "v2");
  addSession(host, "v2", "ses_host", dir, null, 20);
  addMessage(host, "v2", "m1", "ses_host", "assistant", 30, assistantTokens(70, 7));
  host.close();

  const usage = readTurnUsage({
    directory: dir,
    window: { fromTime: 0, toTime: 40 },
    candidates: [first, second]
  });
  assert(usage?.promptTokens === 70, "the reader moves to the store that holds the session");

  const named = readTurnUsage({
    directory: path.join(dir, "nowhere"),
    sessionId: "ses_missing",
    window: { fromTime: 0, toTime: 40 },
    candidates: [first, second]
  });
  assert(named === null, "no store holds the named session -> null");
});

// -- Unavailable store --------------------------------------------
withTempDir((dir) => {
  assert(readTurnUsage({
    directory: dir,
    window: { fromTime: 0, toTime: 1 },
    candidates: [path.join(dir, "absent.db")]
  }) === null, "absent store -> null");

  const file = path.join(dir, "host.db");
  createStore(file, "v1").close();
  assert(readTurnUsage({
    directory: dir,
    window: { fromTime: 0, toTime: 1 },
    candidates: [file]
  }) === null, "store without session -> null");

  const other = path.join(dir, "notes.db");
  const notes = new DatabaseSync(other);
  notes.exec("CREATE TABLE note (id text)");
  notes.close();
  assert(readTurnUsage({
    directory: dir,
    window: { fromTime: 0, toTime: 1 },
    candidates: [other]
  }) === null, "unknown schema -> null");

  const broken = path.join(dir, "broken.db");
  fs.writeFileSync(broken, "not a database");
  assert(readTurnUsage({
    directory: dir,
    window: { fromTime: 0, toTime: 1 },
    candidates: [broken]
  }) === null, "damaged store -> null");
});

// -- Store discovery ----------------------------------------------
withTempDir((dir) => {
  const dataHome = path.join(dir, "data");
  const named = path.join(dir, "named.db");
  const underHost = path.join(dataHome, "somehost", "store.db");
  const ignored = path.join(dataHome, "somehost", "notes.txt");
  fs.mkdirSync(path.dirname(underHost), { recursive: true });
  createStore(underHost, "v2").close();
  fs.writeFileSync(ignored, "");
  createStore(named, "v1").close();

  const fromEnv = resolveStoreCandidates(
    { LCCST_TELEMETRY_DB: named, SOMEHOST_DB: underHost },
    dir
  );
  assert(fromEnv[0] === named, "LCCST_TELEMETRY_DB is the first candidate");
  assert(fromEnv.includes(underHost), "a host database variable is a candidate");
  assert(!fromEnv.includes(ignored), "a file that is not a database is skipped");

  const fromDataHome = resolveStoreCandidates({ XDG_DATA_HOME: dataHome }, dir);
  assert(fromDataHome.includes(underHost), "a store under the data home is a candidate");

  const fromDefault = resolveStoreCandidates({}, dir);
  assert(
    fromDefault.every((file) => file.startsWith(path.join(dir, ".local", "share"))),
    "the default data home sits under the home directory"
  );
  assert(
    resolveStoreCandidates({ XDG_DATA_HOME: path.join(dir, "absent") }, dir).length === 0,
    "a missing data home yields no candidate"
  );
});

// -- Host session metadata ----------------------------------------
assert(readHostSessionId({ "ai.opencode/sessionID": "ses_1" }) === "ses_1",
  "a prefixed session key is read");
assert(readHostSessionId({ "ai.other/sessionId": "ses_2" }) === "ses_2",
  "the prefix of the session key does not matter");
assert(readHostSessionId({ sessionId: "ses_3" }) === "ses_3", "a bare session key is read");
assert(readHostSessionId({ "ai.opencode/agent": "build" }) === undefined,
  "metadata without a session key yields undefined");
assert(readHostSessionId({ "ai.opencode/sessionID": "" }) === undefined,
  "an empty session key yields undefined");
assert(readHostSessionId(undefined) === undefined, "missing metadata yields undefined");

// -- Phase record -------------------------------------------------
const usageOf = (prompt: number, completion: number, cacheRead: number, turns: number) => ({
  promptTokens: prompt,
  completionTokens: completion,
  cacheReadTokens: cacheRead,
  messageIds: Array.from({ length: turns }, (_, index) => `m${index}`)
});

const first = addPhase(emptyTelemetry(), {
  subproject: "react-timer",
  variant: "plain",
  fromTime: 0,
  toTime: 1000,
  sessionId: null
});
assert(first.phases.length === 1 && first.phases[0].settled === false, "a phase starts unsettled");
assert(first.total_tokens === 0, "a phase boundary holds no token count");
assert(nextPhaseStart(first) === 1000, "the next phase starts at the end of the last one");

const second = addPhase(first, {
  subproject: "go-login-crud",
  variant: "skill-guided",
  fromTime: nextPhaseStart(first),
  toTime: 2000,
  sessionId: "ses_1"
});
assert(second.phases.length === 2, "a second phase is appended");
assert(pendingPhases(second).length === 2, "both phases wait for the host");

const settled = settlePhase(settlePhase(second, 0, usageOf(100, 10, 500, 4)), 1, usageOf(50, 5, 250, 2));
assert(settled.phases[0].settled && settled.phases[1].settled, "a settled phase keeps its flag");
assert(settled.total_prompt_tokens === 150, "the totals add the prompt tokens");
assert(settled.total_completion_tokens === 15, "the totals add the completion tokens");
assert(settled.total_cache_read_tokens === 750, "the totals add the cache read tokens");
assert(settled.total_tokens === 915, "the grand total adds every field");
assert(settled.model_turns === 6, "the record counts the model turns");
assert(
  settled.breakdown["react-timer"].plain.prompt_tokens === 100 &&
    settled.breakdown["go-login-crud"]["skill-guided"].completion_tokens === 5,
  "each phase lands in its own subproject and variant"
);
assert(
  settled.breakdown["react-timer"]["skill-guided"].prompt_tokens === 0,
  "a new subproject starts with empty variants"
);

const again = settlePhase(settled, 0, usageOf(999, 99, 9, 9));
assert(again.total_prompt_tokens === 150, "a settled phase is not counted twice");
assert(settlePhase(settled, 7, usageOf(1, 1, 1, 1)) === settled, "an unknown phase changes nothing");
assert(pendingPhases(settled).length === 0, "no phase waits after the settle");

// -- Telemetry file -----------------------------------------------
withTempDir((dir) => {
  const file = path.join(dir, "nested", "runtime-telemetry.json");
  assert(readTelemetry(file).phases.length === 0, "a missing file starts an empty record");

  writeTelemetry(file, second);
  assert(fs.existsSync(file), "the writer creates the directory of the file");
  const loaded = readTelemetry(file);
  assert(loaded.phases.length === 2, "a written file reads back");
  assert(loaded.phases[1].session_id === "ses_1", "the phase keeps the session of the host");

  fs.writeFileSync(file, "{ not json");
  assert(readTelemetry(file).phases.length === 0, "a damaged file starts an empty record");
});

// -- Summary ------------------------------------------------------
console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
