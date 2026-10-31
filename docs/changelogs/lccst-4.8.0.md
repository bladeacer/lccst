### LCCST 4.8.0

Date: _2026-10-31_

The benchmark run token is now unique to each run. The token still proves that a model received the project instructions, but two runs no longer share the same token value by default. The startup banner now states the run token together with the run identity.

The run report now publishes one extra derived metric: prompt tokens per passing phase. The report also publishes the count of passing phases in the operational summary, so a reader can see the token counts next to the number of phases that actually passed.

## New Features

- The run token derivation includes the workspace path of the run, so every run writes a different token into `prompt-token.txt` and the last line of `AGENTS.md`.
- `make benchmark-run` prints the run token with the agent tag, so the token is easier to trace back to the run that produced it.
- The settle output now states the passing phase count and the prompt, completion, and cache-read totals for the run.
- The benchmark report now includes prompt tokens per passing phase in the operational summary when the run has passing phases with prompt tokens.

## Correctness

- The inclusion gate still requires a prompted, measured, non-flagged, non-drifted run with a verified model and a stated run token.
- The README table reader now also reads `passed_phases` and `prompt_per_pass` from the report text when those values are present.

## Version

This release is version 4.8.0. The bump updates `package.json`, `src/index.ts`, `dist/index.js`, `tests/init_handshake.test.ts`, the telemetry MCP files (`playground/benchmarks/mcp-telemetry/`), `SKILL.md`, the changelog index, and `docs/changelogs/lccst-4.8.0.md`.

## Version Policy

This is a minor version release (4.7.0 -> 4.8.0). It adds additive reporting and provenance metadata. The benchmark protocol stays compatible with existing runs.
