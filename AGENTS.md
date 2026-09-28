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
make test_telemetry     # Run telemetry MCP unit tests.
make test_picker        # Run benchmark picker unit tests.
make test_picker_tty    # Run benchmark picker tests in a pseudo terminal.
make test_report        # Run benchmark report and README table tests.
make test_e2e           # Run telemetry end-to-end tests on real harnesses.
make test_mcp           # Run MCP integration tests.
make benchmark-free     # Pick a model, then run the full benchmark.
make bench-list         # List the models that the picker offers.
make bench-model        # Check that the harness offers the pinned model.
make benchmark-dryrun  # Test main and telemetry MCP connections.
make clean              # Remove dist/.
make help               # List all targets.
```

The benchmark picker drives `make benchmark-free`. It asks for a harness and a
model, then calls the target again with `BENCH_PICK=0` and the chosen values.
Set `BENCH_PICK=0` to skip the picker and pass `HARNESS`, `PROVIDER`,
`MODEL_NAME`, and `BENCH_MODEL_ID` on the command line.

The picker starts a real model, so it refuses to run without a terminal. Set
`BENCH_ALLOW_PIPE=1` only when a script must choose a model. `make bench-list`
needs no terminal.

The run happens in a clean room outside the repository, under
`$(BENCH_TMP)/lccst-bench-$(AGENT_MODEL)`. The target checks that the harness
offers `BENCH_MODEL_ID`, because a harness that cannot resolve the model starts
a different one. The target seeds `SKILL.md`, `README.md`, `guide.md`,
`traps.md`, and `agent-prompt.md` into the clean room, and copies
`agent-prompt.md` to `AGENTS.md` so that the harness injects it. The target
writes the run token to `prompt-token.txt` and to the last line of `AGENTS.md`.
The target then starts the harness in the foreground with the `BENCH_TASK`
prompt, so the user can steer the run. The run points the configuration
directory of the harness at the clean room, so the plugins and skills of the
user cannot change the measurement. A harness that leaves with a non-zero status
does not stop the target, because the settle step and the report must still run.
The target settles the token counts, writes the report, removes the clean room,
and refreshes the README table.

Each run writes its own telemetry file, at `runtime-telemetry.json` inside the
clean room. The harness passes the path in `LCCST_TELEMETRY_FILE`, so two runs
cannot write into one file.

The scanner applies one file filter and one test command to both variants, and
it scores both with the same rubric. A run enters the README table only when
every phase holds a settled count, the host store confirms the model, the model
stated the run token, and the skill-guided variant passes all three subprojects.

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
