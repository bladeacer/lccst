# LCCST Playground

Clean-room evaluation harness for LCCST. Tests and evaluates the protocol with
different AI models and configurations.

## Vocabulary

- A **workspace** is a directory named `<provider>-<harness>-<model>`.
- A **subproject** is `python-http-server`, `react-timer`, or `go-login-crud`.
- An **agent tag** is the workspace directory name.
- A **mode** is `strict` or `lean` -- the defence level for defensive controls.

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
| Node.js | 20 | LCCST server and React projects |
| pnpm | 9 | Node dependencies |
| TypeScript | 5.4 | LCCST source |
| Python | 3.10 | Evaluation script |
| Go | 1.21 | Go project |
| `uv` | 0.4 | Python dependencies |

## Setup

The evaluation environment holds `tiktoken`, which the scanner uses to count
the tokens of a file. The scanner starts it through `uv` when the current
interpreter holds no encoder.

```bash
cd playground/benchmarks
uv sync
cd ../..
```

## Running the Evaluation

```bash
python3 playground/benchmarks/run_benchmark.py <agent-tag> \
    [--model-id <provider/model>] [--workspace <dir>] [--install-deps]
```

The scanner applies one file filter and one test command to the implementation.
Pass `--model-id` with the full identifier that the run pinned, so the report
can compare the model of the host store with the model of the run.

The report is written to:

```text
playground/benchmarks/<agent-tag>/benchmark-report-v<skill-version>.md
```

## Choosing a model

`make benchmark-free` asks for a harness and a model in a fuzzy search. Type
part of a model name and press Enter on the row that the search leaves. Every
row names the harness and the model, so a search matches a harness name too.
`fzf` provides the search. Without `fzf`, the picker asks for a filter and a
number instead. `make bench-list` prints the same list and needs no terminal.

The picker offers a model when the model can do the work.

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

## Evaluation rubric (for documentation only)

The evaluation rubric defines how implementations are scored. This document is
never sent to the model under test. The model only reads `SKILL.md`, `guide.md`,
and `traps.md`.

### What gets measured

Every run measures four things for each subproject:

- File token count. The scanner counts the tokens of every source file. The
  report states an estimate when `tiktoken` is absent.
- Line count. The report counts every source line of every counted file.
- Test verdict. The scanner runs the test command of the subproject and
  classifies the result. A pass, a test failure, and a scanner error are three
  different outcomes.
- Implementation quality. The scanner evaluates typing, security, and error
  handling for features it detects in the text of the implementation files.
  A feature that appears only in a test file, behind a thin wrapper, or in
  the model commentary does not count.

### Scoring rules

- A passing test run earns 50 points, a failing run earns 15 points, and a
  scanner error earns 5 points.
- The scanner adds typing, security, and error handling points only for
  features it detects in the text of the implementation files. A feature that
  appears only in a test file, behind a thin wrapper, or in the model
  commentary does not count.
- The scanner divides the total by the feature ceiling of the subproject and
  reports a percentage. The ceiling is 100 for `python-http-server` and
  `go-login-crud` (pass 50 + typing 17 + security 17 + error handling 16), and
  67 for `react-timer` (pass 50 + typing 17). The `react-timer` ceiling sets
  security and error handling to 0.
- The scanner then applies a bloat penalty. The implementation of a variant
  must fit the line budget of the subproject: 120 lines for
  `python-http-server`, 60 for `react-timer`, and 200 for `go-login-crud`.
  A variant whose implementation files carry more lines than the budget
  loses score in proportion to the excess. The penalty reads implementation
  lines only, so a variant cannot buy the ceiling by padding its test file.
  The budget applies to every variant, so a variant cannot escape the
  penalty by delivering no rewarded feature. The budget is part of the
  assignment: `guide.md` states the same number to both variants, so no
  variant is judged against a hidden bar.

## Evaluation hygiene

The model under test reads every document of the clean room. The run therefore
seeds only the task documents: the guide, the traps, and the prompt. The run
never copies `playground/README.md` into the clean room, because this file
states the rubric. A model that reads the rubric writes the signal, not the
behaviour. The target specification of the three subprojects lives in
`playground/guide.md`. `make test_bench_leak` asks make for the dry-run
recipe, confirms the seeded set, and fails when a scoring term reaches one of
the seeded documents.

## What a report must show

A report enters the README table only when every check passes. The checks are
in the notes under the report header.

- The report names the version of the harness and the path of the command.
- Every phase holds a settled token count, and the settle step flagged no
  phase with an impossible count.
- The host store confirms the model of the run.
- The model stated the run token of the instructions.
- The machine of the run matches the declared toolchain.
- All variants pass their tests.

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
the machine does not match the environment table above.

## What Gets Measured

## What a run measures

Every run measures four things for each subproject:

- File token count. `run_benchmark.py` counts the tokens of every source file
  that the scanner counts. The report states an estimate when `tiktoken` is
  absent.
- Line count. The report counts every source line of every counted file.
- Test verdict. The scanner runs the test command of the subproject and
  classifies the result. A pass, a test failure, and a scanner error are three
  different outcomes.
- Implementation quality. The scanner evaluates typing, security, and error
  handling for features it detects in the text of the implementation files.
  A feature that appears only in a test file, behind a thin wrapper, or in
  the model commentary does not count.
