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

## Breaking Changes

None. All changes are additive, corrective, or internal.

## Version

Bumped from 3.1.0 to 3.2.0.
