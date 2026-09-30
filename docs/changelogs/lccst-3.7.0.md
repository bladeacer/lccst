### LCCST 3.7.0

Date: _2026-09-27_

The telemetry server measures the token usage of the model under test. The
reader names no harness and no model.

## Correctness

### A Rejected Run Names the Check That Failed

The log of `make bench-update` printed one reason for a rejected run. The reason
read `the skill-guided subprojects did not all pass`, and it then listed a
subproject with its test state. A subproject whose tests passed but whose
robustness score fell below 100 was therefore listed as `(passed)` under a
sentence that said the tests did not pass. The line contradicted itself.

The gate needs two facts per subproject. The skill-guided tests must pass, and
the skill-guided robustness score must be 100. The reason now names the check
that failed. A subproject with a failed test is named by its test state, and a
subproject with a low score is named by its score.

### A Report Names No Account of the User

The report stated the path of the harness command. A harness that a user
installed under the home directory wrote a path such as
`/home/tester/.local/share/pnpm/bin/kilo` into a report that the repository
commits.

The scanner now shortens a path that starts in the home directory. The prefix
becomes `~`, so the report reads `~/.local/share/pnpm/bin/kilo`. A system path
such as `/usr/bin/opencode` names no user, so it stays unchanged.

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

### An Early Phase Call No Longer Costs the Phase

The `log_turn_telemetry` tool recorded a phase as soon as the model called it.
A model that called the tool before it did the work ended the measured span at
that moment. The prompt told the model that a second call for the same phase was
forbidden, so the model kept the short span and reported the shortfall instead
of repairing it.

The server now reads the workspace before it records a phase.

- The server refuses a call that arrives before the phase holds its directory
  and its manifest. A refused call records nothing, so the phase can still be
  measured.
- The server corrects the end of a phase when a second call names the same
  phase. A phase holds one record, so a call that came too early costs one more
  call and never costs a phase.
- The spans of the phases follow each other, so the counts of a turn land in one
  phase only.

### The Settle Step Copy the Record

`settlePhase` added the counts to the breakdown of the record that it took. A
second call therefore counted the same phase twice in the record that the
caller still held. The function copies the record now.

### The Report Names the Model That Ran

A harness that cannot resolve the pinned model starts a different model, and
the report named the model that the run requested. A run could therefore
measure one model and publish the name of another one.

The settle step reads the model of every measured turn from the store of the
host, and the report compares that model with the requested model. The report
prints `Model verified` when both names agree, `Wrong model` when they differ,
`Several models ran` when the phases hold more than one model, and `Model
unverified` when the store named no model.

### The Run Refuses a Model That the Harness Does Not Offer

`make benchmark-free` with `BENCH_PICK=0` pinned the model of the
`BENCH_MODEL_ID` variable. The default value of that variable named a model
that no harness offered, so every run without the picker measured the fallback
model of the harness.

The new target `make bench-model` asks the harness for its models and refuses a
run that pins a model the harness does not offer. The run depends on the target,
and the default value of `BENCH_MODEL_ID` now names a model that the default
harness offers.

### A Run Names the Model on the Command Line

Kilo restored the model that the user last chose for each agent, and the
restored model won over the model in the configuration of a run. A run of Kilo
therefore measured the model of the user. The model of a user changes with the
last session, so the same run of the same model could measure two models, and a
run could measure a model that the report never names.

A harness keeps the model of each agent in its state directory. The run now
points that directory at the clean room through `XDG_STATE_HOME`, so no harness
can read the state of a user. Kilo accepts the model on the command line, and
the run names it there. The OpenCode terminal interface has no model flag, so
the run keeps the configuration of the clean room as its only source for that
harness.

### A Run Writes Its Report Without the Benchmark Environment

The scanner read the file token counts with `tiktoken`. When the current
interpreter held no encoder, the scanner started the benchmark environment with
`uv` and waited for it. The call named `check=True`, so a machine with no `uv`,
or a machine with no network, ended the scanner with a `FileNotFoundError` or a
`CalledProcessError` before it wrote the report. The run then held no report,
no token counts, and no scores, so the whole phase was lost.

The environment improves the file token counts only. The scanner now starts it
only when `uv` is on the path, and it falls back to the coarse estimate when the
start fails. The report is always written, and it states that the file token
counts are an estimate.

The child process now runs with `--approximate-tokens`. An environment that
builds `tiktoken` and an interpreter that cannot import it repeated the start
step for ever. The child now never starts a third process.

### A Workspace Inside the Repository Is Refused Before the Removal

The targets `clean-telemetry` and `bench-cleanup` removed the workspace with
`rm -rf`. The check that refuses a workspace inside the repository ran later,
inside the recipe of `benchmark-run`. A `BENCH_TMP` that pointed into the
repository therefore removed tracked files before the refusal.

Every target that removes the workspace now runs the check first. The path comes
from make variables, so the check must guard the removal and not follow it.

## Consistency

### The Continuous Integration Job Does Not Run a Benchmark

The job ran `make test_picker_tty`, which forks a pseudo terminal and runs the
whole `make benchmark-free` pipeline. The step therefore built the clean room,
started a private server, and wrote a report. The report step needs `uv`, which
the GitHub runner image does not ship, so the step always failed.

A benchmark measures a model, so it does not belong in the job. The job now
runs the unit tests, the telemetry unit tests, the picker unit tests, the
benchmark report unit tests, and the integration tests. The report unit tests
use stub harnesses, so they need no model and no `uv`. The pseudo terminal test
stays in `make test_picker_tty`, where `uv` is present.

### The Prompt and Guide Describe the Two Steps

Section 4 of `playground/agent-prompt.md` now tells the agent that the tool
marks the end of the phase, and that the harness settles the counts
afterwards. The `Token accounting` section of `playground/guide.md` states the
two steps, the three places that the reader looks for a store, and the session
rule.

### The Prompt States That an Early Call Is Repairable

Section 4 of `playground/agent-prompt.md` told the model that a second call for
the same phase was forbidden, so a model that had called the tool too early
believed that the measurement was lost. The section now states that the server
refuses a call that arrives before the work, that a refused call records
nothing, and that a second call corrects the end of the same phase. The section
tells the model to call the tool again at the true end of the phase.

### The Run Does Not Attach to the Background Service of the User

The run read the global configuration directory of the user, which holds
plugins, skills, and agents. Those items change the prompt and the tool list, so
they changed the measurement of every phase. The run now points the
configuration directory of the harness at the clean room.

The configuration directory was not the whole problem. The global configuration
*document* of the user holds MCP servers and plugins, and no variable redirects
it: `OPENCODE_CONFIG_DIR` moves the directory, and `XDG_CONFIG_HOME` and `HOME`
do not move the document. A probe with a fake home confirmed that the document
was still read, and a probe of every shape of the `mcp` key confirmed that a
project configuration cannot switch off a server that the global document
defines.

The document is read when a background service starts, and the terminal harness
attaches to that service. A run that attached therefore inherited every server
and plugin of the user: a probe run created a `.headroom` directory inside the
clean room and reported a failed plugin. A run that starts a private server
reads only the configuration of the clean room, and the same probe created no
directory and reported no plugin.

The run now starts a private server for `opencode`. The claim that the run
isolates the configuration of the harness is now true for the servers and the
plugins of the user, and the end-to-end test asserts that a run leaves no
`.headroom` directory in the workspace.

### The Report Fails Soft Without Findings

`scripts/update_readme_benchmarks.py` stopped with an error when no report
existed. It now writes a placeholder and removes the ranking file, so
`make bench-update` works on a workspace without findings.

### The README Generator Reads the Last Column

`scripts/update_readme_benchmarks.py` read the fifth column of the runtime cost
table. The table has six columns now, so the generator reads the last column.
Reports in the old format keep the same values.

### The End-to-End Test Checks the Reader Against a Real Harness

`make test_e2e` checked only the token counts. It never checked that the reader
found the model of a turn, and it never checked that the reader found the text of
a turn, so a reader that returned neither shape passed the test.

The test now seeds the instructions and a run token the way a benchmark run
seeds them, and it asserts that the reader returns the model and the text of the
model turns of a real run. The token check is advisory, because a free model
often ignores the instruction to state the token, and a test of the reader must
not fail on the compliance of a model.

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

## Breaking Changes

The `log_turn_telemetry` tool no longer accepts `prompt_tokens` and
`completion_tokens`, and its result holds no count. A caller that passes the
two values keeps working, because the server drops them. The counts appear in
the report after the settle step.

The telemetry server reads the workspace of a run from the directory of the
file that `LCCST_TELEMETRY_FILE` names. A server started by a harness runs in
another directory, so the earlier use of the working directory refused every
phase. The run also passes the workspace as the `cwd` of the server, and the
server no longer falls back to the telemetry file of the source tree.

The report header gains the field `Harness Version`, and the README table gains
a `Harness Version` column. A report that names no harness version no longer
enters the table, so a report from before this change cannot rank a model.

The phase record of the telemetry file gains the field `token_seen`, which holds
`true` when a turn of the phase stated the run token. A report that predates the
field never verifies a prompt, so it stays out of the table.

The scanner no longer fabricates a failed test result for the plain variant, and
it no longer skips the plain variant tests. A report published before this
change compared two different rubrics, so its plain column is not comparable
with a new report.

The report states the toolchain drift when the machine does not match the
versions in `playground/guide.md`. A report with a drift note does not compare
with a report from another machine.

`run_benchmark.py` gains the options `--model-id` and `--approximate-tokens`.
`make bench-report` passes `--model-id`, so a caller that runs the scanner by
hand must pass the pinned identifier to get a verified model note. The option
`--approximate-tokens` skips the start of the benchmark environment, which a
test needs because it must not install a package.

The `log_turn_telemetry` tool now refuses a call that arrives before the phase
holds its directory and its manifest, and it corrects the end of a phase when a
second call names the same phase. A model that calls the tool twice for one
phase therefore holds one record with the later end, and a model that calls the
tool too early no longer loses the phase.

The runtime token file gains the fields `total_cache_read_tokens`,
`model_turns`, and `phases`. Each phase of the `phases` list holds
`from_time`, `to_time`, `session_id`, `settled`, `model`, and its own counts.
The step objects gain `cache_read_tokens`.

`make benchmark-free` without the picker now refuses a `BENCH_MODEL_ID` that the
harness does not offer, and the default value names `opencode/space-bunny-free`.
The run also reads its own configuration directory for the harness, so a global
plugin, skill, or agent of the user no longer changes a measurement.

The telemetry MCP server needs Node.js 22.5 or later, because the reader uses
`node:sqlite`. The two new variables are `LCCST_TELEMETRY_DB`, which names the
store, and `LCCST_TELEMETRY_FILE`, which names the telemetry file.

`make benchmark-free` asks for the harness and the model unless `BENCH_PICK=0`.
The run removes the workspace at the end, so a script that expects the output
files under `playground/<agent-model>/` must read the new `--workspace` option
of `run_benchmark.py` instead.

The variable `BENCH_WORKSPACE` now holds an absolute path, so a relative
`BENCH_TMP` resolves the same way as an absolute one. A caller that parses the
value must expect an absolute path.

The dead files `playground/benchmarks/runner.py` and
`playground/benchmarks/track_runtime.py` are removed. They proxied the harness
over HTTP to read token counts, and the MCP server replaced that approach. No
target, script, or document referenced either file.

The Makefile target `make test_report` is new, and `make test` runs it. The
Makefile removes the dead `playground/<agent-model>` paths from
`make bench-cleanup` and `make clean-telemetry`, because the workspace now sits
under the temporary directory.

## Version

Bumped from 3.6.0 to 3.7.0.
