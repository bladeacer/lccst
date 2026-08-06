### LCCST 3.3.0

Date: _2026-08-05_

Restores strict-by-default defensive guardrails and consolidates the skill
file to eliminate prompt redundancy.

## Correctness

### Restore Transport Guardrails Under `lean`

The v3.2.0 `lean` definition ("skips rate limiting, caching, structured
error types... unless the domain demands them") incentivized stripping core
defensive guardrails from HTTP server payloads, dropping the Robustness
Guardrails feature score from `(+)` to `(-)` in `python-http-server`.

`lean` now omits rate limiting and caching for pure logic/UI helpers only;
network/data handlers MUST still include boundary validation, typed errors,
and rate throttling. A dedicated `Defensive rules` bullet makes this
non-negotiable for every transport entry point.

### Bump Script Multi-Match Fix

`scripts/bump-version.ts` only replaced the first `version` occurrence in
`tests/init_handshake.test.ts`, so the `serverInfo` assertion could drift
from the `clientInfo` payload after a version sync, failing the MCP
handshake test. The test-file regex now uses the global flag to update every
occurrence.

## Consistency

### Section 4 & 6 Consolidation

The `## 6. Invariants` section duplicated rules already declared in
`## 1. Mandate`, `## 4. Guardrails`, and `## 5. Ecosystem Discovery`
(continuity, guard integrity, verify-first, token discipline). The two
sections were merged into `## 4. Guardrails & Execution Invariants`,
dropping ~7 lines of redundant text without losing behavioral constraints.
`## 7. Execution Path` renumbered to `## 6`.

### Compact Manifest Mapping

Section 5's `manifest_map` block was rewritten as a dense lookup list and the
5-rung Tooling Ladder collapsed to 4 rungs (global binaries folded into the
fallback tier). Ladder order, project-script preference, and state tracking
are preserved.

## New Features

### Strict Mode Default

`mode` now defaults to `strict`, guaranteeing 100% robustness on HTTP/DB
routes. `lean` remains available for pure logic/UI helpers.

## Breaking Changes

None. `strict` remains the behavior of record; `lean` is now scoped
narrower than before (network handlers are no longer exempt from core
guardrails).

## Version

Bumped from 3.2.0 to 3.3.0.

## Post-Release Correction

Date: _2026-08-06_

### Workspace-Bound Path Resolution

The MCP server resolved every `path` argument against the LCCST install
directory (`ROOT`), so running `/audit`, `/tooling`, `/init`, or any step
tool from another project with `.` scanned the LCCST repository instead of
the client's project. Targets now resolve against the workspace root -- the
server's `process.cwd()`, which hosts spawn as the project being edited --
falling back to an optional `LCCST_WORKSPACE` environment variable override.
`ROOT` is retained only for LCCST's own files (`SKILL.md`, `package.json`).

### /audit Honors Its `path` Argument

The `/audit` handler previously ignored its `path` schema entirely
(`async () =>`) and always ran `git diff` against the LCCST repo. It now
accepts the argument, resolves it through `resolveTarget`, and executes git
against the target directory, so a subdirectory of a repo is audited in
repo context.

## Consistency

### Unified Path Resolution & Errors

All nine path-taking tools share a single `resolveTarget` helper with
consistent semantics: default `.` / empty maps to the workspace root,
absolute paths are preserved, `~` expands to the home directory, and
relative paths resolve under the workspace root. Non-existent targets return
a uniform `Error: path "<x>" does not exist. Workspace root: <y>` message.
`path` schema descriptions now state the workspace-relative/absolute
semantics.

### Observable Targets

`/init` and `/audit` report the resolved absolute target at the top of their
output, and the `/swarm` prompt preamble now carries `Active workspace root:
<path>` so the model operates on the client project rather than guessing.

## New Features

### LCCST_WORKSPACE Override

Hosts that do not spawn MCP servers with the project as cwd can pin the
workspace root via the `LCCST_WORKSPACE` environment variable.

## Tests

Eight unit tests added for `resolveTarget` (default, dot, relative, absolute,
non-existent, whitespace); suite now at 69 unit tests + 9 integration tests.
