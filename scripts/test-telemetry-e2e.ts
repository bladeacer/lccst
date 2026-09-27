import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SERVER = path.join(ROOT, "playground", "benchmarks", "mcp-telemetry", "build");
const SETTLE = path.join(SERVER, "settle.js");
// The workspace sits outside the repository, so a harness can never reach a
// tracked file of the project from its own workspace.
const E2E_ROOT = path.join(os.tmpdir(), "lccst-telemetry-e2e");

interface Harness {
  /** Name of the harness command. */
  name: string;
  /** Configuration file that the harness reads from its project. */
  config: string;
  /** Model that the run uses, unless the environment names another one. */
  model: string;
  /** Flags that the harness needs, such as a private server. */
  flags: string[];
  /** Variables that isolate the configuration of the harness. */
  configVariables: string[];
}

const HARNESSES: Harness[] = [
  {
    name: "opencode",
    config: "opencode.json",
    model: "opencode/space-bunny-free",
    flags: ["--standalone"],
    configVariables: ["OPENCODE_CONFIG_DIR"]
  },
  {
    name: "kilo",
    config: "kilo.json",
    model: "kilo/stepfun/step-3.7-flash:free",
    flags: [],
    configVariables: ["KILO_CONFIG_DIR"]
  }
];

const PROMPT =
  "Call the lccst-telemetry_log_turn_telemetry tool exactly once with " +
  "subproject react-timer and variant plain. Then reply with the single word done.";

const RUN_TIMEOUT_MS = 300000;

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.error(`  FAIL: ${name}`); }
}

function skip(name: string, reason: string) {
  skipped++;
  console.log(`  SKIP: ${name} (${reason})`);
}

function hasCommand(name: string): boolean {
  try {
    return spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

function writeConfig(workspace: string, harness: Harness): void {
  const relativeServer = path.relative(workspace, path.join(SERVER, "index.js"));
  const config = {
    $schema: "https://opencode.ai/config.json",
    // The snapshot feature of a harness writes into a git repository. The
    // workspace of this test holds no work, so the feature stays off.
    snapshot: false,
    mcp: {
      "lccst-telemetry": {
        type: "local",
        command: ["node", relativeServer],
        enabled: true
      }
    }
  };
  fs.writeFileSync(path.join(workspace, harness.config), `${JSON.stringify(config, null, 2)}\n`);
}

function readTelemetry(workspace: string): Record<string, unknown> | null {
  const file = path.join(workspace, "runtime-telemetry.json");
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function settleTelemetry(workspace: string) {
  return spawnSync("node", [SETTLE, path.join(workspace, "runtime-telemetry.json"), workspace], {
    encoding: "utf-8",
    timeout: RUN_TIMEOUT_MS
  });
}

function runCase(harness: Harness): void {
  console.log(`\nHarness: ${harness.name}`);

  if (!hasCommand(harness.name)) {
    skip(`${harness.name} token usage`, `the command ${harness.name} is not on the path`);
    return;
  }

  const model = process.env.LCCST_E2E_MODEL ?? harness.model;
  const workspace = path.join(E2E_ROOT, harness.name);
  fs.rmSync(workspace, { recursive: true, force: true });
  fs.mkdirSync(path.join(workspace, "config"), { recursive: true });
  // The workspace is its own project root, so no ancestor configuration can add
  // or replace a server.
  spawnSync("git", ["init", "--quiet"], { cwd: workspace, stdio: "ignore" });
  writeConfig(workspace, harness);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LCCST_TELEMETRY_FILE: path.join(workspace, "runtime-telemetry.json")
  };
  for (const variable of harness.configVariables) {
    env[variable] = path.join(workspace, "config");
  }

  console.log(`  Running ${harness.name} with ${model}...`);
  const run = spawnSync(harness.name, ["run", ...harness.flags, "--auto", "--model", model, PROMPT], {
    cwd: workspace,
    encoding: "utf-8",
    timeout: RUN_TIMEOUT_MS,
    env
  });

  if (run.status !== 0) {
    console.error(`  ${harness.name} exited with code ${run.status}.`);
    console.error((run.stderr ?? "").split("\n").slice(-8).join("\n"));
    assert(false, `${harness.name} run finishes`);
    return;
  }

  const beforeSettle = readTelemetry(workspace);
  assert(beforeSettle !== null, `${harness.name} wrote a telemetry file`);
  if (!beforeSettle) {
    return;
  }

  const phases = (beforeSettle.phases ?? []) as Array<Record<string, unknown>>;
  assert(phases.length === 1, `${harness.name} recorded one phase`);

  settleTelemetry(workspace);
  const settled = readTelemetry(workspace);
  assert(settled !== null, `${harness.name} kept the telemetry file after the settle`);

  const prompt = Number(settled?.total_prompt_tokens ?? 0);
  const completion = Number(settled?.total_completion_tokens ?? 0);
  const cacheRead = Number(settled?.total_cache_read_tokens ?? 0);
  const modelTurns = Number(settled?.model_turns ?? 0);

  console.log(
    `  Measured: prompt ${prompt}, completion ${completion}, cache read ${cacheRead}, ` +
      `model turns ${modelTurns}`
  );
  assert(prompt > 0, `${harness.name} counted prompt tokens`);
  assert(completion > 0, `${harness.name} counted completion tokens`);
  assert(modelTurns > 0, `${harness.name} counted model turns`);

  const breakdown = (settled?.breakdown ?? {}) as Record<string, Record<string, Record<string, number>>>;
  const step = breakdown["react-timer"]?.plain;
  assert(
    step !== undefined && step.prompt_tokens === prompt && step.completion_tokens === completion,
    `${harness.name} attributed the counts to the phase`
  );
}

console.log("LCCST: Telemetry end-to-end tests on real harnesses\n");
console.log("The run needs a network connection and a model that the harness can reach.");

const selected = process.argv.slice(2);
const cases = selected.length > 0
  ? HARNESSES.filter((harness) => selected.includes(harness.name))
  : HARNESSES;

if (cases.length === 0) {
  console.error(`No known harness in: ${selected.join(", ")}`);
  process.exit(1);
}

for (const harness of cases) {
  runCase(harness);
}

fs.rmSync(E2E_ROOT, { recursive: true, force: true });

console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
