### LCCST 3.0.0

Date: _2026-07-06_

Protocol rewrite: flat 3-step execution path, MCP server consolidation, and benchmark automation.

## New Features

### MCP Server Mode

Full Model Context Protocol server implementation in `src/index.ts`. Exposes three tools (`/init`, `/audit`, `/swarm`) and a `swarm` prompt for programmatic AI agent integration.

### Flat 3-Step Execution Path

Replaced multi-phase execution loops with a flat sequence: wipe stale artefacts, seed via `/init`, generate application files directly. Eliminated the meta-cognition tax from prior versions.

### Automated Benchmark Suite

`playground/benchmarks/` harness with token telemetry (FCT + ART), robustness scoring, and per-subproject evaluation profiles across three reference projects (python-http-server, react-timer, go-login-crud).

### Version Bump Utility

`scripts/bump-version.ts` synchronises version strings across package.json, src/index.ts, test files, and telemetry MCP.

## Changes

### Unified Skill Artifacts

All runtime state consolidated under `.lccst/` directory. State persistence via `SwarmState` class with JSON file-backed checkpointing.

### CI/CD Pipeline

GitHub Actions release workflow building `dist/index.js` and publishing draft releases on version tags.

### Skill File Restructured

`SKILL.md` rewritten to Agent Skills specification format with YAML front matter, structured sections, and a Tooling Ladder for ecosystem discovery.

## Breaking Changes

- Dropped multi-phase execution loop in favour of flat 3-step path
- Removed legacy JavaScript code (moved fully to TypeScript)
- Runtime state directory changed to `.lccst/` (was project-root files)

## Version

Bumped from 2.9.0 to 3.0.0.
