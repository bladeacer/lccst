# LCCST Playground

Clean-room benchmark harness for LCCST. Compares two implementation variants
for each of three subprojects.

## Vocabulary

- A **benchmark workspace** is a directory named `<provider>-<harness>-<model>`.
- A **subproject** is `python-http-server`, `react-timer`, or `go-login-crud`.
- A **plain variant** is the smallest implementation that meets the target
  specification. It does not apply `SKILL.md`.
- A **skill-guided variant** applies `SKILL.md` and `guide.md`.
- An **agent tag** is the benchmark workspace directory name.

A variant is not a mode. A variant is `plain` or `skill-guided`. A mode is
`strict` or `lean`.

## Subprojects

### Python HTTP Server

A HTTP server with user create, read, update, and delete operations.

### React Timer

A stopwatch application with start, stop, and reset actions.

### Go Login CRUD

A login system with user create, read, update, and delete operations.

## Environment

| Tool | Minimum version | Use |
| --- | --- | --- |
| Node.js | 18 | LCCST server and React projects |
| pnpm | 9 | Node dependencies |
| TypeScript | 5.4 | LCCST source |
| Python | 3.10 | Benchmark script |
| Go | 1.21 | Go project |
| `uv` | 0.4 | Python dependencies |

Clean-room run: Go 1.26.4-X with `nodwarf5`, Python 3.13.11, Node.js 18+,
pnpm 11.3.0+, pre-cached TypeScript types.

## Setup

Install the `headroom` MCP server from the
[headroom repository](https://github.com/chopratejas/headroom).

```bash
cd playground/benchmarks
uv sync
cd ../..
```

## Running the Benchmark

```bash
python3 playground/benchmarks/run_benchmark.py <agent-tag> [--install-deps]
```

The report is written to:

```text
playground/benchmarks/<agent-tag>/benchmark-report-v<skill-version>.md
```
