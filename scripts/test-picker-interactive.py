#!/usr/bin/env python3
"""Drive the benchmark picker through a real pseudo terminal.

The picker starts a model, so a human must be present. A pseudo terminal gives
the picker the interactive terminal that it checks for, and it lets the test
type a filter and then a row number the way a person does.

The test puts a stub in place of every harness that the picker knows, so the
run that follows costs no model tokens and the menu holds only stub models. The
stub records its arguments, and the test then checks that the run reached the
report step.
"""

from __future__ import annotations

import os
import pty
import re
import select
import shutil
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HARNESSES = ("opencode", "kilo")
OPENCODE_MODEL = "opencode/stub-model-free"
KILO_MODEL = "kilo/stub-model-free"
RUN_TAG = "opencode-opencode-stub-model-free"
TIMEOUT_S = 300

passed = 0
failed = 0


def check(condition: bool, name: str) -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name}")


def make_stubs(directory: Path) -> Path:
    """Put a stub in place of every harness that the picker may call."""
    directory.mkdir(parents=True, exist_ok=True)
    for harness, model in zip(HARNESSES, (OPENCODE_MODEL, KILO_MODEL)):
        stub = directory / harness
        stub.write_text(
            "#!/bin/sh\n"
            'case "$1" in\n'
            f'  models) echo "{model}"; exit 0 ;;\n'
            '  *) echo "STUB cwd=$(pwd)"; echo "STUB args: $*"; exit 0 ;;\n'
            "esac\n"
        )
        stub.chmod(stub.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return directory


def read_available(fd: int, seconds: float) -> str:
    """Read the terminal until it goes quiet for a moment."""
    chunks: list[str] = []
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        ready, _, _ = select.select([fd], [], [], 0.5)
        if not ready:
            if chunks:
                break
            continue
        try:
            data = os.read(fd, 65536)
        except OSError:
            break
        if not data:
            break
        chunks.append(data.decode("utf-8", errors="replace"))
    return "".join(chunks)


def expect(text: str, pattern: str, name: str) -> None:
    check(re.search(pattern, text) is not None, name)


def clean_run() -> None:
    shutil.rmtree(ROOT / "playground" / "benchmarks" / RUN_TAG, ignore_errors=True)
    shutil.rmtree(f"/tmp/lccst-bench-{RUN_TAG}", ignore_errors=True)


def run_interactive_case() -> None:
    stub_dir = make_stubs(Path(tempfile.mkdtemp(prefix="lccst-stub-")))
    clean_run()
    env = dict(os.environ)
    env["PATH"] = f"{stub_dir}{os.pathsep}{env['PATH']}"

    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(ROOT)
        os.execvpe("make", ["make", "benchmark-free"], env)

    transcript = ""
    try:
        transcript += read_available(fd, 90)
        # Type a filter, then pick the only row that the filter leaves.
        os.write(fd, b"opencode\r")
        transcript += read_available(fd, 20)
        os.write(fd, b"1\r")
        transcript += read_available(fd, 120)
        os.write(fd, b"q\r")
        transcript += read_available(fd, 30)
    finally:
        try:
            os.close(fd)
        except OSError:
            pass
        try:
            os.waitpid(pid, 0)
        except ChildProcessError:
            pass

    expect(transcript, r"LCCST benchmark picker", "the picker greets the user")
    expect(transcript, re.escape(OPENCODE_MODEL), "the stub model appears in the menu")
    expect(transcript, re.escape(KILO_MODEL), "the menu holds both stub harnesses")
    expect(transcript, r"Run name: " + re.escape(RUN_TAG), "the picker shows the run name")
    expect(transcript, r"STUB cwd=", "the harness starts in the clean room")
    expect(transcript, r"--prompt", "the harness receives the task prompt")
    expect(transcript, r"Report generated", "the report step still runs")

    reports = sorted(p.name for p in (ROOT / "playground" / "benchmarks" / RUN_TAG).glob("*.md"))
    check(bool(reports), "a report is written after the interactive run")
    clean_run()
    shutil.rmtree(stub_dir, ignore_errors=True)


def run_pipe_case() -> None:
    """A pipe must not start a run."""
    stub_dir = make_stubs(Path(tempfile.mkdtemp(prefix="lccst-stub-")))
    env = dict(os.environ)
    env["PATH"] = f"{stub_dir}{os.pathsep}{env['PATH']}"
    clean_run()
    result = subprocess.run(
        ["make", "benchmark-free"],
        cwd=ROOT,
        env=env,
        input="opencode\n1\n",
        capture_output=True,
        text=True,
        timeout=TIMEOUT_S,
    )
    check(result.returncode != 0, "a piped run fails instead of starting a model")
    check("needs an interactive terminal" in result.stderr, "the refusal explains itself")
    check(not (ROOT / "playground" / "benchmarks" / RUN_TAG).exists(),
          "a piped run writes no report")

    listing = subprocess.run(
        ["make", "bench-list"],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=TIMEOUT_S,
    )
    check(listing.returncode == 0, "the model list needs no terminal")
    check(OPENCODE_MODEL in listing.stdout, "the list names the stub model")
    shutil.rmtree(stub_dir, ignore_errors=True)
    clean_run()


def main() -> int:
    print("LCCST: Benchmark picker interactive tests\n")
    run_pipe_case()
    run_interactive_case()
    print(f"\nResults: {passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
