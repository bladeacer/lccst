import { detectProject, scanEnvironment, SwarmState, listMakeTargets, listPackageScripts, listShellScripts, discoverTooling, resolveCommand, auditCompliance, clusterHunks, clusterPaths, diffStatFiles, gitChanges, runCommand, runVerifySteps, detectTool, logEvent, resolveTarget, MAX_COMMAND_OUTPUT_CHARS, EVENT_FILE_MAX_BYTES } from "../src/index.js";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

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

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "CMakeLists.txt"), "");
  const p = detectProject(dir);
  assert(p.type === "cmake", "CMakeLists.txt -> cmake");
  assert(p.testCommand.join(" ") === "ctest", "cmake test command is ctest");
  assert(p.buildCommand?.join(" ") === "cmake --build .", "cmake build command");
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

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "pyproject.toml"), "");
  const env = scanEnvironment(dir);
  assert(env.tools.uv !== undefined, "scan reports the executable uv");
  assert(env.tools.run === undefined, "scan drops the subcommand run");
  assert(env.tools.pytest === undefined, "scan drops the argument pytest");
});

// -- Native tooling discovery ----------------------------------------
withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "all: test\n\n.PHONY: test build\n\ntest:\n\tpnpm test\n\nbuild:\n\tpnpm run build\n");
  const targets = listMakeTargets(dir);
  assert(targets.includes("test"), "makefile test target");
  assert(targets.includes("build"), "makefile build target");
  assert(targets.includes("all"), "makefile all target present");
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

// -- Deliverable tier audit ------------------------------------------
withTempDir((dir) => {
  const c = auditCompliance(dir);
  assert(c.mustHave.unitTests === false, "empty dir -> no unit tests");
  assert(c.mustHave.docstrings === false, "empty dir -> no docstrings");
  assert(c.niceToHave.changelog === false, "empty dir -> no changelog");
});

withTempDir((dir) => {
  fs.mkdirSync(path.join(dir, "tests"));
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "tests", "app.test.ts"), "");
  fs.writeFileSync(path.join(dir, "src", "app.ts"), "/** JSDoc comment */\nexport const x = 1;");
  const c = auditCompliance(dir);
  assert(c.mustHave.unitTests === true, "tests dir -> unit tests present");
  assert(c.mustHave.docstrings === true, "src docstring -> docstrings present");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "test_app.py"), "");
  fs.writeFileSync(path.join(dir, "app.py"), '"""Module docstring."""\n');
  const c = auditCompliance(dir);
  assert(c.mustHave.unitTests === true, "test_*.py -> unit tests present");
  assert(c.mustHave.docstrings === true, "python docstring detected");
});

withTempDir((dir) => {
  fs.mkdirSync(path.join(dir, "docs", "api-docs"), { recursive: true });
  fs.mkdirSync(path.join(dir, "docs", "changelogs"), { recursive: true });
  const c = auditCompliance(dir);
  assert(c.niceToHave.apiDocs === true, "docs/api-docs -> api docs present");
  assert(c.niceToHave.changelog === true, "docs/changelogs -> changelog present");
});

// -- Hunk clustering -------------------------------------------------
{
  const clusters = clusterHunks([]);
  assert(clusters.length === 1 && clusters[0].scope === "root", "empty lines -> root cluster");
  assert(clusters[0].suggestion === "chore: apply workspace changes", "root fallback suggestion");
}

{
  const clusters = clusterHunks([
    "src/app.ts | 4 ++--",
    "src/util.ts | 2 +-",
    "README.md | 6 ++++--",
  ]);
  assert(clusters.some(c => c.scope === "src"), "group by top-level dir");
  const src = clusters.find(c => c.scope === "src");
  assert(src?.files.length === 2, "src cluster has both files");
  assert(src?.suggestion === "feat(src): apply 2 file change(s)", "src cluster suggestion");
  const root = clusters.find(c => c.scope === "root");
  assert(root?.files.includes("README.md"), "no-slash file -> root scope");
}

// -- Diff stat file lines --------------------------------------------
{
  const files = diffStatFiles(
    "src/app.ts | 4 ++--\n README.md | 1 +\n 2 files changed, 5 insertions(+)",
  );
  assert(files.length === 2, "diffStatFiles drops the summary line");
  assert(files[0] === "src/app.ts | 4 ++--", "diffStatFiles keeps a file line");
  assert(diffStatFiles("").length === 0, "diffStatFiles empty input -> no files");
}

// -- Environment conventions -----------------------------------------
withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, ".editorconfig"), "root = true\n");
  fs.writeFileSync(path.join(dir, ".prettierrc"), "{}\n");
  const env = scanEnvironment(dir);
  assert(env.conventions.includes("editorconfig"), "editorconfig convention detected");
  assert(env.conventions.includes("prettier"), "prettier convention detected");
  assert(env.tools.git === true, "git tool reported");
});

// -- Command execution -----------------------------------------------
withTempDir((dir) => {
  const ok = runCommand(["printf", "hello"], dir);
  assert(ok.code === 0 && ok.output === "hello", "runCommand success");
  const fail = runCommand(["sh", "-c", "echo bad 1>&2; exit 3"], dir);
  assert(fail.code === 3, "runCommand captures nonzero exit");
  assert(fail.output.includes("bad"), "runCommand captures stderr on failure");
});

// -- Tool detection --------------------------------------------------
assert(typeof detectTool("sh") === "boolean", "detectTool returns boolean");

// -- Event logging ---------------------------------------------------
withTempDir((dir) => {
  logEvent(dir, { event: "swarm_start", project: "node" });
  const events = fs.readFileSync(path.join(dir, ".lccst", "events.jsonl"), "utf-8");
  assert(events.includes("swarm_start"), "logEvent writes events.jsonl");
  assert(events.includes("node"), "logEvent records payload");
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

// -- Path resolution ------------------------------------------------
withTempDir((dir) => {
  fs.mkdirSync(path.join(dir, "src"));
  assert(resolveTarget(undefined, dir) === dir, "default resolves to base");
  assert(resolveTarget(".", dir) === dir, "dot resolves to base");
  assert(resolveTarget("src", dir) === path.join(dir, "src"), "relative resolves under base");
  assert(resolveTarget(path.join(dir, "src"), dir) === path.join(dir, "src"), "absolute path preserved");
  assert(resolveTarget("./src", dir) === path.join(dir, "src"), "explicit relative dot prefix");
  assert(resolveTarget("missing", dir) === null, "non-existent path -> null");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "pyproject.toml"), "");
  assert(resolveTarget("", dir) === dir, "empty string defaults to base");
  assert(resolveTarget("  ", dir) === dir, "whitespace defaults to base");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "file.txt"), "");
  assert(resolveTarget("file.txt", dir) === null, "a file path is not a project root");
});

// -- Path clustering ------------------------------------------------
{
  const clusters = clusterPaths(["src/a.ts", "src/b.ts", "README.md", "docs/x.md"]);
  const scopes = clusters.map(c => c.scope).sort();
  assert(clusters.length === 3, "clusterPaths groups by top directory");
  assert(scopes.join(",") === "docs,root,src", "clusterPaths scopes");
  assert(clusterPaths([]).length === 0, "clusterPaths empty -> no clusters");
  const src = clusters.find(c => c.scope === "src");
  assert(src?.files.length === 2, "clusterPaths collects sibling files");
  assert(src?.suggestion.startsWith("feat(src)"), "clusterPaths suggests a message");
}

// -- Git change discovery --------------------------------------------
withTempDir((dir) => {
  execFileSync("git", ["init", "-q"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "a.txt"), "one\n");
  execFileSync("git", ["add", "a.txt"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "b.txt"), "two\n");
  const changes = gitChanges(dir);
  assert(changes.ok === true, "gitChanges answers inside a repository");
  assert(changes.staged.length === 1, "gitChanges sees the staged file");
  assert(changes.staged[0].includes("a.txt"), "gitChanges names the staged file");
  assert(changes.untracked.length === 1, "gitChanges sees the untracked file");
  assert(changes.untracked[0] === "b.txt", "gitChanges names the untracked path");
});

withTempDir((dir) => {
  const changes = gitChanges(dir);
  assert(changes.ok === false, "gitChanges fails outside a repository");
  assert(changes.untracked.length === 0, "failed gitChanges holds no paths");
});

// -- Command output cap ----------------------------------------------
{
  const big = runCommand(["node", "-e", `process.stdout.write("x".repeat(${MAX_COMMAND_OUTPUT_CHARS + 5000}))`], process.cwd());
  assert(big.code === 0, "capped run exits zero");
  assert(big.output.length === MAX_COMMAND_OUTPUT_CHARS, "output is cut at the cap");
  assert(big.truncated === true, "truncated flag is set");

  const small = runCommand(["node", "-e", "process.stdout.write(\"ok\")"], process.cwd());
  assert(small.output === "ok", "small output is intact");
  assert(small.truncated === false, "truncated flag is false below the cap");
}

// -- Verify gate ------------------------------------------------------
withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "format:\n\texit 1\n\nlint:\n\texit 0\n\ntest:\n\texit 0\n\nbuild:\n\texit 0\n");
  const report = runVerifySteps(dir, false);
  assert(report.failures === 1, "verify counts one failure");
  assert((report.results.format as { exitCode: number }).exitCode !== 0, "verify runs the failing format step");
  assert(report.results.lint === "skipped_after_failure", "lint is reported after a failure");
  assert(report.results.test === "skipped_after_failure", "test is reported after a failure");
  assert(report.results.build === "skipped_after_failure", "build is reported after a failure");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "format:\n\texit 0\n\nlint:\n\texit 0\n\ntest:\n\texit 0\n\nbuild:\n\texit 0\n");
  const report = runVerifySteps(dir, false);
  assert(report.failures === 0, "verify passes when every step passes");
  assert(typeof (report.results.build as { exitCode: number }).exitCode === "number", "verify runs the last step on a pass");
  const dry = runVerifySteps(dir, true);
  assert(dry.results.format === "dry_run", "verify dry run reports dry_run");
});

// -- Tooling Ladder fallback ------------------------------------------
withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "pyproject.toml"), "");
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ scripts: { build: "tsc" } }));
  const cmd = resolveCommand(dir, "build");
  assert(cmd?.join(" ") === "pnpm run build", "package script fills a missing manifest command");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "CMakeLists.txt"), "");
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.writeFileSync(path.join(dir, "scripts", "lint.sh"), "#!/bin/sh\nexit 0\n");
  const cmd = resolveCommand(dir, "lint");
  assert(cmd?.join(" ") === "bash scripts/lint.sh", "scripts helper fills a missing manifest command");
});

// -- Task runners must declare the task -------------------------------
withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "mise.toml"), "[tasks.test]\ncommand = \"pytest\"\n");
  assert(resolveCommand(dir, "test")?.join(" ") === "mise run test", "mise section task wins over manifest");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "mise.toml"), "[tasks]\nlint = \"ruff check\"\n");
  assert(resolveCommand(dir, "lint")?.join(" ") === "mise run lint", "mise table key task wins over manifest");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "mise.toml"), "[tasks.lint]\ncommand = \"ruff check\"\n");
  fs.writeFileSync(path.join(dir, "pyproject.toml"), "");
  assert(resolveCommand(dir, "test")?.join(" ") === "uv run pytest", "mise without the task falls to manifest");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "justfile"), "test:\n\tuv run pytest\n");
  assert(resolveCommand(dir, "test")?.join(" ") === "just test", "just recipe wins over manifest");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "justfile"), "build:\n\tgo build ./...\n");
  fs.writeFileSync(path.join(dir, "go.mod"), "");
  assert(resolveCommand(dir, "test")?.join(" ") === "go test ./...", "just without the recipe falls to manifest");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Taskfile.yml"), "version: '3'\ntasks:\n  test:\n    cmds:\n      - go test ./...\n");
  assert(resolveCommand(dir, "test")?.join(" ") === "task test", "taskfile task wins over manifest");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Taskfile.yml"), "version: '3'\n");
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  assert(resolveCommand(dir, "test")?.join(" ") === "pnpm test", "taskfile without the task falls to manifest");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "build:\n\ttrue\n");
  assert(resolveCommand(dir, "test") === null, "makefile without the target names no test command");
});

withTempDir((dir) => {
  fs.writeFileSync(path.join(dir, "Makefile"), "build:\n\ttrue\n");
  fs.writeFileSync(path.join(dir, "pyproject.toml"), "");
  assert(resolveCommand(dir, "test")?.join(" ") === "uv run pytest", "makefile without the target falls to manifest");
});

// -- Compliance evidence ----------------------------------------------
withTempDir((dir) => {
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "src", "app.ts"), "/** doc */\nexport const x = 1;\n");
  fs.writeFileSync(path.join(dir, "app.test.ts"), "test();\n");
  const report = auditCompliance(dir);
  assert(report.mustHave.unitTests === true, "compliance finds a unit test");
  assert(report.mustHave.unitTestFiles.count === 1, "compliance counts the unit test");
  assert(report.mustHave.unitTestFiles.paths[0] === "app.test.ts", "compliance names the unit test path");
  assert(report.mustHave.docstringFiles.count === 1, "compliance counts the docstring file");
  assert(report.mustHave.docstringFiles.paths[0] === path.join("src", "app.ts"), "compliance names the docstring path");
});

// -- Structured state warnings ----------------------------------------
withTempDir((dir) => {
  const state = new SwarmState(dir);
  fs.writeFileSync(path.join(dir, ".lccst", "state.json"), "{not json");
  const s = state.read();
  assert(s.phase === "init", "corrupt state returns the default");
  assert(state.warnings.length === 1, "corrupt state records a structured warning");
});

// -- Event file rotation ----------------------------------------------
withTempDir((dir) => {
  const filler = "y".repeat(1000);
  for (let i = 0; i < 400; i++) logEvent(dir, { event: "filler", data: filler });
  const file = path.join(dir, ".lccst", "events.jsonl");
  assert(fs.statSync(file).size <= EVENT_FILE_MAX_BYTES, "events file stays under the cap");
  const lines = fs.readFileSync(file, "utf-8").trim().split("\n");
  assert(lines.length > 0, "rotation keeps the newest entries");
  let lastValid = false;
  try { JSON.parse(lines[lines.length - 1]); lastValid = true; } catch { lastValid = false; }
  assert(lastValid, "kept entries stay valid JSON");
});

// -- Summary --------------------------------------------------------
console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
