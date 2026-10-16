# LCCST Audit and Refinement Plan

This document records the audit of the LCCST repository at version `3.8.0`. It
lists the flaws and the overlooked parts that the audit found. It groups the
refinements into scoped semantic version increments. Each increment is
independently releasable.

This plan changes no source code. It is the only file that the audit created.

## 1. Scope and method

The audit examined the following deliverables:

- `src/index.ts`, the MCP server and the swarm helpers.
- `SKILL.md`, the protocol specification.
- `README.md` and `playground/README.md`, the user-facing documentation.
- `scripts/`, `tests/`, the `Makefile`, and the GitHub Actions workflows.
- `playground/benchmarks/mcp-telemetry/`, the telemetry server.

The audit ran `npx tsc --noEmit` and `pnpm run test:swarm`. Both passed. The
audit then read the code and compared it with the specifications. The audit
probed one behaviour directly: `clusterHunks` and the `/audit` file count. The
probe confirmed a defect (finding C1).

Severity labels:

- **High**: a wrong result, a broken promise, or a specification conflict.
- **Medium**: a robustness gap, an inconsistency, or a missing contract.
- **Low**: a cosmetic or maintenance issue.

## 2. Finding index

| ID | Severity | Area | Summary |
| --- | --- | --- | --- |
| C1 | High | audit | The file count includes the `--stat` summary line. |
| C2 | High | audit | Untracked files are absent from the commit plan. |
| C3 | High | swarm | A Makefile-only project reports `no_test_runner`. |
| C4 | High | detect | The CMake test command builds instead of testing. |
| C5 | Medium | init | Subcommands (`run`, `test`) are reported as tools. |
| C6 | Medium | swarm | A dry run writes state, but the reply says it did not. |
| C7 | Medium | swarm | Two computed variables are never used. |
| C8 | Medium | version | Two version sources can drift apart. |
| C9 | Low | paths | A file path is accepted as a project root. |
| C10 | High | swarm | The swarm tool promises a loop that it never runs. |
| C11 | Medium | verify | The gate stops at the first failure and hides later steps. |
| C12 | Low | detect | A CMake or Julia project reports type `unknown`. |
| C13 | High | detect | The manifest order differs from the Tooling Ladder. |
| C14 | Medium | compliance | One marker in one file marks the whole project compliant. |
| R1 | Medium | exec | Command output is unbounded and can overflow the buffer. |
| R2 | Medium | envelope | `next_action` carries command output, not a next action. |
| R3 | Medium | envelope | Error replies bypass the envelope and the `success` flag. |
| R4 | Medium | state | The state write is not atomic and warns on stderr. |
| R5 | Medium | exec | `detectTool` builds a shell command from a manifest value. |
| R6 | Low | logging | `events.jsonl` grows without a bound. |
| R7 | High | protocol | The `mode` argument is documented but never implemented. |
| R8 | Low | makefile | Included makefiles are not read. |
| R9 | Medium | mcp | Tools expose no `outputSchema` or structured content. |
| D1 | High | docs | CMake differs between `README.md`, `SKILL.md`, and code. |
| D2 | Medium | docs | Toolchain versions differ between documents and CI. |
| D3 | Low | docs | The README omits the `swarm` prompt. |
| T1 | Medium | tests | The integration runner fails on any stderr and skips init. |
| T2 | Low | tests | A test uses a double negative in its assertion. |
| T4 | Medium | ci | No check proves that committed `dist/` matches `src/`. |
| T5 | Medium | bump | The bump script edits build output that a build overwrites. |
| T6 | Low | ci | CI duplicates the `test` chain and can drift. |
| T7 | Medium | build | No `engines` field; Node requirements are inconsistent. |
| B1 | Low | telemetry | A fallback path can write into the source tree. |
| B2 | Low | telemetry | An unknown subproject records a phase. |

## 3. Detailed findings

### 3.1 Correctness

**C1. The audit file count includes the summary line.** The `/audit` tool splits
`git diff --stat` on newlines and reports `stagedLines.length` as the file count
(`src/index.ts:432-436`). The last line of a `--stat` output is a summary, such
as `3 files changed, 7 insertions(+)`. That line is not a file. The probe
confirmed that a three-file diff reports `staged_files: 4`.

**C2. Untracked files are absent.** `/audit` reads `git diff --cached --stat`
and `git diff --stat` only (`src/index.ts:422-423`). A new, unstaged file is
untracked, so it never appears in the commit plan. A commit-plan tool must see a
new file.

**C3. A Makefile-only project reports no test runner.** `/swarm` refuses to run
when `detectProject(root).testCommand` is empty (`src/index.ts:479-481`).
`detectProject` reads no `Makefile` (`src/index.ts:61-68`), although
`resolveCommand` would return `make test` (`src/index.ts:148-150`) and `SKILL.md`
lists `Makefile` as a manifest (`SKILL.md:187`). `/swarm` must consult
`resolveCommand` before it refuses.

**C4. The CMake test command builds instead of testing.** The manifest table sets
the CMake test command to `cmake --build .` (`src/index.ts:66`). `SKILL.md`
states `ctest` (`SKILL.md:188`). The code runs a build inside a test step.

**C5. Subcommands are reported as tools.** `scanEnvironment` takes every token of
the test command and reports it as a required tool (`src/index.ts:263-265`). For
`uv run pytest` it reports `uv`, `run`, and `pytest`. For `pnpm test` it reports
`pnpm` and `test`. `run` and `test` are not tools. Only the executable, and
known sub-tools, must be probed.

**C6. A dry run writes state but reports that it did not.** `/swarm` writes
`phase: "swarm"` before it reads `dryRun` (`src/index.ts:474-475`). The reply
then says `Dry-run complete. No state persisted.` (`src/index.ts:498`). A dry run
can write diagnostic state (`SKILL.md:156-157`), so either the write or the
message is wrong. The message misleads.

**C7. Two computed variables are unused.** `/swarm` computes `makeTargets` and
`formatCmd` and uses neither (`src/index.ts:483-486`). The dead code shows an
unfinished tool.

**C8. Two version sources can drift.** The `McpServer` identity is the literal
`"3.8.0"` (`src/index.ts:353`). The `/version` tool reads `package.json`
(`src/index.ts:628-633`). The bump script updates both by hand
(`scripts/bump-version.ts:24-32`). One source must feed both.

**C9. A file path is accepted as a project root.** `resolveTarget` accepts any
path that exists (`src/index.ts:36-44`). A directory-oriented tool then calls
`readdir` on a file. The resolver must require a directory for a project root.

**C10. The swarm tool promises a loop that it never runs.** The tool description
states `discover, cluster, test, commit` (`src/index.ts:454`). The body computes
the project, then returns `phase: "swarm_discover"` (`src/index.ts:492-499`). It
clusters nothing, tests nothing, and commits nothing, although `clusterHunks` is
already present and tested (`src/index.ts:333-348`). The README repeats the
promise (`README.md:24`). The tool must return the cluster plan, or the
documentation must state the true behaviour.

**C11. The verify gate hides later steps.** `/verify` breaks the loop at the
first non-zero exit (`src/index.ts:590-593`). A format failure therefore hides
the lint, test, and build results. `SKILL.md` states that the gate runs all four
steps and ends with a summary (`SKILL.md:108-110`). The gate must report the
later steps as `skipped_after_failure`.

**C12. A CMake or Julia project reports type `unknown`.** The manifest table
gives both a test command and the type `unknown` (`src/index.ts:66-67`). The
`init` report then says `project_type: unknown` for a project that the tool can
test.

**C13. The manifest order differs from the Tooling Ladder.** The code order is
`pyproject.toml`, `package.json`, `Cargo.toml`, `go.mod`, `CMakeLists.txt`,
`Project.toml` (`src/index.ts:61-68`). The `SKILL.md` order is `pyproject.toml`,
`Cargo.toml`, `go.mod`, `package.json`, `Makefile`, `CMakeLists.txt`
(`SKILL.md:181-188`). A repository that holds both `Cargo.toml` and
`package.json` therefore resolves differently in the code and in the
specification. The code also names a Julia manifest that no document names.

**C14. The compliance check is too coarse.** `hasDocstringInSrc` returns true
when one file holds one marker (`src/index.ts:212-231`). The marker list includes
`## `, which is Markdown and not a docstring. The walk skips `node_modules`,
`dist`, `.venv`, and dot directories, but not `target`, `build`, `vendor`, or
`coverage`.

### 3.2 Robustness and contract

**R1. Command output is unbounded.** `runCommand` captures all output with
`execFileSync` (`src/index.ts:239-248`). A large build or test log returns a
large envelope, and the default `maxBuffer` can throw `ENOBUFS`. The server must
cap the output and mark it as truncated.

**R2. `next_action` carries command output.** The envelope holds `next_action`
(`src/index.ts:11-26`). For the step tools that field holds the command output,
not a next action (`src/index.ts:517`). A client cannot tell a next step from a
log.

**R3. Error replies bypass the envelope.** `targetError` returns plain text
(`src/index.ts:46-49`), and the "not a git repository" reply does the same
(`src/index.ts:425`). The `success` flag is then absent. A client must parse two
shapes. Every reply must use the envelope, and an error must set
`success: false`.

**R4. The state write is not atomic.** `SwarmState.write` calls
`fs.writeFileSync` directly (`src/index.ts:305-308`). A stop in the middle of a
write leaves a corrupt file. The next `read` warns through `console.warn`
(`src/index.ts:301`). The integration runner treats any stderr line as a failure
(`scripts/test-connection.ts:81-84`). A warning therefore fails a test. The
write must use a temporary file and a rename.

**R5. `detectTool` builds a shell command.** `detectTool` runs
`execSync("which " + name)` (`src/index.ts:250-253`). A name from a manifest
reaches a shell. The code must use `execFileSync` or `fs.access` on `PATH`, and
it must not depend on `which`.

**R6. `events.jsonl` grows without a bound.** `logEvent` appends forever
(`src/index.ts:319-324`). The file needs a size cap or a rotation step.

**R7. The `mode` argument is documented but never implemented.**
`SKILL.md:22-27` and `SKILL.md:136-148` define `strict` and `lean`. No tool
schema holds `mode`, and no code reads it. The protocol promises a defence level
that the server ignores.

**R8. Included makefiles are not read.** `listMakeTargets` reads the root
`Makefile` only (`src/index.ts:93-106`). An `include` directive is invisible.
Low impact.

**R9. No tool exposes an output schema.** Every tool returns a text block that
holds JSON (`src/index.ts:18-26`). A client must parse the text itself. The MCP
SDK supports `outputSchema` and structured content.

### 3.3 Documentation and consistency

**D1. The CMake command differs across three files.** `README.md:47` states
`cmake --build .`, `SKILL.md:188` states `ctest`, and `src/index.ts:66` states
`cmake --build .`. One command must be true.

**D2. Toolchain versions differ.** `README.md:138-139` states pnpm `>= 9` and
TypeScript `>= 5.4`. The CI workflow pins pnpm `11.3.0`
(`.github/workflows/ci.yml:19`). `playground/README.md:37` states Node.js `18`,
but the telemetry package requires Node.js `>= 22.5`
(`playground/benchmarks/mcp-telemetry/package.json:7`). `.node-version` states
`20`. The root `package.json` has no `engines` field.

**D3. The README omits the `swarm` prompt.** The server registers a prompt named
`swarm` (`src/index.ts:357-376`), and the integration tests cover it. The README
describes only the eleven tools (`README.md:20-35`).

### 3.4 Tooling, CI, and tests

**T1. The integration runner is brittle.** It fails on any stderr byte
(`scripts/test-connection.ts:81-84`), and it sends a tool call with no prior
`initialize` frame (`scripts/test-connection.ts:109-110`). A debug line fails a
healthy server, and a stricter SDK could reject the call.

**T2. A test uses a double negative.** `scripts/test-swarm-unit.ts:86` writes
`assert(!targets.includes("all") === false, ...)`. The assertion is correct but
unreadable.

**T4. Nothing proves that `dist/` matches `src/`.** `dist/index.js` is tracked
(`git ls-files dist`). CI builds but never compares the build output with the
committed file.

**T5. The bump script edits build output.** The script rewrites
`dist/index.js` (`scripts/bump-version.ts:28-32`), and the documented flow then
runs `make build`, which regenerates the file. The hand edit is redundant and
can fail when the minifier changes.

**T6. CI duplicates the test chain.** CI runs each test script in its own step
(`.github/workflows/ci.yml:36-55`) while `package.json:20` defines the same
chain. The two lists can drift.

**T7. Node requirements are inconsistent.** `.node-version` states `20`, the
telemetry package needs `>= 22.5`, and the audit machine runs Node 26. The root
`package.json` states no `engines`.

### 3.5 Benchmark and telemetry

**B1. A telemetry fallback can write into the source tree.** `resolveTelemetryFile`
returns `PRIMARY_TELEMETRY` when the working directory is not a directory
(`playground/benchmarks/mcp-telemetry/src/telemetry.ts:134-148`). The comment
states that the function must not write into the repository. The branch is
nearly unreachable, but it contradicts the comment.

**B2. An unknown subproject records a phase.** `checkPhase` returns `ready: true`
when it holds no manifest for a subproject
(`playground/benchmarks/mcp-telemetry/src/telemetry.ts:204-210`). The tool schema
constrains the subproject to an enum, so the path is hard to reach.

## 4. Refinement increments

The increments below are ordered. Each one is independently releasable. Each one
needs a changelog file under `docs/changelogs/`, an entry in
`docs/changelogs/index.md`, a version bump, and a `make build` after the bump.
The AGENTS.md rules apply to every increment.

### 4.1 Version 3.8.1: correctness patch

**Scope:** non-breaking. No tool schema changes and no reply shape changes.

**Goal:** correct the wrong results and remove the dead code.

Changes:

1. **C1** Exclude the trailing summary line before the count. Count the lines
   that hold a `|` separator, or subtract the summary line.
2. **C3** Make `/swarm` resolve the test command with `resolveCommand` before it
   refuses `no_test_runner`. Add `Makefile` to `detectProject` as a manifest with
   the `make <target>` fallback, or treat the resolved command as the source of
   truth.
3. **C4** Change the CMake test command to `ctest` in `src/index.ts:66`.
4. **C5** Report only the executable of a command and a small known list of
   sub-tools. Drop `run`, `test`, and other subcommands.
5. **C6** Do not write the `swarm` phase when `dryRun` is true, or correct the
   reply text. The reply must match the state.
6. **C7** Remove the unused `makeTargets` and `formatCmd` variables.
7. **C9** Require a directory in `resolveTarget` for a project root. Return the
   existing `targetError` text for a file path.
8. **R5** Replace `execSync("which " + name)` with a shell-free check. Use
   `fs.accessSync` over the `PATH` entries, or `execFileSync("which", [name])`.
9. **D1** Change `README.md:47` to `ctest`.
10. **C12** Give CMake and Julia a named type, or drop the Julia entry until a
    document names it.
11. **T2** Rewrite the double-negative assertion.

Verification:

- Add unit tests for the audit count, the Makefile-only swarm path, the CMake
  command, and the tool list.
- Run `make test`.

Release note: "Correct the audit count, the CMake test command, the Makefile
detection, and the reported tool list."

### 4.2 Version 3.9.0: server contract completion

**Scope:** additive. New reply fields and a new reply path. Existing fields
keep their names.

**Goal:** make the server do what the documents promise, and give clients a clear
reply.

Changes:

1. **C10** Run `clusterHunks` inside `/swarm` and return the cluster plan. State
   the test command and the format command for each cluster. The tool still does
   not commit, because an atomic commit needs interactive staging. The reply
   must state that the caller stages and commits, or a later tool must do it.
2. **C2** Add untracked files to `/audit` through `git status --porcelain`. Add
   an `untracked` list and keep the existing counts.
3. **R1** Cap the command output in `runCommand`. Add `truncated: boolean` to the
   payload. The cap must be one named constant.
4. **R2** Add an `output` field to the payload of the step tools. Keep
   `next_action` for the true next step. This adds a field; it does not rename
   one.
5. **C11** Let `/verify` run all four steps. Report a later step as
   `skipped_after_failure` when an earlier step fails.
6. **C14** Return evidence from `/compliance`: the matched paths and a count.
   Keep the existing boolean fields.
7. **R9** Add an `outputSchema` and structured content to each tool.
8. **R7** Accept a `mode` argument on the state-changing tools. Validate it as
   `strict` or `lean` and echo it in the reply. The server may store it in the
   state file. Enforcement stays a caller duty, and the reply must say so.
9. **R6** Cap `events.jsonl`. Rotate the file when it passes a size limit, or
   keep the newest N entries.
10. **R4** Write the state file through a temporary file and a rename. Replace
    the `console.warn` on corrupt state with a structured warning that the
    caller reads from the envelope.
11. **Tooling Ladder:** make the step tools use `package.json` scripts and
    `scripts/` helpers when the manifest names no command. This completes
    `SKILL.md:192-193`.

Verification:

- Add unit tests for the cluster plan, the untracked list, the output cap, the
  verify skip report, and the `mode` echo.
- Add one integration test that sends `initialize` before a tool call.
- Run `make test`.

Release note: "The swarm tool returns a cluster plan, the audit sees untracked
files, and the replies gain an output field and an output schema."

### 4.3 Version 3.10.0: tooling, benchmark, and documentation hardening

**Scope:** non-breaking. Documentation, CI, and test infrastructure.

**Goal:** make the repository prove its own claims.

Changes:

1. **D2** Agree on one Node.js version and one pnpm version across
   `.node-version`, `README.md`, `playground/README.md`, and the CI workflows.
   Add an `engines` field to the root `package.json` (**T7**).
2. **T7** Align the telemetry `engines` with `.node-version`, or state that the
   telemetry server has a separate requirement.
3. **T4** Add a CI check that rebuilds and compares `dist/`. Keep `dist/`
   tracked only when the check passes.
4. **T5** Remove `dist/index.js` from the bump list. Rely on `make build`.
5. **T6** Remove the duplicated CI steps. Call `pnpm run test` once, or generate
   the step list.
6. **T1** Harden the integration runner. Send `initialize` first. Treat stderr
   as debug output unless the server sends no valid frame.
7. **D3** Document the `swarm` prompt in the README, or state that the prompt is
   for Bare Skill Mode only.
8. **B1** Remove the unreachable `PRIMARY_TELEMETRY` fallback, or state why it
   exists.
9. **R8** Read `include` directives in `listMakeTargets`, or state the
   limitation.

Verification:

- Run `make test` and the CI workflow on a branch.
- Check the README table against the documents.

Release note: "Align the toolchain versions, prove the build output, and harden
the integration tests."

### 4.4 Version 4.0.0: breaking protocol alignment

**Scope:** breaking. The manifest order and the reply envelope change.

**Goal:** make the code and the specification agree, with one stable contract.

Changes:

1. **C13** Adopt the `SKILL.md` manifest order in the code, or change the
   `SKILL.md` table to the code order. One order must win. The chosen order
   changes which command runs in a repository that holds two manifests, so the
   change is breaking.
2. Decide the Julia manifest. Remove `Project.toml`, or document it and add it
   to the ladder.
3. **R3** Send every reply through the envelope. Set `success: false` and a
   `payload.error` object for an error. This replaces the plain-text error
   replies, so a client that reads plain text must change.
4. **R2** Rename the field that holds the command output to `output` and reserve
   `next_action` for the next step. This changes the meaning of an existing
   field, so it is breaking.
5. **B2** Refuse a phase whose subproject the server does not know, so the
   telemetry record cannot hold a phantom phase.
6. State the version policy in `SKILL.md`: which changes need a major, a minor,
   and a patch bump.

Verification:

- Update every `tests/*.test.ts` file for the new envelope.
- Update the `SKILL.md` command list and the README tool list together.
- Run `make test` and `make test_e2e`.
- Update `docs/changelogs` and state the breaking changes.

Release note: "The manifest order now matches the Tooling Ladder, and every reply
uses one envelope with a `success` flag."

## 5. Cross-cutting recommendations

These items do not belong to one version. Apply them with the increment that
touches the same file.

- **One source of truth per fact.** The version (C8), the manifest order (C13),
  the CMake command (C4, D1), and the toolchain versions (D2) each hold two
  copies. A single derived value removes the drift.
- **One reply shape.** The envelope (R2, R3) must serve a success and an error.
  A client must not parse two shapes.
- **Match the promise to the code.** The swarm description (C10) and the `mode`
  argument (R7) promise more than the server does. Either the code or the text
  must change.
- **Keep the tests honest.** The integration runner (T1) must not fail on
  debug output. The build check (T4) must prove the tracked file.
- **Use the project commands.** AGENTS.md already states this rule. The audit
  used `make test_swarm`, `npx tsc`, and the Makefile targets.

## 6. Suggested order of work

1. Release `3.8.1` first. It is small, it corrects wrong results, and it needs
   no client change.
2. Release `3.9.0` next. It completes the server contract and adds the features
   that the audit found missing.
3. Release `3.10.0` after the repository can prove its own build.
4. Release `4.0.0` last, when the project accepts a breaking change. The
   changelog must state every breaking item.

## 7. Open questions

1. Must `/swarm` make the commits itself, or is interactive staging the intended
   boundary? The answer decides the C10 fix.
2. Does the project want a Julia manifest at all? The documents never mention
   one (C12, C13).
3. Is `dist/` meant to stay in version control? The answer decides the T4 and
   T5 approach.
4. Must the server enforce `mode`, or only record it? The answer decides the R7
   fix.
5. Is the manifest order a public contract? The answer decides whether the
   order change belongs to `3.10.0` or to `4.0.0`.
