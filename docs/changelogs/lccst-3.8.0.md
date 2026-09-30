### LCCST 3.8.0

Date: _2026-09-30_

The picker offers a model only when the model costs nothing and can do the work.
The picker asks for the model in a fuzzy search.

## Correctness

### A Store Search Skips a File That Is Not a Database
The telemetry reader searched the data directory of the user for every file
whose name ends in `.db`. A read-only open of such a file succeeds, and the
first query then fails with `file is not a database`. The manual page index of
the host `man` is one such file, so every run printed
`[Telemetry Debug] Store read failed: Error: file is not a database` once for
every phase of every run. The measurement itself was correct, because the reader
continued to the next file.

The search now keeps only the files that start with the header of a SQLite
database. A file that the environment names is still kept whatever its content
is, because a named file is a decision of the user and the reader must report
its problem instead of hiding it.

## New Features

### The Picker Reads the Price of a Model
The picker decided that a model was free by its name alone. It kept a model whose
identifier ends in `-free`, `:free`, or `/free`, and it dropped every other
model. A model that costs nothing therefore stayed out of the menu whenever its
name carried no free marker. `kilo/stealth/space-bunny-alpha` was one such
model, so the picker offered Space Bunny under OpenCode but not under Kilo.

The picker now reads the price of every model from the public registry at
`https://models.dev/api.json`. It offers a model that the registry states no
charge for. The name rule stays the first test, so the picker keeps working
when the registry does not answer.

The registry is the only safe source, because a model name says nothing about a
price. The identifier `stealth/space-bunny-alpha` names a free model at the
provider `kilo` and a model that costs 0.05 per input token at the provider
`nano-gpt`. A rule that matched the name would have offered both.

The registry states a price for up to eight kinds of token. A price can name
`input`, `output`, `input_audio`, `output_audio`, `reasoning`, `cache_read`,
`cache_write`, and `context_over_200k`, and it can hold `tiers`, which is a
price for a long context. A model is therefore free only when the registry
states `input` and `output` at zero and states no charge for anything else,
including every entry of `tiers`. A check that read only `input` and `output`
would have offered a model that charges for a cached read token. A price object
that omits `input` or `output` states no price for that token, and an unknown
price is not a price of zero, so such a model stays out.

The picker reads the registry only when it offers the free models, and it waits
at most ten seconds. The banner of the picker states how many free models the
registry returned, so a fallback to the name rule is visible.

### The Picker Drops a Model That Cannot Do the Work

The picker offered every model that the harness listed, so a run could start on
a model that generates images, that writes no text, or that routes each request
to another model. An image model cannot write a file of a subproject. A router
leaves the report naming a model that never ran, because the router chose a
different model for every request.

The picker now drops a model in three cases. It drops a model that the registry
states cannot call a tool, because a phase asks the model to call a tool. It
drops a model that the registry states writes no text, because a phase asks the
model to write a file. It drops a model that names a router, because the report
must name the model that ran.

The registry marks no model as a router, so the picker names the routers in its
own source. The registry also states no warning about agentic use, and only the
author of a model can say that its model does not fit the work. The picker
therefore names the families that an author rejects, which is the LFM family of
Liquid AI today.

The test drops a model that the registry does not describe. The name rule
already accepted it, and the picker cannot judge what the registry does not
state. A machine with no network therefore keeps every model that carries a
free marker and none of the routers and none of the rejected families.

### The Picker Offers a Fuzzy Search

The picker asked for a filter and for a number. A list of every free model of
every harness holds dozens of rows, and a model name such as
`opencode/space-bunny-free` shares its first letters with other names, so a
user had to read the whole list before typing.

The picker now offers a fuzzy search when `fzf` is on the path. Every row names
the harness and the model, and a search matches the whole row, so a user types
part of a model name to narrow the list and part of a harness name to narrow it
by harness. The user presses Enter on the row that the search leaves.

The picker falls back to the numbered menu when `fzf` is absent or when `fzf`
does not run. The fallback keeps the filter and the number, so a machine
without `fzf` changes nothing. The picker also prints the number of models that
the registry described beside the number of models that the menu offers, so a
reader can see how many models the agentic test dropped.

The picker opens a line reader only when it needs a filter. A line reader takes
over the standard input, so opening one beside a fuzzy search would steal the
keystrokes of the search.

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

The picker now asks for a model in a fuzzy search when `fzf` is on the path. A
script that drove the numbered menu must hide `fzf` from the picker, or set
`BENCH_PICK=0` and pass the variables. `make bench-list` prints the same list,
and it needs no terminal under either setting.

The picker now drops a model that the registry states cannot call a tool, that
writes no text, or that routes each request to another model. A model that a
script named by hand still runs, because `BENCH_PICK=0` accepts any identifier
that the harness offers. The list of `make bench-list` holds fewer rows, and a
row that a report names must now come from that list to be ranked.

The picker reads the price and the abilities of every model from the public
registry at `https://models.dev/api.json`. A machine with no network falls back
to the model name and to the lists in the source of the picker, so the picker
offers fewer models and never blocks for more than ten seconds.

The telemetry reader no longer offers a file to SQLite unless the file starts
with the header of a SQLite database. A run that set `LCCST_TELEMETRY_DB` to a
non-SQLite file keeps the file, because the reader reports its problem instead
of hiding it.


## Version

Bumped from 3.7.0 to 3.8.0.
