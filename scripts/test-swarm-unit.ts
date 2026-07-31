import { detectProject, scanEnvironment, SwarmState, listMakeTargets, listPackageScripts, listShellScripts, discoverTooling, resolveCommand } from "../src/index.js";
import fs from "fs";
import path from "path";
import os from "os";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`  PASS: ${name}`); }
  else { failed++; console.error(`  FAIL: ${name}`); }
}

function withTempDir(fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lccst-unit-"));
  try { fn(dir); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

console.log("LCCST: Swarm library unit tests\n");

// -- Project detection ----------------------------------------------
withTempDir((dir) => {
  const unknown = detectProject(dir);
  assert(unknown.type === "unknown", "empty dir -> unknown");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "pyproject.toml"), "");
  const p = detectProject(dir);
  assert(p.type === "python", "pyproject.toml -> python");
  assert(p.testCommand.join(" ") === "uv run pytest", "python test command");
  assert(p.formatCommand?.join(" ") === "uv run ruff format", "python format");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  const p = detectProject(dir);
  assert(p.type === "node", "package.json -> node");
  assert(p.testCommand.join(" ") === "pnpm test", "node test command");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Cargo.toml"), "");
  const p = detectProject(dir);
  assert(p.type === "rust", "Cargo.toml -> rust");
  assert(p.testCommand.join(" ") === "cargo test", "cargo test command");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "go.mod"), "");
  const p = detectProject(dir);
  assert(p.type === "go", "go.mod -> go");
  assert(p.testCommand.join(" ") === "go test ./...", "go test command");
});

// Priority: first matched manifest wins
withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  fs.writeFileSync(path.join(dir, "pyproject.toml"), "");
  const p = detectProject(dir);
  assert(p.type === "python", "pyproject.toml beats package.json");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Cargo.toml"), "");
  fs.writeFileSync(path.join(dir, "go.mod"), "");
  const p = detectProject(dir);
  assert(p.type === "rust", "Cargo.toml beats go.mod");
});

// -- Environment scan -----------------------------------------------
withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "pyproject.toml"), "");
  const env = scanEnvironment(dir);
  assert(env.project.type === "python", "scan detects python");
  assert(Array.isArray(env.conventions), "conventions is array");
});

// -- Native tooling discovery ----------------------------------------
withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "all: test\n\n.PHONY: test build\n\ntest:\n\tpnpm test\n\nbuild:\n\tpnpm run build\n");
  const targets = listMakeTargets(dir);
  assert(targets.includes("test"), "makefile test target");
  assert(targets.includes("build"), "makefile build target");
  assert(!targets.includes("all") === false, "makefile all target present");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "");
  assert(listMakeTargets(dir).length === 0, "empty makefile -> no targets");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ scripts: { test: "jest", build: "tsc" } }));
  const scripts = listPackageScripts(dir);
  assert(scripts.test === "jest", "package.json scripts parsed");
  assert(scripts.build === "tsc", "package.json build script");
});

withTempDir((dir) => {
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts", "deploy.sh"), "#!/bin/sh\n");
  fs.writeFileSync(path.join(dir, "scripts", "bump.ts"), "");
  fs.writeFileSync(path.join(dir, "scripts", "notes.txt"), "");
  const helpers = listShellScripts(dir);
  assert(helpers.includes("scripts/deploy.sh"), "shell script detected");
  assert(helpers.includes("scripts/bump.ts"), "ts script detected");
  assert(!helpers.includes("scripts/notes.txt"), "non-script excluded");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "test:\n\tpnpm test\n");
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts", "check.sh"), "#!/bin/sh\n");
  const t = discoverTooling(dir);
  assert(t.makeTargets.includes("test"), "discover make targets");
  assert(t.shellScripts.includes("scripts/check.sh"), "discover shell scripts");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "lint:\n\trun-lint\n");
  assert(resolveCommand(dir, "lint")?.join(" ") === "make lint", "Makefile target wins over manifest");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  assert(resolveCommand(dir, "test")?.join(" ") === "pnpm test", "node manifest fallback test command");
  assert(resolveCommand(dir, "lint")?.join(" ") === "pnpm run lint", "node manifest fallback lint command");
});

withTempDir((dir) => {
  assert(resolveCommand(dir, "build") === null, "unknown dir -> no build command");
});

// -- SwarmState -----------------------------------------------------
withTempDir((dir) => {
  const state = new SwarmState(dir);
  const s1 = state.read();
  assert(s1.phase === "init", "default phase is init");
  assert(s1.clusters.length === 0, "default clusters empty");

  state.write({ phase: "swarm", clusters: ["feat: x", "fix: y"] });
  const s2 = state.read();
  assert(s2.phase === "swarm", "readback phase");
  assert(s2.clusters.length === 2, "readback clusters");
  assert(s2.clusters[0] === "feat: x", "readback cluster[0]");

  state.write({ currentCluster: 1 });
  const s3 = state.read();
  assert(s3.currentCluster === 1, "partial update");
  assert(s3.phase === "swarm", "partial update preserves phase");

  state.clear();
  assert(!fs.existsSync(path.join(dir, ".lccst", "state.json")), "clear removes file");
});

// -- Summary --------------------------------------------------------
console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
