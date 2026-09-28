#!/usr/bin/env python3
"""Unit tests for the benchmark scanner and the README table generator.

The tests cover the behaviour that decides whether a run may rank a model:
the model comparison, the shared file filter, the test status rule, the note
parser, and the inclusion gate.

Run the file with:

    make test_report
"""

import importlib.util
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCH_DIR = ROOT / "playground" / "benchmarks"

passed = 0
failed = 0


def load_module(name, path):
    """Load one module from a path, because the file name is not a module name.

    The function registers the module in `sys.modules` before it runs it. The
    `dataclass` decorator reads the module namespace of its own class, so an
    unregistered module fails while the decorator runs.
    """
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


scanner = load_module("run_benchmark", BENCH_DIR / "run_benchmark.py")
table = load_module("update_readme_benchmarks", ROOT / "scripts" / "update_readme_benchmarks.py")


def check(condition, name):
    """Record one check and print its result."""
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name}")


def check_equal(actual, expected, name):
    """Record one equality check and print its result."""
    check(actual == expected, f"{name} (expected {expected!r}, got {actual!r})")


class ModelComparisonTest(unittest.TestCase):
    """The report must compare the requested model with the measured model."""

    def test_same_model_matches(self):
        check(
            scanner.model_matches("opencode/space-bunny-free", "opencode/space-bunny-free"),
            "an identical identifier matches",
        )

    def test_nested_model_part_matches(self):
        check(
            scanner.model_matches(
                "kilo/stepfun/step-3.7-flash:free", "kilo/stepfun/step-3.7-flash:free"
            ),
            "a nested model part matches",
        )

    def test_tag_is_ignored(self):
        check(
            scanner.model_matches("kilo/stepfun/step-3.7-flash:free", "kilo/stepfun/step-3.7-flash"),
            "a host that drops the tag still matches",
        )

    def test_case_is_ignored(self):
        check(
            scanner.model_matches("opencode/ling-3.0-Flash-free", "opencode/ling-3.0-flash-free"),
            "the comparison ignores case",
        )

    def test_different_model_does_not_match(self):
        check(
            not scanner.model_matches(
                "kilo/stepfun/step-3.7-flash:free", "kilo/step-3.7-flash:free"
            ),
            "a different model part does not match",
        )

    def test_empty_names_do_not_match(self):
        check(not scanner.model_matches("", "opencode/x"), "an empty request does not match")
        check(not scanner.model_matches("opencode/x", None), "an empty measurement does not match")

    def test_sanitised_label_does_not_match(self):
        # The picker replaces every unsafe character of a nested model part, so a
        # sanitised label must never be compared with the store.
        check(
            not scanner.model_matches(
                "stepfun-step-3.7-flash-free", "kilo/stepfun/step-3.7-flash:free"
            ),
            "a sanitised label does not match the store",
        )


class FileFilterTest(unittest.TestCase):
    """One filter must count both variants in the same way."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.variant = self.root / "skill-guided"
        (self.variant / "src").mkdir(parents=True)
        (self.variant / "tests").mkdir()
        (self.variant / "node_modules" / "left-pad").mkdir(parents=True)
        (self.variant / "dist").mkdir()
        (self.variant / "__pycache__").mkdir()

        (self.variant / "src" / "app.tsx").write_text("export const x: number = 1;\n")
        (self.variant / "tests" / "app.test.tsx").write_text("test('x', () => {});\n")
        (self.variant / "config.json").write_text("{}\n")
        (self.variant / "pnpm-lock.yaml").write_text("lockfile\n")
        (self.variant / "node_modules" / "left-pad" / "index.js").write_text("module.exports = 1;\n")
        (self.variant / "dist" / "bundle.js").write_text("built\n")
        (self.variant / "__pycache__" / "x.pyc").write_bytes(b"\x00")

    def tearDown(self):
        self.temp.cleanup()

    def names(self):
        return {path.name for path in scanner.collect_source_files(self.variant)}

    def test_counts_source_and_tests(self):
        self.assertEqual(self.names(), {"app.tsx", "app.test.tsx"})

    def test_skips_installed_and_generated(self):
        names = self.names()
        self.assertNotIn("index.js", names)
        self.assertNotIn("bundle.js", names)

    def test_skips_lock_files_and_config(self):
        names = self.names()
        self.assertNotIn("pnpm-lock.yaml", names)
        self.assertNotIn("config.json", names)

    def test_same_filter_for_both_variants(self):
        plain = self.root / "plain"
        (plain / "tests").mkdir(parents=True)
        (plain / "app.tsx").write_text("export const x: number = 1;\n")
        (plain / "tests" / "app.test.tsx").write_text("test('x', () => {});\n")
        plain_names = {path.name for path in scanner.collect_source_files(plain)}
        self.assertEqual(plain_names, self.names())

    def test_missing_directory_is_empty(self):
        self.assertEqual(scanner.collect_source_files(self.root / "absent"), [])

    def test_totals_cover_every_file(self):
        measured = scanner.measure_files(self.variant)
        self.assertEqual(measured["file_count"], 2)
        self.assertEqual(measured["total_lines"], 2)


class TestStatusTest(unittest.TestCase):
    """A scanner failure must never score as a pass."""

    def verdict(self, exit_code, files, timed_out=False, stdout="", info=None):
        result = {"exit_code": exit_code, "timed_out": timed_out, "stdout": stdout, "stderr": ""}
        return scanner.classify_test(result, files, info or {"usage_exit_codes": set()})

    def test_pass(self):
        self.assertEqual(self.verdict(0, 3)["status"], "passed")

    def test_failure(self):
        self.assertEqual(self.verdict(1, 3)["status"], "failed")

    def test_no_source_file_is_an_error(self):
        # The earlier scanner reported PASSED for a variant that held no file.
        self.assertEqual(self.verdict(0, 0)["status"], "error")

    def test_timeout_is_an_error(self):
        self.assertEqual(self.verdict(-1, 3, timed_out=True)["status"], "error")

    def test_start_failure_is_an_error(self):
        self.assertEqual(self.verdict(-1, 3)["status"], "error")

    def test_usage_exit_code_is_an_error(self):
        info = {"usage_exit_codes": {4, 5}}
        self.assertEqual(self.verdict(4, 3, info=info)["status"], "error")

    def test_no_tests_found_is_an_error(self):
        verdict = self.verdict(1, 3, stdout="No tests found, exiting with code 1")
        self.assertEqual(verdict["status"], "error")

    def test_error_scores_below_failure(self):
        """An error must not outscore a real failure."""
        def variant(status):
            return {
                "test_result": {"status": status},
                "features_aggregate": {
                    "has_typing": False,
                    "has_security": False,
                    "has_error_handling": False,
                    "has_test_assertion": False,
                },
            }

        error = variant("error")
        failed = variant("failed")
        passed_variant = variant("passed")
        name = "python-http-server"
        self.assertLess(
            scanner.compute_robustness_score(error, name),
            scanner.compute_robustness_score(failed, name),
        )
        self.assertLess(
            scanner.compute_robustness_score(failed, name),
            scanner.compute_robustness_score(passed_variant, name),
        )

    def test_error_never_reaches_the_ceiling(self):
        variant = {"test_result": {"status": "error"}, "features_aggregate": {
            "has_typing": True, "has_security": True, "has_error_handling": True,
            "has_test_assertion": True,
        }}
        self.assertLess(scanner.compute_robustness_score(variant, "python-http-server"), 100)


class HarnessVersionTest(unittest.TestCase):
    """The report must name the harness version, for reproducibility."""

    def test_a_missing_harness_is_stated(self):
        version = scanner.detect_harness_version("lccst-no-such-harness-xyz")
        self.assertIn("is not on the path", version)

    def test_a_real_harness_is_reported_with_its_path(self):
        version = scanner.detect_harness_version("sh")
        self.assertIn("(", version)
        self.assertIn("sh", version)

    def test_a_harness_that_reports_no_version_says_so(self):
        with tempfile.TemporaryDirectory() as dir:
            stub = Path(dir) / "lccst-stub-harness"
            stub.write_text("#!/bin/sh\nexit 0\n")
            stub.chmod(0o755)
            original = os.environ["PATH"]
            os.environ["PATH"] = f"{dir}{os.pathsep}{original}"
            try:
                version = scanner.detect_harness_version("lccst-stub-harness")
            finally:
                os.environ["PATH"] = original
        self.assertIn("version not reported", version)

    def test_the_version_is_parsed_from_a_banner(self):
        """A harness may print a banner before the version."""
        with tempfile.TemporaryDirectory() as dir:
            stub = Path(dir) / "lccst-banner-harness"
            stub.write_text("#!/bin/sh\necho '~~~ banner ~~~\n'\necho 'kilo 7.7.9'\n")
            stub.chmod(0o755)
            original = os.environ["PATH"]
            os.environ["PATH"] = f"{dir}{os.pathsep}{original}"
            try:
                version = scanner.detect_harness_version("lccst-banner-harness")
            finally:
                os.environ["PATH"] = original
        self.assertIn("7.7.9", version)
        self.assertNotIn("~~~ banner ~~~", version)

    def test_the_report_names_the_harness_version(self):
        text = self.build_report(harness_version="opencode v2.0.18 (/usr/bin/opencode)")
        self.assertIn("**Harness Version:** opencode v2.0.18 (/usr/bin/opencode)", text)
        self.assertNotIn("**Harness version unreported.**", text)

    def test_an_unreported_version_is_flagged(self):
        text = self.build_report(harness_version="lccst-x is not on the path")
        self.assertIn("**Harness version unreported.**", text)

    def test_a_missing_version_line_says_not_stated(self):
        text = self.build_report(harness_version=None)
        self.assertIn("**Harness Version:** not stated", text)

    def build_report(self, harness_version):
        """Build one report with the given harness version."""
        with tempfile.TemporaryDirectory() as dir:
            workspace = Path(dir)
            for project in scanner.PROJECT_ORDER:
                for variant in scanner.VARIANTS:
                    target = workspace / project / variant
                    target.mkdir(parents=True)
                    (target / "main.py").write_text("def f() -> int:\n    return 1\n")
            (workspace / "prompt-token.txt").write_text("abc12345\n")
            original = scanner.WORKSPACE
            scanner.WORKSPACE = workspace
            try:
                results = scanner.collect_results(install=False)
                return scanner.generate_markdown(
                    results, "opencode", "opencode", "ling-free", "opencode/ling-free",
                    "opencode-opencode-ling-free", "v3.7.0", scanner.empty_telemetry(),
                    True, harness_version,
                )
            finally:
                scanner.WORKSPACE = original


class ToolchainTest(unittest.TestCase):
    """The report must state a toolchain drift."""

    def test_drift_is_stated(self):
        notes = scanner.toolchain_notes({"python": "3.14.5", "pnpm": "11.3.0", "go": "1.26.4-X"})
        self.assertTrue(any("python" in note for note in notes))
        self.assertEqual(len(notes), 1)

    def test_no_drift_when_the_machine_matches(self):
        notes = scanner.toolchain_notes({"python": "3.13.11", "pnpm": "11.3.0", "go": "1.26.4-X"})
        self.assertEqual(notes, [])


class TelemetryFileTest(unittest.TestCase):
    """The report must read one file, not the sum of every file."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.workspace = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def write(self, payload):
        (self.workspace / "runtime-telemetry.json").write_text(
            __import__("json").dumps(payload)
        )

    def test_reads_the_workspace_file(self):
        self.write({"total_tokens": 100, "model_turns": 2, "phases": []})
        original = scanner.WORKSPACE
        scanner.WORKSPACE = self.workspace
        try:
            record = scanner.load_telemetry("tag")
        finally:
            scanner.WORKSPACE = original
        self.assertEqual(record["total_tokens"], 100)

    def test_token_state_requires_a_measured_breakdown(self):
        self.write({"total_tokens": 0, "phases": []})
        original = scanner.WORKSPACE
        scanner.WORKSPACE = self.workspace
        try:
            record = scanner.load_telemetry("tag")
        finally:
            scanner.WORKSPACE = original
        self.assertFalse(record["measured_breakdown"])

    def test_unsettled_phases_are_counted(self):
        self.write({
            "total_tokens": 10,
            "phases": [
                {"subproject": "react-timer", "variant": "plain", "settled": False},
                {"subproject": "react-timer", "variant": "skill-guided", "settled": True,
                 "model": "opencode/x", "token_seen": True},
            ],
        })
        original = scanner.WORKSPACE
        scanner.WORKSPACE = self.workspace
        try:
            record = scanner.load_telemetry("tag")
        finally:
            scanner.WORKSPACE = original
        self.assertEqual(record["unsettled_phases"], 1)
        self.assertTrue(record["prompt_verified"])
        self.assertEqual(record["models"], ["opencode/x"])

    def test_damaged_file_gives_an_empty_record(self):
        (self.workspace / "runtime-telemetry.json").write_text("{not json")
        original = scanner.WORKSPACE
        scanner.WORKSPACE = self.workspace
        try:
            record = scanner.load_telemetry("tag")
        finally:
            scanner.WORKSPACE = original
        self.assertEqual(record["total_tokens"], 0)


class NoteParserTest(unittest.TestCase):
    """The gate reads the notes of a report."""

    def test_measured_report(self):
        states = table.read_note_states(
            "> **Model verified.** ok\n\n> **Prompt verified.** ok\n\n"
            "> **Measured runtime tokens.** ok\n"
        )
        self.assertEqual(states["token_state"], table.MEASURED)
        self.assertEqual(states["prompt_state"], table.PROMPT_VERIFIED)
        self.assertEqual(states["model_state"], table.MODEL_VERIFIED)

    def test_unsettled_report(self):
        states = table.read_note_states("> **Unsettled phases.** 2 of 6 phases hold no count.")
        self.assertEqual(states["token_state"], table.UNSETTLED)

    def test_wrong_model_report(self):
        states = table.read_note_states("> **Wrong model.** Do not use this report.")
        self.assertEqual(states["model_state"], table.MODEL_WRONG)

    def test_unverified_prompt_report(self):
        states = table.read_note_states("> **Prompt unverified.** no token found.")
        self.assertEqual(states["prompt_state"], table.PROMPT_UNVERIFIED)

    def test_estimated_breakdown_is_not_measured(self):
        states = table.read_note_states(
            "> **Estimated runtime tokens.** The rows below allocate the total."
        )
        self.assertEqual(states["token_state"], table.NO_TOKENS)

    def test_old_report_without_notes_passes_nothing(self):
        states = table.read_note_states("# Report\n\nNo notes here.\n")
        self.assertEqual(states["token_state"], table.NO_TOKENS)
        self.assertEqual(states["prompt_state"], table.PROMPT_UNKNOWN)
        self.assertEqual(states["model_state"], table.MODEL_UNVERIFIED)

    def test_test_status_cell(self):
        self.assertEqual(table.read_test_status("`PASSED`"), "passed")
        self.assertEqual(table.read_test_status("`FAILED (code 1)`"), "failed")
        self.assertEqual(table.read_test_status("`ERROR: the variant holds no source file`"), "error")
        self.assertEqual(table.read_test_status("`Skipped`"), "unknown")


ROBUSTNESS_TABLE = """## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 3 | 60 | 400 | `PASSED` | **31%** |
| **python-http-server** | Skill-Guided | 4 | 197 | 1407 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 2 | 11 | 65 | `FAILED (code 1)` | **22%** |
| **react-timer** | Skill-Guided | 5 | 172 | 1157 | `ERROR: timed out` | **74%** |
"""


class RobustnessTableTest(unittest.TestCase):
    """The parser must read the columns by name, not by a fixed position."""

    def parse(self, text):
        return table._parse_robustness_section(text)

    def test_columns_are_read_by_name(self):
        projects = self.parse(ROBUSTNESS_TABLE)
        self.assertEqual(len(projects), 2)
        python, react = projects
        self.assertEqual(python.name, "python-http-server")
        self.assertEqual(python.fct_plain, 400)
        self.assertEqual(python.fct_guided, 1407)
        self.assertEqual(python.plain_score, 31)
        self.assertEqual(python.guided_score, 100)
        self.assertEqual(react.fct_plain, 65)
        self.assertEqual(react.fct_guided, 1157)

    def test_the_status_is_read_from_the_status_column(self):
        python, react = self.parse(ROBUSTNESS_TABLE)
        self.assertEqual(python.guided_test_status, "passed")
        self.assertEqual(react.plain_test_status, "failed")
        self.assertEqual(react.guided_test_status, "error")

    def test_a_grown_table_does_not_shift_the_reading(self):
        """The scanner added a Files column, so a fixed index read the wrong cell."""
        grown = ROBUSTNESS_TABLE.replace(
            "| Project Submodule Target | Strategy Variant | Files | Lines |",
            "| Project Submodule Target | Strategy Variant | Files | Lines | Extra |",
        ).replace(
            "|---|---|:-:|:-:|:-:|:-:|:-:|",
            "|---|---|:-:|:-:|:-:|:-:|:-:|:-:|",
        ).replace("| 3 | 60 | 400 |", "| 3 | 60 | x | 400 |").replace(
            "| 4 | 197 | 1407 |", "| 4 | 197 | x | 1407 |"
        ).replace("| 2 | 11 | 65 |", "| 2 | 11 | x | 65 |").replace(
            "| 5 | 172 | 1157 |", "| 5 | 172 | x | 1157 |"
        )
        python, react = self.parse(grown)
        self.assertEqual(python.fct_guided, 1407)
        self.assertEqual(react.fct_guided, 1157)
        self.assertEqual(python.guided_score, 100)
        self.assertEqual(react.plain_test_status, "failed")

    def test_a_table_without_the_needed_columns_yields_nothing(self):
        broken = ROBUSTNESS_TABLE.replace("Robustness Score", "Note")
        self.assertEqual(self.parse(broken), [])


def make_report(**overrides):
    """Build one report for the gate tests."""
    projects = [
        table.ProjectResult(name, 30, 100, True, 400, 1200, 20000, 30000, "passed", "passed")
        for name in table.PROJECTS
    ]
    values = {
        "provider": "opencode",
        "agent_name": "opencode",
        "model_name": "ling-free",
        "skill_version": "3.7.0",
        "context_tools": "lccst-telemetry",
        "projects": projects,
        "token_state": table.MEASURED,
        "prompt_state": table.PROMPT_VERIFIED,
        "model_state": table.MODEL_VERIFIED,
        "harness_version": "opencode v2.0.18 (/usr/bin/opencode)",
    }
    values.update(overrides)
    return table.BenchmarkReport(**values)


class GateTest(unittest.TestCase):
    """A run may rank a model only when every check passes."""

    def test_a_clean_report_is_usable(self):
        self.assertTrue(make_report().is_usable)

    def test_unmeasured_tokens_are_rejected(self):
        self.assertFalse(make_report(token_state=table.NO_TOKENS).is_usable)
        self.assertFalse(make_report(token_state=table.UNSETTLED).is_usable)

    def test_unverified_prompt_is_rejected(self):
        self.assertFalse(make_report(prompt_state=table.PROMPT_UNVERIFIED).is_usable)
        self.assertFalse(make_report(prompt_state=table.PROMPT_UNKNOWN).is_usable)

    def test_wrong_model_is_rejected(self):
        self.assertFalse(make_report(model_state=table.MODEL_WRONG).is_usable)
        self.assertFalse(make_report(model_state=table.MODEL_UNVERIFIED).is_usable)

    def test_a_failing_subproject_is_rejected(self):
        report = make_report()
        report.projects[1].guided_score = 74
        self.assertFalse(report.is_usable)

    def test_an_error_subproject_is_rejected(self):
        report = make_report()
        report.projects[0].guided_test_status = "error"
        self.assertFalse(report.is_usable)

    def test_a_missing_subproject_is_rejected(self):
        report = make_report()
        report.projects = report.projects[:2]
        self.assertFalse(report.is_usable)

    def test_a_report_without_a_harness_version_is_rejected(self):
        """A run that names no harness version cannot be reproduced."""
        for value in ("not stated", "", "unknown",
                      "lccst-x is not on the path",
                      "harness at /tmp/x, version not reported"):
            report = make_report(harness_version=value)
            self.assertFalse(report.is_reproducible, f"rejected: {value!r}")
            self.assertFalse(report.is_usable, f"rejected: {value!r}")

    def test_a_named_harness_version_is_reproducible(self):
        self.assertTrue(make_report().is_reproducible)

    def test_the_reject_reason_names_the_missing_version(self):
        report = make_report(harness_version="not stated")
        self.assertIn("harness version", table.reject_reason(report))

    def test_the_short_version_keeps_only_the_version(self):
        self.assertEqual(
            table._short_version("opencode v2.0.18 (/usr/bin/opencode)"), "v2.0.18"
        )
        self.assertEqual(table._short_version("7.7.9"), "v7.7.9")
        self.assertEqual(table._short_version("not stated"), "not stated")
        self.assertEqual(table._short_version(""), "not stated")

    def test_pick_top_n_drops_an_unusable_report(self):
        unmeasured = make_report(token_state=table.NO_TOKENS)
        self.assertEqual(
            table.pick_top_n({"opencode-opencode-x": [((3, 7, 0), unmeasured)]}), []
        )

        clean = make_report()
        self.assertEqual(
            table.pick_top_n({"opencode-opencode-y": [((3, 7, 0), clean)]}), [clean]
        )

    def test_reject_reason_names_the_first_failure(self):
        self.assertIn("token", table.reject_reason(make_report(token_state=table.NO_TOKENS)))
        self.assertIn("model", table.reject_reason(make_report(model_state=table.MODEL_WRONG)))
        self.assertIn("token", table.reject_reason(make_report(prompt_state=table.PROMPT_UNVERIFIED)))

    def test_a_report_with_no_art_is_rejected_and_earns_no_art_term(self):
        """A run that measured no tokens must not gain the efficiency weight.

        The report holds no ART count, so the function returns `None` and the
        composite score adds no ART term. The run cannot reach the table,
        because the gate rejects a report without a measured token count.
        """
        without = make_report(token_state=table.NO_TOKENS)
        for project in without.projects:
            project.art_plain = 0
            project.art_guided = 0
        self.assertIsNone(table._art_overhead(without))
        self.assertFalse(without.is_usable)

        neutral = make_report()
        for project in neutral.projects:
            project.art_guided = project.art_plain
        # A missing count and a zero overhead score the same. The difference is
        # the gate, which rejects the missing count and keeps the zero overhead.
        self.assertAlmostEqual(
            table._composite_score(without), table._composite_score(neutral)
        )
        self.assertTrue(neutral.is_usable)

    def test_a_run_that_spent_nothing_outranks_one_that_did(self):
        """The ART term must still reward a cheap run."""
        cheap = make_report()
        for project in cheap.projects:
            project.art_guided = project.art_plain
        spent = make_report()
        self.assertGreater(
            table._composite_score(cheap), table._composite_score(spent)
        )


class ReportTextTest(unittest.TestCase):
    """The report must state every check under its header."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.workspace = Path(self.temp.name)
        for project in scanner.PROJECT_ORDER:
            for variant in scanner.VARIANTS:
                directory = self.workspace / project / variant
                directory.mkdir(parents=True)
                (directory / "main.py").write_text("def f() -> int:\n    return 1\n")
        (self.workspace / "prompt-token.txt").write_text("abc12345\n")

    def tearDown(self):
        self.temp.cleanup()

    def build(self, record, harness_version="opencode v2.0.18 (/usr/bin/opencode)"):
        original = scanner.WORKSPACE
        scanner.WORKSPACE = self.workspace
        try:
            results = scanner.collect_results(install=False)
            text = scanner.generate_markdown(
                results, "opencode", "opencode", "ling-free", "opencode/ling-free",
                "opencode-opencode-ling-free", "v3.7.0", record, True,
                harness_version,
            )
        finally:
            scanner.WORKSPACE = original
        return text

    def test_unverified_run_is_labelled(self):
        record = scanner.empty_telemetry()
        text = self.build(record)
        self.assertIn("**Prompt unverified.**", text)
        self.assertIn("**Model unverified.**", text)
        self.assertIn("**No runtime tokens.**", text)

    def test_a_measured_run_is_labelled(self):
        record = scanner.empty_telemetry()
        record["models"] = ["opencode/ling-free"]
        record["prompt_verified"] = True
        record["total_tokens"] = 500
        record["phases"] = [{"subproject": "react-timer", "variant": "plain", "settled": True}]
        record["breakdown"] = {"react-timer": {"plain": {
            "prompt_tokens": 100, "completion_tokens": 50, "cache_read_tokens": 350,
        }}}
        record["measured_breakdown"] = True
        text = self.build(record)
        self.assertIn("**Model verified.**", text)
        self.assertIn("**Prompt verified.**", text)
        self.assertIn("**Measured runtime tokens.**", text)

    def test_the_report_names_the_requested_model_id(self):
        text = self.build(scanner.empty_telemetry())
        self.assertIn("**Requested Model ID:** opencode/ling-free", text)

    def test_an_unknown_tool_list_is_not_reported_as_none(self):
        """A run with no phase must not claim that no server was active."""
        text = self.build(scanner.empty_telemetry())
        self.assertIn("**Active Ecosystem MCPs:** unknown", text)

    def test_a_recorded_tool_list_is_printed(self):
        record = scanner.empty_telemetry()
        record["active_mcps"] = ["lccst-telemetry"]
        text = self.build(record)
        self.assertIn("**Active Ecosystem MCPs:** lccst-telemetry", text)

    def test_a_wrong_model_is_flagged(self):
        record = scanner.empty_telemetry()
        record["models"] = ["kilo/stepfun/step-3.7-flash:free"]
        text = self.build(record)
        self.assertIn("**Wrong model.**", text)

    def test_a_parseable_report_passes_the_gate(self):
        """The scanner output must satisfy the gate of the README generator."""
        record = scanner.empty_telemetry()
        record["models"] = ["opencode/ling-free"]
        record["prompt_verified"] = True
        record["total_tokens"] = 500
        record["model_turns"] = 4
        record["phases"] = [
            {"subproject": p, "variant": v, "settled": True, "model": "opencode/ling-free"}
            for p in scanner.PROJECT_ORDER for v in scanner.VARIANTS
        ]
        record["breakdown"] = {
            p: {v: {"prompt_tokens": 10, "completion_tokens": 5, "cache_read_tokens": 20}
                for v in scanner.VARIANTS}
            for p in scanner.PROJECT_ORDER
        }
        record["measured_breakdown"] = True
        text = self.build(record)
        report = table.parse_report(text, "opencode-opencode-ling-free")
        self.assertIsNotNone(report)
        assert report is not None
        self.assertEqual(report.token_state, table.MEASURED)
        self.assertEqual(report.prompt_state, table.PROMPT_VERIFIED)
        self.assertEqual(report.model_state, table.MODEL_VERIFIED)
        self.assertEqual(len(report.projects), 3)
        self.assertEqual(
            report.harness_version, "opencode v2.0.18 (/usr/bin/opencode)"
        )
        self.assertTrue(report.is_reproducible)
        self.assertEqual(table._short_version(report.harness_version), "v2.0.18")

    def test_a_report_with_no_version_line_is_not_reproducible(self):
        text = self.build(scanner.empty_telemetry(), harness_version=None)
        report = table.parse_report(text, "opencode-opencode-ling-free")
        assert report is not None
        self.assertEqual(report.harness_version, "not stated")
        self.assertFalse(report.is_reproducible)

    def test_an_empty_workspace_never_passes(self):
        """A report of an empty workspace must not enter the table."""
        with tempfile.TemporaryDirectory() as empty:
            original = scanner.WORKSPACE
            scanner.WORKSPACE = Path(empty)
            try:
                results = scanner.collect_results(install=False)
                for project in scanner.PROJECT_ORDER:
                    for variant in scanner.VARIANTS:
                        self.assertEqual(results[project][variant]["file_count"], 0)
                        self.assertEqual(
                            results[project][variant]["test_result"]["status"], "error"
                        )
                text = scanner.generate_markdown(
                    results, "opencode", "opencode", "m", "opencode/m", "tag",
                    "v3.7.0", scanner.empty_telemetry(), True,
                )
            finally:
                scanner.WORKSPACE = original
        self.assertIn("`ERROR:", text)
        report = table.parse_report(text, "tag")
        self.assertIsNotNone(report)
        assert report is not None
        self.assertFalse(report.is_usable)


def main():
    """Run every test case of the file."""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
