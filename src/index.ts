import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// ─── Runtime context ─────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Tooling Ladder: project detection ──────────────────────────
export interface ProjectInfo {
  type: "python" | "node" | "go" | "rust" | "unknown";
  manifest: string;
  testCommand: string[];
  formatCommand?: string[];
  lintCommand?: string[];
}

const MANIFEST_PRIORITY: Array<{ manifest: string; type: ProjectInfo["type"]; test: string[]; format?: string[]; lint?: string[] }> = [
  { manifest: "pyproject.toml", type: "python", test: ["uv", "run", "pytest"], format: ["uv", "run", "ruff", "format"], lint: ["uv", "run", "ruff", "check"] },
  { manifest: "package.json", type: "node", test: ["pnpm", "test"], format: ["pnpm", "run", "format"], lint: ["pnpm", "run", "lint"] },
  { manifest: "Cargo.toml", type: "rust", test: ["cargo", "test"], format: ["cargo", "fmt"], lint: ["cargo", "clippy"] },
  { manifest: "go.mod", type: "go", test: ["go", "test", "./..."], format: ["gofmt", "-l", "."], lint: ["go", "vet", "./..."] },
  { manifest: "CMakeLists.txt", type: "unknown", test: ["cmake", "--build", "."] },
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
      };
    }
  }
  return { type: "unknown", manifest: "", testCommand: [] };
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
  const requiredTools = [...new Set(project.testCommand)].filter(c => !c.startsWith("-") && !c.startsWith("."));
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

// ─── State persistence (.lccst_state) ────────────────────────────
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
  constructor(root: string) { this.filePath = path.resolve(root, ".lccst_state"); }

  read(): SwarmStateData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8").trim();
        if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw), timestamp: Date.now() };
      }
    } catch { /* corrupt — return default */ }
    return { ...DEFAULT_STATE, timestamp: Date.now() };
  }

  write(data: Partial<SwarmStateData>): void {
    const merged = { ...this.read(), ...data, timestamp: Date.now() };
    fs.writeFileSync(this.filePath, JSON.stringify(merged, null, 2) + "\n");
  }

  clear(): void {
    try { if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath); } catch { /* ignore */ }
  }

  get path(): string { return this.filePath; }
}

// ─── Hunk clustering helper ──────────────────────────────────────
export interface Cluster {
  scope: string;
  files: string[];
  suggestion: string;
}

export function clusterHunks(lines: string[]): Cluster[] {
  const files = lines.filter(l => l.includes("|")).map(l => l.split("|")[0].trim()).filter(Boolean);
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

// ─── MCP Server ──────────────────────────────────────────────────
const server = new McpServer({
  name: "lccst-locust",
  version: "3.0.0",
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
  new SwarmState(target).write({ phase: "init" });

  const lines: string[] = [
    `Project type: ${env.project.type}`,
    `Manifest: ${env.project.manifest || "(none detected)"}`,
    `Tools available: ${Object.entries(env.tools).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}`,
    `Test command: ${env.project.testCommand.join(" ") || "(none)"}`,
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

  let diff = "";
  try {
    diff = execSync("git diff --cached --stat", { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).toString();
    if (!diff.trim()) {
      diff = execSync("git diff --stat", { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).toString();
    }
  } catch {
    return { content: [{ type: "text", text: "Not a git repository or no git available." }] };
  }

  if (!diff.trim()) {
    return { content: [{ type: "text", text: "Working tree clean — no changes to audit." }] };
  }

  const lines = diff.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const clusters = clusterHunks(lines);

  const plan: string[] = [`Changes detected: ${lines.length} file(s)`, ""];
  clusters.forEach((c, i) => {
    plan.push(`${i + 1}. ${c.scope}: ${c.files.join(", ")}`);
    plan.push(`   Suggested: ${c.suggestion}`);
  });

  state.write({ clusters: clusters.map(c => c.suggestion) });
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
  if (!project.testCommand.length) {
    return { content: [{ type: "text", text: `No test runner detected for ${target}. Cannot execute swarm.` }] };
  }

  const report: string[] = [
    `Swarm execution started at ${target}`,
    `Project: ${project.type} (${project.manifest})`,
    `Test command: ${project.testCommand.join(" ")}`,
    `Dry-run: ${dryRun}`,
    "",
    `Phase 1/4: Discover & Format — ${project.formatCommand?.join(" ") || "skipped"}`,
    `Phase 2/4: Hunk Clustering — pending git analysis`,
    `Phase 3/4: Targeted Testing — ${project.testCommand.join(" ")}`,
    `Phase 4/4: Atomic Commit — conventional commit generation`,
    "",
    `State tracking: ${state.path}`,
  ];

  if (!dryRun) state.write({ phase: "swarm_discover" });

  return { content: [{ type: "text", text: report.join("\n") }] };
});

// ─── Start transport (only when run directly, not when imported) ─
const isMainModule = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
);
if (isMainModule) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
