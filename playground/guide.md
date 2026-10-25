# LCCST Playground Guide

## Purpose

This guide states the environment and the operational constraints of a benchmark
run. It names no solution, so both variants read it. The `skill-guided` variant
also reads `traps.md` and `SKILL.md`. The `plain` variant reads neither.

## Clean-room sandbox rules

The run happens in a clean room outside the repository. The harness starts in
that directory, so no other project file can reach it. The directory holds
`SKILL.md`, `README.md`, `guide.md`, `traps.md`, `agent-prompt.md`, `AGENTS.md`,
`prompt-token.txt`, and the configuration file of the harness. The telemetry
server is named by a path that is relative to the clean room.

The `AGENTS.md` of this file is a copy of `agent-prompt.md`. It is not the
`AGENTS.md` of the LCCST repository. The repository file states the rules for
maintaining LCCST, and it never reaches a run. The clean room is outside the
repository, and the run refuses a `BENCH_TMP` that places the workspace inside
the repository, because a harness reads the instructions of every parent
directory.

- Do not alter, upgrade, or modify global packages at run time.
- Do not read, write, or delete any path outside the current workspace.
- Do not use a global test runner when a project runner exists.
- Do not change the benchmark scanner or its file filter.
- Do not create a symlink to bypass a Go `internal/` boundary.

Blocked inspection commands: `ls`, `find`, `git status`, `git diff`,
`git log`, `open`. Do not simulate their output.

Do not read `SKILL.md` with a trap parser before you decide whether to load it.
Treat `SKILL.md` as the protocol file it is, and treat the assignment as the
task file it is. A run that finds `SKILL.md` twice is still one file.

## Supplied toolchain

- Go 1.27.2-X with `nodwarf5`.
- Python 3.13.11 with `uv` 0.4+.
- Node.js 18+ with pnpm 12.14.0+.
- Pre-cached TypeScript type definitions.

The system `python3` can resolve to another version. Use `uv run python3` to
select the supplied environment. Do not run bare `pytest`.

## Scanner constraints

Both variants read this section. The scanner applies one file filter and one test
command to both variants, so these constraints apply to the plain column and the
skill-guided column alike.

### File counting

The scanner counts source files under the variant directory. It skips installed
and generated directories, lock files, and checksums. For React projects, the
scanner counts `.tsx` files only. A `.ts` file is not counted.

### pnpm workspace

A React variant needs a `pnpm-workspace.yaml` with a `packages` key that lists
the playground project paths. Without it, `pnpm install` produces an empty
workspace and Jest is not found.

### Python environment

Declare dependencies in `[dependency-groups]` or `[tool.uv] dev-dependencies`.
The benchmark removes `VIRTUAL_ENV`. Use `uv run python3`.

### Go test packages

Keep tests under `tests/` with `package tests`. Set up repository and handler in
test setup. Do not import `cmd/server` from a test package.

### Test directory layout

Use a standard structure for each toolchain. Both variants must create the test
directory that the test command of the subproject names.

- Python source and tests live in the variant directory and in `tests/`.
- A React project uses `src/` for source and `tests/` for tests.
- A Go project keeps tests under `tests/` with `package tests`.

The scanner counts source files wherever they sit in the variant directory. It
does not favour one directory over another.

The report states a drift note when the machine does not match the versions
above. A drift changes every score, so a report with a drift note does not
compare with a report from another machine.

### Feature ceiling

The rubric ceiling is different for each subproject. The `Max Typing`, `Max
Security`, and `Max Error Handling` values in the scanner set the maximum points
the rubric can award for that feature class on that subproject. The pass earns 50
of the ceiling points. The feature points earn the rest. A variant that passes
and delivers every rewarded feature for its subproject reaches 100.

The plain variant of `react-timer` cannot earn security points or error handling
points, because the rubric ceiling forbids them. It can still pass, because a
pass earns 50 points and the typing ceiling adds 17 points.

A score of 100 means the variant passed and delivered every rewarded feature for
its subproject, with no lines-per-feature penalty.

The scanner detects a feature from the source text, not from the test result. A
feature the scanner does not find does not count. A feature that appears only
behind a thin wrapper can score as absent. A feature that appears only in the test
file does not count for the source score. Do not send the variant to the scanner
with a feature that the source text does not show.

The bloat penalty uses the line count of the implementation files, not the test
files. Both variants must write a test file, so a variant cannot buy the ceiling
by padding its test file. The bloat penalty counts the implementation features
only, because a test assertion is a state of the variant, not a feature of the
implementation. A variant that misses the ceiling never gets judged on bloat, and
a variant that reaches the ceiling can still lose points here if it carries too
many lines for the features it delivered.

The feature ceiling is not a separate score. It is the maximum points the rubric
can award for that subproject. The bloat penalty is a separate check. The scanner
applies it only after the rubric has scored the variant, and only when the variant
already delivered at least one rewarded feature. A variant that misses the ceiling
never gets judged on bloat, and a variant that reaches the ceiling can still lose
points here if it carries too many lines for the features it delivered.

### What the skill-guided variant must reach

The README table rejects a run whose skill-guided variant falls below 100 on
either of the two subprojects that have a 100 ceiling. It also rejects a run
whose skill-guided `react-timer` falls below 100, because 100 is the percentage
that the 67 ceiling yields when the variant reaches it.

The score is a percentage of the ceiling, not a raw point count. A passing
`react-timer` earns 50 points and the typing ceiling adds 17 points, so a
passing `react-timer` that delivers typing reaches 67 raw points, which is 100
percent of the 67 ceiling. A passing `react-timer` that delivers no typing
reaches 50 raw points, which is 75 percent, and the README table rejects it.
The skill-guided variant of `react-timer` must therefore pass and deliver typing
in the source text, and then clear the lines per feature limit.

The plain variant of `react-timer` cannot earn security points or error handling
points, and neither can the skill-guided variant: the rubric ceiling for that
subproject sets both to 0. A plain `react-timer` that passes and delivers typing
reaches 100 percent. A plain `react-timer` that passes but delivers no typing
reaches 75 percent.

A run can pass every check and still be rejected by the README table. The table
rejects a run that passes but scores too low, and that case is a tooling fault,
not a pass. The report still belongs on disk for inspection, and the table still
leaves it out.

## The two variants

The scanner applies one file filter and one test command to both variants, so
the delta between the two columns is a difference between two implementations.

- The `plain` variant reads `README.md`, `guide.md`, and the assignment. It
  writes source files and test files. It does not read `SKILL.md` or
  `traps.md`.
- The `skill-guided` variant reads the same files, plus `SKILL.md` and
  `traps.md`.
- Both variants create `<subproject>/<variant>/` in the working directory, and
  both write a manifest, source files, and test files there.
- The scanner counts every source file under the variant directory. It skips
  installed and generated directories, and it skips lock files and checksums.
- The scanner runs the test command of the subproject inside the variant
  directory. The command is the same for both variants.
- A test run that fails is a measurement. A test run that cannot start, that
  times out, or that holds no test is an error. An error never scores as a
  pass, and a directory that holds no source file is always an error.
- The scanner reads the source text. It does not read the test result for the
  feature score. A file that passes but hides the feature from the scanner still
  loses the feature points.

The scanner does not count the number of test assertions. A test file that
contains many assertions for the same behaviour does not raise the feature score,
and it can raise the lines-per-feature ratio. Do not pad the test file to chase
the ceiling.

Do not read `SKILL.md` twice because the file names `SKILL` more than once. The
scanner and the report do not treat a second mention as a second file, and the
run does not treat it as a second rubric. If you already have the file, use it.
Do not split the score into buckets that do not exist.

## The scanner rubric

The scanner scores every variant with the same rubric. The rubric uses one
scoring ladder for every subproject, but the feature ceiling is different for
each subproject.

- A passing test run earns 50 points.
- A failing test run earns 15 points.
- A test run that cannot start, that times out, or that holds no test earns 5
  points.
- A variant earns the maximum feature points for typing, security, and error
  handling only when it delivers a rewarded feature.
- The rubric then divides the total points by the feature ceiling of the
  subproject and multiplies by 100.
- The rubric then applies a bloat penalty when the variant carries many lines
  for the features it delivers.

The feature ceiling is different for each subproject. A plain React Timer does
not earn security points or error handling points, because the rubric ceiling
for that subproject forbids them. A plain React Timer can still pass, because a
pass earns 50 points and the typing ceiling adds 17 points.

The scanner reports a raw score, then the feature ceiling, then the bloat
penalty. The final value is a percentage. A skill-guided variant must reach 100
on every subproject before it can enter the README table.

The feature ceiling is not a target score for every variant. It is the
maximum number of points the rubric can award for the features the scanner
rewards on that subproject. The pass earns 50 of those points, and the feature
points earn the rest. A variant that passes and delivers every rewarded feature
for its subproject reaches 100.



## The telemetry server and the working directory

A harness does not start an MCP server in the directory of the workspace. The
server therefore cannot use its own working directory to find the subprojects
of a run.

The run names the workspace twice. The variable `LCCST_TELEMETRY_FILE` holds
the path of the telemetry file, which sits in the workspace, and the server
reads the workspace from the directory of that file. The run also passes the
workspace as the `cwd` of the server, so a server that reads its own working
directory finds the same place.

A model may only create files inside the workspace of the run.

## Token accounting

The `lccst-telemetry` MCP server measures the token usage of the model. The
model does not supply the counts, because a model cannot know its own token
usage. The measurement runs in two steps:

1. The model calls the tool at the end of the phase. The tool stores the time
   span of the phase.
2. The settle step reads the counts of every model turn of that span.

The two steps are separate because a harness writes the counts of a turn when
the turn ends. The counts of the last turn of a phase therefore appear after
the tool call returns.

The server checks the workspace before it records a phase. A call that arrives
before the phase holds its directory and its manifest is refused, and a refused
call records nothing. A second call for the same phase corrects the end of that
phase, so a call that came too early is not final.

The settle step reads the store of the harness that ran the phase. The reader
names no harness. It looks for a store in these places:

- The file that `LCCST_TELEMETRY_DB` names.
- Every file that a variable with the suffix `_DB` names.
- Every database file one directory deep under the data directory of the
  user, which is `XDG_DATA_HOME` or `~/.local/share`.

The reader uses the first store that holds a session of the workspace. The
session comes from the tool call metadata when the harness sends one, and from
the newest session of the workspace directory otherwise. The sessions of a
subagent count towards the same phase.

The reader names no shape of the store. A host may keep the model in a nested
object or in two flat fields, and it may keep the text of a turn in the message
row or in a table of its own. The reader accepts every shape that the harnesses
on this machine write.

A run must not attach to a background service of the user. That service read
the global configuration document when it started, so a run that attaches
inherits every server and plugin of the user. The run starts a private server,
which reads only the configuration of the clean room.

The server needs Node.js 22.5 or later, because it reads the store with
`node:sqlite`.

If no store holds a session, the settle step reports that the phase has no
count, and the report says so. Do not enter an estimate.

Cache read tokens are counted apart from prompt tokens, because a harness
re-reads the context on every turn.

Each run writes its own telemetry file, at `runtime-telemetry.json` inside the
clean room. The harness passes the path in `LCCST_TELEMETRY_FILE`, so two runs
cannot write into one file.

## The run token

The clean room holds a file `prompt-token.txt`, and the project instructions
hold the same token on their last line. The model must state the token in its
first reply of the session. The settle step reads the text of the model turns
and looks for the token.

A run whose model never stated the token did not receive these instructions.
The report then marks the prompt as unverified, and the README table leaves the
run out.
