### LCCST 4.3.0

*26 October 2026*

Fix the benchmark scoring so a weak model can reach the ceiling, and stop the
scanner from counting test files as implementation.

## Correctness

- `playground/benchmarks/run_benchmark.py`: the feature detector ran its
  regular expressions over every counted file, including the test files. A
  feature that appeared only in a test file counted for the implementation
  score, which contradicts the rule that the scanner reads the source text.
  The detector now aggregates over the implementation files only, and a new
  `is_test_file` helper names a test file by its directory and its file name.
- `playground/benchmarks/run_benchmark.py`: the typing regular expression
  matched a bare `def run(self):` followed by a return statement, because the
  colon rule reached past the parameter list. A method parameter annotated
  inside its own parameter list is now a typing marker, and a bare parameter
  list is not.
- `playground/benchmarks/run_benchmark.py`: the bloat penalty used the total
  line count, which includes the test files that every variant must write. A
  variant could not buy the ceiling by padding its test file, and a variant
  that wrote a longer test file was penalised for it. The penalty now uses the
  implementation line count, and the report table states that count.
- `playground/benchmarks/run_benchmark.py`: the contamination check compared
  the total line count, so a guided variant that copied the plain output with
  a different test file passed the check. It now compares the implementation
  line count.

## Consistency

- `playground/agent-prompt.md`, `playground/guide.md`, `playground/README.md`:
  the score is a percentage of the feature ceiling, not a raw point count. The
  documents previously said a passing `react-timer` reaches at most 67 and that
  the table rejects a score below 67, which is true of the raw count and false
  of the percentage. A passing `react-timer` that delivers typing reaches 100
  percent; a passing `react-timer` that delivers no typing reaches 75 percent.
  The three files now say so in the same way, and the agent prompt states the
  raw count and the percentage together.

## New Features

- `playground/agent-prompt.md`: a `Write a lean implementation` section that
  tells the model to plan the smallest file that satisfies the assignment, to
  deliver each feature once, to keep the implementation file under the
  lines-per-feature limit, and to avoid banners, docstrings, and comments that
  add no feature.
- `SKILL.md`: the weak-model checklist gains two items that cover the
  benchmark scoring: write a lean implementation, and score the source, not the
  test.

## Version

Bumped to 4.3.0.