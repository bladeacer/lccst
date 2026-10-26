### LCCST 4.4.0

Date: _2026-10-26_

The playground told the model under test how the benchmark scores it, so a
model could write the signal instead of the behaviour. The model-facing
documents now carry the task only, and the rubric stays with the operator.

## Correctness

### The Rubric Leaves the Clean Room

`make benchmark-run` copied `playground/README.md` into the clean room. The
model under test therefore read the full rubric: the point values, the
feature ceilings, the bloat limits, and the rule that the README table
accepts a skill-guided variant at 100 percent only. The run no longer copies
that file. The rubric now lives in `playground/README.md` alone, which is an
operator document.

`playground/guide.md` lost the sections `The score` and `What the README
table accepts`, and `playground/traps.md` lost the section `Score ceiling`.
`playground/agent-prompt.md` lost the sentences that named the points, the
scanner, and the post-run test pass. The trap bullets that named the
detection process, such as the typing signal, the security term list, and
the error-handling check, now state the engineering practice instead of the
detection.

The target specification of the three subprojects moved from
`playground/README.md` to `playground/guide.md`, so both variants keep one
document with the specification, the environment, and the layout rules.

## Consistency

### Seeded Set Matches the Documents

`AGENTS.md`, `README.md`, `playground/guide.md`, `playground/traps.md`, and
`playground/agent-prompt.md` now agree with the new seeding: the plain
variant reads `guide.md`, and the skill-guided variant reads the same file
plus `SKILL.md` and `traps.md`.

## New Features

- `make test_bench_leak` (`scripts/test-bench-leak.py`): ask make for the
  dry-run recipe of `benchmark-run`, confirm the seeded set, and fail when a
  scoring term reaches one of the four model-facing documents. The check
  joins the default test suite.

## Version

Bumped from 4.3.0 to 4.4.0.
