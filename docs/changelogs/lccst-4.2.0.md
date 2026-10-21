### LCCST 4.2.0

Date: _2026-10-21_

The benchmark isolates variants into separate harness sessions, rejects
contaminated measurements, and closes the parity gaps between SKILL.md, README.md,
and the MCP server. The rubric rebalances away from a saturated robustness term,
and the skill consolidates its weak-model rules into one checklist.

## Correctness

### Benchmark Variants Run in Separate Sessions

The benchmark no longer runs both variants in one harness session. Each
subproject variant now runs in its own session, so a model cannot copy the plain
output into the guided directory. The Makefile seeds the clean room once and runs
six sessions, one per subproject variant. The agent prompt assigns one variant
only and removes the six-directory blind deletion pass.

### Contaminated and Misattributed Telemetry Rejected

The settle step flags a phase whose settled tokens exceed the session total, and
the scanner flags a report whose guided file inventory equals the plain inventory
exactly (identical file count, line count, and token count). A flagged run does
not enter the ranking table, and the rejection reason states the flag.

### Dependencies Pinned Per Variant

Python variants now run `uv sync` before the test run, and Go variants run `go
mod download`. Both columns of one report resolve the same dependency versions.

### MCP Server Commands Time Out

`runCommand` now enforces a 300-second timeout (override with `LCCST_COMMAND_TIMEOUT`).
A timed-out command reports exit code 124 instead of hanging the server.

### Makefile Parser Ignores Recipe Lines

`readMakefile` now skips recipe lines (leading tab), handles line continuations,
and ignores comments before matching a target. A recipe line that looks like
`foo: bar` after trimming no longer registers a false target.

### Audit Writes State After Git Succeeds

The `audit` tool now writes `.lccst/state.json` only after `gitChanges` succeeds.
A non-git target no longer leaves a state file behind after the error reply.

## Consistency

### Lint Column Added to Manifest Tables

SKILL.md and README.md now document lint commands for every manifest in the
Tooling Ladder. The manifest table in SKILL.md and the ladder snippet in README.md
both carry a lint column that matches `MANIFEST_PRIORITY`.

### Scripts Fallback Surface Narrowed

The server now searches `scripts/` only, not `tools/`, `bin/`, or `script/`.
SKILL.md and README.md document the narrower surface. A helper counts when it is
executable or has a recognised extension, and the base name matches the command or
its plural.

### Per-Command Argument Availability Documented

SKILL.md and README.md now document which arguments each command accepts. `abort`
appears on `/swarm` only. `dryRun` appears on `/swarm`, `/verify`, `/lint`,
`/format`, `/test`, and `/build`. `mode` appears on the eight state-changing
tools. The README gains the `dryRun` and `abort` lines.

### Hunk Isolation Reworded

SKILL.md and README.md now state that a cluster is a top-level group of changed
files, and that hunk-level isolation is the duty of the caller with `git add -p`.
The mandate keeps the requirement; the server does not claim hunk-level
isolation.

### State Lifecycle Clarified

SKILL.md now states that the caller clears the state file after the final commit,
through `/verify` or `/swarm --abort`. The server never learns of the final
commit.

### Swarm Prompt Description Corrected

The registered `swarm` prompt now describes itself as returning the SKILL.md
content for the active workspace, matching the README.

### Envelope Step Field Consistent

`runStepTool` now sets the envelope step field to `/lint`, `/format`, `/test`, and
`/build`, matching every other tool. The step field always starts with `/`.

### Task Runners Surfaced in Init and Tooling

`init` and `tooling` now report which task runners (`mise.toml`, `justfile`,
`Taskfile.yml`) declare a task for the workspace, so the caller sees the runner
that the next step will use.

## New Features

### Three-Way Parity Check

`scripts/test-parity.ts` holds the three-way parity check. It imports
`PROTOCOL_COMMANDS` from `src/index.ts`, reads `SKILL.md` and `README.md` as
text, and checks command-set parity, argument parity, ladder parity, version
parity, and envelope parity. `make test_parity` runs the script, and `make test`
runs it after the other tests. A failed check prints one line per gap.

### Robustness Rubric Rebalanced

The guided robustness term now carries 25% of the composite instead of 40%. The
pass rate carries 20%, plain robustness carries 15%, and the FCT and ART
efficiency terms each carry 20%. A bloat factor reduces the per-variant robustness
score when the variant delivers few features for many lines. The token economy
penalty is capped so a lean compliant implementation outscores both a bloated one
and a copied one.

### Scanner Facts Moved to Shared Guide

The scanner constraints (`.tsx` counting, the pnpm workspace `packages` key, `uv
run python3`, and the test-directory layouts) moved from `traps.md` to
`guide.md`. Both variants read `guide.md`. Trap history stays in `traps.md` for
the guided variant only.

### Telemetry Section Compressed

The telemetry section of `agent-prompt.md` now has one recovery rule: a refused
or early call records nothing; call the tool again at the true end of the phase;
no apology, one state marker.

### Weak-Model Rules Consolidated

The 4.1.0 weak-model rule paragraphs in SKILL.md folded into one compact
checklist: check files by path, treat a runner without the task as a skip, detect
the platform once, fix a failing command instead of switching shells. Shorter text
reduces violation surface for weak models and ceremony for strong ones.

### Declared Toolchain Updated

`DECLARED_TOOLCHAIN` and `guide.md` now declare pnpm 12.x and Go 1.27.x, which
matches the current machine. The drift note carries information again.

## Breaking Changes

None. The release is a minor version bump.

## Version

Bumped from 4.1.0 to 4.2.0.
