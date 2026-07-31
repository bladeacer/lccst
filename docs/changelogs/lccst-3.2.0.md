### LCCST 3.2.0

Date: _2026-07-30_

Correctness, consistency, and production-readiness hardening. Adaptive
scaffolding tier and automated CI.

## Correctness

### Bump Script Syncs SKILL.md Version

`scripts/bump-version.ts` now updates the version field in `SKILL.md`
metadata alongside package.json and source files, preventing version drift
between the spec and code.

### /audit Tool Staged/Unstaged Clarity

The `/audit` tool now reports staged and unstaged changes separately with
distinct cluster plans, instead of falling back silently. Both scopes are
visible in a single response.

### clusterHunks Robustness

`src/index.ts:129` guards against `undefined` from `split()` on malformed
diff lines that lack a `|` separator.

### SwarmState Error Visibility

`SwarmState.read()` and `SwarmState.clear()` now log warnings on corrupt
state files or failed cleanup instead of swallowing errors silently.

### scanEnvironment Tool Detection

Simplified required-tool extraction in `scanEnvironment` to correctly
identify the executable from test commands like `go test ./...` (was
including `./...` as a tool name).

## Consistency

### Licence Compliance Spelling

Corrected "Licence Compliance" to "License Compliance" in SKILL.md §4 for
US-English consistency with the project's MIT license header.

### Orphaned Directory Removed

`src/swarm/` contained only a README.md; the actual swarm implementation
lives in `src/index.ts`. Removed the directory and updated the main README
reference.

### .pytest_cache Ignored

Added `.pytest_cache` to `.gitignore`.

## New Features

### Adaptive Scaffolding Modes

SKILL.md now accepts a `mode` parameter (`strict` | `lean`, default
`strict`). Strict mode applies full defensive engineering (rate limiting,
caching, structured errors, architectural isolation). Lean mode skips
non-essential scaffolding for simple UI or ephemeral modules, reducing token
overhead for small projects like react-timer.

### CI Workflow

Added `.github/workflows/ci.yml` for automated type-checking, build, and
test execution on every push and pull request to `main`.

### Changelog Structure

Added `docs/changelogs/` with a MOC index page and per-version changelogs
for 3.0.0, 3.1.0, and 3.2.0. Prior-version changelogs are not available;
see the index for a summary of un-tagged releases.

### .node-version

Added `.node-version` file for automated Node.js version management.

## New Features: Expanded Tooling & Subcommands

### Native Tooling Discovery

The server now inventories a project's own utility layer before composing
raw commands:

- `listMakeTargets` parses `Makefile` targets
- `listPackageScripts` reads `package.json` scripts
- `listShellScripts` scans `scripts/`, `tools/`, `bin/`, and `script/` for
  executable or script-extension helpers
- `discoverTooling` aggregates all three into a single report

Command resolution (`resolveCommand`) prefers a matching Makefile target over
the manifest fallback (e.g. `make test` over `pnpm test`), so the project's
canonical commands win.

### New MCP Tools

Eleven tools are now exposed (was three):

- `tooling` -- inventory Makefile targets, script helpers, and package scripts
- `lint` -- run lint (Makefile target first, manifest fallback)
- `format` -- run format
- `test` -- run test
- `build` -- run build (new `buildCommand` added to project detection)
- `verify` -- run the full quality gate (format, lint, test, build) with a
  pass/fail summary
- `compliance` -- audit deliverable tiers (must-haves: unit tests, docstrings;
  nice-to-haves: API docs, changelog)
- `version` -- report the current LCCST version

### SKILL.md Subcommands

SKILL.md now documents `/tooling`, `/lint`, `/format`, `/test`, `/build`,
`/verify`, `/compliance`, and `/version`, each mapping 1:1 to an MCP tool.
The Tooling Ladder was re-ordered so the project utility layer (Makefile,
`scripts/`, package scripts) sits above LSP/Tree-sitter and ad-hoc `grep`
pipelines.

### Deliverable Tiers

SKILL.md splits every payload into two requirement tiers, audited by the
`/compliance` tool:

- **Must Have** (non-negotiable, blocks commit): unit tests adjacent to every
  functional module, and docstrings on public exports.
- **Nice to Have** (best-effort, may defer): API docs for public interfaces
  and changelog delta records. License compliance remains a hard stop on
  copyleft clashes.

### AGENTS.md

Added `AGENTS.md` capturing repository conventions for AI agents: canonical
Makefile commands, the must-have / nice-to-have deliverable tiers, changelog
style, version-bump workflow, the eleven MCP tools, code layout, and
structural invariants. Referenced from the README Development section.

### Test Suite Expansion

Extended unit coverage to `clusterHunks`, `runCommand`, `detectTool`,
`logEvent`, and `scanEnvironment` conventions (61 unit tests total). Added
MCP integration tests for the `version`, `tooling`, and `compliance` tools
(9 integration tests total). README test-script counts updated accordingly.

### MCP Server Activation Rules

The main `lccst` MCP server is registered in `opencode.jsonc` but **disabled
by default** (`enabled: false`). It is activated by flipping the flag or
toggling per-prompt in the host. Inside benchmark playgrounds
(`playground/{agent-model}/`) the main server is always disabled -- the
generated `opencode.jsonc` now explicitly sets `lccst.enabled: false` -- so
runs stay isolated from protocol tooling and only `lccst-telemetry` is active.

## Breaking Changes

None. All changes are additive, corrective, or internal.

## Version

Bumped from 3.1.0 to 3.2.0.
