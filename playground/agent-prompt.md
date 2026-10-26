# LCCST Playground Agent Instructions

This file arrives as the project instructions of the workspace, in the file
`AGENTS.md`. The harness sends the first task with it. You are running one
benchmark phase in an isolated workspace. The current working directory is the
only workspace you can access.

## 0. State the run token

The last line of this file holds a run token. State the token in your first
reply of this session. The harness reads your reply to confirm that you received
these instructions. A run that states no token is left out of the results.

## 1. Read the assignment

The assignment names one subproject (`python-http-server`, `react-timer`, or
`go-login-crud`), the required environment, and the scope. The assignment
requests one variant only. If the host supplies a single `variant` value,
implement only that value.

Read `README.md` and `guide.md` before implementation. Both variants read the
same two files.

- For `plain`, do not load or apply `SKILL.md` or `traps.md`.
- For `skill-guided`, load and apply `SKILL.md` and `traps.md`.

A `mode` value (`strict` or `lean`) is independent of the benchmark `variant`.
Do not use a mode name in place of a variant name. The scanner and the report
always use the names `plain` and `skill-guided`. The report labels the plain
column `Plain Strategy` and the skill-guided column `Skill-Guided`; these are
display labels only. Always write the variant value that the assignment names.

## 2. Prepare the sandbox

Remove only the target directory for the current variant before the mapping step:

```text
<subproject>/<variant>/
```

This is a blind deletion pass for one variant directory. Do not read or examine
the directory before removing it. Do not remove any other path. Do not run
`ls`, `find`, `git status`, `git diff`, `git log`, or `open`. Do not read,
write, or delete any path outside the current working directory. Do not load
the LCCST repository file at `.agents/AGENTS.md` or any parent `AGENTS.md` into
your planning. The clean room copies this file to `AGENTS.md`. The repository
file does not reach this run, and a plan from that file is a plan for a
different job.

### 2.1 Map the conventions

The `lccst` MCP server is disabled in this workspace, so the `init` tool is
not available. Do not wait for the tool. Apply the intent of the `/init`
command yourself. Map the project conventions. Examine the environment.
Do not write a source file in this step.

Record these four items in one short line each. Then give a short architecture
plan once, before you write code:

- The target path. Use `<subproject>/<variant>/` inside the current working
  directory.
- The manifest. Use `pyproject.toml` for `python-http-server`, `package.json`
  for `react-timer`, and `go.mod` for `go-login-crud`.
- The tools. Use the supplied toolchain list in `guide.md`.
- The conventions. Use `README.md` and `guide.md`. For `skill-guided`, also use
  the guardrails and the deliverables in `SKILL.md`.

The variant directory is empty. The manifest does not exist yet. You create
the manifest in section 3.

## 3. Implement the subproject

1. Create the directory for the current variant.
2. Follow the target specification in `README.md` and `guide.md`.
3. Write the manifest, the source files, and the test files of the variant. The
   test command of the subproject names the test directory, so create it.
4. Install dependencies with the command listed in `guide.md`.
5. Run the benchmark test command before the phase ends. The harness runs the
   test command after the run, so the variant needs test files that pass.
6. Call `log_turn_telemetry` at the end of the phase, after the test run.
   Call it once. Do not call it inside a loop, and do not make extra tool calls.

Implement only the variant that the assignment names. Do not create the other
variant, a second implementation, or extra files that the assignment does not
ask for. A phase names one variant.

For `skill-guided`, keep source and test files in the scanner paths. Use
explicit relative imports. Do not install a global package, create a symlink,
or add a second toolchain. Do not change the benchmark scanner or its
configuration.

## 4. Keep the implementation lean

Plan the smallest file that satisfies the assignment, then write it once:

1. List the behaviour the target specification asks for. Deliver each part of
   the behaviour once, in the source file.
2. Do not add helpers, banners, or comments that restate the assignment. Prose
   in the source costs nothing to remove and room to carry.
3. Write one test file that checks the behaviour. Extra assertions for one
   behaviour add no value.
4. A long implementation costs points, but the target behaviour comes first.
   When the task needs the lines, spend them on the feature, not on prose.

The scanner reads the text of the source file only. A feature that appears
only in a test file, in a wrapper, or in your closing commentary does not
count. Write the feature into the source file itself.

## 5. Record telemetry

Call `log_turn_telemetry` once at the end of the phase, after the test run.
A phase is one subproject variant. Pass only the `subproject` and the `variant`.
The tool marks the end of the phase. Do not pass token values or state a token
count. You cannot know the token count of your own turn.

The server checks the workspace before it records a phase. A refused call records
nothing, and a second call for the same phase corrects the end of that phase. If
the tool refuses or returns early, finish the phase and call the tool again at the
true end of the phase. Do not apologise. State the result of the call. The
telemetry call must be the last tool operation in the phase.

## 6. End the phase

End the response with the state that matches the last action:

- `[Awaiting Approval]`
- `[Phase Complete: <subproject>/<variant>]`
- `[Telemetry Recorded: <subproject>/<variant>]`

Do not add commentary after the state, except a short final line that names
the result you just saw.
