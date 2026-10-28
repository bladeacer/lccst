import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

// --- Structured JSON envelope ------------------------------------
interface Envelope {
  success: boolean;
  step: string;
  payload: Record<string, unknown>;
  next_action: string;
  [key: string]: unknown;
}

/**
 * The output schema that every tool declares. Each tool reply is one
 * envelope, so one schema serves every tool. The SDK validates the
 * structured content of a reply against this schema.
 */
const ENVELOPE_OUTPUT_SCHEMA = {
  success: z.boolean().describe("Whether the step ran without a protocol error."),
  step: z.string().describe("The protocol step that produced this reply."),
  payload: z.record(z.string(), z.unknown()).describe("Step-specific fields."),
  next_action: z.string().describe("The next action for the caller."),
};

function envelope(
  step: string,
  payload: Record<string, unknown>,
  next_action: string,
  success: boolean = true,
): ToolReply {
  const env: Envelope = { success, step, payload, next_action };
  return { content: [{ type: "text", text: JSON.stringify(env) }], structuredContent: env };
}

/** One tool reply: an envelope with structured content, or a plain error. */
type ToolReply =
  | { content: { type: "text"; text: string }[]; structuredContent: Envelope }
  | { content: { type: "text"; text: string }[]; isError: true };

/**
 * Reply through the envelope with `success: false` and a `payload.error`
 * object. Every reply uses one envelope shape, so a client never parses two
 * reply forms.
 */
function errorReply(step: string, text: string): ToolReply {
  return envelope(step, { error: text }, text, false);
}

// --- Runtime context ------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); // lccst install root (SKILL.md, package.json)
const WORKSPACE = process.env.LCCST_WORKSPACE || process.cwd(); // client project root

// --- Target path resolution -----------------------------------------
// Tools default to the client workspace root (the cwd of the MCP server,
// which hosts spawn as the project being edited), not the lccst install dir.
export function resolveTarget(raw: string | undefined, base?: string): string | null {
  const b = base ?? WORKSPACE;
  let p = (raw ?? "").trim();
  if (!p || p === ".") return isDirectory(b) ? b : null;
  if (p === "~") p = os.homedir();
  else if (p.startsWith("~/")) p = path.join(os.homedir(), p.slice(2));
  const abs = path.isAbsolute(p) ? path.normalize(p) : path.resolve(b, p);
  return isDirectory(abs) ? abs : null;
}

/** Say whether a path names an existing directory. */
function isDirectory(target: string): boolean {
  try { return fs.statSync(target).isDirectory(); } catch { return false; }
}

function targetError(raw?: string): string {
  const shown = raw && raw.trim() ? raw.trim() : ".";
  return `Error: path "${shown}" does not exist. Workspace root: ${WORKSPACE}`;
}

// --- Tooling Ladder: project detection -------------------------------
export interface ProjectInfo {
  type: "python" | "node" | "go" | "rust" | "cmake" | "makefile" | "unknown";
  manifest: string;
  testCommand: string[];
  formatCommand?: string[];
  lintCommand?: string[];
  buildCommand?: string[];
}

const MANIFEST_PRIORITY: Array<{ manifest: string; type: ProjectInfo["type"]; test: string[]; format?: string[]; lint?: string[]; build?: string[] }> = [
  { manifest: "pyproject.toml", type: "python", test: ["uv", "run", "pytest"], format: ["uv", "run", "ruff", "format"], lint: ["uv", "run", "ruff", "check"] },
  { manifest: "Cargo.toml", type: "rust", test: ["cargo", "test"], format: ["cargo", "fmt"], lint: ["cargo", "clippy"], build: ["cargo", "build"] },
  { manifest: "go.mod", type: "go", test: ["go", "test", "./..."], format: ["gofmt", "-l", "."], lint: ["go", "vet", "./..."], build: ["go", "build", "./..."] },
  { manifest: "package.json", type: "node", test: ["pnpm", "test"], format: ["pnpm", "run", "format"], lint: ["pnpm", "run", "lint"], build: ["pnpm", "run", "build"] },
  { manifest: "Makefile", type: "makefile", test: ["make", "test"], build: ["make", "build"] },
  { manifest: "CMakeLists.txt", type: "cmake", test: ["ctest"], build: ["cmake", "--build", "."] },
];

export function detectProject(root: string): ProjectInfo {
  for (const entry of MANIFEST_PRIORITY) {
    if (fs.existsSync(path.join(root, entry.manifest))) {
      return {
        type: entry.type,
        manifest: entry.manifest,
        testCommand: entry.test,
        formatCommand: entry.format,
        lintCommand: entry.lint,
        buildCommand: entry.build,
      };
    }
  }
  return { type: "unknown", manifest: "", testCommand: [] };
}

// --- Native tooling discovery (Makefile, package scripts, shell utils) --
export interface TaskRunnerInfo {
  mise: boolean;
  just: boolean;
  taskfile: boolean;
}

export interface ToolingReport {
  makeTargets: string[];
  packageScripts: Record<string, string>;
  shellScripts: string[];
  taskRunners: TaskRunnerInfo;
}

export function listMakeTargets(root: string): string[] {
  const targets = new Set<string>();
  const visiting = new Set<string>();
  const makefile = path.join(root, "Makefile");
  if (fs.existsSync(makefile)) {
    readMakefile(makefile, targets, visiting);
  }
  return [...targets].sort();
}

function readMakefile(filePath: string, targets: Set<string>, visiting: Set<string>): void {
  if (visiting.has(filePath)) return;
  visiting.add(filePath);
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  let continuation = "";
  for (const line of lines) {
    // Recipe lines start with a tab and are not targets.
    if (line.startsWith("\t")) continue;
    // Handle line continuations: a trailing backslash joins the next line.
    const combined = continuation + line.trimEnd();
    if (combined.endsWith("\\")) {
      continuation = combined.slice(0, -1);
      continue;
    }
    continuation = "";
    const trimmed = combined.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith(".")) continue;
    if (/[:+?]=/.test(trimmed)) continue;
    const includeMatch = trimmed.match(/^include\s+(.+)$/);
    if (includeMatch) {
      for (const pattern of includeMatch[1].split(/\s+/)) {
        if (!pattern || pattern.startsWith("#")) continue;
        const included = path.resolve(path.dirname(filePath), pattern);
        if (fs.existsSync(included)) {
          readMakefile(included, targets, visiting);
        }
      }
      continue;
    }
    const m = trimmed.match(/^([A-Za-z0-9_][A-Za-z0-9_.%/-]*)\s*:/);
    if (m) targets.add(m[1]);
  }
  visiting.delete(filePath);
}

export function listPackageScripts(root: string): Record<string, string> {
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return (pkg.scripts ?? {}) as Record<string, string>;
  } catch {
    return {};
  }
}

export function listShellScripts(root: string): string[] {
  const dir = path.join(root, "scripts");
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    if (!stat.isFile()) continue;
    const isExec = (stat.mode & 0o111) !== 0;
    if (isExec || /\.(sh|py|js|ts|mjs|cjs)$/.test(entry)) out.push(path.join("scripts", entry));
  }
  return out;
}

export function discoverTooling(root: string): ToolingReport {
  return {
    makeTargets: listMakeTargets(root),
    packageScripts: listPackageScripts(root),
    shellScripts: listShellScripts(root),
    taskRunners: {
      mise: declaresMiseTask(root, "test") || declaresMiseTask(root, "lint") || declaresMiseTask(root, "format") || declaresMiseTask(root, "build"),
      just: declaresJustRecipe(root, "test") || declaresJustRecipe(root, "lint") || declaresJustRecipe(root, "format") || declaresJustRecipe(root, "build"),
      taskfile: declaresTaskfileTask(root, "test") || declaresTaskfileTask(root, "lint") || declaresTaskfileTask(root, "format") || declaresTaskfileTask(root, "build"),
    },
  };
}

// --- Command resolution & execution ----------------------------------
export type ProjectStep = "test" | "lint" | "format" | "build";

/** Say whether a mise.toml declares the task, by section or by key. */
export function declaresMiseTask(root: string, kind: ProjectStep): boolean {
  const file = path.join(root, "mise.toml");
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf-8");
  if (new RegExp(`^\\s*\\[tasks\\.${kind}\\]`, "m").test(text)) return true;
  const lines = text.split("\n");
  let inTasks = false;
  for (const line of lines) {
    if (/^\s*\[tasks\]\s*(#.*)?$/.test(line)) { inTasks = true; continue; }
    if (/^\s*\[/.test(line)) { inTasks = false; continue; }
    if (inTasks && new RegExp(`^\\s*${kind}\\s*=`).test(line)) return true;
  }
  return false;
}

/** Say whether a justfile declares the recipe. */
export function declaresJustRecipe(root: string, kind: ProjectStep): boolean {
  const file = path.join(root, "justfile");
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf-8");
  return new RegExp(`^${kind}(\\s+\\S+)*\\s*:`, "m").test(text);
}

/** Say whether a Taskfile.yml declares the task under its tasks table. */
export function declaresTaskfileTask(root: string, kind: ProjectStep): boolean {
  const file = path.join(root, "Taskfile.yml");
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf-8");
  if (!/^tasks\s*:/m.test(text)) return false;
  return new RegExp(`^\\s+${kind}\\s*:(\\s|$)`, "m").test(text);
}

export function resolveCommand(root: string, kind: ProjectStep): string[] | null {
  // Task runners first: a runner wins only when its file exists in the root
  // and declares the task. A runner file that declares no task is skipped,
  // because a runner command that names no task cannot succeed.
  const makeTargets = listMakeTargets(root);
  if (makeTargets.includes(kind)) return ["make", kind];
  if (declaresMiseTask(root, kind)) return ["mise", "run", kind];
  if (declaresJustRecipe(root, kind)) return ["just", kind];
  if (declaresTaskfileTask(root, kind)) return ["task", kind];
  const project = detectProject(root);
  const map: Record<ProjectStep, string[] | undefined> = {
    test: project.testCommand,
    lint: project.lintCommand,
    format: project.formatCommand,
    build: project.buildCommand,
  };
  const cmd = map[kind];
  // A Makefile manifest won above only when the target exists. When the
  // target is missing, `make <kind>` cannot succeed, so fall through.
  if (cmd && cmd.length > 0 && project.type !== "makefile") return cmd;
  // Tooling Ladder completion: when the manifest names no command for this
  // step, use a package.json script of the same name, then a scripts/ helper
  // of the same name. A Makefile target already won above.
  const scripts = listPackageScripts(root);
  if (scripts[kind]) return ["pnpm", "run", kind];
  const helper = listShellScripts(root).find(s => {
    const base = path.basename(s).replace(/\.[^.]+$/, "");
    return base === kind || base === `${kind}s`;
  });
  if (helper) {
    if (helper.endsWith(".sh")) {
      if (process.platform === "win32" &&
          !process.env.MSYSTEM &&
          !process.env.WSL_DISTRO_NAME &&
          !process.env.OSTYPE?.includes("msys")) {
        return ["pwsh", "-Command", `& \"${helper}\"`];
      }
      return ["bash", helper];
    }
    if (helper.endsWith(".py")) return ["python3", helper];
    if (helper.endsWith(".ts")) return ["npx", "tsx", helper];
    return ["node", helper];
  }
  return null;
}

// --- Deliverable tier audit ------------------------------------------
/** The most evidence paths that one reply lists. The count is always exact. */
export const COMPLIANCE_EVIDENCE_LIMIT = 10;

/** Directories that hold generated or installed output, not deliverables. */
const COMPLIANCE_SKIP_DIRS = ["node_modules", "dist", ".venv", "target", "build", "vendor", "coverage"];

export interface ComplianceEvidence {
  /** The first `COMPLIANCE_EVIDENCE_LIMIT` matched paths. */
  paths: string[];
  /** The total number of matched paths. */
  count: number;
}

export interface ComplianceReport {
  mustHave: {
    unitTests: boolean;
    docstrings: boolean;
    unitTestFiles: ComplianceEvidence;
    docstringFiles: ComplianceEvidence;
  };
  niceToHave: {
    apiDocs: boolean;
    changelog: boolean;
    apiDocPaths: string[];
    changelogPaths: string[];
  };
}

/**
 * Collect the paths under `root` whose file name matches a pattern.
 *
 * The result holds the first `COMPLIANCE_EVIDENCE_LIMIT` matched paths and
 * the total count, so a reply stays small while the count stays exact.
 */
function collectMatches(root: string, patterns: RegExp[]): ComplianceEvidence {
  const paths: string[] = [];
  let count = 0;
  const walk = (current: string, depth: number): void => {
    if (depth > 4) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || COMPLIANCE_SKIP_DIRS.includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { walk(full, depth + 1); continue; }
      if (patterns.some(p => p.test(entry.name))) {
        count++;
        if (paths.length < COMPLIANCE_EVIDENCE_LIMIT) paths.push(path.relative(root, full));
      }
    }
  };
  if (fs.existsSync(root)) walk(root, 0);
  return { paths, count };
}

export function auditCompliance(root: string): ComplianceReport {
  const testPatterns = [
    /\.test\.(ts|tsx|js|jsx)$/,
    /\.spec\.(ts|tsx|js|jsx)$/,
    /^test_.*\.py$/,
    /_test\.py$/,
    /_test\.go$/,
    /\.test\.rs$/,
    /.*_test\.rs$/,
  ];
  const unitTestFiles = collectMatches(root, testPatterns);
  const srcDir = path.join(root, "src");
  const docstringFiles = collectDocstrings(fs.existsSync(srcDir) ? srcDir : root, root);

  const apiDocCandidates = ["docs/api-docs", "docs/reference", "docs/api", "api-docs", "reference"];
  const apiDocPaths = apiDocCandidates.filter(rel => fs.existsSync(path.join(root, rel)));
  const changelogCandidates = ["docs/changelogs", "CHANGELOG.md", "changelog.md"];
  const changelogPaths = changelogCandidates.filter(rel => fs.existsSync(path.join(root, rel)));

  return {
    mustHave: {
      unitTests: unitTestFiles.count > 0,
      docstrings: docstringFiles.count > 0,
      unitTestFiles,
      docstringFiles,
    },
    niceToHave: {
      apiDocs: apiDocPaths.length > 0,
      changelog: changelogPaths.length > 0,
      apiDocPaths,
      changelogPaths,
    },
  };
}

/**
 * Collect the source files under `dir` that hold a docstring marker.
 *
 * The paths are relative to `root`, so the evidence names project paths.
 */
function collectDocstrings(dir: string, root: string): ComplianceEvidence {
  const paths: string[] = [];
  let count = 0;
  if (!fs.existsSync(dir)) return { paths, count };
  const markers = ["/**", "\"\"\"", "///", "## "];
  const walk = (current: string, depth: number): void => {
    if (depth > 4) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || COMPLIANCE_SKIP_DIRS.includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { walk(full, depth + 1); continue; }
      if (/\.(py|ts|tsx|js|jsx|go|rs)$/.test(entry.name)) {
        try {
          const head = fs.readFileSync(full, "utf-8").slice(0, 2000);
          if (markers.some(m => head.includes(m))) {
            count++;
            if (paths.length < COMPLIANCE_EVIDENCE_LIMIT) paths.push(path.relative(root, full));
          }
        } catch { continue; }
      }
    }
  };
  walk(dir, 0);
  return { paths, count };
}

/** The maximum number of output characters that a reply carries. */
export const MAX_COMMAND_OUTPUT_CHARS = 20000;

export interface RunResult {
  command: string[];
  output: string;
  code: number;
  /** Whether the output was cut at `MAX_COMMAND_OUTPUT_CHARS`. */
  truncated: boolean;
}

/** Cut a string at the output cap and report whether a cut happened. */
function capOutput(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_COMMAND_OUTPUT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_COMMAND_OUTPUT_CHARS), truncated: true };
}

export function runCommand(command: string[], cwd: string): RunResult {
  // The executor buffer sits above the cap, so a large log is cut by the
  // cap instead of failing with ENOBUFS.
  const maxBuffer = MAX_COMMAND_OUTPUT_CHARS * 500;
  const timeout = Number(process.env.LCCST_COMMAND_TIMEOUT ?? 300) * 1000;
  try {
    const raw = execFileSync(command[0], command.slice(1), { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], maxBuffer, timeout }).toString().trim();
    const capped = capOutput(raw);
    return { command, output: capped.text, code: 0, truncated: capped.truncated };
  } catch (e: any) {
    const stderr = e?.stderr?.toString?.() ?? "";
    const stdout = e?.stdout?.toString?.() ?? "";
    if (e?.code === 'ETIMEDOUT' || e?.signal === 'SIGTERM') {
      const capped = capOutput((stdout + stderr).trim() || `The command exceeded ${timeout / 1000} seconds.`);
      return { command, output: capped.text, code: 124, truncated: capped.truncated };
    }
    const capped = capOutput((stdout + stderr).trim() || String(e?.message ?? e));
    return { command, output: capped.text, code: e?.status ?? 1, truncated: capped.truncated };
  }
}

export function detectTool(name: string): boolean {
  if (!name) return false;
  const suffixes = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const suffix of suffixes) {
      try { fs.accessSync(path.join(dir, name + suffix), fs.constants.X_OK); return true; }
      catch { /* keep looking */ }
    }
  }
  return false;
}

export interface EnvReport {
  project: ProjectInfo;
  tools: Record<string, boolean>;
  conventions: string[];
}

export function scanEnvironment(root: string): EnvReport {
  const project = detectProject(root);
  // Only the executable token names a tool. The later tokens of a test command
  // are arguments, such as the `run` and `pytest` of `uv run pytest`, so the
  // probe must not report them as installed tools.
  const executable = project.testCommand[0];
  const tools: Record<string, boolean> = {};
  if (executable) tools[executable] = detectTool(executable);
  tools["git"] = detectTool("git");
  const conventions: string[] = [];
  if (fs.existsSync(path.join(root, ".editorconfig"))) conventions.push("editorconfig");
  if (fs.existsSync(path.join(root, ".prettierrc")) || fs.existsSync(path.join(root, ".prettierrc.json"))) conventions.push("prettier");
  if (fs.existsSync(path.join(root, "rustfmt.toml"))) conventions.push("rustfmt");
  if (fs.existsSync(path.join(root, ".golangci.yml"))) conventions.push("golangci-lint");
  return { project, tools, conventions };
}

// --- Atomic file write ----------------------------------------------
/**
 * Write a file through a temporary file and a rename.
 *
 * A stop in the middle of a plain write leaves a corrupt file. A rename is
 * atomic on the same file system, so a reader sees the old file or the new
 * file, never a half-written one.
 */
function writeFileAtomic(filePath: string, data: string): void {
  const tmpPath = filePath + ".tmp";
  fs.writeFileSync(tmpPath, data);
  fs.renameSync(tmpPath, filePath);
}

// --- State persistence (.lccst/state.json) ---------------------------
export interface SwarmStateData {
  phase: string;
  clusters: string[];
  currentCluster: number;
  errors: string[];
  mode?: "strict" | "lean";
  timestamp: number;
}

const DEFAULT_STATE: SwarmStateData = {
  phase: "init", clusters: [], currentCluster: 0, errors: [], timestamp: Date.now(),
};

export class SwarmState {
  private filePath: string;
  /** Structured warnings for the caller. A tool reads them from the reply. */
  readonly warnings: string[] = [];

  constructor(root: string) {
    this.filePath = path.resolve(root, ".lccst", "state.json");
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  read(): SwarmStateData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8").trim();
        if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw), timestamp: Date.now() };
      }
    } catch (e) {
      this.warnings.push(`corrupt state file at ${this.filePath}, returned the default state: ${String((e as Error)?.message ?? e)}`);
    }
    return { ...DEFAULT_STATE, timestamp: Date.now() };
  }

  write(data: Partial<SwarmStateData>): void {
    const merged = { ...this.read(), ...data, timestamp: Date.now() };
    try {
      writeFileAtomic(this.filePath, JSON.stringify(merged, null, 2) + "\n");
    } catch (e) {
      this.warnings.push(`state write failed at ${this.filePath}: ${String((e as Error)?.message ?? e)}`);
    }
  }

  clear(): void {
    try { if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath); }
    catch (e) { this.warnings.push(`state clear failed at ${this.filePath}: ${String((e as Error)?.message ?? e)}`); }
  }

  get path(): string { return this.filePath; }
}

// --- Observability event logging (.lccst/events.jsonl) ---------------
/** The size cap of `events.jsonl` in bytes. Past the cap the file rotates. */
export const EVENT_FILE_MAX_BYTES = 256 * 1024;

/**
 * Append one JSON line to `events.jsonl`.
 *
 * When the file passes `EVENT_FILE_MAX_BYTES`, the file keeps the newest
 * entries up to half the cap. Logging must never break a tool, so a failure
 * here is silent by design; the state warnings carry the errors that a
 * caller must see.
 */
export function logEvent(root: string, event: Record<string, unknown>): void {
  try {
    const dir = path.resolve(root, ".lccst");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "events.jsonl");
    const entry = { ...event, timestamp: Date.now() };
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
    if (fs.statSync(file).size > EVENT_FILE_MAX_BYTES) {
      const lines = fs.readFileSync(file, "utf-8").split("\n").filter(Boolean);
      const kept: string[] = [];
      let bytes = 0;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (bytes + lines[i].length + 1 > EVENT_FILE_MAX_BYTES / 2) break;
        kept.unshift(lines[i]);
        bytes += lines[i].length + 1;
      }
      writeFileAtomic(file, kept.length > 0 ? kept.join("\n") + "\n" : "");
    }
  } catch { /* a logging failure must not fail a tool call */ }
}

// --- Hunk clustering helper -----------------------------------------
export interface Cluster {
  scope: string;
  files: string[];
  suggestion: string;
}

/**
 * Read the file lines of a `git diff --stat` output.
 *
 * The output ends with a summary line, such as `3 files changed, 7
 * insertions(+)`, which names no file. A file line holds a `|` separator, so
 * the helper keeps those lines only. The count of the result is the file count.
 */
export function diffStatFiles(stat: string): string[] {
  return stat.split("\n").map(line => line.trim()).filter(line => line.includes("|"));
}

export interface GitChanges {
  /** Whether git answered. A false value means the path is no repository. */
  ok: boolean;
  /** File lines of `git diff --cached --stat`. */
  staged: string[];
  /** File lines of `git diff --stat`. */
  unstaged: string[];
  /** Paths that `git status --porcelain` marks untracked (`??`). */
  untracked: string[];
}

/**
 * Read the changed files of a Git working tree.
 *
 * A commit plan must see a new file, so the untracked paths join the staged
 * and the unstaged file lines. The commands run without a shell.
 */
export function gitChanges(root: string): GitChanges {
  const empty: GitChanges = { ok: false, staged: [], unstaged: [], untracked: [] };
  try {
    const stat = (args: string[]): string[] =>
      diffStatFiles(execFileSync("git", args, { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).toString().trim());
    const staged = stat(["diff", "--cached", "--stat"]);
    const unstaged = stat(["diff", "--stat"]);
    const porcelain = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).toString();
    const untracked = porcelain.split("\n")
      .map(line => line.trim())
      .filter(line => line.startsWith("??"))
      .map(line => line.slice(2).trim())
      .filter(Boolean);
    return { ok: true, staged, unstaged, untracked };
  } catch {
    return empty;
  }
}

/**
 * Group file paths by their top-level directory into commit clusters.
 *
 * A path without a slash belongs to the `root` scope. Each cluster carries a
 * commit-message suggestion.
 */
export function clusterPaths(paths: string[]): Cluster[] {
  if (paths.length === 0) return [];
  const groups: Record<string, string[]> = {};
  for (const f of paths) {
    const dir = f.includes("/") ? f.split("/")[0] : "root";
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(f);
  }
  return Object.entries(groups).map(([scope, fileList]) => {
    const type = scope === "root" ? "chore" : "feat";
    return { scope, files: fileList, suggestion: `${type}(${scope}): apply ${fileList.length} file change(s)` };
  });
}

export function clusterHunks(lines: string[]): Cluster[] {
  const files = lines.filter(l => l.includes("|")).map(l => (l.split("|")[0] || "").trim()).filter(Boolean);
  if (files.length === 0) return [{ scope: "root", files: lines, suggestion: "chore: apply workspace changes" }];
  return clusterPaths(files);
}

// --- MCP Server -----------------------------------------------------
const server = new McpServer({
  name: "lccst-locust",
  version: "4.5.0",
});

// Prompt: load SKILL.md into context
server.registerPrompt("swarm", {
  description: "Return the SKILL.md content for the active workspace.",
}, async () => {
  try {
    const skillContent = fs.readFileSync(path.resolve(ROOT, "SKILL.md"), "utf-8");
    return {
      messages: [{
        role: "user",
        content: { type: "text", text: `Active workspace root: ${WORKSPACE}\n\nExecute the following system skill framework precisely:\n\n${skillContent}` },
      }],
    };
  } catch (error: any) {
    return {
      messages: [{
        role: "user",
        content: { type: "text", text: `Internal Error loading downstream blueprint: ${error.message}` },
      }],
    };
  }
});

// Tool: /init
/** The implementation guidance that mirrors the execution checklist of SKILL.md. */
export const WEAK_MODEL_GUIDANCE: string[] = [
  "Implement only the behaviour the task asks for, write each part once, and do not restate the rules in comments. A docstring that describes the behaviour of a public export is content, not a restatement. Do not pad the test file. Extra lines that the behaviour needs are acceptable; extra lines that add no behaviour are waste.",
  "Put each required behaviour into the source file itself. A behaviour that exists only in a test or in reply commentary is not implemented.",
  "Make one plan and implement it in bounded steps. Do not restate the plan between steps, do not re-read a file you already read, and do not loop on read-only inspection.",
];

/** The `mode` argument that every state-changing tool accepts. */
const MODE_ARG = z.enum(["strict", "lean"]).optional().default("strict").describe(
  "Protocol defence level. The server records the mode; the caller enforces it."
);

server.registerTool("init", {
  description: "Map project conventions and verify local environment state.",
  inputSchema: {
    path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root."),
    mode: MODE_ARG,
  },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => {
  const target = resolveTarget(args?.path);
  if (!target) {
    return errorReply("/init", targetError(args?.path));
  }

  const mode = args?.mode ?? "strict";
  const env = scanEnvironment(target);
  const tooling = discoverTooling(target);
  const state = new SwarmState(target);
  state.write({ phase: "init", mode });
  logEvent(target, { event: "init", project: env.project.type, manifest: env.project.manifest, mode });

  return envelope("/init", {
    target,
    project_type: env.project.type,
    manifest: env.project.manifest || "(none detected)",
    tools_available: Object.entries(env.tools).filter(([, v]) => v).map(([k]) => k).join(", ") || "none",
    test_command: env.project.testCommand.join(" ") || "(none)",
    make_targets: tooling.makeTargets.join(", ") || "(none)",
    script_helpers: tooling.shellScripts.join(", ") || "(none)",
    task_runners: tooling.taskRunners,
    conventions: env.conventions,
    mode,
    mode_enforcement: "caller_duty",
    guidance: [...WEAK_MODEL_GUIDANCE],
    ...(state.warnings.length > 0 ? { state_warnings: state.warnings } : {}),
  }, "Run /swarm to begin execution.");
});

// Tool: /audit
server.registerTool("audit", {
  description: "Scan workspace diffs and present an ultra-lean commit plan.",
  inputSchema: {
    path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root."),
    mode: MODE_ARG,
  },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => {
  const target = resolveTarget(args?.path);
  if (!target) {
    return errorReply("/audit", targetError(args?.path));
  }

  const mode = args?.mode ?? "strict";
  const state = new SwarmState(target);
  logEvent(target, { event: "audit_start", mode });

  const changes = gitChanges(target);
  if (!changes.ok) {
    return errorReply("/audit", `${target} is not a git repository, or git is unavailable.`);
  }
  state.write({ phase: "audit", mode });

  if (changes.staged.length === 0 && changes.unstaged.length === 0 && changes.untracked.length === 0) {
    return envelope("/audit", { phase: "clean", path: target, mode, mode_enforcement: "caller_duty" }, "Working tree clean.");
  }

  const stagedClusters = clusterHunks(changes.staged);
  const unstagedClusters = clusterHunks(changes.unstaged);
  const untrackedClusters = clusterPaths(changes.untracked);
  const totalFiles = changes.staged.length + changes.unstaged.length + changes.untracked.length;

  if (changes.staged.length > 0) {
    state.write({ clusters: stagedClusters.map(c => c.suggestion) });
  }

  return envelope("/audit", {
    path: target,
    staged_files: changes.staged.length,
    unstaged_files: changes.unstaged.length,
    untracked_files: changes.untracked.length,
    total_files: totalFiles,
    staged: stagedClusters.map(c => ({ scope: c.scope, files: c.files, suggestion: c.suggestion })),
    unstaged: unstagedClusters.map(c => ({ scope: c.scope, files: c.files, suggestion: c.suggestion })),
    untracked: untrackedClusters.map(c => ({ scope: c.scope, files: c.files, suggestion: c.suggestion })),
    mode,
    mode_enforcement: "caller_duty",
    guidance: [...WEAK_MODEL_GUIDANCE],
    ...(state.warnings.length > 0 ? { state_warnings: state.warnings } : {}),
  }, "Review the commit plan above. Stage each cluster and commit it; the server does not commit.");
});

// Tool: /swarm
server.registerTool("swarm", {
  description: "Discover and cluster workspace changes into a commit plan. The caller stages and commits each cluster; the server does not lint, split, or commit.",
  inputSchema: {
    path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root."),
    dryRun: z.boolean().optional().default(false).describe("Dry-run mode (no mutations)."),
    abort: z.boolean().optional().default(false).describe("Abort an interrupted swarm and clear state."),
    mode: MODE_ARG,
  },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => {
  const target = resolveTarget(args?.path);
  if (!target) {
    return errorReply("/swarm", targetError(args?.path));
  }
  const dryRun = args?.dryRun === true;
  const abort = args?.abort === true;
  const mode = args?.mode ?? "strict";

  if (abort) {
    const state = new SwarmState(target);
    state.clear();
    return envelope("/swarm", { phase: "aborted", path: target, mode }, "State cleared. Run /init to begin again.");
  }

  const state = new SwarmState(target);

  const project = detectProject(target);
  const testCmd = resolveCommand(target, "test");
  logEvent(target, { event: "swarm_start", project: project.type, dryRun, mode });
  if (!testCmd) {
    return envelope("/swarm", { phase: "error", reason: "no_test_runner", mode }, "No test runner detected. Cannot execute swarm.", false);
  }

  const formatCmd = resolveCommand(target, "format");
  const changes = gitChanges(target);
  const statPath = (line: string): string => (line.split("|")[0] || "").trim();
  const changedFiles = [...new Set([
    ...changes.staged.map(statPath),
    ...changes.unstaged.map(statPath),
    ...changes.untracked,
  ].filter(Boolean))];
  const clusterPlan = clusterPaths(changedFiles).map(c => ({
    scope: c.scope,
    files: c.files,
    suggestion: c.suggestion,
    test_command: testCmd.join(" "),
    format_command: formatCmd ? formatCmd.join(" ") : "(none detected)",
  }));

  if (!dryRun) {
    state.write({ phase: "swarm_cluster", clusters: clusterPlan.map(c => c.suggestion), mode });
  }
  logEvent(target, { event: "swarm_cluster", clusters: clusterPlan.length, dryRun });

  return envelope("/swarm", {
    phase: "swarm_cluster",
    project: project.type,
    manifest: project.manifest,
    dry_run: dryRun,
    changes_ok: changes.ok,
    changed_files: changedFiles.length,
    clusters: clusterPlan,
    test_command: testCmd.join(" "),
    format_command: formatCmd ? formatCmd.join(" ") : "(none detected)",
    mode,
    mode_enforcement: "caller_duty",
    commit_boundary: "The server does not commit. The caller stages each cluster and creates the atomic commit.",
    ...(state.warnings.length > 0 ? { state_warnings: state.warnings } : {}),
  }, dryRun
    ? "Dry-run complete. No state persisted. Stage each cluster and commit it."
    : "Stage each cluster in turn and commit it. The server does not commit.");
});

// --- Shared runner for project-step tools ----------------------------
function runStepTool(kind: ProjectStep, args?: { path?: string; dryRun?: boolean; mode?: "strict" | "lean" }): ToolReply {
  const target = resolveTarget(args?.path);
  if (!target) {
    return errorReply(`/${kind}`, targetError(args?.path));
  }
  const dryRun = args?.dryRun === true;
  const mode = args?.mode ?? "strict";
  const cmd = resolveCommand(target, kind);
  if (!cmd) {
    return envelope(`/${kind}`, { phase: "skipped", reason: "no_command", mode, mode_enforcement: "caller_duty" }, `No ${kind} command detected.`);
  }
  if (dryRun) {
    return envelope(`/${kind}`, { phase: "dry_run", command: cmd.join(" "), mode, mode_enforcement: "caller_duty" }, `[DRY-RUN] ${cmd.join(" ")}`);
  }
  const result = runCommand(cmd, target);
  logEvent(target, { event: `${kind}_run`, command: cmd.join(" "), exitCode: result.code });
  return envelope(`/${kind}`, {
    phase: "complete",
    command: cmd.join(" "),
    exitCode: result.code,
    output: result.output || "(no output)",
    truncated: result.truncated,
    mode,
    mode_enforcement: "caller_duty",
  }, result.code === 0
    ? `The ${kind} step passed. Continue with the next step.`
    : `The ${kind} step failed. Fix the failure, then run /${kind} again.`);
}

// Tool: /tooling
server.registerTool("tooling", {
  description: "Inventory native tooling: Makefile targets, package.json scripts, and scripts/ helpers.",
  inputSchema: { path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root.") },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => {
  const target = resolveTarget(args?.path);
  if (!target) {
    return errorReply("/tooling", targetError(args?.path));
  }
  const t = discoverTooling(target);
  return envelope("/tooling", {
    make_targets: t.makeTargets,
    shell_scripts: t.shellScripts,
    package_scripts: Object.keys(t.packageScripts),
    task_runners: t.taskRunners,
  }, "Tooling inventory complete.");
});

// Tool: /lint
server.registerTool("lint", {
  description: "Run the project lint command (Makefile `lint` target first, then manifest lint).",
  inputSchema: {
    path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root."),
    dryRun: z.boolean().optional().default(false).describe("Dry-run mode (no mutations)."),
    mode: MODE_ARG,
  },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => runStepTool("lint", args));

// Tool: /format
server.registerTool("format", {
  description: "Run the project format command (Makefile `format` target first, then manifest format).",
  inputSchema: {
    path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root."),
    dryRun: z.boolean().optional().default(false).describe("Dry-run mode (no mutations)."),
    mode: MODE_ARG,
  },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => runStepTool("format", args));

// Tool: /test
server.registerTool("test", {
  description: "Run the project test command (Makefile `test` target first, then manifest test).",
  inputSchema: {
    path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root."),
    dryRun: z.boolean().optional().default(false).describe("Dry-run mode (no mutations)."),
    mode: MODE_ARG,
  },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => runStepTool("test", args));

// Tool: /build
server.registerTool("build", {
  description: "Run the project build command (Makefile `build` target first, then manifest build).",
  inputSchema: {
    path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root."),
    dryRun: z.boolean().optional().default(false).describe("Dry-run mode (no mutations)."),
    mode: MODE_ARG,
  },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => runStepTool("build", args));

// --- Verify gate ----------------------------------------------------
export interface VerifyReport {
  /** One entry per step. A later step after a failure is reported, not run. */
  results: Record<string, unknown>;
  /** The number of steps that ran and failed. */
  failures: number;
}

/**
 * Run the quality gate: format, lint, test, build.
 *
 * The gate covers all four steps. A step with no command is `skipped`, a
 * step after a failure is `skipped_after_failure`, and a dry run reports
 * `dry_run` for every runnable step. A failed step is never hidden.
 */
export function runVerifySteps(root: string, dryRun: boolean): VerifyReport {
  const steps: ProjectStep[] = ["format", "lint", "test", "build"];
  const results: Record<string, unknown> = {};
  let failed = 0;
  let failedEarlier = false;
  for (const step of steps) {
    const cmd = resolveCommand(root, step);
    if (!cmd) {
      results[step] = "skipped";
      continue;
    }
    if (dryRun) {
      results[step] = "dry_run";
      continue;
    }
    if (failedEarlier) {
      results[step] = "skipped_after_failure";
      continue;
    }
    const result = runCommand(cmd, root);
    logEvent(root, { event: `${step}_run`, command: cmd.join(" "), exitCode: result.code });
    results[step] = { exitCode: result.code, output: result.output, truncated: result.truncated };
    if (result.code !== 0) {
      failed++;
      failedEarlier = true;
    }
  }
  return { results, failures: failed };
}

// Tool: /verify
server.registerTool("verify", {
  description: "Run the full quality gate: format, lint, test, build. Reports a later step as skipped_after_failure when an earlier step fails.",
  inputSchema: {
    path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root."),
    dryRun: z.boolean().optional().default(false).describe("Dry-run mode (no mutations)."),
    mode: MODE_ARG,
  },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => {
  const target = resolveTarget(args?.path);
  if (!target) {
    return errorReply("/verify", targetError(args?.path));
  }
  const dryRun = args?.dryRun === true;
  const mode = args?.mode ?? "strict";
  const report = runVerifySteps(target, dryRun);
  const state = new SwarmState(target);
  state.clear();
  return envelope("/verify", {
    dry_run: dryRun,
    steps: report.results,
    failures: report.failures,
    mode,
    mode_enforcement: "caller_duty",
    ...(state.warnings.length > 0 ? { state_warnings: state.warnings } : {}),
  }, report.failures === 0 ? "PASS" : `Fix the ${report.failures} failing step(s), then run /verify again.`);
});

// Tool: /compliance
server.registerTool("compliance", {
  description: "Audit deliverable tiers: must-haves (unit tests, docstrings) and nice-to-haves (API docs, changelog).",
  inputSchema: { path: z.string().optional().default(".").describe("Workspace-relative or absolute target path; default is the workspace root.") },
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async (args) => {
  const target = resolveTarget(args?.path);
  if (!target) {
    return errorReply("/compliance", targetError(args?.path));
  }
  const report = auditCompliance(target);
  logEvent(target, { event: "compliance_audit", report });
  return envelope("/compliance", {
    must_have: {
      unit_tests: report.mustHave.unitTests,
      unit_tests_count: report.mustHave.unitTestFiles.count,
      unit_tests_evidence: report.mustHave.unitTestFiles.paths,
      docstrings: report.mustHave.docstrings,
      docstrings_count: report.mustHave.docstringFiles.count,
      docstrings_evidence: report.mustHave.docstringFiles.paths,
    },
    nice_to_have: {
      api_docs: report.niceToHave.apiDocs,
      api_docs_evidence: report.niceToHave.apiDocPaths,
      changelog: report.niceToHave.changelog,
      changelog_evidence: report.niceToHave.changelogPaths,
    },
  }, "Audit complete.");
});

// Tool: /version
server.registerTool("version", {
  description: "Report the LCCST protocol and server version.",
  inputSchema: {},
  outputSchema: ENVELOPE_OUTPUT_SCHEMA,
}, async () => {
  let pkgVersion = "(unknown)";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, "package.json"), "utf-8"));
    pkgVersion = pkg.version ?? "(unknown)";
  } catch { /* ignore */ }
  return envelope("/version", { version: pkgVersion }, `LCCST v${pkgVersion}`);
});

// --- Protocol command definitions ----------------------------------
export interface ProtocolCommand {
  name: string;
  description: string;
  args: string[];
}

export const PROTOCOL_COMMANDS: ProtocolCommand[] = [
  { name: "init", description: "Map project conventions and verify local environment state.", args: ["path", "mode"] },
  { name: "audit", description: "Scan workspace diffs and present an ultra-lean commit plan.", args: ["path", "mode"] },
  { name: "swarm", description: "Discover and cluster workspace changes into a commit plan. The caller stages and commits each cluster; the server does not lint, split, or commit.", args: ["path", "mode", "dryRun", "abort"] },
  { name: "tooling", description: "Inventory native tooling: Makefile targets, package.json scripts, and scripts/ helpers.", args: ["path"] },
  { name: "lint", description: "Run the project lint command (Makefile `lint` target first, then manifest lint).", args: ["path", "mode", "dryRun"] },
  { name: "format", description: "Run the project format command (Makefile `format` target first, then manifest format).", args: ["path", "mode", "dryRun"] },
  { name: "test", description: "Run the project test command (Makefile `test` target first, then manifest test).", args: ["path", "mode", "dryRun"] },
  { name: "build", description: "Run the project build command (Makefile `build` target first, then manifest build).", args: ["path", "mode", "dryRun"] },
  { name: "verify", description: "Run the full quality gate: format, lint, test, build. Reports a later step as skipped_after_failure when an earlier step fails.", args: ["path", "mode", "dryRun"] },
  { name: "compliance", description: "Audit deliverable tiers: must-haves (unit tests, docstrings) and nice-to-haves (API docs, changelog).", args: ["path"] },
  { name: "version", description: "Report the LCCST protocol and server version.", args: [] },
];

// --- Start transport (only when run directly, not when imported) ----
const isMainModule = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
);
if (isMainModule) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
