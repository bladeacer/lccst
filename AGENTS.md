# AGENTS.md

This file gives agents the rules and limits for work in the LCCST repository.
Use this file with `SKILL.md`, the protocol specification, and `README.md`,
the user-facing documentation.

When sources conflict, use `SKILL.md` for protocol mechanics. Use `README.md`
for user-facing claims.

## Project Overview

LCCST (Locust) is a deterministic workspace gatekeeper. It decomposes each
workspace change into isolated, test-verified, atomic Git commits.

The main deliverables are one MCP server (`src/index.ts`) and one protocol
specification (`SKILL.md`). The server contains the complete implementation in
one file.

## Documentation Style

Write documentation with the vendored `skills/simple-english/SKILL.md` rules.
Use Simplified Technical English (STE) and British English.

### Language Rules

- Use short sentences and active voice.
- Use one term for one concept throughout a document.
- Use `must` for a requirement. Do not use `should` for an optional rule.
- Put a condition before its command.
- Keep descriptive text separate from instructions.
- Use clear subjects. Replace an unclear `it` or `this` with a named object.
- Use British spellings, such as `behaviour`, `licence`, and `normalised`.
- Keep code, identifiers, commands, paths, and quoted errors unchanged.
- Use ASCII characters only. Do not use emojis or em-dashes.
- Limit text lines to 100 characters. Limit code-block lines to 120 characters.

## Canonical Commands

Use Makefile targets and `scripts/` helpers. Do not compose raw commands when
a project command already exists.

```bash
make build              # Bundle src/index.ts -> dist/index.js with esbuild and tsc.
make test               # Run all unit and integration tests.
make test_swarm         # Run swarm unit tests.
make test_mcp           # Run MCP integration tests.
make benchmark-dryrun  # Test main and telemetry MCP connections.
make clean              # Remove dist/.
make help               # List all targets.
```

Use `pnpm` version 9 or later. Pin the Node.js version in `.node-version`.

## Deliverable Tiers

The `/compliance` tool checks two deliverable tiers.

### Must-have deliverables

These items block a commit:

- Add unit tests next to every functional module. Run `make test`. All tests
  must pass.
- Add docstrings to every public export, class, and function.

Match test and docstring size to the module. Test public behaviour. Do not test
trivial internals. Do not add scaffolding unless the domain requires it.

### Nice-to-have deliverables

These items do not block a commit for an internal-only change:

- Add API documentation in `docs/api-docs/`.
- Add a changelog entry in `docs/changelogs/`.
- Examine licence compatibility. Stop when copyleft code conflicts with the
  MIT licence.

## Changelog Convention

Store each version changelog in `docs/changelogs/lccst-<version>.md`. Add the
file to `docs/changelogs/index.md`.

Use the Ada_CRDT structure:

1. Start with `### LCCST <version>`.
2. Add the release date in the existing italic format.
3. Add one summary line.
4. Add relevant sections: `## Correctness`, `## Consistency`,
   `## New Features`, `## Breaking Changes`, and `## Version`.

Add a changelog entry for every behaviour change. State breaking changes
explicitly.

## Version Bumping

Run the version command with a semantic version:

```bash
pnpm run bump <major.minor.patch>
```

The command updates `package.json`, `src/index.ts`, `dist/index.js`,
`tests/init_handshake.test.ts`, the telemetry MCP files, and `SKILL.md`
metadata. Run `make build` after the command.

## MCP Server

The server exposes eleven tools:

- `init`: Map project conventions and examine the environment.
- `audit`: Scan workspace diffs and give a commit plan.
- `swarm`: Run the discovery, clustering, testing, and commit loop.
- `tooling`: List Makefile targets, script helpers, and package scripts.
- `lint`: Run lint. Use the Makefile target first, then the manifest fallback.
- `format`: Run the project format command.
- `test`: Run the project test command.
- `build`: Run the project build command.
- `verify`: Run the full quality gate: format, lint, test, and build.
- `compliance`: Audit must-have and nice-to-have deliverables.
- `version`: Report the current LCCST version.

The `lccst` server is registered in `opencode.jsonc`. It is disabled by
default (`enabled: false`). In benchmark playgrounds, it stays disabled. Only
`lccst-telemetry` is active there.

## Code Layout

```text
src/index.ts          MCP server and swarm helpers in one file
scripts/              Version bump, test runners, and benchmark aggregation
tests/                JSON-RPC integration test payloads
playground/           Benchmark harness and agent sandboxes
docs/changelogs/      Per-version changelogs and the index
```

## Structural Invariants

- Keep one file focused on one domain. `src/index.ts` is the exception because
  it contains the complete MCP server and swarm helpers.
- Use strict TypeScript. Do not use `any`, unchecked casts, or disabled type
  checks unless the language or host makes them unavoidable.
- Use hermetic lockfiles and workspace runners: `pnpm`, `uv`, `cargo`, and
  `go`.
- Do not create commands that already exist as Makefile targets, scripts, or
  package scripts. Use `/tooling` or `make help` before writing a command.
- Remove temporary files created during the task before `git status`.
