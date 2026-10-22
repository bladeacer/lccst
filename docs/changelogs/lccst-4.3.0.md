### LCCST 4.3.0

Date: _2026-10-22_

The README opening claim now names the invariants the protocol actually
enforces. The skill file and the MCP server already enforced single
responsibility, cohesion, and strict test verification; the README over-claimed
SOLID enforcement and a production gate that the server does not implement.
The parity check gains a capability-claim rule so a README claim must match a
SKILL.md rule or an MCP check. The benchmark session loop expanded a make
function inside a shell loop, so `make benchmark-free` stopped with a shell
syntax error before the first session started. The loop now unrolls at
expansion time, and every session receives its own task prompt. A harness
sanity check opens the harness in a clean room without a prompt and closes it
once the telemetry server of the clean room has started.

## Correctness

### README Claim Aligned to the Protocol

The opening paragraph previously named "architectural cohesion and SOLID
invariants". The server enforces neither. It now names the three invariants
that the skill and the server do enforce: single responsibility, cohesion, and
strict test verification.

### SKILL.md Line Split

The hermetic-lockfile rule and the manifest rule ran together on one line.
They now occupy separate bullets.

### Benchmark Session Loop

The session loop of `benchmark-run` called `$(eval ...)` inside a shell `for`
loop. The recipe line ended with a doubled backslash, so the shell reported a
syntax error before the first session started, and the make function ran once
at expansion time, so the task prompt could not name the subproject or the
variant of its session. The session list now unrolls at expansion time through
`RUN_VARIANT_SESSION`, and each session receives its own task prompt from
`SINGLE_VARIANT_TASK`.

## Consistency

### Parity Check Gains a Capability-Claim Rule

`scripts/test-parity.ts` previously checked command sets, argument docs, the
tooling ladder, versions, and the reply envelope. It now also checks that
every capability claim in the README opening paragraph matches a rule in
SKILL.md or a check in the MCP server. A claim with no backing rule fails the
check.

## New Features

- A capability-claim parity rule in `scripts/test-parity.ts`.
- `make test_sanity` (`scripts/test-bench-sanity.ts`): open opencode or kilo
  in a clean room with the telemetry configuration of a run, wait until the
  harness spawns the telemetry server of the clean room, and close the harness
  without sending the prompt, so no model is reached.
- `make test_bench_run` (`scripts/test-bench-run.py`): ask make for the
  dry-run commands of `benchmark-run` and check one launch per subproject and
  variant, a prompt that names its session, no make residue in the session
  block, and a session block that parses as one shell script. The check joins
  the default test suite.

## Breaking Changes

None. The release is a minor version bump.

## Version

Bumped from 4.2.0 to 4.3.0.