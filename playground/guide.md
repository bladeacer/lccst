# LCCST Playground Guide

## Purpose

This guide states the target specification, the environment, and the
operational constraints of a benchmark run. It names no solution, so both
variants read it. The `skill-guided` variant also reads `traps.md` and
`SKILL.md`. The `plain` variant reads neither.

## Clean-room sandbox rules

The run happens in a clean room outside the repository. The harness starts in
that directory, so no other project file can reach it. The directory holds
`SKILL.md`, `guide.md`, `traps.md`, `agent-prompt.md`, `AGENTS.md`,
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
- Do not change the configuration file of the harness.
- Do not create a symlink to bypass a Go `internal/` boundary.

Blocked inspection commands: `ls`, `find`, `git status`, `git diff`,
`git log`, `open`. Do not simulate their output.

## Target specification

- The `python-http-server` subproject is an HTTP server with user create,
  read, update, and delete operations.
- The `react-timer` subproject is a stopwatch application with start, stop,
  and reset actions.
- The `go-login-crud` subproject is a login system with user create, read,
  update, and delete operations.

## Supplied toolchain

- Go 1.27.2-X with `nodwarf5`.
- Python 3.13.11 with `uv` 0.4+.
- Node.js 18+ with pnpm 12.14.0+.
- Pre-cached TypeScript type definitions.

The system `python3` can resolve to another version. Use `uv run python3` to
select the supplied environment. Do not run bare `pytest`.

## Project layout and tests

Both variants follow the constraints in this section, so the two variants
write to the same kind of layout.

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
- A React project writes components and tests with the `.tsx` extension.
- A Go project keeps tests under `tests/` with `package tests`.

The test command of each subproject runs inside the variant directory.

## The two variants

- The `plain` variant reads `guide.md` and the assignment, then writes source
  files and test files. It does not read `SKILL.md` or `traps.md`.
- The `skill-guided` variant reads the same documents, plus `SKILL.md` and
  `traps.md`.
- Both variants create `<subproject>/<variant>/` in the working directory, and
  both write a manifest, source files, and test files there.
- The test command of the subproject must pass inside the variant directory.
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
