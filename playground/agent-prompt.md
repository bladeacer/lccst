# LCCST Playground Agent Instructions

You are running one benchmark phase in an isolated workspace. The current
working directory is the only workspace you can access.

## 1. Read the assignment

The assignment names one subproject (`python-http-server`, `react-timer`, or
`go-login-crud`), the required environment, and the scope. The standard
assignment requests both variants. Implement `plain` first, then
`skill-guided`. If the host supplies a single `variant` value, implement only
that value.

Read `README.md` and `guide.md` before implementation.

- For `plain`, do not load or apply `SKILL.md`.
- For `skill-guided`, load and apply `SKILL.md`.

A `mode` value (`strict` or `lean`) is independent of the benchmark `variant`.
Do not use a mode name in place of a variant name.

## 2. Prepare the sandbox

CAUTION: The following deletion removes the contents of the six listed
benchmark directories.

Remove only these six directories before `/init`:

```text
python-http-server/plain/
python-http-server/skill-guided/
react-timer/plain/
react-timer/skill-guided/
go-login-crud/plain/
go-login-crud/skill-guided/
```

This is a blind deletion pass. Do not read or examine these directories
before removing them. Do not remove any other path. Do not run `ls`, `find`,
`git status`, `git diff`, `git log`, or `open`. Do not read, write, or
delete any path outside the current working directory.

Run `/init` after the deletion pass. It records the target path, manifest,
tools, and conventions. Give a short architecture plan before you write
code.

## 3. Implement the subproject

1. Select one subproject.
2. Create the directory for the current variant.
3. Follow the target specification in `README.md` and `guide.md`.
4. Install dependencies with the command listed in `guide.md`.
5. For `skill-guided`, run the benchmark test command before the phase ends.
   For `plain`, complete the target specification without a test run.
6. Call `log_turn_telemetry` at the end of the phase. For `skill-guided`, call
   it after the test run. For `plain`, call it after completion.
7. Do not start the next subproject until all requested variants are complete.

If the assignment requests one variant, do not create the other. The harness
does not run plain-variant tests.

For `skill-guided`, keep source and test files in the scanner paths. Use
explicit relative imports. Do not install a global package, create a symlink, or
add a second toolchain. Do not change the benchmark scanner or its
configuration.

## 4. Record telemetry

Call `log_turn_telemetry` once at the end of each phase. A phase is one
subproject variant. For `skill-guided`, the phase includes the test run. For
`plain`, the phase ends when the target specification is complete.

Pass the exact `subproject`, `variant`, `prompt_tokens`, and
`completion_tokens` values. Use integer counts. If the host does not expose a
token count, do not call the tool. State that the count is unavailable. Do not
use placeholders or estimates. Do not call the tool before the phase starts or
again for the same phase.

The telemetry call must be the last tool operation in the phase. You can
write one short next-step summary after the call.

## 5. End the phase

End the response with these exact states:

- `[Awaiting Approval]`
- `[Phase Complete: <subproject>/<variant>]`
- `[Telemetry Recorded: <subproject>/<variant>]`

Use the state that matches the last action. Do not claim that a test passed
when the test command did not run or returned a non-zero exit code.
