### LCCST 3.6.0

Date: _2026-09-24_

Clarified protocol and playground documentation with Simplified Technical
English. No server runtime behaviour or MCP API changed.

## Correctness

### Protocol terminology

Updated `SKILL.md` to define workspace, subproject, target, command, step,
cluster, state file, mode, and variant. The document separates Read/Plan
Mode from Active Execution. It also states the exact scope of each command,
the mode rules, the state lifecycle, and the `/swarm --abort` argument. The
document also distinguishes the Bare Skill flags, the host `dryRun` input, and
the `dry_run` response field.

### Playground instructions

Updated `playground/README.md`, `playground/guide.md`, and
`playground/agent-prompt.md` to identify the exact benchmark commands, paths,
and variant rules. The documents distinguish `plain` and `skill-guided`
from `strict` and `lean`. They also define telemetry for both benchmark
variants and identify the versioned report path.

## Consistency

### Simplified Technical English

Applied the vendored Simple English skill to the changed documentation. The
text uses short sentences, condition-first instructions, clear subjects, and
one term for each concept. Historical benchmark reports remain unchanged.

### Agent Instructions

Updated `AGENTS.md` to use the same STE and British English rules. The file
defines language requirements, exact command wording, deliverable tiers, and
clear version and MCP instructions.

## New Features

### Server Security Hardening

Replaced `execSync(command.join(" "), ...)` with `execFileSync(command[0], command.slice(1), ...)` in `runCommand`. This prevents shell injection via command arguments and removes the shell from the execution path.

### Verify Stops on First Failure

The `/verify` tool now stops at the first failing step instead of running all steps regardless. This saves execution time and makes the failure point clear.

## Bug Fixes

### State No Longer Cleared by Individual Step Tools

The `runStepTool` function (used by `/lint`, `/format`, `/test`, `/build`) no longer clears `.lccst/state.json` after each run. Only `/swarm` and `/verify` clear the state file. Previously, running `/lint` then `/test` would lose the state written by `/init` or `/audit`.

## Correctness

### Docstring Detection Tightened

Removed `"# "` and `"// "` from the docstring markers in `auditCompliance`. These matched any comment, not just docstrings. The remaining markers are `/**`, `"""`, `///`, and `## `.

## Breaking Changes

None. The server runtime, MCP tools, and telemetry interface are unchanged.

## Version

Bumped from 3.5.0 to 3.6.0.
