### LCCST 4.6.0

Date: _2026-10-28_

The audit of the DeepSeek benchmark run found a scoring rule that rewarded
a feature-free implementation, a README gate that no guided run could pass,
and guidance that ordered the skill-guided variant to write unrequested
defences. The rubric now applies one visible size budget to both variants,
the gate compares the two variants, and the guidance states each risk before
it states a control.

## Correctness

### The Size Penalty Reaches Every Variant

The bloat penalty divided the implementation lines by the number of
delivered features, and it skipped the division when a variant delivered no
feature. A variant that shipped no detected feature therefore escaped the
penalty and kept its pass score, while a variant that shipped the features
that the skill demands paid the penalty. The penalty now compares the
implementation lines of a variant with the line budget of the subproject:
120 lines for `python-http-server`, 60 for `react-timer`, and 200 for
`go-login-crud`. The same budget applies to both variants and to a variant
that delivers no feature, so neither column can buy the pass score with
volume.

### The Size Budget Is Part of the Assignment

The old thresholds (30 and 20 lines per feature) lived only in the scoring
code, so the model under test could not know the bar it was judged against.
`guide.md` now states the budget to both variants, and the rubric document
states the same numbers, so no variant is judged against a hidden bar.

### The README Gate Compares the Variants

The gate required a skill-guided score of 100 percent on every subproject,
which no guided run could reach under the old react-timer threshold. The
gate now requires six passing variants and a skill-guided score that
reaches the plain score of the same subproject. The reject reason names the
score pair of the subproject, and it names the variant whose tests failed.

### The Traps State No Unrequested Feature

The trap file ordered the skill-guided variant to hash a password, check a
session, and enforce a rate limit, and it placed that order in the React
section, so a guided stopwatch could receive password hashing that the
assignment never asked for. The guard traps now apply only to a behaviour
that the assignment states, the rate limiter trap names the removal of an
unrequested limiter, and the Go error-branch trap no longer demands a
branch on every call.

### The Skill States the Risk Before the Control

The mode rules ordered rate throttling and architectural isolation for
every network or data target in `strict` mode, which contradicted the
mandate that treats over-engineering as a correctness defect. The mode
rules now add rate throttling, caching, and architectural isolation only
when a stated risk or a lookup cost requires them. The lean mode of a
network or data target no longer orders rate throttling. The execution
checklist states that a docstring which describes the behaviour of a public
export is content, so the checklist and the deliverable no longer pull
against each other. The MCP server mirrors the sentence in its guidance
reply.

## Consistency

The parity check, the leak check, the report tests, and the unit suites
cover the new rubric, the new gate, and the reworded guidance.

## Breaking Changes

The rubric changed from a lines-per-feature penalty to a line budget, so
the robustness scores of a new report are not comparable with the scores of
a report that predates this version. A repository that holds an old report
must re-run its benchmark before it compares columns.

## Version

This release is version 4.6.0. The bump updates `package.json`,
`src/index.ts`, `dist/index.js`, `tests/init_handshake.test.ts`, the
telemetry MCP files, and the `SKILL.md` metadata.
