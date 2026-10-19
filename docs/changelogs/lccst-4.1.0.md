### LCCST 4.1.0

Date: _2026-10-19_

The Tooling Ladder detects task runners by declaration instead of by command,
and the skill gains weak-model safety rules after the 4.0.0 benchmark split
models by capability.

## Correctness

### A Task Runner Must Declare the Task

The server selected `mise run <command>`, `just <command>`, or `task <command>`
from the runner file alone, so a `mise.toml` with no test task produced a
command that could never pass. The server now parses the runner file and picks
the runner only when it declares the task. A runner that declares no task is
skipped, and resolution falls through to the language manifest.

### A Makefile Without the Target Falls Through

`resolveCommand` returned `make <command>` for a Makefile that held no such
target, because the Makefile manifest entry names fixed commands. A Makefile
without the target now falls through to package scripts and `scripts/`
helpers, and reports no command when nothing declares one.

### The Skill No Longer Probes With a Command

`SKILL.md` stated Makefile detection as "`make -n test` succeeds". A model in
a workspace without a Makefile ran the probe, received a make error, and could
misread it as a project failure. Detection is now file-based in the skill, as
it already was in the server: a runner counts when its file declares the
command.

## Consistency

### Weak-Model Safety Rules in the Skill

The 4.0.0 benchmark split models by capability. Strong models used the new
ladder correctly, but weaker models turned a guided phase into a whole-phase
error through four paths. The skill now closes them:

- The ladder says to check runner and manifest files by path, and not to list
  directory contents.
- A runner file that declares no command is a skip, not an error, and a model
  must not create a runner to satisfy the ladder.
- Platform detection runs once, before the first command. A failed command is
  a project failure to fix, not a shell problem, so the skill no longer
  suggests switching shells after a failure.
- A failing test names a defect: fix the cause and run the command again,
  instead of ending the loop after the first failure.

### Target Specification Term Restored

Version 4.0.0 removed the term from the skill, but `agent-prompt.md` and
`traps.md` still reference it. The term is restored in the skill terminology.

### Dead Julia Type Removed

The `ProjectInfo` type union still listed `julia` after 4.0.0 removed the
Julia manifest. The value is removed.

## Version

Bumped from 4.0.0 to 4.1.0.
