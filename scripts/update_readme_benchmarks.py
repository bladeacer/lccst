#!/usr/bin/env python3
"""Update README.md with latest top-N benchmark results.

Scans playground/benchmarks/ for agent-model directories, parses the
latest benchmark report for each unique agent-model, picks the top N by
average guided robustness score, and regenerates the benchmark table in
README.md.
"""

from __future__ import annotations

import re
import sys
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

BENCH_DIR = Path("playground/benchmarks")
README_PATH = Path("README.md")
TOP_N = 5

ART_RE = re.compile(r"\*\*(\d+)\s+tokens?\*\*")
SCORE_RE = re.compile(r"\*\*(\d+)%\*\*")
VER_RE = re.compile(r"(\d+(?:\.\d+)*)")


@dataclass
class ProjectResult:
    """Single project's benchmark data within a report."""

    name: str
    plain_score: int
    guided_score: int
    test_passed: bool
    fct_plain: int
    fct_guided: int
    art_plain: int
    art_guided: int


@dataclass
class BenchmarkReport:
    """Parsed report for one agent-model-version combination."""

    agent_name: str
    model_name: str
    skill_version: str
    context_tools: str
    projects: list[ProjectResult] = field(default_factory=list)

    @property
    def avg_guided_score(self) -> float:
        if not self.projects:
            return 0.0
        return sum(p.guided_score for p in self.projects) / len(self.projects)

    @property
    def avg_plain_score(self) -> float:
        if not self.projects:
            return 0.0
        return sum(p.plain_score for p in self.projects) / len(self.projects)

    @property
    def total_art_guided(self) -> int:
        return sum(p.art_guided for p in self.projects)

    @property
    def total_fct_guided(self) -> int:
        return sum(p.fct_guided for p in self.projects)

    @property
    def total_art_plain(self) -> int:
        return sum(p.art_plain for p in self.projects)

    @property
    def total_fct_plain(self) -> int:
        return sum(p.fct_plain for p in self.projects)

    @property
    def heaviest_project(self) -> str:
        if not self.projects:
            return ""
        return max(self.projects, key=lambda p: p.art_guided).name

    @property
    def heaviest_fct_project(self) -> str:
        if not self.projects:
            return ""
        return max(self.projects, key=lambda p: p.fct_guided).name

    @property
    def passed_count(self) -> int:
        return sum(1 for p in self.projects if p.test_passed)


def parse_version(version_str: str) -> tuple[int, ...]:
    """Parse a version string like 'v2.7.0' into a sortable tuple."""
    m = VER_RE.search(version_str)
    if not m:
        return (0,)
    return tuple(int(p) for p in m.group(1).split("."))


def _parse_int(s: str) -> int:
    """Parse an int from a string, returning 0 on failure."""
    try:
        return int(s.replace(",", ""))
    except ValueError:
        return 0


def _fct_overhead(r: BenchmarkReport) -> float:
    """Return FCT overhead as a decimal (0.5 = 50% overhead)."""
    if r.total_fct_plain == 0:
        return 0.0
    return max((r.total_fct_guided - r.total_fct_plain) / r.total_fct_plain, 0)


def _art_overhead(r: BenchmarkReport) -> float:
    """Return ART overhead as a decimal (0.5 = 50% overhead)."""
    if r.total_art_plain == 0:
        return 0.0
    return max((r.total_art_guided - r.total_art_plain) / r.total_art_plain, 0)


def _parse_robustness_section(
    text: str,
) -> list[ProjectResult]:
    """Extract project results from the Robustness Metrics table."""
    sec = re.search(
        r"## Robustness Metrics.*?\n"
        r"(\|.*\n\|.*[-:| ]+\n.*?)(?=\n##|\Z)",
        text,
        re.DOTALL,
    )
    if not sec:
        return []

    table = sec.group(1).strip()
    lines = [
        l.strip() for l in table.split("\n") if l.strip().startswith("|")
    ]
    if len(lines) < 3:
        return []

    data_lines = lines[2:]
    projects: list[ProjectResult] = []
    i = 0

    while i < len(data_lines):
        cells = [c.strip() for c in data_lines[i].split("|")[1:-1]]
        if len(cells) < 6:
            i += 1
            continue

        proj_m = re.match(r"\*\*(.+?)\*\*", cells[0])
        if not proj_m:
            i += 1
            continue

        proj_name = proj_m.group(1)
        ps_m = SCORE_RE.search(cells[5])
        plain_score = int(ps_m.group(1)) if ps_m else 0
        fct_p = _parse_int(cells[3])

        if i + 1 >= len(data_lines):
            break

        g_cells = [c.strip() for c in data_lines[i + 1].split("|")[1:-1]]
        if len(g_cells) < 6:
            i += 1
            continue

        gs_m = SCORE_RE.search(g_cells[5])
        guided_score = int(gs_m.group(1)) if gs_m else 0
        fct_g = _parse_int(g_cells[3])
        test_passed = "PASSED" in g_cells[4].upper()

        projects.append(
            ProjectResult(
                name=proj_name,
                plain_score=plain_score,
                guided_score=guided_score,
                test_passed=test_passed,
                fct_plain=fct_p,
                fct_guided=fct_g,
                art_plain=0,
                art_guided=0,
            )
        )
        i += 2

    return projects


def _fill_art_values(
    text: str, projects: list[ProjectResult]
) -> None:
    """Fill ART values from the Runtime Cost Partitioning table."""
    sec = re.search(
        r"## Runtime Cost Partitioning.*?\n"
        r"(\|.*\n\|.*[-:| ]+\n.*?)(?=\n##|\Z)",
        text,
        re.DOTALL,
    )
    if not sec:
        return

    table = sec.group(1).strip()
    lines = [
        l.strip() for l in table.split("\n") if l.strip().startswith("|")
    ]
    if len(lines) < 3:
        return

    data_lines = lines[2:]
    art_data: dict[str, dict[str, int]] = {}

    for line in data_lines:
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) < 5:
            continue
        proj_name = cells[0]
        var = cells[1].lower()
        art_m = ART_RE.search(cells[4])
        if art_m:
            art = int(art_m.group(1))
            key = "plain" if "plain" in var else "guided"
            art_data.setdefault(proj_name, {})[key] = art

    for p in projects:
        pname = p.name
        if pname in art_data:
            p.art_plain = art_data[pname].get("plain", 0)
            p.art_guided = art_data[pname].get("guided", 0)
        else:
            for k, v in art_data.items():
                if k.lower() == pname.lower():
                    p.art_plain = v.get("plain", 0)
                    p.art_guided = v.get("guided", 0)
                    break


def parse_report(text: str, agent_tag: str) -> BenchmarkReport | None:
    """Parse a benchmark report markdown file into structured data."""
    agent_m = re.search(
        r"\*\*Agent Configuration:\*\*\s*(\S+)", text
    )
    skill_m = re.search(
        r"\*\*Skill Protocol Engine:\*\*\s*(.+?)(?:\s*\*|$)",
        text,
    )
    tools_m = re.search(
        r"\*\*Active Ecosystem MCPs:\*\*\s*`(.+?)`", text
    )
    if not agent_m:
        return None

    parts = agent_tag.split("-", 1)
    agent_name = parts[0] if len(parts) == 2 else agent_tag
    model_name = parts[1] if len(parts) == 2 else ""
    skill_version = skill_m.group(1).strip().lstrip("v") if skill_m else ""
    context_tools = tools_m.group(1) if tools_m else ""

    projects = _parse_robustness_section(text)
    if not projects:
        return None

    _fill_art_values(text, projects)

    return BenchmarkReport(
        agent_name=agent_name,
        model_name=model_name,
        skill_version=skill_version,
        context_tools=context_tools,
        projects=projects,
    )


def get_agent_reports(
) -> dict[str, list[tuple[tuple[int, ...], BenchmarkReport]]]:
    """Scan benchmark dirs and group reports by agent-model."""
    reports: dict[
        str, list[tuple[tuple[int, ...], BenchmarkReport]]
    ] = {}

    for agent_dir in sorted(BENCH_DIR.iterdir()):
        if not agent_dir.is_dir() or agent_dir.name.startswith("."):
            continue
        if agent_dir.name in (
            "mcp-telemetry", "__pycache__", ".venv"
        ):
            continue

        agent_tag = agent_dir.name
        for report_file in sorted(
            agent_dir.glob("benchmark-report*.md")
        ):
            text = report_file.read_text(encoding="utf-8")
            report = parse_report(text, agent_tag)
            if report is None:
                continue
            ver = parse_version(report.skill_version)
            reports.setdefault(agent_tag, []).append((ver, report))

    return reports


def pick_top_n(
    reports_map: dict[
        str, list[tuple[tuple[int, ...], BenchmarkReport]]
    ],
    n: int = 3,
) -> list[BenchmarkReport]:
    """Pick top N agent-models by performance and token efficiency."""
    latest: list[BenchmarkReport] = []
    for versions in reports_map.values():
        if not versions:
            continue
        versions.sort(key=lambda x: x[0], reverse=True)
        latest.append(versions[0][1])

    if not latest:
        return []

    max_guided = max(r.avg_guided_score for r in latest) or 1
    max_plain = max(r.avg_plain_score for r in latest) or 1
    max_fct_oh = max(_fct_overhead(r) for r in latest) or 1
    max_art_oh = max(_art_overhead(r) for r in latest) or 1

    def _composite(r: BenchmarkReport) -> float:
        guided_norm = r.avg_guided_score / max_guided
        plain_norm = r.avg_plain_score / max_plain
        pass_rate = r.passed_count / max(len(r.projects), 1)
        fct_penalty = _fct_overhead(r) / max_fct_oh
        art_penalty = _art_overhead(r) / max_art_oh
        return (
            guided_norm * 40
            + plain_norm * 10
            + pass_rate * 10
            - fct_penalty * 20
            - art_penalty * 20
        )

    latest.sort(key=_composite, reverse=True)
    return latest[:n]


def fmt_int(n: int) -> str:
    """Format integer with comma thousands separator."""
    return f"{n:,}"


def pct_delta(a: int, b: int) -> str:
    """Return signed percentage string from a to b. Returns '--' when the
    baseline is zero (the delta is undefined rather than zero)."""
    if a == 0:
        return "--"
    return f"{((b - a) / a * 100):+.0f}"


def _art_prose(ap: int, ag: int) -> str:
    """Return the ART overhead prose fragment, handling the zero-plain case."""
    if ap == 0:
        return "clean, zero-waste execution on the runtime tracking proxy"
    return f"{pct_delta(ap, ag)}% ART overhead"


def _wrap_benchmark_text(text: str, width: int = 80) -> str:
    """Wrap prose lines to *width* while leaving tables and headings intact."""
    out: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            out.append("")
        elif stripped.startswith(("|", "#")):
            out.append(line)
        elif stripped.startswith("> "):
            inner = line[line.index("> ") + 2 :]
            indent = "> "
            wrapped = textwrap.fill(
                inner, width=width - 2,
                break_long_words=False, break_on_hyphens=False,
            )
            for wl in wrapped.split("\n"):
                out.append(f"{indent}{wl}")
        elif stripped.startswith(("* ", "- ")):
            inner = line[line.index(stripped[:2]) + 2:]
            prefix = stripped[:2]
            wrapped = textwrap.fill(
                inner, width=width - 2,
                break_long_words=False, break_on_hyphens=False,
            )
            for j, wl in enumerate(wrapped.split("\n")):
                out.append(f"{prefix}{wl}" if j == 0 else f"  {wl}")
        else:
            if len(line) <= width:
                out.append(line)
            else:
                out.extend(
                    textwrap.fill(
                        line, width=width,
                        break_long_words=False, break_on_hyphens=False,
                    ).split("\n")
                )
    return "\n".join(out)


def generate_table(reports: list[BenchmarkReport]) -> str:
    """Generate the markdown benchmark table content."""
    parts: list[str] = []

    for report in reports:
        ver_label = report.skill_version
        heading = (
            f"#### {report.agent_name}-{report.model_name}: "
            f"skill version v{ver_label}"
        )
        parts.append(heading)
        parts.append("")

        header = (
            "| Agent Runtime | LLM Engine | Skill Layer "
            "| Context Tools (MCP) | Subproject "
            "| Plain Score | Skill-Guided | Test Status "
            "| FCT (Plain) | FCT (Guided) "
            "| ART (Plain) | ART (Guided) |"
        )
        sep = (
            "| :--- | :--- | :--- | :--- | :--- "
            "| :---: | :---: | :---: "
            "| :---: | :---: | :---: | :---: |"
        )
        parts.append(header)
        parts.append(sep)

        for proj in report.projects:
            status = "PASSED" if proj.test_passed else "FAILED"
            row = (
                f"| **{report.agent_name}** "
                f"| `{report.model_name}` "
                f"| `v{report.skill_version}` "
                f"| `{report.context_tools}` "
                f"| **{proj.name}** "
                f"| {proj.plain_score}/100 "
                f"| **{proj.guided_score}/100** "
                f"| {status} "
                f"| {fmt_int(proj.fct_plain)} "
                f"| {fmt_int(proj.fct_guided)} "
                f"| {fmt_int(proj.art_plain)} "
                f"| {fmt_int(proj.art_guided)} |"
            )
            parts.append(row)

        n = len(report.projects)
        avg_p = f"{report.avg_plain_score:.0f}"
        avg_g = f"{report.avg_guided_score:.0f}"
        passed = report.passed_count
        heavy_art = report.heaviest_project
        heavy_fct = report.heaviest_fct_project

        summary = (
            f"| **Summary** | | | | **Workspace Totals / Avg** "
            f"| **{avg_p}/100** | **{avg_g}/100** "
            f"| **{passed}/{n} Passed** "
            f"| **{fmt_int(report.total_fct_plain)}** "
            f"| **{fmt_int(report.total_fct_guided)}** "
            f"| **{fmt_int(report.total_art_plain)}** "
            f"| **{fmt_int(report.total_art_guided)}** |"
        )
        parts.append(summary)
        parts.append("")
        fp = report.total_fct_plain
        fg = report.total_fct_guided
        ap = report.total_art_plain
        ag = report.total_art_guided
        parts.append(
            f"> **Highest ART subproject:** `{heavy_art}` "
            f"consumed the most guided runtime tokens."
        )
        parts.append(
            f"> **Highest FCT subproject:** `{heavy_fct}` "
            f"consumed the most guided FCT tokens."
        )
        if ap == 0:
            parts.append(
                f"> Skill-guided implementation used **{pct_delta(fp, fg)}%** "
                f"more FCT while maintaining a clean, zero-waste baseline "
                f"execution loop on the runtime tracking proxy across the "
                f"workspace suite."
            )
        else:
            parts.append(
                f"> Skill-guided implementation used **{pct_delta(fp, fg)}%** "
                f"more FCT and **{pct_delta(ap, ag)}%** more ART "
                f"compared to plain implementation across the "
                f"workspace suite."
            )
        parts.append("")

    return "\n".join(parts)


def generate_comparison_table(reports: list[BenchmarkReport]) -> str:
    """Generate a cross-model comparison summary table."""
    if not reports:
        return ""

    parts = []
    headers = " | ".join(
        f"{r.agent_name}-{r.model_name}" for r in reports
    )
    parts.append(f"| Metric | {headers} |")
    parts.append("| --- |" + " --- |" * len(reports))

    rows_data = [
        ("Plain score", lambda r: f"{r.avg_plain_score:.0f}/100"),
        ("Guided score", lambda r: f"{r.avg_guided_score:.0f}/100"),
        ("Plain FCT", lambda r: fmt_int(r.total_fct_plain)),
        ("Guided FCT", lambda r: fmt_int(r.total_fct_guided)),
        ("FCT overhead", lambda r: pct_delta(r.total_fct_plain, r.total_fct_guided) + "%"),
        ("Plain ART", lambda r: fmt_int(r.total_art_plain)),
        ("Guided ART", lambda r: fmt_int(r.total_art_guided)),
        ("ART overhead", lambda r: (pct_delta(r.total_art_plain, r.total_art_guided) + "%") if r.total_art_plain != 0 else "N/A"),
        ("Tests passed", lambda r: f"{r.passed_count}/{len(r.projects)}"),
    ]

    for label, fn in rows_data:
        cells = " | ".join([label] + [fn(r) for r in reports])
        parts.append(f"| {cells} |")

    return "\n".join(parts)


def _fmt_backtick_tag(r: BenchmarkReport) -> str:
    return f"`{r.agent_name}-{r.model_name}`"


def _fmt_names(reports: list[BenchmarkReport]) -> str:
    tags = [_fmt_backtick_tag(r) for r in reports]
    if len(tags) == 1:
        return tags[0]
    if len(tags) == 2:
        return f"{tags[0]} and {tags[1]}"
    return ", ".join(tags[:-1]) + f", and {tags[-1]}"


def _fmt_intro_line(perfect: list[BenchmarkReport]) -> str:
    return (
        f"All evaluated models ({_fmt_names(perfect)}) achieved a perfect "
        f"guided score of 100/100 under the protocol. However, their "
        f"resource efficiency varied significantly:"
    )


def generate_summary_sections(reports: list[BenchmarkReport]) -> str:
    """Generate subsections: Token Efficiency, Least Token Usage, Overall Top Models."""
    if not reports:
        return ""

    perfect = [r for r in reports if r.avg_guided_score >= 100]
    imperfect = [r for r in reports if r.avg_guided_score < 100]
    best_plain = max(reports, key=lambda r: r.avg_plain_score)
    by_overhead = sorted(reports, key=_fct_overhead)
    most_efficient = by_overhead[0]

    heavy_counts: dict[str, int] = {}
    for r in reports:
        name = max(r.projects, key=lambda p: p.art_guided).name
        heavy_counts[name] = heavy_counts.get(name, 0) + 1
    majority_name = max(heavy_counts, key=heavy_counts.get)

    # ---- Token Efficiency ----
    te = []

    if perfect:
        if len(perfect) == 1:
            p = perfect[0]
            tag = f"{p.agent_name}-{p.model_name}"
            p_fct = pct_delta(p.total_fct_plain, p.total_fct_guided)
            p_art = pct_delta(p.total_art_plain, p.total_art_guided)
            te.append(
                f"Only {_fmt_backtick_tag(p)} achieved a perfect guided "
                f"score of 100/100. However, its resource efficiency "
                f"varied across subprojects:"
            )
            if p is best_plain:
                te.append(
                    f"* **{tag}** entered with the strongest plain baseline "
                    f"({p.avg_plain_score:.0f}/100) and reached perfection "
                    f"with {p_fct}% FCT and "
                    f"{_art_prose(p.total_art_plain, p.total_art_guided)}"
                    f" -- representing a genuine quality investment "
                    f"rather than recovery from failure."
                )
            else:
                te.append(
                    f"* **{tag}** achieved a perfect guided score with "
                    f"{p_fct}% FCT and "
                    f"{_art_prose(p.total_art_plain, p.total_art_guided)}."
                )
        else:
            te.append(_fmt_intro_line(perfect))

            best_pp = max(perfect, key=lambda r: r.avg_plain_score)
            bp_tag = f"{best_pp.agent_name}-{best_pp.model_name}"
            bp_fct = pct_delta(
                best_pp.total_fct_plain, best_pp.total_fct_guided
            )
            bp_art = pct_delta(
                best_pp.total_art_plain, best_pp.total_art_guided
            )
            te.append(
                f"* **{bp_tag}** entered with the strongest plain baseline "
                f"({best_pp.avg_plain_score:.0f}/100) and reached perfection "
                f"with {bp_fct}% FCT and "
                f"{_art_prose(best_pp.total_art_plain, best_pp.total_art_guided)}"
                f" -- representing a genuine quality investment "
                f"rather than recovery from failure."
            )

            eff_pp = min(perfect, key=_fct_overhead)
            if eff_pp is not best_pp:
                eff_tag = f"{eff_pp.agent_name}-{eff_pp.model_name}"
                eff_fct = pct_delta(
                    eff_pp.total_fct_plain, eff_pp.total_fct_guided
                )
                te.append(
                    f"* **{eff_tag}** was the most token-efficient at "
                    f"{eff_fct}% FCT with "
                    f"{_art_prose(eff_pp.total_art_plain, eff_pp.total_art_guided)}, "
                    f"though its lower plain baseline "
                    f"({eff_pp.avg_plain_score:.0f}/100) means the "
                    f"overhead figure partly reflects additional "
                    f"rounds of correction."
                )

            remaining = [
                r for r in perfect
                if r is not best_pp and r is not eff_pp
            ]
            for r in remaining:
                tag = f"{r.agent_name}-{r.model_name}"
                r_fct = pct_delta(
                    r.total_fct_plain, r.total_fct_guided
                )
                te.append(
                    f"* **{tag}** also delivered a perfect guided score, "
                    f"with {r_fct}% FCT and "
                    f"{_art_prose(r.total_art_plain, r.total_art_guided)}."
                )

    if imperfect:
        for r in imperfect:
            tag = f"{r.agent_name}-{r.model_name}"
            worst = min(r.projects, key=lambda p: p.guided_score)
            r_fct = pct_delta(
                r.total_fct_plain, r.total_fct_guided
            )
            art_prose = _art_prose(r.total_art_plain, r.total_art_guided)
            if r is most_efficient and r not in perfect:
                te.append(
                    f"* **{tag}** was the most token-efficient overall "
                    f"({r_fct}% FCT, {art_prose}) but scored "
                    f"{r.avg_guided_score:.0f}/100 "
                    f"(weakest: {worst.name} at {worst.guided_score}/100)."
                )
            else:
                te.append(
                    f"* **{tag}** scored {r.avg_guided_score:.0f}/100 "
                    f"(weakest: {worst.name} at {worst.guided_score}/100) "
                    f"with {r_fct}% FCT and {art_prose}."
                )

    te.append(
        f"Across all runners, `{majority_name}` remained "
        f"the most resource-intensive subproject."
    )

    # ---- Least Token Usage ----
    lowest_abs = min(
        reports,
        key=lambda r: (
            r.total_fct_plain + r.total_fct_guided
            + r.total_art_plain + r.total_art_guided
        ),
    )
    lowest_abs_total = (
        lowest_abs.total_fct_plain + lowest_abs.total_fct_guided
        + lowest_abs.total_art_plain + lowest_abs.total_art_guided
    )
    ltu = [
        f"{lowest_abs.agent_name}-{lowest_abs.model_name} consumed "
        f"the fewest tokens overall "
        f"({fmt_int(lowest_abs_total)}): "
        f"{fmt_int(lowest_abs.total_fct_plain)} plain FCT, "
        f"{fmt_int(lowest_abs.total_fct_guided)} guided FCT, "
        f"{fmt_int(lowest_abs.total_art_plain)} plain ART, and "
        f"{fmt_int(lowest_abs.total_art_guided)} guided ART."
    ]

    # ---- Overall Top Models ----
    otm = [
        "| Rank | Agent-Model | Plain Score | Guided Score "
        "| FCT Overhead | ART Overhead | Verdict |",
        "| ---: | :--- | :---: | :---: | :---: | :---: | :--- |",
    ]
    for i, r in enumerate(reports, 1):
        tag = f"{r.agent_name}-{r.model_name}"
        r_fct = pct_delta(r.total_fct_plain, r.total_fct_guided)
        r_art = pct_delta(r.total_art_plain, r.total_art_guided)
        fct_oh = _fct_overhead(r)
        art_oh = _art_overhead(r)
        pass_rate = r.passed_count / max(len(r.projects), 1)
        composite = (
            r.avg_guided_score * 0.4
            + r.avg_plain_score * 0.1
            + pass_rate * 10
            - fct_oh * 20
            - art_oh * 20
        )
        if i == 1:
            verdict = "Best overall"
        elif composite >= 30:
            verdict = "Strong competitor"
        else:
            verdict = "Quality concern"
        art_col = "N/A" if r.total_art_plain == 0 else f"{r_art}%"
        otm.append(
            f"| {i} | {tag} | {r.avg_plain_score:.0f}/100 "
            f"| {r.avg_guided_score:.0f}/100 | {r_fct}% | {art_col} "
            f"| {verdict} |"
        )

    sections = [
        "#### Token Efficiency\n\n" + "\n\n".join(te),
        "#### Least Token Usage\n\n" + "\n".join(ltu),
        "#### Overall Top Models\n\n" + "\n".join(otm),
    ]
    return "\n\n".join(sections)


def update_readme(table_content: str, count: int = 0) -> None:
    """Replace the benchmark table section in README.md."""
    text = README_PATH.read_text(encoding="utf-8")

    start_marker = "<!-- BENCHMARK_RESULTS_START -->"
    end_marker = "<!-- BENCHMARK_RESULTS_END -->"

    wrapped = f"{start_marker}\n\n{table_content}\n\n{end_marker}\n"

    if start_marker in text and end_marker in text:
        before = text.split(start_marker, 1)[0]
        after_full = text.split(end_marker, 1)[1]
        # Strip old legacy content (static comparison table + prose summary)
        # that used to sit after the end marker. Find the next heading.
        next_section = re.search(r"\n### ", after_full)
        if next_section:
            after = after_full[next_section.start():]
        else:
            after = after_full
        new_text = before + wrapped + after
    else:
        # Fallback: insert after the Verification Matrix heading
        section_m = re.search(
            r"(### Verification Matrix & Baseline Benchmarks\n"
            r".*?)(?=\n### |\Z)",
            text,
            re.DOTALL,
        )
        if section_m:
            new_text = (
                text[: section_m.start()]
                + "### Verification Matrix & Baseline Benchmarks\n\n"
                + "The baseline metrics below were captured using our "
                + "automated evaluation harness.\n\n"
                + wrapped
                + "\n"
                + text[section_m.end() :]
            )
        else:
            print("Error: Could not find benchmark section in README.",
                  file=sys.stderr)
            sys.exit(1)

    README_PATH.write_text(new_text, encoding="utf-8")
    print(f"Updated {README_PATH} with {count} agent-model table(s).")


def main() -> None:
    """Entry point."""
    reports_map = get_agent_reports()
    if not reports_map:
        print("No benchmark reports found.", file=sys.stderr)
        sys.exit(1)

    top = pick_top_n(reports_map)
    print(
        f"Found {len(reports_map)} agent-model(s), "
        f"selected top {len(top)} by performance."
    )
    for r in top:
        print(
            f"  {r.agent_name}-{r.model_name} "
            f"(v{r.skill_version}, "
            f"avg guided: {r.avg_guided_score:.0f}%)"
        )

    table = generate_table(top)
    comparison = generate_comparison_table(top)
    summary = generate_summary_sections(top)
    combined = f"{table}\n\n### Benchmark Summary\n\n{comparison}\n\n{summary}"
    combined = _wrap_benchmark_text(combined)
    update_readme(combined, len(top))


if __name__ == "__main__":
    main()
