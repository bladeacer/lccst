# LCCST Playground

Clean-room benchmark harness for LCCST. Compares two implementation variants
for each of three subprojects.

## Vocabulary

- A **benchmark workspace** is a directory named `<provider>-<harness>-<model>`.
- A **subproject** is `python-http-server`, `react-timer`, or `go-login-crud`.
- A **plain variant** is the smallest implementation that meets the target
  specification. It reads `README.md` and `guide.md`. It does not apply
  `SKILL.md` or `traps.md`.
- A **skill-guided variant** applies `SKILL.md` and `traps.md` as well.
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

The benchmark environment holds `tiktoken`, which the scanner uses to count the
tokens of a file. The scanner starts it through `uv` when the current
interpreter holds no encoder.

```bash
cd playground/benchmarks
uv sync
cd ../..
```

## Running the Benchmark

```bash
python3 playground/benchmarks/run_benchmark.py <agent-tag> \
    [--model-id <provider/model>] [--workspace <dir>] [--install-deps]
```

The scanner applies one file filter and one test command to both variants, so
the plain column and the skill-guided column measure the same thing. Pass
`--model-id` with the full identifier that the run pinned, so the report can
compare the model of the host store with the model of the run.

The report is written to:

```text
playground/benchmarks/<agent-tag>/benchmark-report-v<skill-version>.md
```

## What a report must show

A report enters the README table only when every check passes. The checks are
in the notes under the report header.

- Every phase holds a settled token count.
- The host store confirms the model of the run.
- The model stated the run token of the instructions.
- All three subprojects hold a passing skill-guided variant at 100 percent.

A run that fails a check stays on disk for inspection, and the table leaves it
out.
