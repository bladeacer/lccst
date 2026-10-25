# Plan: weak-model benchmark pathology and the WIP 4.3.0 changes

Status: audit only. No code changes yet. Scope of the work: version 4.3.0.

## 1. What the last commit (8244aa1 "feat: WIP skill changes") did

The previous agent fixed four real scanner defects in
`playground/benchmarks/run_benchmark.py` and rewrote the benchmark prose:

1. Feature detection now aggregates over implementation files only (new
   `is_test_file`); a feature that appears only in a test file no longer counts.
2. The typing regex no longer matches a bare `def run(self):` followed by a
   return statement.
3. The bloat penalty now uses implementation line count (`impl_lines`), not the
   total line count, so test files cannot buy or lose the ceiling.
4. The contamination check compares implementation line counts.

Those four changes are sound. The problems are in the prose and in what was
left undone.

## 2. Findings: critical issues in the WIP state

Finding F1 (broken headings) — `playground/agent-prompt.md` declares sections
`0, 1, 2, 3, 6, 5, 5`. The new `## 6. Write a lean implementation` sits before
`## 5. Record telemetry`, and `## 5. End the phase` duplicates the number 5.
Order is 3, 6, 5, 5.

Finding F2 (verbatim duplication) — the same rubric paragraphs repeat across
and inside the playground files:
- "bloat penalty uses the line count of the implementation files" appears in
  `agent-prompt.md`, `guide.md`, twice inside `guide.md` itself, and in code
  comments three times.
- "Do not pad the test file to chase the ceiling" appears 4 times.
- The react-timer percentage explanation (67 ceiling, 75 vs 100 percent)
  appears at least 6 times across `agent-prompt.md`, `guide.md`, and
  `playground/README.md`.
`agent-prompt.md` grew to about 2150 words. The prompt sent to the model
quadrupled. For a benchmark that measures prompt and thinking tokens per turn,
this is self-harm: a weak model rereads repeated rules, loops them, and
overthinks. This is the most likely cause of the deepseek/mimo regression
pattern ("kept overthinking on our current setup"), together with F3.

Finding F3 (cliff-edge bloat penalty gates every run at 100) —
`compute_robustness_score` multiplies the whole score by
`max_lpf / lines_per_feature` and truncates with `int()`. The skill-guided
variant must reach 100 on every subproject to enter the README table
(`scripts/update_readme_benchmarks.py` line ~116 uses `guided_score >= 100`).
So a 100-ceiling subproject needs `impl_lines <= 30 * detected_features`, and
`react-timer` (typing only, ceiling 67) needs `impl_lines <= 20` in total. One
line over: `int(100 * 30/30.3) = 98` and the whole run is rejected. A Python
HTTP server with hashing, sessions, rate limiting, and error branches in 30 to
90 lines is at the edge of possibility; a 20-line React timer is nearly
impossible in practice. Weak models reliably break this cliff. This is either
an intentional "lean or die" design choice or a critical design bug. Decision
needed from the user.

Finding F4 (untested scanner changes) — `scripts/test-benchmark-report.py`
holds zero coverage of `is_test_file`, `impl_lines`, the impl-only feature
aggregate, or the contamination comparison. The WIP changelog claims these
fixes; nothing verifies them.

Finding F5 (benchmark scoring leaked into the end-user skill) —
`SKILL.md` weak-model checklist items 5 and 6 say "A benchmark phase scores
the implementation", "keep the file under the lines-per-feature limit", "do
not pad the test file to chase a score", and "Score the source, not the test".
The user rule: no scoring rules in SKILL.md. The general advice (lean
implementation, deliver a feature once, do not overthink, do not pad) may
stay, but the benchmark-specific phrasing must go.

Finding F6 (SKILL.md/MCP parity gap) — items 5 and 6 exist only in SKILL.md.
`src/index.ts` has no matching guidance, and `scripts/test-parity.ts` checks
commands, not guidance text, so today the parity test passes while the
capability exists in one place only.

Finding F7 (changelog regression) — the WIP commit replaced the accumulated
4.3.0 changelog, deleting the record of the already-committed 4.3.0 work
(README capability-claim parity, benchmark session loop fix, `test_sanity`,
`test_bench_run`). The new changelog covers only the scanner fixes. The two
halves must be merged into one 4.3.0 entry.

Finding F8 (prose faults) —
- `playground/traps.md` line 90: `for clarity.## Score ceiling` — a heading
  merged into a sentence.
- `playground/guide.md` duplicates "A variant that misses the ceiling never
  gets judged on bloat" twice and repeats the "feature ceiling" explanation in
  two sections.
- `playground/traps.md` tells the model "Do not use Strategy and Routine in
  your own work", chasing a confusion that is better fixed by removing the
  confusion than by warning about it.
- `playground/guide.md` says "either of the two subprojects that have a 100
  ceiling", which reads wrongly (there are two such subprojects out of three).

Finding F9 (rubric facts inconsistent between prose and code) — the per-file
feature table looks fine, but the prose asserts "A skill-guided variant must
reach 100 on every subproject" while also explaining that react-timer's raw
ceiling is 67. Correct in percentage terms, but the constant re-explanation is
what bred the duplication. One canonical statement per file.

## 3. Root-cause summary for weak models (deepseek, mimo)

Ranked by expected impact:

1. F2 prompt bloat and repetition: weak models follow a small set of rules
   well; two thousand words of rubric prose with internal duplication makes
   them re-derive the plan every few turns. Fix by writing each rule once,
   where it belongs, and keeping the model-facing prompt short.
2. F3 the bloat cliff: the gate demands near-impossible terseness. Even a
   correct run dies. Fix by design decision (see section 5, open question).
3. Missing anti-overthinking guidance: SKILL.md and the MCP server never tell
   a weak model to stop planning after one pass, nor to proceed bottom-up.
   Add it (F5/F6 scope), with parity.
4. F4: without tests we could be shipping a detector that silently mis-scores
   and debugging by benchmark instead of by test.

## 4. README table truth check

Not a bug, verified: the gate (`guided_score >= 100`) is a percentage gate and
aligns with the prose. A perfect react-timer reaches 67/67 = 100 percent.

## 5. Open question for the user (decision needed before implementing)

The bloat cliff (F3). Options:
- (a) Keep the cliff. Accept that only very terse implementations rank; the
  bench is a lean-implementation contest by design.
- (b) Apply the penalty but reject a run only when the plain and guided
  variants both underperform, or require `>= 95` instead of `>= 100`.
- (c) Reduce cliff severity: report the penalty but let the README table rank
  on raw score, or scale lines-per-feature ceilings up (30/20 are small).
Nothing is decided until the user answers.

## 6. Work plan for 4.3.0, in commit order

No work is started before the user answers section 5 and approves the plan.

Commit 1: `fix(bench): de-duplicate and reorder the playground prompt files`
- Reorder and renumber `agent-prompt.md` sections (0..5 in order, one lean
  implementation section).
- State every rubric fact once per file: scoring ladder, ceilings, table, and
  bloat limit each once in `guide.md`, once in `playground/README.md`, once in
  `agent-prompt.md`.
- Delete duplicated paragraphs in `guide.md` (`bloat penalty` paragraph twice,
  "feature ceiling" twofold), the "Do not use Strategy and Routine" trap, and
  shorten the model-facing prompt. Where a prose duplication grows the run
  prompt, keep the wrapped version inside the agent-prompt files. Update traps
  heading split (F8).
- Deletions and rewordings were/separate style is untouched elsewhere.

Commit 2: `test(bench): cover the implementation-only feature detector`
- Add cases to `scripts/test-benchmark-report.py`: `is_test_file` (tests dir,
  `test_`, `_test.`, `.test.`, non-test), impl-only feature aggregation,
  `impl_lines` accounting, contamination flagging on impl-line-equality, and
  the bloat penalty cliff values (30/20, one-line-over behaviour). Run
  `make test_report`.

Commit 3: `docs(skill): generalise the lean-implementation checklist`
- Reword SKILL.md weak-model checklist items 5 and 6 to remove benchmark
  vocabulary (`benchmark phase scores`, `lines-per-feature limit`, `chase a
  score`, `score the source`). Keep: plan a lean implementation, deliver a
  feature once, do not restate rules in comments, do not pad tests, put the
  behaviour in the source rather than only in the test.
- Add an anti-overthinking item: plan once, implement, verify; do not restate
  the plan between steps; run the next command instead of re-inspecting.

Commit 4: `feat(mcp): mirror the lean-implementation guardrail in the server`
- Add the same lean/anti-overthinking guidance to `src/index.ts` wherever the
  server already emits checklist guidance (the `compliance` and `swarm`
  guidance paths). Keep wording identical to SKILL.md.
- Extend `scripts/test-parity.ts` so the mirrored guidance is checked on both
  sides.

Commit 5: `docs: merge the 4.3.0 changelog halves`
- Merge the pre-WIP 4.3.0 content (README parity rule, session loop,
  `test_sanity`, `test_bench_run`) back with the scanner-fix summary from the
  WIP commit, plus the above commits. Keep the Ada_CRDT structure and the
  `_2026-10-25_` italic date format the convention requires.

After the commits, the verification runs the user suggested:
- `make bench-list`, and a `BENCH_ALLOW_PIPE=1` run against a Kilo-backed
  model and a deepseek-class model to confirm the failure is prompt-induced
  and not an opencode-quantisation artifact.
- Record the results in a new `plan.md` section, then delete `plan.md` with
  the second-last commit of the release, per `SKILL.md` house style (the plan
  file must not enter a commit).

## 7. What stays out of scope

- No scoring-core change without the user's answer to section 5.
- No rubric tables, line limits, or score vocabulary in SKILL.md beyond the
  general lean-implementation wording (user rule).
- No scanner rewrites beyond test coverage; F3 handling is F3-consistent only.
