#!/usr/bin/env tsx
/**
 * Three-way parity check: SKILL.md, README.md, and the MCP server in src/index.ts.
 */

import { PROTOCOL_COMMANDS } from "../src/index.ts";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillText = fs.readFileSync(path.resolve(__dirname, "../SKILL.md"), "utf-8");
const readmeText = fs.readFileSync(path.resolve(__dirname, "../README.md"), "utf-8");
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8"));
const srcContent = fs.readFileSync(path.resolve(__dirname, "../src/index.ts"), "utf-8");

const errors = [];

// --- 1. Command-set parity ---
const expectedCommands = ["init", "audit", "swarm", "tooling", "lint", "format", "test", "build", "verify", "compliance", "version"];

const enumMatch = skillText.match(/enum:\s*\[([\s\S]*?)\]/);
let skillCommands = [];
if (enumMatch) {
  skillCommands = enumMatch[1]
    .split(",")
    .map(s => s.trim().replace(/"/g, "").replace(/\\n/g, "").trim())
    .filter(Boolean)
    .map(c => c.replace(/^\//, ""));
}
if (JSON.stringify(skillCommands.sort()) !== JSON.stringify(expectedCommands.sort())) {
  errors.push("SKILL.md frontmatter: command enum is [" + skillCommands.join(", ") + "], expected [" + expectedCommands.join(", ") + "]");
}

for (const cmd of expectedCommands) {
  if (!readmeText.includes("**`" + cmd + "`**")) {
    errors.push("README.md: tool list missing **" + cmd + "**");
  }
}

// --- 2. Argument parity ---
for (const cmd of PROTOCOL_COMMANDS) {
  const expected = cmd.args;
  const header = "- `/" + cmd.name + "`:";
  const headerIdx = skillText.indexOf(header);
  if (headerIdx < 0) {
    errors.push("SKILL.md body: /" + cmd.name + " section not found");
    continue;
  }
  const rest = skillText.slice(headerIdx + header.length);
  const nextHeaderMatch = rest.match(/\n- `\/(\w+)`:|\n### |^\n## /m);
  const sectionEnd = nextHeaderMatch ? headerIdx + header.length + nextHeaderMatch.index : skillText.length;
  const section = skillText.slice(headerIdx, sectionEnd);
  
  for (const arg of expected) {
    if (!section.includes("`" + arg + "`")) {
      errors.push("SKILL.md body: /" + cmd.name + " missing arg documentation for `" + arg + "`");
    }
  }
}

if (!readmeText.includes("dryRun") && !readmeText.includes("dry-run")) {
  errors.push("README.md: missing dryRun argument documentation");
}
if (!readmeText.includes("abort")) {
  errors.push("README.md: missing abort argument documentation");
}

// --- 3. Ladder parity ---
const lintCommands = [
  "uv run ruff check",
  "cargo clippy",
  "go vet ./...",
  "pnpm run lint",
  "make lint",
];
for (const lint of lintCommands) {
  if (!skillText.includes(lint)) {
    errors.push("SKILL.md: manifest table missing lint command \"" + lint + "\"");
  }
  if (!readmeText.includes(lint)) {
    errors.push("README.md: manifest ladder missing lint command \"" + lint + "\"");
  }
}

for (const runner of ["Makefile", "mise.toml", "justfile", "Taskfile.yml"]) {
  if (!skillText.includes(runner)) {
    errors.push("SKILL.md: task runner table missing " + runner);
  }
  if (!readmeText.includes(runner)) {
    errors.push("README.md: task runner ladder missing " + runner);
  }
}

// --- 4. Version parity ---
const skillVersionMatch = skillText.match(/version:\s*"(\d+\.\d+(?:\.\d+)?)"/);
const skillVersion = skillVersionMatch ? skillVersionMatch[1] : null;
const packageVersion = packageJson.version;

if (skillVersion !== packageVersion) {
  errors.push("Version parity: SKILL.md has v" + skillVersion + ", package.json has " + packageVersion);
}

const srcVersionMatch = srcContent.match(/version:\s*"(\d+\.\d+(?:\.\d+)?)"/);
const srcVersion = srcVersionMatch ? srcVersionMatch[1] : null;
if (srcVersion !== packageVersion) {
  errors.push("Version parity: src/index.ts server has v" + srcVersion + ", package.json has " + packageVersion);
}

const telemetryPkgPath = path.resolve(__dirname, "../playground/benchmarks/mcp-telemetry/package.json");
if (fs.existsSync(telemetryPkgPath)) {
  const telemetryPkg = JSON.parse(fs.readFileSync(telemetryPkgPath, "utf-8"));
  if (telemetryPkg.version !== packageVersion) {
    errors.push("Version parity: telemetry MCP has " + telemetryPkg.version + ", package.json has " + packageVersion);
  }
}

const handshakePath = path.resolve(__dirname, "../tests/init_handshake.test.ts");
if (fs.existsSync(handshakePath)) {
  const handshakeContent = fs.readFileSync(handshakePath, "utf-8");
  const handshakeVersionMatch = handshakeContent.match(/version:\s*"(\d+\.\d+(?:\.\d+)?)"/);
  const handshakeVersion = handshakeVersionMatch ? handshakeVersionMatch[1] : null;
  if (handshakeVersion && handshakeVersion !== packageVersion) {
    errors.push("Version parity: handshake test has v" + handshakeVersion + ", package.json has " + packageVersion);
  }
}

// --- 5. Envelope parity ---
for (const cmd of PROTOCOL_COMMANDS) {
  const toolPattern = new RegExp("registerTool\\(\"" + cmd.name + "\",\\s*[\\s\\S]*?outputSchema:\\s*ENVELOPE_OUTPUT_SCHEMA", "s");
  if (!toolPattern.test(srcContent)) {
    errors.push("src/index.ts: /" + cmd.name + " missing outputSchema: ENVELOPE_OUTPUT_SCHEMA");
  }
}

// --- 6. Capability-claim parity ---
// Every capability claim in the README opening paragraph must match a rule in
// SKILL.md or a check in the MCP server. A claim with no backing rule fails.
const readmeLines = readmeText.split("\n");
let readmeParagraph = "";
for (let i = 0; i < readmeLines.length; i++) {
  if (readmeLines[i].startsWith("lccst handles")) {
    readmeParagraph = readmeLines.slice(i, i + 4).join(" ");
    break;
  }
}
const readmeParagraphLC = readmeParagraph.toLowerCase().replace(/-/g, " ");
const skillTextLC = skillText.toLowerCase();
const srcContentLC = srcContent.toLowerCase();

// Supported claims: the README may name these only when SKILL.md carries the
// matching rule and the MCP server carries the matching check.
const supportedClaims = [
  { claim: "single-responsibility", backing: ["one file focused on one domain"] },
  { claim: "cohesion", backing: ["top-level group", "top-level directory"] },
  { claim: "strict test verification", backing: ["passing test", "test command"] },
  { claim: "atomic", backing: ["atomic"] },
  { claim: "deterministic", backing: ["deterministic"] },
  { claim: "gatekeeper", backing: ["gatekeeper"] },
];
for (const { claim, backing } of supportedClaims) {
  if (readmeParagraphLC.includes(claim.replace(/-/g, " ")) && !backing.some(b => skillTextLC.includes(b))) {
    errors.push("README.md: capability claim \"" + claim + "\" has no matching rule in SKILL.md");
  }
}

// Unsupported claims: these words name capabilities the protocol does not
// enforce. They must not appear in the README opening paragraph at all.
const unsupportedClaims = [
  "solid", "liskov", "open/closed", "interface segregation", "dependency inversion",
  "before they reach production", "production gate", "push", "pull request",
];
for (const claim of unsupportedClaims) {
  if (readmeParagraphLC.includes(claim)) {
    errors.push("README.md: unsupported capability claim \"" + claim + "\" has no backing rule in SKILL.md or check in src/index.ts");
  }
}

if (readmeParagraphLC.includes("cohesion") && !srcContentLC.includes("clusterpaths")) {
  errors.push("README.md: cohesion claim has no matching check in src/index.ts");
}
if (readmeParagraphLC.includes("test verification") && !srcContentLC.includes("runverifysteps")) {
  errors.push("README.md: strict test verification claim has no matching check in src/index.ts");
}

if (!srcContent.includes("envelope(`/${kind}`")) {
  errors.push("src/index.ts: runStepTool does not use / prefix for step field");
}

const errorReplyCalls = srcContent.matchAll(/errorReply\(`(\/\w+)`/g);
const errorReplySteps = Array.from(errorReplyCalls, m => m[1]);
for (const step of errorReplySteps) {
  if (!step.startsWith("/")) {
    errors.push("src/index.ts: errorReply uses bare step name \"" + step + "\" instead of \"/\" + step}");
  }
}

// --- 7. Guidance parity ---
// The weak-model checklist of SKILL.md and the guidance field of the MCP
// server must state the same three rules. Only a shared anchor phrase proves
// that both sides carry the rule.
for (const phrase of [
  "write each part once",
  "exists only in a test",
  "restate the plan between steps",
]) {
  if (!skillText.includes(phrase)) {
    errors.push("SKILL.md: weak-model guidance missing the phrase \"" + phrase + "\"");
  }
  if (!srcContent.includes(phrase)) {
    errors.push("src/index.ts: guidance field missing the phrase \"" + phrase + "\"");
  }
}

// --- Report results ---
if (errors.length === 0) {
  console.log("Parity check passed: SKILL.md, README.md, and MCP server agree on the protocol.");
  process.exit(0);
} else {
  console.error("Parity check failed: " + errors.length + " gap(s) found:");
  for (const err of errors) {
    console.error("  - " + err);
  }
  process.exit(1);
}
