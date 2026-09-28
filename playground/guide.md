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

- Do not alter, upgrade, or modify global packages at run time.
- Do not read, write, or delete any path outside the current workspace.
- Do not use a global test runner when a project runner exists.
- Do not change the benchmark scanner or its file filter.
- Do not create a symlink to bypass a Go `internal/` boundary.

Blocked inspection commands: `ls`, `find`, `git status`, `git diff`,
`git log`, `open`. Do not simulate their output.

## Supplied toolchain

- Go 1.26.4-X with `nodwarf5`.
- Python 3.13.11 with `uv` 0.4+.
- Node.js 18+ with pnpm 11.3.0+.
- Pre-cached TypeScript type definitions.

The system `python3` can resolve to another version. Use `uv run python3` to
select the supplied environment. Do not run bare `pytest`.

The report states a drift note when the machine does not match the versions
above. A drift changes every score, so a report with a drift note does not
compare with a report from another machine.

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

## pnpm 11 build approval

pnpm 11 requires approval for packages that run build scripts. A dependency
that runs a build script can stop an install until it is approved. The approval
is a fact of the environment, so both variants must handle it. The file
`traps.md` names the package that needs the approval.

## File layout

Use a standard structure for each toolchain. Both variants must create the test
directory that the test command of the subproject names.

- Python source and tests live in the variant directory and in `tests/`.
- A React project uses `src/` for source and `tests/` for tests.
- A Go project keeps tests under `tests/` with `package tests`.

The scanner counts source files wherever they sit in the variant directory. It
does not favour one directory over another.

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
