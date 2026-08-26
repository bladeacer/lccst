### LCCST 3.1.0

Date: _2026-07-17_

Benchmark expansion, token efficiency improvements, and skill file trimming.

## New Features

### Multi-Model Benchmark Results

Added benchmark results for three agent-model combinations:
- `opencode-ling-3.0-flash-free` (benchmark leader: -4% ART overhead)
- `opencode-deepseek-v4-flash-free`
- `opencode-hy3-free`

### Benchmark Report Automation

`scripts/update_readme_benchmarks.py` parses benchmark reports from `playground/benchmarks/` and regenerates the README comparison tables with composite scoring.

### Adaptive README Benchmarks

Automated top-N selection of best-performing agent models with token efficiency prose generation.

## Changes

### Skill File Trimming

Reduced SKILL.md token count by removing passive-voice prose and consolidating redundant guardrail descriptions.

### Hardcoded Version Fix

Test file `tests/init_handshake.test.ts` version string is now managed by the bump-version utility instead of hardcoded.

### Benchmark Harness Improvements

- Telemetry MCP server for runtime token tracking
- Composite scoring with guided score, plain baseline, pass rate, and token overhead components
- Project-aware scoring profiles per subproject

## Breaking Changes

None.

## Version

Bumped from 3.0.0 to 3.1.0.
