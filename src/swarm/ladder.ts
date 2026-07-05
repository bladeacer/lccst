import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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
  { manifest: "CMakeLists.txt", type: "unknown", test: ["cmake", "--build", "."], format: undefined, lint: undefined },
  { manifest: "Project.toml", type: "unknown", test: ["julia", "--project=.", "-e", "using Pkg; Pkg.test()"], format: undefined, lint: undefined },
];

export function detectProject(root: string): ProjectInfo {
  for (const entry of MANIFEST_PRIORITY) {
    const manifestPath = path.join(root, entry.manifest);
    if (fs.existsSync(manifestPath)) {
      return {
        type: entry.type,
        manifest: entry.manifest,
        testCommand: entry.test,
        formatCommand: entry.format,
        lintCommand: entry.lint,
      };
    }
  }
  return {
    type: "unknown",
    manifest: "",
    testCommand: [],
  };
}

export function detectTool(name: string): boolean {
  try {
    execSync(`which ${name} 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export interface EnvReport {
  project: ProjectInfo;
  tools: Record<string, boolean>;
  conventions: string[];
}

export function scanEnvironment(root: string): EnvReport {
  const project = detectProject(root);
  const requiredTools = [...new Set(project.testCommand.map(c => c))].filter(c => !c.startsWith("-") && !c.startsWith("."));
  const tools: Record<string, boolean> = {};
  for (const t of requiredTools) {
    tools[t] = detectTool(t);
  }
  tools["git"] = detectTool("git");
  const conventions: string[] = [];
  if (fs.existsSync(path.join(root, ".editorconfig"))) conventions.push("editorconfig");
  if (fs.existsSync(path.join(root, ".prettierrc")) || fs.existsSync(path.join(root, ".prettierrc.json"))) conventions.push("prettier");
  if (fs.existsSync(path.join(root, "rustfmt.toml"))) conventions.push("rustfmt");
  if (fs.existsSync(path.join(root, ".golangci.yml"))) conventions.push("golangci-lint");
  return { project, tools, conventions };
}

export function getTestRunner(root: string): string[] {
  const info = detectProject(root);
  if (info.testCommand.length > 0) return info.testCommand;
  return [];
}
