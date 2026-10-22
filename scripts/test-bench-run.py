#!/usr/bin/env python3
"""Check the expanded benchmark-run recipe of the Makefile.

The session loop of `benchmark-run` builds one task prompt per subproject and
variant. A make function cannot run once per shell-loop iteration, and a stray
backslash in a recipe line breaks the shell script of the loop, so the loop
must expand at make time. The test asks make for the dry-run commands and
checks that the recipe holds one launch per session, that every prompt names
the subproject and the variant of its session, that no make residue reaches
the shell, and that the session commands parse as one shell script.

Run the file with:

    make test_bench_run
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The subprojects and the variants that the Makefile pins. The test spells the
# lists here, so a change in the Makefile that drops a session fails the check
# instead of passing with fewer sessions.
BENCH_SUBPROJECTS = ["python-http-server", "react-timer", "go-login-crud"]
BENCH_VARIANTS = ["plain", "skill-guided"]

START_MARKER = "Starting one session per subproject variant"
REPORT_MARKER = "bench-report"

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


def dry_run(tmpdir):
    """Expand the benchmark-run recipe without executing it.

    The temporary directory only redirects the clean-room path, so a make
    version that executes a command despite the dry run writes outside the
    repository.
    """
    env = dict(os.environ, BENCH_TMP=tmpdir)
    return subprocess.run(
        ["make", "--no-print-directory", "-n", "benchmark-run"],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )


def session_block(stdout):
    """Return the printed commands between the session announcement and the report."""
    lines = stdout.splitlines()
    start = None
    end = None
    for index, line in enumerate(lines):
        if start is None and START_MARKER in line:
            start = index
        if start is not None and REPORT_MARKER in line:
            end = index
            break
    if start is None or end is None:
        return None
    return "\n".join(lines[start + 1 : end])


print("LCCST: Benchmark-run recipe checks\n")

tmpdir = tempfile.mkdtemp(prefix="lccst-bench-run-")
result = dry_run(tmpdir)

check(result.returncode == 0, "make -n benchmark-run leaves with status 0")

block = session_block(result.stdout)
check(block is not None, "the dry run prints the session block")

if block is not None:
    launches = result.stdout.count('--prompt "Read AGENTS.md')
    check(
        launches == len(BENCH_SUBPROJECTS) * len(BENCH_VARIANTS),
        f"the recipe launches one session per subproject and variant ({launches} launches)",
    )
    check(
        result.stdout.count("[Harness] Session: ")
        == len(BENCH_SUBPROJECTS) * len(BENCH_VARIANTS),
        "the recipe announces one session per subproject and variant",
    )
    check(
        '--prompt "$SESSION_TASK"' not in result.stdout,
        "no prompt reads a shell variable that no loop iteration sets",
    )
    check(
        "$(eval" not in block,
        "the session block holds no make eval function",
    )
    check(
        "\\\\" not in block,
        "the session block holds no doubled backslash",
    )
    for subproject in BENCH_SUBPROJECTS:
        for variant in BENCH_VARIANTS:
            prompt = f"Implement the {subproject} subproject for the {variant} variant only"
            check(
                result.stdout.count(prompt) == 1,
                f"one prompt names {subproject} with {variant}",
            )
    parsed = subprocess.run(
        ["sh", "-n"], input=block, capture_output=True, text=True, timeout=30
    )
    check(
        parsed.returncode == 0,
        "the session block parses as one shell script"
        + (f" ({parsed.stderr.strip()})" if parsed.returncode else ""),
    )

if result.returncode != 0:
    print(result.stderr.strip())

shutil.rmtree(tmpdir, ignore_errors=True)

print(f"\nResults: {passed} passed, {failed} failed")
raise SystemExit(1 if failed else 0)
