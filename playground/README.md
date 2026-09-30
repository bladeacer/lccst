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

## Choosing a model

`make benchmark-free` asks for a harness and a model in a fuzzy search. Type part
of a model name and press Enter on the row that the search leaves. Every row
names the harness and the model, so a search matches a harness name too.
`fzf` provides the search. Without `fzf`, the picker asks for a filter and a
number instead. `make bench-list` prints the same list and needs no terminal.

The picker offers a model when the model can do the work and costs nothing.

- A model can do the work when the registry states that it calls tools, that it
  reads text, and that it writes text. A model that generates images, audio, or
  video, and a moderation model, are therefore left out.
- A model is a router when its identifier ends in `openrouter/auto`,
  `openrouter/free`, or `kilo-auto/`. A router chooses another model for each
  request, so a report would name a model that never ran.
- A family that its author rejects for agentic work is left out. The LFM family
  of Liquid AI is the only such family today.
- A model is free when its identifier ends in `-free`, `:free`, or `/free`, or
  when the registry states no charge for it.

The registry at `https://models.dev/api.json` states a price for up to eight
kinds of token, and it can hold a price for a long context, so the picker reads
every number that the registry states. A price that the registry does not state
is not a price of zero, so such a model is left out. The registry decides by
provider, because one model name can be free at one provider and paid at
another. The picker reads the registry only when it offers the models, and it
waits at most ten seconds. Without the registry, the picker falls back to the
model name and to the lists above.

Set `BENCH_ALL_MODELS=1` to offer every model that can do the work. Set
`BENCH_PICK=0` and pass `HARNESS`, `PROVIDER`, `MODEL_NAME`, and
`BENCH_MODEL_ID` to choose a model without the picker. The picker keeps every
list in `scripts/benchmark-picker.ts`, so a new family or a new router is one
line in that file.

## What a report must show

A report enters the README table only when every check passes. The checks are
in the notes under the report header.

- The report names the version of the harness and the path of the command.
- Every phase holds a settled token count.
- The host store confirms the model of the run.
- The model stated the run token of the instructions.
- All three subprojects hold a passing skill-guided variant at 100 percent.

A run that fails a check stays on disk for inspection, and the table leaves it
out.

## The report header

The header states what a reader needs to reproduce a run.

| Field | Source |
| --- | --- |
| Provider | The provider of the run |
| Harness | The harness that ran the phases |
| Harness Version | `harness --version` and the path of the command |
| Model | The model name of the run |
| Requested Model ID | The full identifier that the run pinned |
| Agent Tag | The directory name of the report |
| Active Ecosystem MCPs | The servers the host recorded |
| Skill Protocol Engine | The version of `SKILL.md` |
| Python, pnpm, Go | The versions on the machine |

The report then states a note for every check, and a toolchain drift note when
the machine does not match `guide.md`.
