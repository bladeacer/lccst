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

## Breaking Changes

### Tool Output Format

All MCP tool responses now return structured JSON envelopes. Consumers that parsed the previous unstructured text output must update to parse the new JSON format. The text content type is preserved for MCP compatibility.

## Version

Bumped from 3.4.0 to 3.5.0.
