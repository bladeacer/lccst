### LCCST 4.7.0

Date: _2026-10-28_

The playground evaluation now solely focuses on providing utility and improved
code quality. The benchmarking playground is used as a black-box environment to
evaluate the skill's effectiveness at implementing the relevant projects (plain
and skill-guided variants). The skill file is updated to remove all benchmark-
related instructions and remain solely focused on protocol execution and code
quality.

The playground is updated to work with Kiro's models that can be selected via
`make benchmark-free`.

## Documentation Changes

### Playground Documentation

- Updated `playground/README.md` to focus on evaluation rather than benchmarking
- Removed variant comparison language (`plain` vs `skill-guided`)
- Added evaluation rubric documentation for human reference only (not visible to
  the model under test)
- Simplified scoring description to focus on implementation quality metrics

### README.md

- Updated "Playground and Benchmarking" section to "Playground and Evaluation"
- Removed detailed benchmarking methodology that compared two implementation
  variants
- Added evaluation process documentation with clear isolation guarantees
- Kept the rubric in playground/README.md for human reference only

### SKILL.md

- Removed version metadata reference to benchmark variants
- Removed terminology section references to benchmark variants
- Updated mode description to be clearer

## Version

This release is version 4.7.0. The bump updates `package.json`,
`src/index.ts`, `dist/index.js`, `tests/init_handshake.test.ts`, the
telemetry MCP files (`playground/benchmarks/mcp-telemetry/`), and the
`SKILL.md` metadata.

## Version Policy

This is a minor version release (4.6.0 -> 4.7.0). It adds additive changes
to the playground evaluation process and documentation. The core protocol
remains unchanged.
