### LCCST 3.4.0

Date: _2026-08-28_

Updates to the benchmark harness, README accuracy, and MCP server parity.

## Correctness

### Benchmark Table Column Fix

The `scripts/update_readme_benchmarks.py` per-model table separator row had fewer columns than the header row. The separator and summary rows now match the thirteen-column layout of the table headers. Benchmark tables render correctly.

### README Conciseness and Accuracy

The README was trimmed to remove redundancy and to reflect the current MCP server tooling precisely. The runtime modes, installation options, and tool descriptions now match `src/index.ts` exactly. The benchmark prose sections were tightened.

## Consistency

### MCP and Skill File Alignment

The eleven MCP tools are now documented in `SKILL.md` with one-to-one parity to the server registration in `src/index.ts`. The tool descriptions match the implementation descriptions exactly. When the MCP server is active, agents invoke `/init` first to detect the project type and tooling before proceeding.

## New Features

### Playground Focus on Implementation

The playground files (`guide.md`, `README.md`, `agent-prompt.md`) were updated to focus solely on implementing the three reference projects. References to running the benchmark script itself were removed. The agent prompt now directs the model exclusively toward project implementation and telemetry checkpointing.

## Version

Bumped from 3.3.0 to 3.4.0.
