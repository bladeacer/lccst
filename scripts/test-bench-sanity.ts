import { spawn, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SERVER = path.join(ROOT, "playground", "benchmarks", "mcp-telemetry", "build", "index.js");
// The workspace sits outside the repository, so no ancestor configuration of
// the user can reach the harness, the way a benchmark clean room separates.
const SANITY_ROOT = path.join(os.tmpdir(), "lccst-bench-sanity");
// The check matches a spawned server by its working directory, which reads
// the process table of the operating system.
const PROC = "/proc";

interface Harness {
  /** Name of the harness command. */
  name: string;
  /** Configuration file that the harness reads from its project. */
  config: string;
  /** Model that the configuration pins. The check sends no prompt, so the
   * model of the configuration is never reached. */
  model: string;
  /** Variables that isolate the global configuration of the harness. */
  configVariables: string[];
  /** Flags that the harness needs, such as a private server. */
  flags: string[];
  /** Whether the launch names the model on the command line. A harness
   * restores the model that the user last chose, and the restored model wins
   * over the configuration, so kilo names the model on the command line. */
  namesModel: boolean;
}

const HARNESSES: Harness[] = [
  {
    name: "opencode",
    config: "opencode.json",
    model: "opencode/space-bunny-free",
    flags: ["--standalone"],
    configVariables: ["OPENCODE_CONFIG_DIR"],
    namesModel: false
  },
  {
    name: "kilo",
    config: "kilo.json",
    model: "kilo/stepfun/step-3.7-flash:free",
    flags: [],
    configVariables: ["KILO_CONFIG_DIR"],
    namesModel: true
  }
];

// The harness starts its MCP servers when the session opens. The check waits
// for the telemetry server of the clean room to appear, and it gives up when
// the harness stays silent for too long.
const BOOT_TIMEOUT_MS = 90000;
const POLL_INTERVAL_MS = 250;
const EXIT_TIMEOUT_MS = 10000;
const TAIL_LIMIT = 4000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The generated benchmark configuration names the same servers. The path of
// the telemetry server stays relative to the workspace, the way the Makefile
// writes it, so the check also catches a broken relative path.
function writeConfig(workspace: string, harness: Harness): void {
  const relativeServer = path.relative(workspace, SERVER);
  const config = {
    model: harness.model,
    instructions: ["AGENTS.md"],
    // The snapshot feature of a harness writes into a git repository. The
    // workspace of this check holds no work, so the feature stays off.
    snapshot: false,
    mcp: {
      // The check must not inherit a server or a plugin of the user, because
      // an inherited server changes the tool list of the harness.
      lccst: { enabled: false },
      headroom: { enabled: false },
      "lccst-telemetry": {
        type: "local",
        command: ["node", relativeServer],
        cwd: workspace,
        environment: {
          LCCST_TELEMETRY_FILE: path.join(workspace, "runtime-telemetry.json")
        },
        enabled: true
      }
    }
  };
  fs.writeFileSync(path.join(workspace, harness.config), `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * The pids of the telemetry servers that run inside one workspace.
 *
 * The harness spawns the server with a relative path and the workspace as the
 * working directory, so the working directory separates the server of the
 * check from the server of another session on the same machine. The function
 * returns null when the operating system exposes no process table, because a
 * missing table cannot prove a missing server.
 */
function telemetryChildren(workspace: string): number[] | null {
  if (!fs.existsSync(PROC)) {
    return null;
  }
  const marker = path.join("mcp-telemetry", "build", "index.js");
  const found: number[] = [];
  for (const entry of fs.readdirSync(PROC)) {
    if (!/^\d+$/.test(entry)) {
      continue;
    }
    try {
      const pid = Number(entry);
      const cmdline = fs.readFileSync(path.join(PROC, entry, "cmdline"), "utf-8");
      if (!cmdline.includes(marker)) {
        continue;
      }
      if (fs.readlinkSync(path.join(PROC, entry, "cwd")) === workspace) {
        found.push(pid);
      }
    } catch {
      // The process left between the directory listing and the read.
    }
  }
  return found;
}

function killGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    // The harness starts in its own process group, so the group signal also
    // reaches the telemetry server that the harness spawned.
    process.kill(-pid, signal);
  } catch {
    // The process group left before the signal arrived.
  }
}

function waitForExit(child: ReturnType<typeof spawn>, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (exited: boolean) => {
      if (settled) return;
      settled = true;
      resolve(exited);
    };
    child.once("exit", () => settle(true));
    setTimeout(() => settle(false), timeoutMs);
  });
}

function tail(buffer: string): string {
  return buffer.slice(-TAIL_LIMIT).split("\n").slice(-8).join("\n");
}

async function runCase(harness: Harness): Promise<void> {
  console.log(`\nHarness: ${harness.name}`);

  if (!hasCommand(harness.name)) {
    skip(`${harness.name} connection`, `the command ${harness.name} is not on the path`);
    return;
  }
  const workspace = path.join(SANITY_ROOT, harness.name);
  if (telemetryChildren(workspace) === null) {
    skip(`${harness.name} connection`, `the operating system exposes no ${PROC} process table`);
    return;
  }

  fs.rmSync(workspace, { recursive: true, force: true });
  fs.mkdirSync(path.join(workspace, "harness-config"), { recursive: true });
  fs.mkdirSync(path.join(workspace, "harness-state"), { recursive: true });
  writeConfig(workspace, harness);
  fs.writeFileSync(
    path.join(workspace, "AGENTS.md"),
    "# Sanity Check\n\nNo prompt reaches the model.\n"
  );

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    XDG_STATE_HOME: path.join(workspace, "harness-state")
  };
  for (const variable of harness.configVariables) {
    env[variable] = path.join(workspace, "harness-config");
  }
  const args = [
    ...harness.flags,
    ...(harness.namesModel ? ["--model", harness.model] : [])
  ];

  console.log(`  Opening ${harness.name} without a prompt...`);
  const child = spawn(harness.name, args, {
    cwd: workspace,
    env,
    // The own process group lets the close step reach the spawned server.
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderrBuffer = "";
  child.stderr?.on("data", (data: Buffer) => {
    stderrBuffer += data.toString();
    if (stderrBuffer.length > TAIL_LIMIT * 2) {
      stderrBuffer = stderrBuffer.slice(-TAIL_LIMIT);
    }
  });
  // The terminal interface writes its drawing commands into the pipe. The
  // check reads no drawing, but the pipe must still be drained.
  child.stdout?.resume();

  let spawnError = "";
  child.on("error", (error: Error) => {
    spawnError = error.message;
  });

  let exited = false;
  child.once("exit", () => {
    exited = true;
  });

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  let children: number[] | null = [];
  while (Date.now() < deadline) {
    if (spawnError.length > 0 || exited) {
      break;
    }
    children = telemetryChildren(workspace);
    if (children !== null && children.length > 0) {
      break;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  if (spawnError.length > 0) {
    assert(false, `${harness.name} opened (${spawnError})`);
    return;
  }
  assert(!exited, `${harness.name} stayed open until the server connected`);
  if (exited) {
    if (stderrBuffer.trim().length > 0) {
      console.error(tail(stderrBuffer));
    }
    return;
  }
  assert(
    children !== null && children.length > 0,
    `${harness.name} spawned the telemetry server of the clean room ` +
      `(${children?.length ?? 0} processes)`
  );

  killGroup(child.pid ?? 0, "SIGTERM");
  const closed = await waitForExit(child, EXIT_TIMEOUT_MS);
  if (!closed) {
    killGroup(child.pid ?? 0, "SIGKILL");
    await waitForExit(child, EXIT_TIMEOUT_MS);
  }
  assert(closed, `${harness.name} left after the close signal`);

  // A server that outlives the harness would write into the telemetry file of
  // the next run, so the close must reach the server.
  let leftovers: number[] | null = [];
  const closeDeadline = Date.now() + 5000;
  while (Date.now() < closeDeadline) {
    leftovers = telemetryChildren(workspace);
    if (leftovers !== null && leftovers.length === 0) {
      break;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  for (const pid of leftovers ?? []) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The process left on its own.
    }
  }
  assert(
    leftovers !== null && leftovers.length === 0,
    `${harness.name} left no telemetry server behind`
  );
}

console.log("LCCST: Harness connection sanity checks\n");
console.log("The check opens the harness the way a benchmark run opens it, and it");
console.log("closes the harness without sending the prompt, so no model is reached.");

const selected = process.argv.slice(2);
const cases = selected.length > 0
  ? HARNESSES.filter((harness) => selected.includes(harness.name))
  : HARNESSES;

if (cases.length === 0) {
  console.error(`No known harness in: ${selected.join(", ")}`);
  process.exit(1);
}

for (const harness of cases) {
  await runCase(harness);
}

fs.rmSync(SANITY_ROOT, { recursive: true, force: true });

console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
