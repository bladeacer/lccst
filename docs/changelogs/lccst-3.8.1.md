### LCCST 3.8.1

Date: _2026-10-16_

The audit count, the CMake test command, the Makefile detection, and the
reported tool list are correct now.

## Correctness

### The Audit File Count Excludes the Summary Line

The `/audit` tool counted every line of a `git diff --stat` output. The last
line of that output is a summary, such as `3 files changed, 7 insertions(+)`.
A three-file diff therefore reported `staged_files: 4`.

The new `diffStatFiles` helper keeps only the lines that hold a `|` separator.
The helper returns the file lines, and its length is the file count. Both the
staged and the unstaged count use the helper, and `clusterHunks` receives the
file lines only.

### A Makefile-Only Project Reaches the Swarm Loop

The `/swarm` tool refused to run when `detectProject(root).testCommand` was
empty. A project that holds a `Makefile` and no other manifest reports an
empty test command, so the tool reported `no_test_runner` although the
Makefile defines a `test` target.

The tool now resolves the test command with `resolveCommand` before it
refuses. `resolveCommand` reads the `Makefile` targets first, so a
`Makefile`-only project runs `make test`.

### The CMake Test Command Tests Instead of Building

The manifest table set the CMake test command to `cmake --build .`, which
builds a project and runs no test. `SKILL.md` states `ctest`. The table now
states `ctest`, and the build command stays `cmake --build .`. `README.md`
now states the same command.

### The Environment Scan Reports Tools, Not Arguments

The scan took every token of a test command and probed it as a tool. For
`uv run pytest` it reported `uv`, `run`, and `pytest`. A subcommand and an
argument are not tools, and the report confused a reader.

The scan now probes the executable of the test command only, plus `git`. A
project that reports no test command probes no tool.

### A Dry Run Writes No State

The `/swarm` tool wrote the `swarm` phase before it read the `dryRun`
argument, and the reply then stated `Dry-run complete. No state persisted.`
The reply contradicted the state file.

The write now runs only when `dryRun` is false. A dry run leaves the state
file untouched, and the reply is true.

### The Project Root Must Be a Directory

`resolveTarget` accepted any path that exists. A file path then reached
`readdir` in a directory-oriented tool. The resolver now requires a
directory and returns the `targetError` text for a file path.

### CMake and Julia Projects Report Their Own Type

The manifest table gave the `CMakeLists.txt` and `Project.toml` entries the
type `unknown`, although both entries hold a test command. The `init` report
then stated `project_type: unknown` for a project that the server can test.
Both entries now report `cmake` and `julia`.

## Consistency

### The Tool Probe Runs No Shell

`detectTool` ran `execSync("which " + name)`. A name from a manifest reached
a shell, and the probe depended on the `which` utility. The probe now walks
the `PATH` entries with `fs.accessSync` and checks the platform suffixes.
The shell is gone, and a missing `which` no longer breaks the probe.

### The Dead Variables Are Gone

The `/swarm` tool computed `makeTargets` and `formatCmd` and used neither.
The dead code showed an unfinished tool. Both variables are removed.

### One Assertion Reads in One Direction

A unit test of the Makefile targets asserted
`!targets.includes("all") === false`. The assertion was correct but hard to
read. It now states `targets.includes("all")`.

## Breaking Changes

None. The tool schemas and the reply shape are unchanged. A CMake project
reports `ctest` as its test command, which corrects a wrong result.

## Version

Bumped from 3.8.0 to 3.8.1.
