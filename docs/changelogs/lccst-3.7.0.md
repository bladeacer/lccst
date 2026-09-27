### LCCST 3.7.0

Date: _2026-09-27_

The telemetry server measures the token usage of the model under test. The
reader names no harness and no model.

## Correctness

### The Model Cannot Supply Its Own Token Count

The `log_turn_telemetry` tool asked the model under test for `prompt_tokens`
and `completion_tokens`. A model cannot read its own token usage, so the model
sent invented counts. The report then presented the invented counts as
measurements.

The tool now takes only the `subproject` and the `variant`. It stores the time
span of the phase. The settle step then measures that span.

### A Phase Is Measured After It Ends

A harness writes the token counts of a turn when the turn ends. The counts of
the last turn of a phase therefore appear after the tool call of that turn
returns. A reader that measures during the tool call loses the last turn of
every phase, and it loses every turn of the first phase.

The measurement therefore runs in two steps:

1. The tool call stores the span of the phase.
2. The settle step, `make telemetry-settle`, reads the counts of every model
   turn of the span.

The settle step is idempotent. It measures a phase that holds no model turn
again, so a run that settles too early corrects itself.

### The Reader Names No Harness

The earlier reader knew the file name and the schema of one harness. A second
harness needed a code change.

The reader now collects its candidates and takes the first store that holds a
session of the workspace:

- The file that `LCCST_TELEMETRY_DB` names.
- Every file that a variable with the suffix `_DB` names.
- Every database file one directory deep under the data directory of the user.

The reader accepts both host schemas. The newest schema keeps the author of a
turn in the `type` column of `session_message`. The older schema keeps it in
the `data` column of `message`. A store that the reader cannot open is
skipped without a message, because the data directory of a user holds many
database files that are not session stores.

The reader also takes the session from any metadata key that names a session,
because harnesses differ in the prefix of the key. A harness that sends no
such key falls back to the newest session of the workspace directory. The
sessions of a subagent count towards the same phase.

### The Report Labels an Estimate and an Unsettled Phase

The report now states the source of the runtime tokens. It prints `Unsettled
phases` when a phase holds no count, `Measured` when every phase holds a count,
`Estimated` when the rows come from the allocation by code payload size, and
`No runtime tokens` when the host store holds no counts.

### Cache Read Tokens Count Apart

A harness re-reads the context on every turn. Cache read tokens are larger
than the prompt and completion tokens together. The report listed no column
for them, so the plain and guided rows looked comparable when they were not.

The server records `cache_read_tokens` apart from `prompt_tokens`, and the
report shows a column for it. The combined column is the sum of the three
columns.

### The Integration Test Runner Waits for the Answer

`scripts/test-connection.ts` read the answer after a fixed 250 milliseconds.
The server answers in about 80 milliseconds on an idle machine, but a loaded
machine pushed the first answer past 250 milliseconds, so the suite failed at
random. The runner now reads the frame as soon as the server writes it, and it
waits only for a complete line. The runner keeps a five second limit for a
server that stays silent.

The measured cold start of the server, from process spawn to the first
response, was 80 to 86 milliseconds at an idle load and 145 to 280
milliseconds with sixteen busy loops on the machine. The old fixed wait fell
inside that range, which is why the failure looked random.

## Consistency

### The Prompt and Guide Describe the Two Steps

Section 4 of `playground/agent-prompt.md` now tells the agent that the tool
marks the end of the phase, and that the harness settles the counts
afterwards. The `Token accounting` section of `playground/guide.md` states the
two steps, the three places that the reader looks for a store, and the session
rule.

### The Report Fails Soft Without Findings

`scripts/update_readme_benchmarks.py` stopped with an error when no report
existed. It now writes a placeholder and removes the ranking file, so
`make bench-update` works on a workspace without findings.

### The README Generator Reads the Last Column

`scripts/update_readme_benchmarks.py` read the fifth column of the runtime cost
table. The table has six columns now, so the generator reads the last column.
Reports in the old format keep the same values.

## New Features

### An Interactive Picker for the Harness and the Model

`make benchmark-free` asks which harness and which model to use. The picker
reads the model list of every harness that the path holds, offers the free
models, and accepts a filter that matches the harness or the model text. It
then calls the target again with the chosen values, so the run itself stays in
the Makefile.

`make bench-list` prints the same list without asking. `BENCH_PICK=0` skips the
picker, and `BENCH_ALL_MODELS=1` offers every model instead of the free ones.
`BENCH_MODEL_ID` pins the model identifier in the harness configuration, and
`BENCH_TASK` sets the task that the run hands to the harness.

The picker refuses to start a run when the terminal is not interactive, because
the run costs model tokens and a stray newline in a pipe must not start one.
The refusal names `BENCH_ALLOW_PIPE=1`, which lets a script choose a model. The
model list needs no terminal and always works.

### The Prompt Is Injected Automatically

The run copies `playground/agent-prompt.md` into the workspace twice: once
under its own name, and once as `AGENTS.md`. Every harness reads `AGENTS.md` as
the project instructions, so the model no longer needs a pasted prompt. The
generated configuration names `AGENTS.md` in `instructions`, disables every other
MCP server, pins the model, and turns the snapshot feature off.

### The Run Happens in the Foreground

The target starts the harness with `--prompt` in the workspace and waits. The
user can answer the harness, or type a new message to steer the run. When the
user leaves the session, the target settles the token counts, writes the
report, removes the clean room, and refreshes the README table.

A harness that leaves with a non-zero status does not stop the target. The
target prints the status and runs the settle step and the report anyway,
because a run that the user stopped still holds the phases that it recorded.

### The Clean Room Path Is Guarded

The clean room path comes from make variables, and three targets remove it. A
`guard_workspace` check now refuses an empty path, the root directory, and any
parent of the repository, so a bad value cannot turn into a broad delete. The
picker passes `BENCH_PICK=0`, and the target no longer needs a second guard
variable.

The workspace used to sit in `playground/<agent-model>/`, so an ancestor
`AGENTS.md` of the repository reached the model, and a harness could reach a
tracked file of the project. The workspace now sits under the temporary
directory of the machine, and the scanner reads it through the new
`--workspace` option of `run_benchmark.py`.

### An End-to-End Test on Real Harnesses

`scripts/test-telemetry-e2e.ts` runs a real harness with a real model. For
each harness it builds a throwaway workspace outside the repository, starts
the telemetry server through a relative command path, asks the model to mark
one phase, runs the settle step, and then checks the counts.

The test covers `opencode` and `kilo`. It skips a harness that is not on the
path, and `LCCST_E2E_MODEL` selects another model. The run needs a network
connection. `make test_e2e` runs it, and the unit suite stays offline.

### A Unit Test for the Reader, the Phase Record, and the Picker

`scripts/test-telemetry-usage.ts` covers the window arithmetic, both store
schemas, the newest schema preference, the session name, the directory
fallback, a child session, several stores in one data directory, an unknown
schema, a damaged store, the candidate discovery, the metadata key rule, the
phase record, the settle fold, and the telemetry file. The test builds its own
store files, so it does not read the store of the developer.

`scripts/test-benchmark-picker.ts` covers the identifier split, the free model
test, the filter, the menu, the harness registry, and the terminal guard.

`scripts/test-picker-interactive.py` drives the picker through a pseudo
terminal, which is the only way to give it the interactive terminal that it
checks for. The test types a filter and then a row number, and it puts a stub in
place of every harness, so the run costs no model tokens. The test then checks
that the run reached the harness with the task prompt, and that the report
followed. It also checks that a pipe is refused, and that the model list works
without a terminal.

`make test` runs the three files. The CI workflow runs each file as its own
step.

## Breaking Changes

The `log_turn_telemetry` tool no longer accepts `prompt_tokens` and
`completion_tokens`, and its result holds no count. A caller that passes the
two values keeps working, because the server drops them. The counts appear in
the report after the settle step.

The runtime token file gains the fields `total_cache_read_tokens`,
`model_turns`, and `phases`. Each phase of the `phases` list holds
`from_time`, `to_time`, `session_id`, `settled`, and its own counts. The step
objects gain `cache_read_tokens`.

The telemetry MCP server needs Node.js 22.5 or later, because the reader uses
`node:sqlite`. The two new variables are `LCCST_TELEMETRY_DB`, which names the
store, and `LCCST_TELEMETRY_FILE`, which names the telemetry file.

`make benchmark-free` asks for the harness and the model unless `BENCH_PICK=0`.
The run removes the workspace at the end, so a script that expects the output
files under `playground/<agent-model>/` must read the new `--workspace` option
of `run_benchmark.py` instead.

## Version

Bumped from 3.6.0 to 3.7.0.
