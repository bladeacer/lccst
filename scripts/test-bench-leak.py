#!/usr/bin/env python3
"""Check that the documents a run seeds hold no scoring terms.

The model under test reads every document of the clean room. A scoring term
in a seeded document lets the model write the signal, not the behaviour, so
the run measures the copy of the rubric instead of the skill.

`benchmark-run` copies `SKILL.md`, `playground/guide.md`,
`playground/traps.md`, and `playground/agent-prompt.md`. The rubric states
its terms in `playground/README.md`, which the run never copies. The check
asks make for the dry-run recipe, confirms the seeded set, and scans each
seeded document for scoring terms.

Run the file with:

    make test_bench_leak
"""

import os
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The sources that `benchmark-run` copies into the clean room. The prompt copy
# reaches the model twice, as `agent-prompt.md` and as `AGENTS.md`.
SEEDED_SOURCES = [
    "SKILL.md",
    "playground/guide.md",
    "playground/traps.md",
    "playground/agent-prompt.md",
]

# Terms of the rubric: the score itself, the weights, the detection process,
# and the acceptance rules. The list must match the case of a term when that
# term is a display label. A match is a leak.
SCORING_TERMS = [
    "scanner",
    "scanning",
    "rubric",
    "ceiling",
    "bloat",
    "penalt",
    "points",
    "percent",
    "rewarded",
    "feature score",
    "lines per feature",
    "lines-per-feature",
    "plain strategy",
    "skill-guided column",
    "robustness",
    "score",
    "benchmark-report-v",
]

RUBRIC_HOME = "playground/README.md"

passed = 0
failed = 0


def check(condition, name):
    """Record one check and print its result."""
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name}")


def dry_run_recipe():
    """Expand the benchmark-run recipe without executing it."""
    tmpdir = tempfile.mkdtemp(prefix="lccst-bench-leak-")
    result = subprocess.run(
        ["make", "--no-print-directory", "-n", "benchmark-run"],
        cwd=ROOT,
        env=dict(os.environ, BENCH_TMP=tmpdir),
        capture_output=True,
        text=True,
        timeout=120,
    )
    import shutil
    shutil.rmtree(tmpdir, ignore_errors=True)
    return result.stdout


print("LCCST: Clean-room scoring-leak checks\n")

recipe = dry_run_recipe()
check(recipe != "", "make -n benchmark-run prints a recipe")

for source in SEEDED_SOURCES:
    check(f'cp {source} "' in recipe, f"the recipe seeds {source}")

check(
    "cp playground/README.md" not in recipe,
    "the recipe never seeds the rubric document",
)

for source in SEEDED_SOURCES:
    text = (ROOT / source).read_text()
    lowered = text.lower()
    leaks = [term for term in SCORING_TERMS if term in lowered]
    check(not leaks, f"{source} holds no scoring term"
          + (f" (found: {', '.join(leaks)})" if leaks else ""))

rubric_text = (ROOT / RUBRIC_HOME).read_text().lower()
check(
    "feature ceiling" in rubric_text and "bloat penalty" in rubric_text,
    f"the rubric stays stated in {RUBRIC_HOME}",
)

print(f"\nResults: {passed} passed, {failed} failed")
raise SystemExit(1 if failed else 0)
