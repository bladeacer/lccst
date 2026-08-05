import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// --- Runtime context ------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// --- Tooling Ladder: project detection -------------------------------
export interface ProjectInfo {
  type: "python" | "node" | "go" | "rust" | "unknown";
  manifest: string;
  testCommand: string[];
  formatCommand?: string[];
  lintCommand?: string[];
  buildCommand?: string[];
}

const MANIFEST_PRIORITY: Array<{ manifest: string; type: ProjectInfo["type"]; test: string[]; format?: string[]; lint?: string[]; build?: string[] }> = [
  { manifest: "pyproject.toml", type: "python", test: ["uv", "run", "pytest"], format: ["uv", "run", "ruff", "format"], lint: ["uv", "run", "ruff", "check"] },
  { manifest: "package.json", type: "node", test: ["pnpm", "test"], format: ["pnpm", "run", "format"], lint: ["pnpm", "run", "lint"], build: ["pnpm", "run", "build"] },
  { manifest: "Cargo.toml", type: "rust", test: ["cargo", "test"], format: ["cargo", "fmt"], lint: ["cargo", "clippy"], build: ["cargo", "build"] },
  { manifest: "go.mod", type: "go", test: ["go", "test", "./..."], format: ["gofmt", "-l", "."], lint: ["go", "vet", "./..."], build: ["go", "build", "./..."] },
  { manifest: "CMakeLists.txt", type: "unknown", test: ["cmake", "--build", "."], build: ["cmake", "--build", "."] },
  { manifest: "Project.toml", type: "unknown", test: ["julia", "--project=.", "-e", "using Pkg; Pkg.test()"] },
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
export interface ToolingReport {
  makeTargets: string[];
  packageScripts: Record<string, string>;
  shellScripts: string[];
}

export function listMakeTargets(root: string): string[] {
  const makefile = path.join(root, "Makefile");
  if (!fs.existsSync(makefile)) return [];
  const lines = fs.readFileSync(makefile, "utf-8").split("\n");
  const targets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(".")) continue;
    if (/[:+?]=/.test(trimmed)) continue;
    const m = trimmed.match(/^([A-Za-z0-9_][A-Za-z0-9_.%/-]*)\s*:/);
    if (m) targets.push(m[1]);
  }
  return [...new Set(targets)].sort();
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
  const dirs = ["scripts", "tools", "bin", "script"];
  const out: string[] = [];
  for (const d of dirs) {
    const dir = path.join(root, d);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, entry);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (!stat.isFile()) continue;
      const isExec = (stat.mode & 0o111) !== 0;
      if (isExec || /\.(sh|py|js|ts|mjs|cjs)$/.test(entry)) out.push(path.join(d, entry));
    }
  }
  return out;
}

export function discoverTooling(root: string): ToolingReport {
  return {
    makeTargets: listMakeTargets(root),
    packageScripts: listPackageScripts(root),
    shellScripts: listShellScripts(root),
  };
}

// --- Command resolution & execution ----------------------------------
export type ProjectStep = "test" | "lint" | "format" | "build";

export function resolveCommand(root: string, kind: ProjectStep): string[] | null {
  const makeTargets = listMakeTargets(root);
  if (makeTargets.includes(kind)) return ["make", kind];
  const project = detectProject(root);
  const map: Record<ProjectStep, string[] | undefined> = {
    test: project.testCommand,
    lint: project.lintCommand,
    format: project.formatCommand,
    build: project.buildCommand,
  };
  const cmd = map[kind];
  return cmd && cmd.length > 0 ? cmd : null;
}

// --- Deliverable tier audit ------------------------------------------
export interface ComplianceReport {
  mustHave: { unitTests: boolean; docstrings: boolean };
  niceToHave: { apiDocs: boolean; changelog: boolean };
}

function hasAny(dir: string, patterns: RegExp[]): boolean {
  if (!fs.existsSync(dir)) return false;
  const walk = (current: string, depth: number): boolean => {
    if (depth > 4) return false;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === ".venv") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { if (walk(full, depth + 1)) return true; }
      else if (patterns.some(p => p.test(entry.name))) return true;
    }
    return false;
  };
  return walk(dir, 0);
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
  const hasTests = hasAny(root, testPatterns);
  const srcDir = path.join(root, "src");
  const hasDocstrings = hasDocstringInSrc(fs.existsSync(srcDir) ? srcDir : root);

  const apiDocs = fs.existsSync(path.join(root, "docs", "api-docs")) ||
    fs.existsSync(path.join(root, "docs", "reference")) ||
    fs.existsSync(path.join(root, "docs", "api")) ||
    fs.existsSync(path.join(root, "api-docs")) ||
    fs.existsSync(path.join(root, "reference"));
  const changelog = fs.existsSync(path.join(root, "docs", "changelogs")) ||
    fs.existsSync(path.join(root, "CHANGELOG.md")) ||
    fs.existsSync(path.join(root, "changelog.md"));

  return {
    mustHave: { unitTests: hasTests, docstrings: hasDocstrings },
    niceToHave: { apiDocs, changelog },
  };
}

function hasDocstringInSrc(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  const markers = ["/**", "\"\"\"", "///", "## ", "# ", "// "];
  const walk = (current: string, depth: number): boolean => {
    if (depth > 4) return false;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === ".venv") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { if (walk(full, depth + 1)) return true; }
      else if (/\.(py|ts|tsx|js|jsx|go|rs)$/.test(entry.name)) {
        try {
          const head = fs.readFileSync(full, "utf-8").slice(0, 2000);
          if (markers.some(m => head.includes(m))) return true;
        } catch { continue; }
      }
    }
    return false;
  };
  return walk(dir, 0);
}

export interface RunResult {
  command: string[];
  output: string;
  code: number;
}

export function runCommand(command: string[], cwd: string): RunResult {
  try {
    const output = execSync(command.join(" "), { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).toString();
    return { command, output: output.trim(), code: 0 };
  } catch (e: any) {
    const stderr = e?.stderr?.toString?.() ?? "";
    const stdout = e?.stdout?.toString?.() ?? "";
    return { command, output: (stdout + stderr).trim() || String(e?.message ?? e), code: e?.status ?? 1 };
  }
}

export function detectTool(name: string): boolean {
  try { execSync(`which ${name} 2>/dev/null`, { stdio: "ignore" }); return true; }
  catch { return false; }
}

export interface EnvReport {
  project: ProjectInfo;
  tools: Record<string, boolean>;
  conventions: string[];
}

export function scanEnvironment(root: string): EnvReport {
  const project = detectProject(root);
  const requiredTools = project.testCommand.filter(c => !c.startsWith("-") && !c.startsWith(".") && !c.startsWith("./"));
  const tools: Record<string, boolean> = {};
  for (const t of requiredTools) tools[t] = detectTool(t);
  tools["git"] = detectTool("git");
  const conventions: string[] = [];
  if (fs.existsSync(path.join(root, ".editorconfig"))) conventions.push("editorconfig");
  if (fs.existsSync(path.join(root, ".prettierrc")) || fs.existsSync(path.join(root, ".prettierrc.json"))) conventions.push("prettier");
  if (fs.existsSync(path.join(root, "rustfmt.toml"))) conventions.push("rustfmt");
  if (fs.existsSync(path.join(root, ".golangci.yml"))) conventions.push("golangci-lint");
  return { project, tools, conventions };
}

// --- State persistence (.lccst/state.json) ---------------------------
export interface SwarmStateData {
  phase: string;
  clusters: string[];
  currentCluster: number;
  errors: string[];
  timestamp: number;
}

const DEFAULT_STATE: SwarmStateData = {
  phase: "init", clusters: [], currentCluster: 0, errors: [], timestamp: Date.now(),
};

export class SwarmState {
  private filePath: string;
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
    } catch (e) { console.warn("SwarmState: corrupt state file, returning default:", e); }
    return { ...DEFAULT_STATE, timestamp: Date.now() };
  }

  write(data: Partial<SwarmStateData>): void {
    const merged = { ...this.read(), ...data, timestamp: Date.now() };
    fs.writeFileSync(this.filePath, JSON.stringify(merged, null, 2) + "\n");
  }

  clear(): void {
    try { if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath); }
    catch (e) { console.warn("SwarmState: failed to clear state file:", e); }
  }

  get path(): string { return this.filePath; }
}

// --- Observability event logging (.lccst/events.jsonl) ---------------
export function logEvent(root: string, event: Record<string, unknown>): void {
  const dir = path.resolve(root, ".lccst");
  fs.mkdirSync(dir, { recursive: true });
  const entry = { ...event, timestamp: Date.now() };
  fs.appendFileSync(path.join(dir, "events.jsonl"), JSON.stringify(entry) + "\n");
}

// --- Hunk clustering helper -----------------------------------------
export interface Cluster {
  scope: string;
  files: string[];
  suggestion: string;
}

export function clusterHunks(lines: string[]): Cluster[] {
  const files = lines.filter(l => l.includes("|")).map(l => (l.split("|")[0] || "").trim()).filter(Boolean);
  if (files.length === 0) return [{ scope: "root", files: lines, suggestion: "chore: apply workspace changes" }];

  const groups: Record<string, string[]> = {};
  for (const f of files) {
    const dir = f.includes("/") ? f.split("/")[0] : "root";
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(f);
  }

  return Object.entries(groups).map(([scope, fileList]) => {
    const type = scope === "root" ? "chore" : "feat";
    return { scope, files: fileList, suggestion: `${type}(${scope}): apply ${fileList.length} file change(s)` };
  });
}

// --- MCP Server -----------------------------------------------------
const server = new McpServer({
  name: "lccst-locust",
  version: "3.3.0",
});

// Prompt: load SKILL.md into context
server.registerPrompt("swarm", {
  description: "Enforce deterministic lint-cluster-split-test-commit boundaries over the active workspace layout.",
}, async () => {
  try {
    const skillContent = fs.readFileSync(path.resolve(ROOT, "SKILL.md"), "utf-8");
    return {
      messages: [{
        role: "user",
        content: { type: "text", text: `Execute the following system skill framework precisely:\n\n${skillContent}` },
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
server.registerTool("init", {
  description: "Map project conventions and verify local environment state.",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path to scan.") },
}, async (args) => {
  const target = args?.path ? path.resolve(ROOT, String(args.path)) : ROOT;
  if (!fs.existsSync(target)) {
    return { content: [{ type: "text", text: `Error: path "${target}" does not exist.` }] };
  }

  const env = scanEnvironment(target);
  const tooling = discoverTooling(target);
  new SwarmState(target).write({ phase: "init" });
  logEvent(target, { event: "init", project: env.project.type, manifest: env.project.manifest });

  const lines: string[] = [
    `Project type: ${env.project.type}`,
    `Manifest: ${env.project.manifest || "(none detected)"}`,
    `Tools available: ${Object.entries(env.tools).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}`,
    `Test command: ${env.project.testCommand.join(" ") || "(none)"}`,
    `Makefile targets: ${tooling.makeTargets.join(", ") || "(none)"}`,
    `Script helpers: ${tooling.shellScripts.join(", ") || "(none)"}`,
  ];
  if (env.conventions.length > 0) lines.push(`Conventions: ${env.conventions.join(", ")}`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
});

// Tool: /audit
server.registerTool("audit", {
  description: "Scan workspace diffs and present an ultra-lean commit plan.",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path.") },
}, async () => {
  const state = new SwarmState(ROOT);
  state.write({ phase: "audit" });

  let staged = "";
  let unstaged = "";
  logEvent(ROOT, { event: "audit_start" });
  try {
    staged = execSync("git diff --cached --stat", { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    unstaged = execSync("git diff --stat", { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
  } catch {
    return { content: [{ type: "text", text: "Not a git repository or no git available." }] };
  }

  const plan: string[] = [];
  let totalFiles = 0;

  if (staged) {
    const lines = staged.split("\n").map(l => l.trim()).filter(Boolean);
    const clusters = clusterHunks(lines);
    totalFiles += lines.length;
    plan.push(`Staged changes: ${lines.length} file(s)`, "");
    clusters.forEach((c, i) => {
      plan.push(`${i + 1}. ${c.scope}: ${c.files.join(", ")}`);
      plan.push(`   Suggested: ${c.suggestion}`);
    });
    state.write({ clusters: clusters.map(c => c.suggestion) });
  }

  if (unstaged) {
    const lines = unstaged.split("\n").map(l => l.trim()).filter(Boolean);
    const clusters = clusterHunks(lines);
    totalFiles += lines.length;
    if (plan.length > 0) plan.push("");
    plan.push(`Unstaged changes: ${lines.length} file(s) (not yet staged)`, "");
    clusters.forEach((c, i) => {
      plan.push(`${i + 1}. ${c.scope}: ${c.files.join(", ")}`);
      plan.push(`   Suggested: ${c.suggestion}`);
    });
  }

  if (!staged && !unstaged) {
    return { content: [{ type: "text", text: "Working tree clean -- no changes to audit." }] };
  }

  return { content: [{ type: "text", text: plan.join("\n") }] };
});

// Tool: /swarm
server.registerTool("swarm", {
  description: "Transition to Active Execution: discover, cluster, test, commit.",
  inputSchema: {
    path: z.string().optional().default(".").describe("Target path."),
    dryRun: z.boolean().optional().default(false).describe("Dry-run mode (no mutations)."),
  },
}, async (args) => {
  const target = args?.path ? path.resolve(ROOT, String(args.path)) : ROOT;
  const dryRun = args?.dryRun === true;
  const state = new SwarmState(target);
  state.write({ phase: "swarm" });

  const project = detectProject(target);
  logEvent(target, { event: "swarm_start", project: project.type, dryRun });
  if (!project.testCommand.length) {
    return { content: [{ type: "text", text: `No test runner detected for ${target}. Cannot execute swarm.` }] };
  }

  const tooling = discoverTooling(target);
  const makeTargets = tooling.makeTargets.length > 0 ? `make: ${tooling.makeTargets.join(", ")}` : "no Makefile";
  const formatCmd = resolveCommand(target, "format");
  const testCmd = resolveCommand(target, "test");

  const report: string[] = [
    `Swarm execution started at ${target}`,
    `Project: ${project.type} (${project.manifest})`,
    `Native tooling: ${makeTargets}`,
    `Test command: ${testCmd?.join(" ") || "(none detected)"}`,
    `Dry-run: ${dryRun}`,
    "",
    `Phase 1/4: Discover & Format -- ${formatCmd?.join(" ") || "skipped"}`,
    `Phase 2/4: Hunk Clustering -- pending git analysis`,
    `Phase 3/4: Targeted Testing -- ${testCmd?.join(" ") || "(none detected)"}`,
    `Phase 4/4: Atomic Commit -- conventional commit generation`,
    "",
    `State tracking: ${state.path}`,
  ];

  if (!dryRun) state.write({ phase: "swarm_discover" });

  return { content: [{ type: "text", text: report.join("\n") }] };
});

// --- Shared runner for project-step tools ----------------------------
function runStepTool(kind: ProjectStep, args?: { path?: string }): { content: { type: "text"; text: string }[] } {
  const target = args?.path ? path.resolve(ROOT, String(args.path)) : ROOT;
  if (!fs.existsSync(target)) {
    return { content: [{ type: "text", text: `Error: path "${target}" does not exist.` }] };
  }
  const cmd = resolveCommand(target, kind);
  if (!cmd) {
    return { content: [{ type: "text", text: `No ${kind} command detected for ${target}.` }] };
  }
  const result = runCommand(cmd, target);
  logEvent(target, { event: `${kind}_run`, command: cmd.join(" "), exitCode: result.code });
  const lines = [
    `[${kind}] ${cmd.join(" ")}`,
    `Exit code: ${result.code}`,
    result.output ? `\n${result.output}` : "(no output)",
  ];
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

// Tool: /tooling
server.registerTool("tooling", {
  description: "Inventory native tooling: Makefile targets, package.json scripts, and scripts/ helpers.",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path.") },
}, async (args) => {
  const target = args?.path ? path.resolve(ROOT, String(args.path)) : ROOT;
  if (!fs.existsSync(target)) {
    return { content: [{ type: "text", text: `Error: path "${target}" does not exist.` }] };
  }
  const t = discoverTooling(target);
  const lines: string[] = [`Tooling for ${target}`, ""];
  lines.push(`Makefile targets: ${t.makeTargets.join(", ") || "(none)"}`);
  lines.push(`Shell/script helpers: ${t.shellScripts.join(", ") || "(none)"}`);
  lines.push(`package.json scripts: ${Object.keys(t.packageScripts).join(", ") || "(none)"}`);
  return { content: [{ type: "text", text: lines.join("\n") }] };
});

// Tool: /lint
server.registerTool("lint", {
  description: "Run the project lint command (Makefile `lint` target first, then manifest lint).",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path.") },
}, async (args) => runStepTool("lint", args));

// Tool: /format
server.registerTool("format", {
  description: "Run the project format command (Makefile `format` target first, then manifest format).",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path.") },
}, async (args) => runStepTool("format", args));

// Tool: /test
server.registerTool("test", {
  description: "Run the project test command (Makefile `test` target first, then manifest test).",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path.") },
}, async (args) => runStepTool("test", args));

// Tool: /build
server.registerTool("build", {
  description: "Run the project build command (Makefile `build` target first, then manifest build).",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path.") },
}, async (args) => runStepTool("build", args));

// Tool: /verify
server.registerTool("verify", {
  description: "Run the full quality gate: format, lint, test, build. Skips steps with no detected command.",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path.") },
}, async (args) => {
  const target = args?.path ? path.resolve(ROOT, String(args.path)) : ROOT;
  const steps: ProjectStep[] = ["format", "lint", "test", "build"];
  const report: string[] = [`Quality gate for ${target}`, ""];
  let failed = 0;
  for (const step of steps) {
    const cmd = resolveCommand(target, step);
    if (!cmd) {
      report.push(`[SKIP] ${step} -- no command detected`);
      continue;
    }
    const result = runCommand(cmd, target);
    logEvent(target, { event: `${step}_run`, command: cmd.join(" "), exitCode: result.code });
    report.push(`[${result.code === 0 ? "OK" : "FAIL"}] ${step}: ${cmd.join(" ")}`);
    if (result.code !== 0) failed++;
  }
  report.push("", `Result: ${failed === 0 ? "PASS" : `${failed} failing step(s)`}`);
  return { content: [{ type: "text", text: report.join("\n") }] };
});

// Tool: /compliance
server.registerTool("compliance", {
  description: "Audit deliverable tiers: must-haves (unit tests, docstrings) and nice-to-haves (API docs, changelog).",
  inputSchema: { path: z.string().optional().default(".").describe("Relative target path.") },
}, async (args) => {
  const target = args?.path ? path.resolve(ROOT, String(args.path)) : ROOT;
  if (!fs.existsSync(target)) {
    return { content: [{ type: "text", text: `Error: path "${target}" does not exist.` }] };
  }
  const report = auditCompliance(target);
  logEvent(target, { event: "compliance_audit", report });
  const lines = [
    `Compliance audit for ${target}`,
    "",
    "MUST HAVE",
    `  Unit tests: ${report.mustHave.unitTests ? "PRESENT" : "MISSING"}`,
    `  Docstrings: ${report.mustHave.docstrings ? "PRESENT" : "MISSING"}`,
    "",
    "NICE TO HAVE",
    `  API docs: ${report.niceToHave.apiDocs ? "PRESENT" : "MISSING"}`,
    `  Changelog: ${report.niceToHave.changelog ? "PRESENT" : "MISSING"}`,
  ];
  return { content: [{ type: "text", text: lines.join("\n") }] };
});

// Tool: /version
server.registerTool("version", {
  description: "Report the LCCST protocol and server version.",
  inputSchema: {},
}, async () => {
  let pkgVersion = "(unknown)";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, "package.json"), "utf-8"));
    pkgVersion = pkg.version ?? "(unknown)";
  } catch { /* ignore */ }
  return { content: [{ type: "text", text: `LCCST v${pkgVersion}` }] };
});

// --- Start transport (only when run directly, not when imported) ----
const isMainModule = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
);
if (isMainModule) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
