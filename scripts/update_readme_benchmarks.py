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
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

BENCH_DIR = Path("playground/benchmarks")
README_PATH = Path("README.md")
TOP_N = 3

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
    max_fct = max(r.total_fct_guided for r in latest) or 1
    max_art = max(r.total_art_guided for r in latest) or 1

    latest.sort(
        key=lambda r: (
            r.avg_guided_score / max_guided * 50
            + r.avg_plain_score / max_guided * 10
            - (r.total_fct_guided / max_fct) * 20
            - (r.total_art_guided / max_art) * 20
        ),
        reverse=True,
    )
    return latest[:n]


def fmt_int(n: int) -> str:
    """Format integer with comma thousands separator."""
    return f"{n:,}"


def pct_delta(a: int, b: int) -> str:
    """Return signed percentage string from a to b."""
    if a == 0:
        return "0"
    return f"{((b - a) / a * 100):+.0f}"


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
        heavy = report.heaviest_project

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
            f"> **Highest ART subproject:** `{heavy}` "
            f"consumed the most guided runtime tokens."
        )
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
        ("ART overhead", lambda r: pct_delta(r.total_art_plain, r.total_art_guided) + "%"),
        ("Tests passed", lambda r: f"{r.passed_count}/{len(r.projects)}"),
    ]

    for label, fn in rows_data:
        cells = " | ".join([label] + [fn(r) for r in reports])
        parts.append(f"| {cells} |")

    return "\n".join(parts)


def generate_summary_paragraph(reports: list[BenchmarkReport]) -> str:
    """Generate interpretive summary paragraph from report data."""
    if not reports:
        return ""

    by_overhead = sorted(
        reports,
        key=lambda r: (
            (r.total_fct_guided - r.total_fct_plain) / r.total_fct_plain
            if r.total_fct_plain else 0
        ),
    )
    most_efficient = by_overhead[0]
    least_efficient = by_overhead[-1]

    best_plain = max(reports, key=lambda r: r.avg_plain_score)

    imperfect = [r for r in reports if r.avg_guided_score < 100]

    all_heavy = [
        (r, max(r.projects, key=lambda p: p.art_guided)) for r in reports
    ]
    overall_heaviest = max(all_heavy, key=lambda x: x[1].art_guided)

    me_name = f"{most_efficient.agent_name}-{most_efficient.model_name}"
    bp_name = f"{best_plain.agent_name}-{best_plain.model_name}"

    me_fct = pct_delta(most_efficient.total_fct_plain, most_efficient.total_fct_guided)
    me_art = pct_delta(most_efficient.total_art_plain, most_efficient.total_art_guided)
    bp_fct = pct_delta(best_plain.total_fct_plain, best_plain.total_fct_guided)
    bp_art = pct_delta(best_plain.total_art_plain, best_plain.total_art_guided)

    parts = []

    parts.append(
        f"{me_name} appears the most token-efficient at "
        f"{me_fct}/{me_art} overhead, but this "
        f"is misleading -- its plain scores "
        f"({most_efficient.avg_plain_score:.0f}/100) came at inflated "
        f"FCT ({fmt_int(most_efficient.total_fct_plain)}) and "
        f"ART ({fmt_int(most_efficient.total_art_plain)}) "
        f"compared to {bp_name} "
        f"({best_plain.avg_plain_score:.0f}/100, "
        f"{fmt_int(best_plain.total_fct_plain)}/"
        f"{fmt_int(best_plain.total_art_plain)}), indicating it choked "
        f"on the plain implementation and required more tokens to produce "
        f"worse code."
    )

    perfect_count = sum(1 for r in reports if r.avg_guided_score >= 100)
    total = len(reports)
    if perfect_count == total and total > 0:
        label = "three" if total == 3 else str(total)
        parts.append(
            f"The skill guide delivered a 100/100 score for all "
            f"{label}, but the overhead "
            f"percentage looks artificially low because the plain baseline "
            f"was already elevated by struggle rather than efficiency."
        )

    if best_plain.avg_guided_score >= 100:
        parts.append(
            f"{bp_name} had the "
            f"strongest plain baseline and reached "
            f"100/100 with a {bp_fct}/{bp_art} overhead that "
            f"represents genuine quality investment, not recovery from failure."
        )
    else:
        parts.append(
            f"{bp_name} had the "
            f"strongest plain baseline at "
            f"{best_plain.avg_plain_score:.0f}/100."
        )

    for r in imperfect:
        worst_proj = min(r.projects, key=lambda p: p.guided_score)
        r_fct = pct_delta(r.total_fct_plain, r.total_fct_guided)
        r_art = pct_delta(r.total_art_plain, r.total_art_guided)
        if len(imperfect) == 1:
            parts.append(
                f"{r.agent_name}-{r.model_name} "
                f"was the only model below 100/100 "
                f"({r.avg_guided_score:.0f}/100, with "
                f"{worst_proj.guided_score}/100 on "
                f"{worst_proj.name}) and incurred the highest overhead "
                f"({r_fct}/{r_art})."
            )
        else:
            parts.append(
                f"{r.agent_name}-{r.model_name} "
                f"scored {r.avg_guided_score:.0f}/100 "
                f"(lowest: {worst_proj.guided_score}/100 on "
                f"{worst_proj.name}) with {r_fct}/{r_art} overhead."
            )

    parts.append(
        f"{overall_heaviest[1].name} was the heaviest subproject "
        f"across all runners."
    )

    lowest_abs = min(
        reports,
        key=lambda r: r.total_fct_plain + r.total_fct_guided
        + r.total_art_plain + r.total_art_guided,
    )
    lowest_abs_total = (
        lowest_abs.total_fct_plain + lowest_abs.total_fct_guided
        + lowest_abs.total_art_plain + lowest_abs.total_art_guided
    )
    parts.append(
        f"{lowest_abs.agent_name}-{lowest_abs.model_name} "
        f"used the fewest total tokens "
        f"({fmt_int(lowest_abs.total_fct_plain)} FCT + "
        f"{fmt_int(lowest_abs.total_fct_guided)} guided FCT + "
        f"{fmt_int(lowest_abs.total_art_plain)} ART + "
        f"{fmt_int(lowest_abs.total_art_guided)} guided ART = "
        f"{fmt_int(lowest_abs_total)} total)."
    )

    classified_tags: list[str] = []
    decent = [
        r for r in reports
        if r.avg_guided_score >= 90
        and r.avg_guided_score == 100
        and r not in (most_efficient, lowest_abs)
    ]
    for r in decent:
        tag = f"{r.agent_name}-{r.model_name}"
        classified_tags.append(tag)
        r_fct = pct_delta(r.total_fct_plain, r.total_fct_guided)
        r_art = pct_delta(r.total_art_plain, r.total_art_guided)
        parts.append(
            f"{tag} is a decently competing "
            f"option ({r.avg_guided_score:.0f}/100 guided, "
            f"{r_fct}/{r_art} overhead)."
        )

    poor = [
        r for r in reports
        if r.avg_guided_score < 90
        or (r is least_efficient and r.avg_guided_score < 100)
    ]
    for r in poor:
        tag = f"{r.agent_name}-{r.model_name}"
        if tag in classified_tags:
            continue
        classified_tags.append(tag)
        r_fct = pct_delta(r.total_fct_plain, r.total_fct_guided)
        r_art = pct_delta(r.total_art_plain, r.total_art_guided)
        parts.append(
            f"{tag} is not worth using "
            f"({r.avg_guided_score:.0f}/100 guided, "
            f"{r_fct}/{r_art} overhead)."
        )

    return "\n\n".join(parts)


def update_readme(table_content: str) -> None:
    """Replace the benchmark table section in README.md."""
    text = README_PATH.read_text(encoding="utf-8")

    start_marker = "<!-- BENCHMARK_RESULTS_START -->"
    end_marker = "<!-- BENCHMARK_RESULTS_END -->"

    wrapped = f"{start_marker}\n\n{table_content}\n{end_marker}\n"

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
    print(f"Updated {README_PATH} with {TOP_N} agent-model table(s).")


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
    summary = generate_summary_paragraph(top)
    combined = f"{table}\n\n### Benchmark Summary\n\n{comparison}\n\n{summary}"
    update_readme(combined)


if __name__ == "__main__":
    main()
