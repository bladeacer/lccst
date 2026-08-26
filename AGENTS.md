# AGENTS.md

Conventions and guardrails for AI agents working in the LCCST repository.
This file is a companion to `SKILL.md` (the protocol spec) and `README.md`
(user-facing docs). When these conflict, `SKILL.md` wins for protocol
mechanics; `README.md` wins for user-facing claims.

## Project Overview

LCCST (Locust) is a deterministic workspace gatekeeper. It decomposes
codebase changes into isolated, test-verified, atomic Git commits. The core
deliverable is a single-file MCP server (`src/index.ts`) plus a protocol
specification (`SKILL.md`). Documentation uses Simplified Technical English
(STE) and British English.

## Documentation Style

Documentation uses Simplified Technical English (STE) and British English.
When these conflict, `SKILL.md` wins for protocol mechanics; `README.md` wins for user-facing claims.

## Canonical Commands

Use the Makefile and `scripts/` helpers instead of composing raw commands.

```bash
make build        # Bundle src/index.ts -> dist/index.js (esbuild + tsc)
make test         # Run all tests (unit + integration)
make test_swarm   # Unit tests for swarm library helpers (scripts/test-swarm-unit.ts)
make test_mcp     # MCP server integration tests (scripts/test-connection.ts)
make benchmark-dryrun  # Verify main + telemetry MCP servers connect
make clean        # Remove dist/
make help         # List all targets
```

Package manager is `pnpm` (>= 9). Node version is pinned in `.node-version`.

## Deliverable Tiers

Every payload is graded on two tiers. Must-haves gate commit; nice-to-haves
are best-effort and may defer for internal-only changes. The `/compliance`
MCP tool audits both.

**Must Have (non-negotiable, blocks commit):**
1. Unit tests adjacent to every functional module, passing via `make test`.
2. Docstrings on every public export, class, and function.

**Proportionality:** Size tests and docstrings to the module. Assert public
behaviour, skip trivial internals, and do not add scaffolding the domain does
not justify.

**Nice to Have (best-effort, may defer):**
3. API docs for public interfaces (e.g. `docs/api-docs/`).
4. Changelog delta records in `docs/changelogs/` (see below).
5. License compliance (no copyleft clashes in a MIT project).

## Changelog Convention

Per-version changelogs live in `docs/changelogs/lccst-<version>.md`, indexed
by `docs/changelogs/index.md`. Use the Ada_CRDT style: a version header with
date, a one-line summary, then categorized sections (`## Correctness`,
`## Consistency`, `## New Features`, `## Breaking Changes`, `## Version`).

Always append a changelog entry when changing behaviour. Flag breaking changes
explicitly.

## Version Bumping

```bash
pnpm run bump <major.minor.patch>
```

This syncs the version across `package.json`, `src/index.ts`, `dist/index.js`,
`tests/init_handshake.test.ts`, the telemetry MCP (`package.json` + `src` +
`build`), and `SKILL.md` metadata. After bumping, rebuild with `make build`.

## MCP Server

The server exposes eleven tools:

| Tool | Purpose |
|------|---------|
| `init` | Map project conventions and verify environment |
| `audit` | Scan workspace diffs and generate commit plan |
| `swarm` | Execute the discovery-cluster-test-commit loop |
| `tooling` | Inventory Makefile targets, scripts, package scripts |
| `lint` | Run lint (Makefile target first, manifest fallback) |
| `format` | Run format |
| `test` | Run test |
| `build` | Run build |
| `verify` | Run full quality gate (format, lint, test, build) |
| `compliance` | Audit deliverable tiers (must-have vs nice-to-have) |
| `version` | Report the current LCCST version |

Activation: the `lccst` server is registered in `opencode.jsonc` but disabled
by default (`enabled: false`). Inside benchmark playgrounds it is always
disabled; only `lccst-telemetry` is active there.

## Code Layout

```
src/index.ts          MCP server + all swarm helpers (single file)
scripts/              Version bump, test runners, benchmark aggregation
tests/                JSON-RPC integration test payloads
playground/           Benchmark harness + agent sandboxes
docs/changelogs/      Per-version changelogs + MOC index
```

## Structural Invariants

- One file, one domain (anti-god-object). `src/index.ts` is the sanctioned
  exception: the whole MCP server is intentionally self-contained.
- Strict TypeScript. No type escapes unless unavoidable.
- Use hermetic lockfiles and workspace runners (`pnpm`, `uv`, `cargo`, `go`).
- Never re-invent commands that already exist as Makefile targets, scripts,
  or package scripts. Discover them with `/tooling` or `make help` first.
- Clean up transient files before `git status`.
