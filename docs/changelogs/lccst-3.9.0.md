### LCCST 3.9.0

Date: _2026-10-16_

The swarm tool returns a cluster plan, the audit sees untracked files, and
the replies gain an output field and an output schema.

## Correctness

### The Swarm Tool Returns a Cluster Plan

The `/swarm` tool promised a discover-cluster-test-commit loop, but it
returned one phase and one test command. It clustered nothing, although
`clusterHunks` was already present and tested.

The tool now reads the staged, unstaged, and untracked files, groups them
by their top-level directory, and returns one cluster per directory. Each
cluster carries a commit-message suggestion, the test command, and the
format command. The reply states the commit boundary: the server does not
commit, because an atomic commit needs interactive staging. The caller
stages each cluster and creates the commit. The reply phase is now
`swarm_cluster`, and the state file records the cluster suggestions.

### The Audit Sees Untracked Files

The `/audit` tool read two diff outputs only. A new file that no commit
and no `git add` named was untracked, so it never appeared in the commit
plan. A commit-plan tool must see a new file.

The tool now reads `git status --porcelain` beside the two diffs. The
reply gained an `untracked` list and an `untracked_files` count, and
`total_files` now includes the untracked files. The staged and unstaged
counts keep their meaning. The git commands now run without a shell.

### The Verify Gate Reports Every Step

The `/verify` gate broke at the first failing step. A format failure
therefore hid the lint, test, and build results, although `SKILL.md`
states that the gate runs all four steps and ends with a summary.

The gate now covers all four steps in every run. A step after a failure
is reported as `skipped_after_failure`, so a failure never hides a later
step. The step results now carry the command output and a `truncated`
flag beside the exit code.

### The Compliance Check Returns Evidence

The `/compliance` tool returned four booleans with no evidence. A reader
could not tell which files marked the project compliant.

The reply now holds the matched paths and a count for each item. The
path list holds at most ten entries, and the count stays exact. The walk
now skips the generated directories `target`, `build`, `vendor`, and
`coverage` beside the directories it already skipped. The boolean fields
keep their names.

## New Features

### Every Tool Declares an Output Schema

Every tool returned a text block that held JSON, so a client had to
parse the text itself. The MCP SDK supports an `outputSchema` and
structured content.

Every tool now declares one output schema, and every success reply
carries the same envelope as structured content beside the text block.
A client can read the fields without parsing the text. A plain-text
error reply sets the MCP `isError` flag, which the SDK exempts from
output validation. A full envelope error is a 4.0.0 change.

### The State-Changing Tools Accept a Mode

`SKILL.md` defines a `mode` argument with the values `strict` and
`lean`, but no tool schema held the argument and no code read it. The
protocol promised a defence level that the server ignored.

The state-changing tools now accept `mode`, validate it as `strict` or
`lean`, and echo it in the reply with `mode_enforcement:
"caller_duty"`. The server stores the mode in the state file. The server
records the mode only; the caller enforces it, because enforcement is a
defence decision that belongs to the caller.

### The Command Output Is Capped

`runCommand` captured all output. A large build or test log returned a
large envelope, and the default executor buffer could throw `ENOBUFS`.
The output is now cut at `MAX_COMMAND_OUTPUT_CHARS`, which is one named
constant of 20000 characters, and the payload marks the cut with
`truncated: true`. The executor buffer sits above the cap, so a large
log is cut by the cap instead of failing.

### The Step Replies Separate Output From Next Action

The step tools carried the command output in `next_action`. A client
could not tell a next step from a log.

The step replies now carry the command output in an `output` field, and
`next_action` states the true next step, such as `The test step passed.
Continue with the next step.` The existing field names are unchanged.

### The Ladder Fills a Missing Command

A manifest can name no command for a step. `CMakeLists.txt` names no
format command, for example, so `/format` reported `skipped` although
the workspace held a matching script.

`resolveCommand` now falls back to a `package.json` script of the same
name, then to a `scripts/` helper of the same name, when the manifest
names no command. A Makefile target and a manifest command keep their
priority.

## Consistency

### The State Write Is Atomic

The state write used a plain write. A stop in the middle left a corrupt
file, and the next read warned on the standard error. The integration
runner treats any standard-error line as a failure, so a warning failed
a healthy test.

The write now uses a temporary file and a rename, so a reader sees the
old file or the new file and never a half-written one. A corrupt state,
a failed write, and a failed clear now record a structured warning. A
tool reads the warnings from the `state_warnings` reply field instead of
the standard error.

### The Event File Is Capped

`events.jsonl` grew without a bound. The file now rotates when it
passes `EVENT_FILE_MAX_BYTES`. The rotation keeps the newest entries up
to half the cap, and it writes through a temporary file and a rename.

## Breaking Changes

None. The tool schemas gained a `mode` argument with a default, the
replies gained fields, and the existing field names are unchanged. The
`swarm` reply reports the phase `swarm_cluster` instead of
`swarm_discover`, which names the new reply path.

## Version

Bumped from 3.8.1 to 3.9.0.
