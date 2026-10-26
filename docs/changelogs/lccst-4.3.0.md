### LCCST 4.3.0

Date: _2026-10-25_

The benchmark session loop expanded a make function inside a shell loop, so
`make benchmark-free` stopped with a syntax error before the first session
started. The README opening claim named invariants the protocol does not
enforce. The scanner counted a feature that appears only in the test file,
matched a bare parameter list as a typing marker, and judged the bloat penalty
and the contamination check on total lines, which include the test files every
variant must write. The scoring prose of the playground repeated the same
rubric paragraphs four to six times and grew the model-facing prompt, which
pushes weak models into rereading and overthinking.

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

### Scanner Reads the Implementation, Not the Tests

`playground/benchmarks/run_benchmark.py` ran the feature detector over every
counted file, including the test files. A feature that appeared only in a test
file counted for the implementation score, which contradicts the rule that the
scanner reads the source text. The detector now aggregates over the
implementation files only, and a new `is_test_file` helper names a test file by
its directory and its file name.

### Typing Marker Stops at the Parameter List

The typing regular expression matched a bare `def run(self):` followed by a
return statement, because the colon rule reached past the parameter list. A
method parameter annotated inside its own parameter list is now a typing
marker, and a bare parameter list is not.

### Bloat Penalty Uses the Implementation Lines

The bloat penalty used the total line count, which includes the test files
that every variant must write. A variant that wrote a longer test file was
penalised for it. The penalty now uses the implementation line count, and the
report table states that count.

### Contamination Check Uses the Implementation Lines

The contamination check compared the total line count, so a guided variant
that copied the plain output with a different test file passed the check. It
now compares the implementation line count.

## Consistency

### Playground Scoring Prose Deduplicated

`playground/agent-prompt.md`, `playground/guide.md`, and
`playground/README.md` repeated the ceiling, bloat, and react-timer
percentage explanations four to six times, broke the section numbering of the
agent prompt, and grew the model-facing prompt several times over. Each fact
now appears once per file: the task steps in `agent-prompt.md`, the rubric in
`guide.md`, and the measurement summary in `playground/README.md`. A merged
heading in `playground/traps.md` is repaired, and the lines-per-feature limit
is worded as a penalty rather than a hard cap, so lines that the target
behaviour needs remain acceptable.

### Capability-Claim Parity Check

`scripts/test-parity.ts` now also checks that every capability claim in the
README opening paragraph matches a rule in SKILL.md or a check in the MCP
server. A claim with no backing rule fails the check. It now also checks that
the execution guidance appears in both SKILL.md and the MCP server, so a
checklist rule cannot exist on one side only.

### Execution Checklist Carries No Scoring Vocabulary

The execution checklist of SKILL.md described benchmark mechanics, such as a
lines-per-feature limit and a score to chase, which read as noise outside a
benchmark run. The checklist now states the general rule: implement the
asked-for behaviour once, place the behaviour in the source itself, and spend
lines only on behaviour. The MCP server mirrors the same guidance in the
`guidance` field of the `/init` and `/audit` replies.

## New Features

- `make test_sanity` (`scripts/test-bench-sanity.ts`): open opencode or kilo
  in a clean room with the telemetry configuration of a run, wait until the
  harness spawns the telemetry server of the clean room, and close the harness
  without sending the prompt, so no model is reached.
- `make test_bench_run` (`scripts/test-bench-run.py`): ask make for the
  dry-run commands of `benchmark-run` and check one launch per subproject and
  variant, a prompt that names its session, no make residue in the session
  block, and a session block that parses as one shell script. The check joins
  the default test suite.
- Scanner unit tests in `scripts/test-benchmark-report.py` cover the test-file
  boundary of the filter, the implementation-only feature aggregate, the
  implementation line count behind the bloat penalty and the contamination
  check, the typing marker rule, and the percentage rounding of the two
  ceiling shapes.
- `WEAK_MODEL_GUIDANCE` in `src/index.ts`: the mirrored checklist that the
  `/init` and `/audit` replies carry, with the parity anchors for the new
  guidance rule of `scripts/test-parity.ts`.

## Version

Bumped from 4.2.0 to 4.3.0.
