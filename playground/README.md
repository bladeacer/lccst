# LCCST Playground

Implementation workspace for three reference projects used in benchmark evaluation.

## Projects

### Python HTTP Server
A single-file HTTP server with CRUD for users. Includes input validation, email regex, rate limiting, and type hints. Tests run via `uv run pytest`.

### React Timer
A TypeScript stopwatch with start, stop, and reset functionality. Split into a Timer class and `TimerDisplay` React component with a `formatTime()` utility. Tests use Jest, ts-jest, and @testing-library/react.

### Go Login CRUD
A layered Go server with model, repository, handler, middleware, and cache components. Uses interfaces and dependency injection. Tests run via `go test ./tests/ -v`.

## Environment

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 18 | Running the LCCST MCP server |
| pnpm | >= 9 | Package manager for Node projects |
| TypeScript | >= 5.4 | Compiling engine source |
| Python | >= 3.10 | Running playground benchmarks |
| Go | >= 1.21 | Reference project in playground |
| uv | >= 0.4 | Python package manager |

## Setup

Install the `headroom` MCP server. Follow the setup instructions at the [headroom repository](https://github.com/chopratejas/headroom). Headroom saves token usage while preserving context.

## Implementation Guide

See [`guide.md`](./guide.md) for project-specific constraints, mitigation rules, and known token traps. The guide covers TypeScript, pnpm, Python uv, and Go module layout concerns.

## Benchmarking

The benchmark suite measures token impact of skill-guided versus plain code generation. See the [`README.md`](../README.md) in the project root for the full benchmarking suite and results.
