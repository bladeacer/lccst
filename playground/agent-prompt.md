# LCCST Playground Agent Instructions

You are running one benchmark phase in an isolated workspace. The current
working directory is the only workspace you can access.

## 1. Read the assignment

The task assignment names one subproject, the required environment, and the
scope. Use one of these exact subproject names:

- `python-http-server`
- `react-timer`
- `go-login-crud`

The standard benchmark assignment requests both variants for each subproject.
Implement `plain` first, then implement `skill-guided`. If the host supplies a
single `variant` value, implement only that value.

Read `README.md` and `guide.md` before implementation. Apply this variant rule:

- For `plain`, do not load or apply `SKILL.md`.
- For `skill-guided`, load and apply `SKILL.md`.

The `mode` value `strict` or `lean` is independent of the benchmark `variant`.
Do not use a mode name in place of a variant name.

## 2. Prepare the sandbox

CAUTION: The following cleanup step deletes the contents of the six listed
benchmark directories. Remove them before you inspect the sandbox.

Before `/init`, remove only these six directories:

```text
python-http-server/plain/
python-http-server/skill-guided/
react-timer/plain/
react-timer/skill-guided/
go-login-crud/plain/
go-login-crud/skill-guided/
```

This is a blind deletion pass. Do not read, list, or examine these directories
before removing them. Do not remove any other path.

Do not run `ls`, `find`, `git status`, `git diff`, `git log`, or `open`. Do not
read, write, or delete any path outside the current working directory. Do not
change network settings or proxies.

Run `/init` after the deletion pass. `/init` records the target path, manifest,
tools, and conventions. Give a short architecture plan before you write a
source file.

## 3. Implement one subproject at a time

1. Select one subproject from the assignment.
2. Create the directory for the current variant.
3. Follow the target specification and layout rules in `README.md` and
   `guide.md`.
4. Install dependencies with the command listed in `guide.md` for the selected
   subproject.
5. For `skill-guided`, run the benchmark test command listed in `guide.md`
   before the phase ends. For `plain`, complete the target specification
   without a test run.
6. Call `log_turn_telemetry` at the end of the phase. For `skill-guided`, call
   it after the test run. For `plain`, call it after target specification
   completion.
7. Do not start the next subproject until all requested variants for the
   current subproject are complete.

If the assignment requests both variants, implement `plain` first and
`skill-guided` second. If it requests one variant, do not create the other
variant. The benchmark harness does not run plain-variant tests.

For `skill-guided`, keep source files and test files in the scanner paths. Use
explicit relative imports. Do not install a global package, create a symlink, or
add a second toolchain. Do not change the benchmark scanner or the supplied
configuration.

## 4. Record telemetry

The `lccst-telemetry` server provides `log_turn_telemetry`. Call that tool
once at the end of each requested phase. A phase is one subproject variant. For
`skill-guided`, the phase includes the benchmark test run. For `plain`, the
phase ends when the target specification is complete.

Pass the exact `subproject`, `variant`, `prompt_tokens`, and
`completion_tokens` values for the phase. Use integer counts. If the host does
not expose a token count, do not call the tool. State that the count is
unavailable. Do not use placeholders or estimates. Do not call the tool before
the phase starts. Do not call it again for the same phase.

The telemetry call must be the last tool operation in the phase. Do not run a
command, read a file, or start another subproject after the call. You can
write one short next-step summary after the call.

## 5. End the phase

End the response with one of these exact states:

- `[Awaiting Approval]`
- `[Phase Complete: <subproject>/<variant>]`
- `[Telemetry Recorded: <subproject>/<variant>]`

Use the state that matches the last action. Do not claim that a test passed
when the test command did not run or returned a non-zero exit code.
