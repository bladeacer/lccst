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

## Consistency

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

### The Run Isolates the Configuration of the Harness

The run read the global configuration of the user, which holds plugins, skills,
agents, and extra servers. Those items change the prompt and the tool list, so
they changed the measurement of every phase. The run now points the
configuration directory of the harness at the clean room, in the way the
end-to-end test already did.

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
model of a turn, the phase record, the correction of an early call, the phase
guard, the settle fold, and the telemetry file. The test builds its own
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

The reader of the pseudo terminal stopped at the first quiet moment. A build
step prints nothing for seconds, so the test closed the terminal while the run
still worked, and four checks read a transcript that ended early. The reader now
waits for the text that it expects, and it reads to the end of the run.

### The Report Names the Harness Version

A report named the provider, the harness, the model, and the skill version. It
named no harness version, so two runs that differed only in their harness build
looked like the same measurement. A harness version changes the prompt, the tool
list, and the token accounting, so the report could not be reproduced.

The scanner now asks the harness for its version and records the version with
the path of the command, because two installs of one harness can differ. The
version handles a banner, so a harness that prints one still reports a version.
The run prints the version at the start as well.

The README table gained a `Harness Version` column, the cross-model comparison
gained a harness row and a version row, and the ranking file gained a version
column.

### A Report Without a Harness Version Stays Out of the Table

`BenchmarkReport.is_reproducible` now rejects a report that names no harness
version, or that states the harness is not on the path or reports no version. A
report that names no version cannot be reproduced, so it must not rank a model.
The rejection log names the reason first.

### The Table Parser Reads Columns by Name

`_parse_robustness_section` read the robustness table by a fixed column index.
The scanner added a `Files` column, so the index of the score moved, and the
parser read the test standing as the score and the line count as the token
count. Every report would have carried a wrong score and a wrong test status.

The parser now reads the column names of the header row. It accepts the older
header names, so a report from before the `Files` column still parses. A table
that holds none of the required columns yields no project, and no run is ranked
from it.

### The Instructions File Is Not Sent Twice

A probe of `opencode` v2.0.18 and `kilo` v7.7.9 against a local capture server
counted how many times the content of `AGENTS.md` reached the system prompt.
Both harnesses sent it once. The `instructions` key of the generated
configuration is redundant rather than harmful: `opencode` ignores the key
entirely, and `kilo` reads it but does not duplicate a file it already loads as
the project rule. The earlier suspicion of a doubled prompt was wrong, and the
key stays as a fallback for a harness that reads neither location.

### The Run Refuses a Workspace Inside the Repository

A harness reads the instructions of every directory above its workspace, so a
workspace inside the repository would send the repository `AGENTS.md` to the
model under test. The two documents have different purposes, and the repository
file would have changed every measurement.

A probe confirmed that a clean room nested inside a project that holds an
`AGENTS.md` receives only its own prompt, because the harness stops at the
workspace. The new `assert_separate_instructions` check removes the doubt
anyway: the run refuses a `BENCH_TMP` that resolves inside the repository, and
`BENCH_WORKSPACE` is now an absolute path so the check holds for a relative
value.

### A Probe Confirmed the Isolation of the Run

A probe against a local capture server, with a fake home directory, confirmed
that `OPENCODE_CONFIG_DIR` stops the global `AGENTS.md`, the global agents, and
the global skills of a user from reaching the prompt. The probe also confirmed
that a probe run inside the LCCST repository does not receive the repository
`AGENTS.md` in the clean room, and that a global agent prompt is applied when the
configuration directory is not redirected. The isolation the changelog claimed
for `v3.7.0` holds.

### The Reader Names No Store Shape

The reader looked for the model in a nested `model` object and for the text in
a `parts` list. Neither shape exists in the stores that the harnesses on this
machine write. A probe of both live stores showed the real shapes:

- opencode v2.0.18 keeps `session_v2` and `session_message`. The model is a
  nested `model` object with an `id` field, and the text of a turn is a
  `content` list of parts.
- kilo v7.7.9 keeps `session` and `message`. The model is a flat `modelID` and
  `providerID` pair with no `model` object at all, and the message row holds no
  text. The text sits in a `part` table that joins on the message identifier.

A probe of the reader against both live stores returned no model and no text, so
every report would have claimed an unverified model and an unverified prompt.

The reader now reads a `content` list, a `parts` list, and a `part` table, and it
reads a nested `model.id`, a nested `model.modelID`, a flat `modelID`, and a
plain string. The unit tests now build their fixtures from the columns and the
payloads of the two live stores, because a fixture written from a guess hides a
reader bug instead of exposing it.

### The Server Found No Workspace

A harness does not start an MCP server in the directory of the workspace. The
server used `process.cwd()` to look for the directory and the manifest of a
phase, so it refused every phase of every run, and the report held no phase at
all. The end-to-end test caught this on both harnesses.

The server now reads the workspace from the directory of the file that
`LCCST_TELEMETRY_FILE` names, and the run also passes the workspace as the
`cwd` of the server. The server no longer falls back to the file of the source
tree, because a run that lost the variable would then write into the repository.

### A Unit Test for the Scanner and the Table Gate

`run_benchmark.py` and `scripts/update_readme_benchmarks.py` held the rules that
decide whether a run may rank a model, and neither file held a test. The new
target `make test_report` runs `scripts/test-benchmark-report.py`, which covers
the model comparison, the shared file filter, the test status rule, the tool
chain drift note, the selection of one telemetry file, the note parser, and the
inclusion gate. The suite also checks that a report of an empty workspace never
passes the gate, and that the output of the scanner satisfies the gate of the
generator.

`make test` runs the file. The CI workflow runs each file as its own step.

### The Plain Variant Is Scored With the Same Rubric

The scanner gave the plain variant a fabricated failed test result, so the plain
column could never score above 65 percent and the skill-guided column started at
50. The delta between the two columns was therefore a property of the rubric
rather than a property of the code. The agent prompt also told the plain variant
not to write tests, so the harness could not have measured the plain variant
honestly.

The scanner now runs the same test command for both variants, and it scores both
with the same rubric. The agent prompt now asks both variants for source files
and test files.

### One File Filter Serves Both Variants

The scanner counted `plain/*.html` and `plain/*.js` for one variant and
`skill-guided/src/*.tsx` and `skill-guided/tests/*.tsx` for the other. The file
content token delta therefore counted the test files of one variant and not the
other, which made the headline figure an artefact of the glob patterns.

The scanner now walks each variant directory and applies one filter to both. It
skips installed and generated directories, and it skips lock files and
checksums. The file layout rules moved from `playground/guide.md` to
`playground/traps.md`, because the guide now describes the environment only.

### An Empty Variant Is an Error, Not a Pass

A variant that held no source file still ran its test command. A test command
that found nothing returned a zero status in one project, so the scanner
reported `PASSED` for a variant with zero lines and zero tokens.

The scanner now classifies a test run as `passed`, `failed` or `error`. An empty
variant directory, a timeout, a command that cannot start, a usage exit code,
and a run that found no test are all errors. An error scores 5 points, a failure
scores 15, and a pass scores 50. No path reports a pass for a directory that
holds no source file.

### The Traps File Is Not Part of the Control Arm

`playground/guide.md` held a section of known traps with the concrete fixes for
the three subprojects, and the agent prompt told both variants to read the
guide. The plain variant therefore received part of the answer that `SKILL.md`
is meant to supply, which suppressed the measured delta.

The traps now live in `playground/traps.md`. The guide states the environment
and names no solution. Only the skill-guided variant reads the traps.

## Consistency

### The Prompt Matches the Variant Definitions

`playground/README.md` stated that the skill-guided variant applies `SKILL.md`
and `guide.md`, and the agent prompt told both variants to read `guide.md`. The
prompt and the playground README now state the same rule: both variants read
`README.md` and `guide.md`, and only the skill-guided variant reads `SKILL.md`
and `traps.md`.

### The Model Check Compares the Pinned Identifier

The report compared a sanitised directory name with the model that the host
store recorded. The picker replaces every unsafe character of a model name for
the path, so `kilo/stepfun/step-3.7-flash:free` reached the report as
`stepfun-step-3.7-flash-free`. The comparison then failed, and the report marked
a correct run as a wrong model. Thirty-two of the thirty-nine models that the
picker offered would have failed the check.

The scanner now receives the pinned identifier through the new `--model-id`
option of `run_benchmark.py`, and it compares the model part of both names
without the tag. The report prints the pinned identifier on its own line.

### The Run Token Confirms the Prompt

Nothing checked that the model received the project instructions, so a run that
measured a different prompt looked like a valid measurement.

The run now writes a token to `prompt-token.txt` and to the last line of
`AGENTS.md`, and the prompt asks the model to state the token in its first
reply. The settle step reads the text of the model turns and looks for the
token, and the report states whether the prompt is verified. A run that states
no token stays out of the README table.

### Each Run Writes Its Own Telemetry File

The telemetry server fell back to `playground/benchmarks/runtime-telemetry.json`
because the run never set `LCCST_TELEMETRY_FILE`. Two overlapping runs wrote
into one file, and the report summed the counts of both. A run that a user
interrupted left the file in the repository, and a later report merged its
phases.

The generated harness configuration now passes `LCCST_TELEMETRY_FILE` with a
path inside the clean room. The scanner reads the first file that exists rather
than the sum of every file, and `.gitignore` covers the artifacts of a run.

### The Table Rejects a Run That Measured Nothing

`pick_top_n` filtered only on the average skill-guided score, so a report with no
token count was published like any other. Because the composite score returned
an overhead of zero for a report with no runtime tokens, such a run collected the
full efficiency weight and outranked a run that really spent tokens.

The new `BenchmarkReport.is_usable` check requires a measured count for every
phase, a model that the host store confirms, a stated run token, all three
subprojects, and a passing skill-guided variant at 100 percent for each. The
generator prints the reason for every rejection, and the composite score adds no
efficiency term when a report holds no count.

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
