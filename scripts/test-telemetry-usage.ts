import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import os from "os";
import path from "path";
import {
  isSqliteFile,
  readHostSessionId,
  readModel,
  readText,
  readTurnUsage,
  resolveStoreCandidates,
  statesToken,
  sumTurnUsage
} from "../playground/benchmarks/mcp-telemetry/src/usage.js";
import {
  checkPhase,
  emptyTelemetry,
  nextPhaseStart,
  pendingPhases,
  phaseOutcomeText,
  readTelemetry,
  recordPhase,
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

/** Build one throwaway directory that holds a store file. */
function storeDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lccst-telemetry-store-"));
}

function assistantTokens(input: number, output: number, reasoning = 0, read = 0, write = 0) {
  return { input, output, reasoning, cache: { read, write } };
}

function storedMessage(
  id: string,
  timeCreated: number,
  role: string,
  tokens: unknown,
  model: string | null = null,
  text: string = ""
) {
  return { id, role, timeCreated, tokens, model, text };
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
  tokens: unknown,
  model?: unknown,
  parts?: unknown
) {
  const data = JSON.stringify({ role, tokens, model, parts });
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

// -- Model of a turn ---------------------------------------------
const mixedModels = sumTurnUsage(
  [
    storedMessage("m0", 5, "assistant", assistantTokens(10, 1), "opencode/alpha"),
    storedMessage("m1", 6, "assistant", assistantTokens(10, 1), "opencode/alpha"),
    storedMessage("m2", 7, "user", null, "opencode/beta")
  ],
  { fromTime: 0, toTime: 10 }
);
assert(
  mixedModels.models.length === 1 && mixedModels.models[0] === "opencode/alpha",
  "the reader names each model of the window once and skips a user turn"
);

assert(readModel("assistant", { model: { id: "alpha", providerID: "opencode" } }) === "opencode/alpha",
  "a host model object becomes provider/model");
assert(readModel("assistant", { model: "kilo/beta" }) === "kilo/beta", "a plain model string is kept");
assert(readModel("assistant", { model: { id: "alpha" } }) === "alpha", "a model without a provider is kept");
assert(readModel("assistant", { model: {} }) === null, "a model without an id yields null");
assert(readModel("user", { model: { id: "alpha", providerID: "opencode" } }) === null,
  "a user turn names no model");

// -- Newest store schema ------------------------------------------
withTempDir((dir) => {
  const file = path.join(dir, "host.db");
  const store = createStore(file, "v2");
  addSession(store, "v2", "ses_other", dir, null, 10);
  addSession(store, "v2", "ses_sub", dir, "ses_main", 10);
  addSession(store, "v2", "ses_main", dir, null, 20);
  addMessage(store, "v2", "m1", "ses_sub", "assistant", 40, assistantTokens(50, 5),
    { id: "alpha", providerID: "opencode" });
  addMessage(store, "v2", "m2", "ses_main", "assistant", 50, assistantTokens(200, 20, 10, 100, 5),
    { id: "alpha", providerID: "opencode" });
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
  assert(
    usage?.models.length === 1 && usage.models[0] === "opencode/alpha",
    "the reader reports the model that the host used"
  );

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

// -- The run token reaches the reader from the store ---------------
// The settle step never sees the model directly. It reads the text of the
// turns from the store, so the store must carry the text of a turn.
withTempDir((dir) => {
  const file = path.join(dir, "host.db");
  const store = createStore(file, "v2");
  addSession(store, "v2", "ses_token", dir, null, 1);
  addMessage(
    store, "v2", "m1", "ses_token", "assistant", 5, assistantTokens(60, 6), "opencode/alpha",
    [{ type: "text", text: "My run token is 9f8e7d6c." }]
  );
  addMessage(
    store, "v2", "m2", "ses_token", "assistant", 6, assistantTokens(60, 6), "opencode/alpha",
    [{ type: "tool", state: {} }]
  );
  store.close();

  const usage = readTurnUsage({
    directory: dir,
    window: { fromTime: 0, toTime: 10 },
    candidates: [file]
  });
  assert(
    usage !== null && statesToken(usage, "9f8e7d6c"),
    "the reader finds the run token in the text of the store"
  );
  assert(
    usage !== null && !statesToken(usage, "00000000"),
    "the reader rejects a token that the store does not hold"
  );
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
  // A file that ends in .db and that is not a SQLite database. A manual page
  // index of the host `man` is one such file on a workstation.
  const foreign = path.join(dataHome, "man", "index.db");
  fs.mkdirSync(path.dirname(underHost), { recursive: true });
  fs.mkdirSync(path.dirname(foreign), { recursive: true });
  createStore(underHost, "v2").close();
  fs.writeFileSync(ignored, "");
  fs.writeFileSync(foreign, Buffer.from([0xcf, 0xfa, 0x8f, 0x57, 0x13, 0x00]));
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
  assert(
    !fromDataHome.includes(foreign),
    "a found file that is not a SQLite database is not a candidate"
  );

  const fromDefault = resolveStoreCandidates({}, dir);
  assert(
    fromDefault.every((file) => file.startsWith(path.join(dir, ".local", "share"))),
    "the default data home sits under the home directory"
  );
  assert(
    resolveStoreCandidates({ XDG_DATA_HOME: path.join(dir, "absent") }, dir).length === 0,
    "a missing data home yields no candidate"
  );

  // A store that the environment names is kept even when it is damaged, so the
  // reader reports the problem instead of hiding it.
  const brokenNamed = path.join(dir, "broken.db");
  fs.writeFileSync(brokenNamed, "not a database at all");
  assert(
    resolveStoreCandidates({ LCCST_TELEMETRY_DB: brokenNamed }, dir)[0] === brokenNamed,
    "a named store is kept whatever its content is"
  );
  assert(
    !resolveStoreCandidates({ XDG_DATA_HOME: path.join(dir, "none") }, dir).includes(brokenNamed),
    "a file outside the data home is not a found candidate"
  );
});

// -- SQLite header -------------------------------------------------
withTempDir((dir) => {
  const good = path.join(dir, "good.db");
  const empty = path.join(dir, "empty.db");
  const short = path.join(dir, "short.db");
  const foreign = path.join(dir, "index.db");
  const missing = path.join(dir, "absent.db");
  createStore(good, "v2").close();
  fs.writeFileSync(empty, "");
  fs.writeFileSync(short, "SQLite");
  fs.writeFileSync(foreign, Buffer.from([0xcf, 0xfa, 0x8f, 0x57, 0x13, 0x00]));

  assert(isSqliteFile(good), "a store file starts with the SQLite header");
  assert(!isSqliteFile(foreign), "a foreign index file has no SQLite header");
  assert(!isSqliteFile(empty), "an empty file has no SQLite header");
  assert(!isSqliteFile(short), "a file shorter than the header is not a store");
  assert(!isSqliteFile(missing), "a missing file is not a store");
  assert(!isSqliteFile(dir), "a directory is not a store");
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
const usageOf = (
  prompt: number,
  completion: number,
  cacheRead: number,
  turns: number,
  text: string = ""
) => ({
  promptTokens: prompt,
  completionTokens: completion,
  cacheReadTokens: cacheRead,
  messageIds: Array.from({ length: turns }, (_, index) => `m${index}`),
  models: ["opencode/alpha"],
  text
});

const recorded = recordPhase(emptyTelemetry(), {
  subproject: "react-timer",
  variant: "plain",
  toTime: 1000,
  sessionId: null
});
const first = recorded.data;
assert(recorded.status === "recorded" && recorded.count === 1, "a new phase is recorded");
assert(first.phases.length === 1 && first.phases[0].settled === false, "a phase starts unsettled");
assert(first.total_tokens === 0, "a phase boundary holds no token count");
assert(nextPhaseStart(first) === 1000, "the next phase starts at the end of the last one");

const second = recordPhase(first, {
  subproject: "go-login-crud",
  variant: "skill-guided",
  toTime: 2000,
  sessionId: "ses_1"
}).data;
assert(second.phases.length === 2, "a second phase is appended");
assert(pendingPhases(second).length === 2, "both phases wait for the host");

// -- An early call is not final -----------------------------------
const early = recordPhase(second, {
  subproject: "react-timer",
  variant: "plain",
  toTime: 3000,
  sessionId: null
});
assert(early.status === "corrected" && early.count === 2, "a repeat call corrects its own phase");
assert(
  early.data.phases[0].to_time === 3000 && early.data.phases[0].from_time === 0,
  "the corrected phase moves its end and keeps its start"
);
assert(
  early.data.phases[1].from_time === 3000,
  "the spans of the phases follow each other, so no turn is counted twice"
);
assert(early.data.phases[1].to_time === 2000, "the correction leaves the other phase alone");
assert(
  early.data.phases[0].session_id === null,
  "a correction without a session keeps the session of the host"
);

const withSession = recordPhase(early.data, {
  subproject: "react-timer",
  variant: "plain",
  toTime: 4000,
  sessionId: "ses_9"
});
assert(withSession.data.phases[0].session_id === "ses_9", "a correction takes a new session name");

const settledFirst = settlePhase(second, 0, usageOf(100, 10, 500, 4));
const afterSettle = recordPhase(settledFirst, {
  subproject: "react-timer",
  variant: "plain",
  toTime: 5000,
  sessionId: null
});
assert(afterSettle.status === "settled", "a phase with counts is not recorded again");
assert(afterSettle.data.phases[0].to_time === 1000, "a measured phase keeps its measured span");

// -- Phase guard --------------------------------------------------
withTempDir((dir) => {
  const missing = checkPhase(dir, "python-http-server", "plain");
  assert(missing.ready === false, "a phase without a directory is refused");
  assert(
    typeof missing.reason === "string" && missing.reason.includes("python-http-server/plain"),
    "the refusal names the missing directory"
  );

  const empty = path.join(dir, "react-timer", "plain");
  fs.mkdirSync(empty, { recursive: true });
  const noManifest = checkPhase(dir, "react-timer", "plain");
  assert(noManifest.ready === false, "a phase without its manifest is refused");
  assert(
    typeof noManifest.reason === "string" && noManifest.reason.includes("package.json"),
    "the refusal names the missing manifest"
  );

  fs.writeFileSync(path.join(empty, "package.json"), "{}");
  assert(checkPhase(dir, "react-timer", "plain").ready === true, "a phase with its manifest may record");

  const go = path.join(dir, "go-login-crud", "skill-guided");
  fs.mkdirSync(go, { recursive: true });
  fs.writeFileSync(path.join(go, "go.mod"), "module example\n");
  assert(checkPhase(dir, "go-login-crud", "skill-guided").ready === true, "each subproject has its own manifest");
  assert(checkPhase(dir, "go-login-crud", "plain").ready === false, "a missing variant is refused");
  assert(checkPhase(dir, "unknown", "plain").ready === true, "an unknown subproject has no rule");
});

assert(
  phaseOutcomeText("react-timer (plain)", "recorded", 1).includes("phase 1"),
  "a recorded phase names its number"
);
assert(
  phaseOutcomeText("react-timer (plain)", "corrected", 1).includes("Corrected"),
  "a corrected phase tells the model the record is not an error"
);
assert(
  phaseOutcomeText("react-timer (plain)", "settled", 1).includes("not change"),
  "a measured phase tells the model to stop"
);

const settled = settlePhase(settlePhase(second, 0, usageOf(100, 10, 500, 4)), 1, usageOf(50, 5, 250, 2));
assert(settled.phases[0].settled && settled.phases[1].settled, "a settled phase keeps its flag");
assert(settled.phases[0].model === "opencode/alpha", "a settled phase keeps the model of the host");
assert(settled.phases[0].model_turns === 4, "a settled phase keeps its turn count");
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
assert(
  second.total_prompt_tokens === 0 && Object.keys(second.breakdown).length === 0,
  "the settle copies the record, so the record that it takes stays unchanged"
);
assert(settlePhase(settled, 7, usageOf(1, 1, 1, 1)) === settled, "an unknown phase changes nothing");
assert(pendingPhases(settled).length === 0, "no phase waits after the settle");

// -- Run token -----------------------------------------------------
// The instructions of a run carry a token. A turn that states the token proves
// that the model received the instructions, so the report can trust the run.
assert(
  readText("assistant", { parts: [{ type: "text", text: "token abc12345 stated" }] })
    === "token abc12345 stated",
  "the text of a turn joins its text parts"
);
assert(
  readText("assistant", { parts: [{ type: "tool", state: {} }, { type: "text", text: "ok" }] })
    === "ok",
  "a part that is not text is skipped"
);
assert(readText("user", { parts: [{ type: "text", text: "hi" }] }) === "", "a user turn has no text");
assert(readText("assistant", {}) === "", "a turn without parts has no text");
assert(readText("assistant", { parts: "not a list" }) === "", "a malformed part list has no text");

const withToken = sumTurnUsage(
  [
    storedMessage("t0", 5, "assistant", assistantTokens(10, 1), null, "run token ab12cd34 ok"),
    storedMessage("t1", 6, "assistant", assistantTokens(10, 1), null, "done")
  ],
  { fromTime: 0, toTime: 10 }
);
assert(withToken.text.includes("ab12cd34"), "the text of the turns is collected");
assert(statesToken(withToken, "ab12cd34"), "a turn that states the token verifies the prompt");
assert(!statesToken(withToken, "ffff0000"), "a different token does not verify the prompt");
assert(!statesToken(withToken, ""), "an empty token never verifies the prompt");
assert(!statesToken({ ...withToken, text: "" }, "ab12cd34"), "no text means no verification");

// The settle records the verdict, and a later phase keeps it.
const tokenPhase = recordPhase(emptyTelemetry(), {
  subproject: "react-timer",
  variant: "plain",
  toTime: 1000,
  sessionId: null
});
const tokenSettled = settlePhase(tokenPhase.data, 0, usageOf(10, 1, 5, 1, "token ab12cd34"), true);
assert(tokenSettled.phases[0].token_seen === true, "the phase records that the token was stated");
const noTokenPhase = recordPhase(tokenSettled, {
  subproject: "react-timer",
  variant: "skill-guided",
  toTime: 2000,
  sessionId: null
});
const noTokenSettled = settlePhase(noTokenPhase.data, 1, usageOf(10, 1, 5, 1, "done"), false);
assert(
  noTokenSettled.phases[1].token_seen === false,
  "a phase that states no token records false"
);
assert(
  noTokenSettled.phases[0].token_seen === true,
  "a settled phase keeps its own verdict"
);

// -- The live store schemas of opencode and kilo --------------------
// The fixtures below were copied from the real stores on the machine, because
// a fixture written from a guess hides a reader bug instead of exposing it.
//
// opencode v2.0.18, newest schema: `session_v2` plus `session_message`. The
// author sits in the `type` column, the model is a nested object with an `id`
// field, and the text of a turn is a list of parts under `content`.
{
  const file = path.join(storeDir(), "opencode-live.db");
  const store = new DatabaseSync(file);
  store.exec("CREATE TABLE session_v2 (id text, directory text, parent_id text, time_updated integer)");
  store.exec(
    "CREATE TABLE session_message (id text, session_id text, type text, seq integer, " +
      "time_created integer, time_updated integer, data text)"
  );
  store.prepare(
    "INSERT INTO session_v2 (id, directory, parent_id, time_updated) VALUES (?, ?, ?, ?)"
  ).run("ses_live", "/tmp/lccst-bench-x", null, 100);
  const data = JSON.stringify({
    agent: "build",
    content: [
      { type: "reasoning", text: "internal thought" },
      { type: "text", text: "Run token 9f8e7d6c acknowledged." },
      { id: "prt_1", name: "read", state: {}, type: "tool" }
    ],
    cost: 0,
    finish: "stop",
    model: { providerID: "opencode", id: "ling-3.0-flash-fin-free", variant: "default" },
    snapshot: "abc",
    time: { start: 90 },
    tokens: { total: 300, input: 200, output: 100, reasoning: 0, cache: { read: 50, write: 0 } }
  });
  store.prepare(
    "INSERT INTO session_message (id, session_id, type, seq, time_created, time_updated, data) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("msg_live", "ses_live", "assistant", 0, 95, 99, data);
  store.close();

  const usage = readTurnUsage({
    directory: "/tmp/lccst-bench-x",
    candidates: [file],
    window: { fromTime: 90, toTime: 100 }
  });
  assert(usage !== null, "the live opencode schema is read");
  assert(usage?.promptTokens === 200, "the live opencode schema counts fresh prompt tokens");
  assert(usage?.cacheReadTokens === 50, "the live opencode schema counts cache reads");
  assert(
    usage?.models[0] === "opencode/ling-3.0-flash-fin-free",
    "the live opencode schema names the model from the nested object"
  );
  assert(usage?.text.includes("9f8e7d6c"), "the live opencode schema yields the run token");
  assert(
    !usage?.text.includes("internal thought"),
    "a reasoning part is not the text of a turn"
  );
  assert(
    statesToken(usage ?? { text: "" }, "9f8e7d6c"),
    "the live opencode schema verifies the run token"
  );
}

// kilo 7.7.9, legacy schema: `session` plus `message`. The author sits inside
// `data`, the model is a flat `modelID` and `providerID` pair with no `model`
// object at all, and the message row holds no text of any kind.
{
  const file = path.join(storeDir(), "kilo-live.db");
  const store = new DatabaseSync(file);
  store.exec("CREATE TABLE session (id text, directory text, parent_id text, time_updated integer)");
  store.exec("CREATE TABLE message (id text, session_id text, time_created integer, time_updated integer, data text)");
  store.prepare(
    "INSERT INTO session (id, directory, parent_id, time_updated) VALUES (?, ?, ?, ?)"
  ).run("ses_k", "/tmp/lccst-bench-y", null, 100);
  const data = JSON.stringify({
    agent: "build",
    cost: 0,
    finish: "stop",
    mode: "build",
    modelID: "cohere/north-mini-code:free",
    parentID: "ses_k",
    path: { cwd: "/tmp/lccst-bench-y" },
    providerID: "kilo",
    role: "assistant",
    time: { start: 90 },
    tokens: { total: 300, input: 200, output: 100, reasoning: 0, cache: { read: 50, write: 0 } }
  });
  store.prepare(
    "INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)"
  ).run("msg_k", "ses_k", 95, 99, data);
  store.close();

  const usage = readTurnUsage({
    directory: "/tmp/lccst-bench-y",
    candidates: [file],
    window: { fromTime: 90, toTime: 100 }
  });
  assert(usage !== null, "the live kilo schema is read");
  assert(usage?.promptTokens === 200, "the live kilo schema counts fresh prompt tokens");
  assert(
    usage?.models[0] === "kilo/cohere/north-mini-code:free",
    "the live kilo schema names the model from the flat fields"
  );
  assert(
    usage?.models[0] !== undefined,
    "a flat modelID no longer loses the model"
  );
  assert(usage?.text === "", "the live kilo schema holds no text in the message row");
}

// A host that keeps the text of a turn in a table of its own.
{
  const file = path.join(storeDir(), "parts.db");
  const store = new DatabaseSync(file);
  store.exec("CREATE TABLE session (id text, directory text, parent_id text, time_updated integer)");
  store.exec("CREATE TABLE message (id text, session_id text, time_created integer, data text)");
  store.exec("CREATE TABLE part (id text, message_id text, session_id text, time_created integer, data text)");
  store.prepare(
    "INSERT INTO session (id, directory, parent_id, time_updated) VALUES (?, ?, ?, ?)"
  ).run("ses_p", "/tmp/lccst-bench-z", null, 100);
  store.prepare("INSERT INTO message (id, session_id, time_created, data) VALUES (?, ?, ?, ?)").run(
    "msg_p",
    "ses_p",
    95,
    JSON.stringify({
      role: "assistant",
      modelID: "stepfun/step-3.7-flash:free",
      providerID: "kilo",
      tokens: { input: 10, output: 5, cache: { read: 2, write: 0 } }
    })
  );
  store.prepare("INSERT INTO part (id, message_id, session_id, time_created, data) VALUES (?, ?, ?, ?, ?)").run(
    "prt_1",
    "msg_p",
    "ses_p",
    95,
    JSON.stringify({ type: "text", text: "My run token is 1a2b3c4d." })
  );
  store.prepare("INSERT INTO part (id, message_id, session_id, time_created, data) VALUES (?, ?, ?, ?, ?)").run(
    "prt_2",
    "msg_p",
    "ses_p",
    96,
    JSON.stringify({ type: "tool", state: {} })
  );
  store.close();

  const usage = readTurnUsage({
    directory: "/tmp/lccst-bench-z",
    candidates: [file],
    window: { fromTime: 90, toTime: 100 }
  });
  assert(usage?.text.includes("1a2b3c4d"), "a part table yields the run token");
  assert(statesToken(usage ?? { text: "" }, "1a2b3c4d"), "a part table verifies the run token");
  assert(
    usage?.models[0] === "kilo/stepfun/step-3.7-flash:free",
    "a part table still names the model"
  );
}

// -- Reader unit behaviour for the new shapes ----------------------
assert(
  readModel("assistant", { modelID: "step:free", providerID: "kilo" }) === "kilo/step:free",
  "a flat modelID names the model"
);
assert(
  readModel("assistant", { model: { providerID: "kilo", modelID: "step:free" } }) === "kilo/step:free",
  "a nested modelID names the model"
);
assert(
  readModel("assistant", { model: { providerID: "opencode", id: "x-free" } }) === "opencode/x-free",
  "a nested id names the model"
);
assert(
  readModel("assistant", { model: "opencode/x" }) === "opencode/x",
  "a plain string names the model"
);
assert(
  readModel("assistant", { modelID: "step:free" }) === "step:free",
  "a flat modelID without a provider names the model"
);
assert(readModel("assistant", {}) === null, "a turn with no model names none");
assert(readModel("user", { modelID: "x" }) === null, "a user turn names no model");

assert(
  readText("assistant", { content: [{ type: "text", text: "hello" }] }) === "hello",
  "a content list yields the text"
);
assert(
  readText("assistant", { parts: [{ type: "text", text: "hello" }] }) === "hello",
  "a parts list yields the text"
);
assert(
  readText("assistant", { content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }) === "a\nb",
  "several text parts are joined"
);
assert(
  readText("assistant", { content: [{ type: "text", text: "a" }], parts: [{ type: "text", text: "a" }] }) === "a",
  "the same text in two lists is not repeated"
);
assert(readText("user", { content: [{ type: "text", text: "x" }] }) === "", "a user turn has no text");
assert(readText("assistant", {}) === "", "a turn with no list has no text");

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
