### LCCST 3.5.0

Date: _2026-08-29_

Dry-run execution mode, structured JSON envelopes, state lifecycle management, and tooling ladder refinements.

## New Features

### Dry-Run Mode

The `dry_run` boolean argument is now available for `/swarm` and `/verify`. When enabled, state mutations are tested without committing files, clearing `.lccst/state.json`, or executing stateful commands. This enables safe pre-flight verification of the execution loop.

### /swarm Abort Mechanism

`/swarm --abort` resets an interrupted swarm and clears `.lccst/state.json`. This allows recovery from failed or cancelled execution sequences without manual file cleanup.

### Structured JSON Envelopes

All MCP tools now return a structured JSON envelope containing `success`, `step`, `payload`, and `next_action` fields instead of unstructured text. This enables seamless integration with programmatic AI orchestrators while keeping `src/index.ts` lightweight.

### State Lifecycle Management

`/swarm` and `/verify` now clear `.lccst/state.json` upon successful sequence completion. The state file is no longer left behind after a successful run. The `/swarm --abort` reset mechanism recovers from interrupted states.

## Consistency

### Tooling Ladder Priority

Native workspace runners now take explicit precedence over bare binaries. The protocol dictates preferring `pnpm exec jest` or `uv run pytest` over global `jest` or `pytest`. This prevents environment leaks when running commands in Bare Skill Mode.

### Token Investment Philosophy Moved

The token economy guidance moved out of `SKILL.md` into the `README.md` Core Philosophy section. The skill keeps only the proportionality principle in its mandate. The philosophy is now concise: invest tokens where robustness depends on them. Do not spend tokens on trivial corrections.

### Skill and README Separation

`SKILL.md` is now standalone: it describes the protocol as slash commands and exact conventions without referencing the MCP server, its modes, activation, or tool parity. `README.md` documents the one-to-one mapping between tools and slash commands and regains a concise Core Philosophy section (UNIX-style minimalism, user conventions first, quality over velocity, locality clustering, proportional defence, and token investment).

## Correctness

### Restored `pnpm-lock.yaml`

Restored the `pnpm-lock.yaml` lockfile to version control. It had been removed in commit `a4b13d8` and added to `.gitignore`, which caused the CI `pnpm install --frozen-lockfile` step in `.github/workflows/ci.yml` to fail because no lockfile was present. The lockfile is now tracked again and `--frozen-lockfile` runs cleanly.

## Performance

### Mode Gating Restored in `SKILL.md`

Added an explicit Mode Gating clause back to `SKILL.md` §2. Agents remain in Read/Plan Mode by default and only latch into Active Execution on a directed change command. This matches the v2.8.0 budget control that had been collapsed into a single line in the v3.5.0 draft, and it reduces completion-token overhead during `/init` and `/audit` turns.

### Defensive Rules Bound to `mode`

The defensive-engineering rule in `SKILL.md` now binds to the `mode` argument declared in the YAML schema. In `lean` mode (pure logic/UI helpers) only boundary validation and typed errors are required; rate throttling, caching, and architectural isolation apply only in `strict` mode and only where exposure justifies them. This stops the agent from chasing security/error patterns on projects where the rubric ceiling forbids them (for example, the React Timer rubric ceiling of 67/100).

### Telemetry Clause Relaxed

`playground/agent-prompt.md` no longer demands that the telemetry tool call be the absolute final token of the response. The call still must be placed at the end of each phase, but a brief next-step summary is permitted afterwards. This restores the agent's normal closure logic and reduces tool-call retries.

### Pre-Baked Configuration Docs Restored

Added the React and TypeScript Setup Checklist, Go Test Package Isolation, uv for Python (PEP 735) paragraphs, and the `## Platform-Specific Notes` section back to `playground/guide.md`. These map to known token traps from v2.8.0 (`allow-builds`, `package tests`, `pyproject.toml` layout) and prevent re-derivation loops.

### Benchmark Runner Docs Restored

`playground/README.md` regained the `Running the Benchmark`, `What Gets Measured`, `Robustness Score Calculation`, `Reproducing Benchmarks`, `Adding New Agents`, and `Prerequisites` sections that were removed in the v3.5.0 README trim. Agents asked to reproduce or extend benchmarks now have an authoritative recipe instead of improvising.

## Breaking Changes

### Tool Output Format

All MCP tool responses now return structured JSON envelopes. Consumers that parsed the previous unstructured text output must update to parse the new JSON format. The text content type is preserved for MCP compatibility.

## Version

Bumped from 3.4.0 to 3.5.0.
