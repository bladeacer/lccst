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
| Node.js | 20 | LCCST server and React projects |
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
- All three subprojects hold a skill-guided variant that reaches the ceiling for
  that subproject.

The ceiling is 100 for `python-http-server` and `go-login-crud`, and 67 for
`react-timer`. A skill-guided variant that passes but scores below the ceiling
for its subproject is rejected. The README table uses the same ceilings that the
scanner uses.

The README table rejects a run that passes every check but scores too low. That
case is a tooling fault, not a pass. The report still belongs on disk for
inspection, and the table still leaves it out.

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

## What Gets Measured

Every run measures four things for each subproject and each variant.

- File token count. `run_benchmark.py` counts the tokens of every source file
  that the scanner counts. The report states an estimate when `tiktoken` is
  absent.
- Line count. The report counts every source line of every counted file.
- Test verdict. The scanner runs the test command of the subproject and
  classifies the result. A pass, a test failure, and a scanner error are three
  different outcomes.
- Robustness score. The score rewards the features that the rubric rewards. The
  ceiling is different for each subproject. A passing skill-guided variant must
  reach 100 on every subproject.

The scanner scores the source text, not the test result. A feature the scanner
does not see in the source does not count, even when a passing test exercises it.

The score uses the implementation files, not the test files. A feature that
appears only in a test file does not count, and the bloat penalty uses the
implementation lines only, so a variant cannot buy the ceiling by padding its
test file. The report table still shows the total line count of every counted
file, so the implementation line count is the difference between the two.

The report labels the columns `Strategy` and `Routine`, but the two implementations
are `plain` and `skill-guided`. A run does not create a second rubric or a second
model by using those labels, and the README table still rejects a run whose
skill-guided variant falls below the ceiling.

The score also needs a short file. Do not try to buy the ceiling by stuffing the
file with lines that do not add a rewarded feature. A feature in the file is not
enough when the file is too long, and a short file is not enough when the file
does not deliver the feature the rubric rewards.

The scanner does not count the number of test assertions. A test file that
contains many assertions for the same behaviour does not raise the feature score,
and it can raise the lines-per-feature ratio. Do not pad the test file to chase
the ceiling.

## Robustness Score Calculation

The same rubric scores the plain variant and the skill-guided variant. A pass
earns 50 points. A test failure earns 15 points. A scanner error earns 5
points. The feature points are the same in both columns.

The score then adds the feature ceiling for the subproject. The feature ceiling
is the maximum points the rubric awards for typing, security, and error
handling on that subproject. The ceiling is different for each subproject.

### Feature ceilings

| Subproject | Max Typing | Max Security | Max Error Handling | Ceiling |
| --- | :---: | :---: | :---: | :---: |
| python-http-server | 17 | 17 | 16 | 100 |
| react-timer | 17 | 0 | 0 | 67 |
| go-login-crud | 17 | 17 | 16 | 100 |

The plain variant of `react-timer` does not earn security points or error
handling points, because the rubric ceiling forbids them. A plain React Timer
can still pass, because the pass earns 50 points and the typing ceiling adds
17 points.

The feature ceiling sets the maximum points the rubric can award for a subproject.
It does not set the score a variant must reach on its own. The score uses the
pass, the detected features, and the ceiling together. A variant that passes and
delivers every rewarded feature for its subproject reaches the ceiling.

The bloat penalty is a separate step. The scanner applies it only after the
rubric has scored the variant, and only when the variant already delivered at
least one rewarded feature. A variant that delivers no rewarded feature never
reaches the bloat penalty. A variant that reaches the ceiling can still lose
points here if it carries too many lines for the features it delivered.

### Bloat penalty

The score then applies a bloat penalty when a variant carries many lines for the
features it delivers. The penalty uses a lines-per-feature ratio per subproject.

| Subproject | Lines per feature ceiling |
| --- | :---: |
| python-http-server | 30 |
| react-timer | 20 |
| go-login-crud | 30 |

A variant that exceeds the ratio loses score, because it carries code that does
not add a rewarded feature.

### Why the columns are comparable

The plain variant and the skill-guided variant share the same rubric, the same
feature ceilings, and the same bloat penalty. The score of one column is
therefore directly comparable with the score of the other column.

### What the README table accepts

The README table accepts a run only when the skill-guided variant reaches the
ceiling for every subproject.

- The skill-guided `python-http-server` must reach 100.
- The skill-guided `react-timer` must reach 67.
- The skill-guided `go-login-crud` must reach 100.

A 100 on a subproject with a 100 ceiling means the variant passed and delivered
every rewarded feature for that subproject, with no lines-per-feature penalty.

A 67 on `react-timer` means the variant passed and delivered every rewarded
feature for that subproject, with no lines-per-feature penalty. A skill-guided
`react-timer` that passes and delivers only typing reaches at most 67.

The README table does not accept a skill-guided variant that passes but scores
below the ceiling for its subproject.

The score has two parts that are not the same thing. The ceiling says how many
points the rubric can award for a subproject. The bloat penalty says whether a
variant that already reached the ceiling stays there after the scanner looks at
its lines. A variant can hit the ceiling and still lose points to the bloat
penalty. A variant can miss the ceiling and never get to the bloat penalty.

The score is a percentage of the ceiling, not a raw point count. A passing
`react-timer` earns 50 points and the typing ceiling adds 17 points, so a
passing `react-timer` that delivers typing reaches 67 raw points, which is 100
percent of the 67 ceiling. A passing `react-timer` that delivers no typing
reaches 50 raw points, which is 75 percent, and the README table rejects it.
The table accepts a skill-guided variant only when its percentage reaches 100
for its subproject, so a skill-guided `react-timer` must pass and deliver
typing in the source text.

A run can also be rejected after it passes every other check. A high score needs
both a detected feature and a short file. A file that carries the feature but also
carries too many lines can fail the table even when the test passes.
