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

## Breaking Changes

None. The server runtime, MCP tools, and telemetry interface are unchanged.

## Version

Bumped from 3.5.0 to 3.6.0.
