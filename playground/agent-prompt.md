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

The README table accepts a run only when the skill-guided variant reaches the
ceiling for every subproject. The ceiling is 100 for `python-http-server` and
`go-login-crud`, and 67 for `react-timer`. A skill-guided variant that passes
but scores below the ceiling for its subproject is rejected.

A `mode` value (`strict` or `lean`) is independent of the benchmark `variant`.
Do not use a mode name in place of a variant name.

## 2. Prepare the sandbox

Remove only the target directory for the current variant before the mapping step:

```text
<subproject>/<variant>/
```

This is a blind deletion pass for one variant directory. Do not read or examine
the directory before removing it. Do not remove any other path. Do not run
`ls`, `find`, `git status`, `git diff`, `git log`, or `open`. Do not read,
write, or delete any path outside the current working directory.

### 2.1 Map the conventions

The `lccst` MCP server is disabled in this workspace, so the `init` tool is
not available. Do not wait for the tool. Apply the intent of the `/init`
command yourself. Map the project conventions. Examine the environment.
Do not write a source file in this step.

Record these four items:

- Record the target path. Use `<subproject>/<variant>/` inside the current
  working directory.
- Record the manifest. Use `pyproject.toml` for `python-http-server`,
  `package.json` for `react-timer`, and `go.mod` for `go-login-crud`.
- Record the tools. Use the supplied toolchain list in `guide.md`.
- Record the conventions. Use `README.md` and `guide.md`. For `skill-guided`,
  also use the guardrails and the deliverables in `SKILL.md`.

Do not load the LCCST repository file at `.agents/AGENTS.md` or any parent
`AGENTS.md` into your planning. The clean room copies this file to
`AGENTS.md`. The repository file does not reach this run, and a plan from that
file is a plan for a different job.

Do not mix up the terms `variant` and `mode` with the terms `strategy` and
`routine`. The scanner and the report call the two implementations `plain` and
`skill-guided`. The report labels the columns `Strategy` and `Routine`, but
those are only labels. A run that writes a file named `Strategy` or `Routine`
or that names a column after one of those words has the wrong vocabulary.
The scanner checks the text of the source file. It does not read your closing
commentary for the feature score. If your closing monologue carries the feature
term but the source file does not, the score still misses that feature.
If you are not sure whether a feature reached the source file, make it reach the
source file. Write the feature in the file, not in the closing commentary.
Then call the test command and record the result you got.

The variant directory is empty. The manifest does not exist yet. You create
the manifest in section 3.

State the four items in one short line each. Then give a short architecture
plan before you write code.

## 3. Implement the subproject

1. Create the directory for the current variant.
2. Follow the target specification in `README.md` and `guide.md`. The score rewards features the scanner detects in the text of the file. If the scanner sees no match for a feature, the score treats the feature as absent, even if the file is correct.
3. Write the manifest, the source files, and the test files of the variant. The
   test command of the subproject names the test directory, so create it.
   The scanner counts every source file, so parenthetical prose and dead code lower the score.
4. Install dependencies with the command listed in `guide.md`.
5. Run the benchmark test command before the phase ends. The harness runs the
   test command after the run, so the variant needs test files that pass.
6. Call `log_turn_telemetry` at the end of the phase, after the test run. Do not call the telemetry tool inside a loop, and do not create extra tool calls just to help a ceiling you do not control.

Implement only the variant that the assignment names. Do not create the other
variant.

Do not add a second implementation, a second file, a second model, a second
rubric, or a second strategy name in one phase. A phase names one variant. One
variant.

For `skill-guided`, keep source and test files in the scanner paths. Use
explicit relative imports. Do not install a global package, create a symlink, or
add a second toolchain. Do not change the benchmark scanner or its
configuration.

The scanner scores every variant with the same rubric. The rubric uses one
scoring ladder for every subproject, but the feature ceiling is different for
each subproject.

- A passing test run earns 50 points.
- A failing test run earns 15 points.
- A test run that cannot start, that times out, or that holds no test earns 5
  points.
- A variant earns the maximum feature points for typing, security, and error
  handling only when the source text delivers a rewarded feature.
- The rubric then divides the total points by the feature ceiling of the
  subproject and multiplies by 100.
- The rubric then applies a bloat penalty when the variant carries many lines
  for the features it delivers.

The feature ceiling is different for each subproject. A plain React Timer does
not earn security points or error handling points, because the rubric ceiling
for that subproject forbids them. A plain React Timer can still pass, because a
pass earns 50 points and the typing ceiling adds 17 points.

A skill-guided variant must reach the ceiling for its subproject before the run
can enter the README table. The ceiling is 100 for `python-http-server` and
`go-login-crud`, and 67 for `react-timer`. A 100 on a 100-ceiling subproject
means the variant passed and delivered every rewarded feature for that subproject,
with no lines-per-feature penalty. A 67 on `react-timer` means the variant passed
and delivered every rewarded feature for that subproject, with no
lines-per-feature penalty.

The feature ceilings that the scanner uses are fixed:

| Subproject | Max Typing | Max Security | Max Error Handling | Ceiling |
| --- | :---: | :---: | :---: | :---: |
| python-http-server | 17 | 17 | 16 | 100 |
| react-timer | 17 | 0 | 0 | 67 |
| go-login-crud | 17 | 17 | 16 | 100 |

The plain variant of `react-timer` cannot earn security points or error handling
points. The skill-guided variant of `react-timer` cannot earn them either: the
rubric ceiling for that subproject sets both to 0, so the scanner awards no
security points and no error handling points to either variant. A passing
`react-timer` earns 50 points and the typing ceiling adds 17 points, so a
passing `react-timer` reaches at most 67 raw points, which is the ceiling for
that subproject. The score is a percentage of the ceiling: 67 raw points is
100 percent, and the README table requires the skill-guided variant to reach
100 percent on every subproject. A passing `react-timer` that delivers typing
reaches 100 percent. A passing `react-timer` that delivers no typing reaches 75
percent and is rejected. The skill-guided variant of `react-timer` must
therefore pass and deliver typing in the source text, and then clear the lines
per feature limit.

The bloat limits that the scanner uses are fixed:

| Subproject | Lines per feature ceiling |
| --- | :---: |
| python-http-server | 30 |
| react-timer | 20 |
| go-login-crud | 30 |

The feature ceiling is not a separate score. It is the maximum points the rubric
can award for that subproject. The bloat penalty is a separate check. The scanner
applies it only after the rubric has scored the variant, and only when the variant
already delivered at least one rewarded feature. A variant that misses the ceiling
never gets judged on bloat, and a variant that reaches the ceiling can still lose
points here if it carries too many lines for the features it delivered.

The bloat penalty uses the line count of the implementation files, not the test
files. Both variants must write a test file, so a variant cannot buy the ceiling
by padding its test file. The bloat penalty counts the implementation features
only, because a test assertion is a state of the variant, not a feature of the
implementation.

Do not add code that does not add a rewarded feature, because the bloat penalty
lowers the score.

The scanner reads the text of the files you write. It does not count a feature
from a passing test, a wrapper, or a comment alone. If the scanner sees no real
feature in the source text, the score misses that feature even when the test
passes. Give the scanner a real typing, a real security term, or a real error
branch in the source, and keep the file short enough to clear the
lines-per-feature limit.

The scanner does not count the number of test assertions. A test file that
contains many assertions for the same behaviour does not raise the feature score,
and it can raise the lines-per-feature ratio. Do not pad the test file to chase
the ceiling.

## 6. Write a lean implementation

A benchmark phase scores the implementation, not the commentary. A model that
writes a large file, adds helpers that the assignment does not ask for, and
restates the rules in comments loses points to the bloat penalty, and a variant
that loses points cannot reach the ceiling. A model that writes a small file that
delivers every rewarded feature reaches the ceiling.

Before you write code, plan the smallest file that satisfies the assignment:

1. List the features that the rubric rewards for this subproject. For
   `react-timer`, that is typing only. For `python-http-server` and
   `go-login-crud`, it is typing, security, and error handling.
2. Write one source file that delivers each feature once. Do not add a feature
   twice. Do not add a helper that the assignment does not ask for.
3. Write one test file that checks the behaviour. Keep it short. A test file
   that holds many assertions for the same behaviour does not raise the score.
4. Keep the implementation file under the lines-per-feature limit for the
   subproject. The limit is 30 lines per feature for `python-http-server` and
   `go-login-crud`, and 20 lines per feature for `react-timer`.

Do not explain the assignment in the source file. Do not add a banner, a
docstring that restates the rules, or a comment that says what the code does.
The scanner reads the text of the file, and prose that adds no feature counts
against the limit.

Do not start the next subproject until the phase is complete.

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

## 5. End the phase

End the response with the state that matches the last action:

- `[Awaiting Approval]`
- `[Phase Complete: <subproject>/<variant>]`
- `[Telemetry Recorded: <subproject>/<variant>]`

Do not add extra commentary after the state. The scanner scores the files you
write, not the closing monologue. A long closing monologue does not add a
rewarded feature and can push the variant past the lines-per-feature limit.
End with the state and nothing after it, except a short final line that names
the result you just saw.
