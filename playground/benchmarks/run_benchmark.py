#!/usr/bin/env python3
"""Agent-agnostic benchmark: measures tokens, lines, features, and test results
for plain vs skill-guided implementations across all three projects.

The workspace folder is named ``provider-harness-model`` (e.g.
``opencode-zen-opencode-hy3-free``) so results can be compared across
providers, harnesses, and models.

Usage:
    python3 run_benchmark.py <provider-harness-model> \
        [--provider opencode-zen] [--harness opencode] [--model hy3-free] [--install-deps]
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

try:
    import tiktoken
except ImportError:
    if not any(a == "--uv" for a in sys.argv):
        try:
            subprocess.run(
                ["uv", "run", "python3", __file__, *sys.argv[1:], "--uv"],
                check=True, cwd=Path(__file__).resolve().parent,
            )
            sys.exit(0)
        except (FileNotFoundError, subprocess.CalledProcessError):
            pass
    ENCODER = None
else:
    ENCODER = tiktoken.get_encoding("cl100k_base")

if "--uv" in sys.argv:
    sys.argv.remove("--uv")

PLAYGROUND = Path(__file__).resolve().parent.parent

# Workspace of the run. The clean room sits outside the repository, so the
# default below only applies to an older layout.
WORKSPACE = PLAYGROUND

PROJECTS = {
    "python-http-server": {
        "patterns": ["plain/*.py", "skill-guided/*.py", "skill-guided/tests/*.py"],
        "plain_prefix": "plain",
        "guided_prefix": "skill-guided",
        "test_cmd_plain": None,
        "test_cmd_guided": ["uv", "run", "python3", "-m", "pytest", "tests/", "-v", "--tb=short"],
        "test_env_guided": {"DISABLE_RATE_LIMIT": "1", "VIRTUAL_ENV": ""},
        "test_cwd_guided": "skill-guided",
    },
    "react-timer": {
        "patterns": ["plain/*.html", "plain/*.js", "skill-guided/src/*.tsx", "skill-guided/tests/*.tsx"],
        "plain_prefix": "plain",
        "guided_prefix": "skill-guided",
        "test_cmd_plain": None,
        "test_cmd_guided": ["npx", "--no-install", "jest", "--no-coverage"],
        "test_cwd_guided": "skill-guided",
        "test_env_guided": {},
    },
    "go-login-crud": {
        "patterns": ["plain/*.go", "skill-guided/cmd/server/*.go", "skill-guided/internal/**/*.go", "skill-guided/tests/*.go"],
        "plain_prefix": "plain",
        "guided_prefix": "skill-guided",
        "test_cmd_plain": None,
        "test_cmd_guided": ["go", "test", "./tests/", "-v"],
        "test_cwd_guided": "skill-guided",
        "test_env_guided": {},
    },
}

PROJECT_PROFILES = {
    "python-http-server": {"max_typing": 17, "max_security": 17, "max_error_handling": 16},
    "react-timer":        {"max_typing": 17, "max_security": 0,  "max_error_handling": 0},
    "go-login-crud":      {"max_typing": 17, "max_security": 17, "max_error_handling": 16},
}


def estimate_tokens(text):
    if ENCODER: 
        return len(ENCODER.encode(text))
    tokens_by_punctuation = len(re.findall(r"[{}()\[\].,:;+\-*/%&|^~=<>!]", text))
    words = len(re.findall(r"\b\w+\b", text))
    return words + (tokens_by_punctuation // 2)


def analyze_code_features(text):
    return {
        "has_typing": bool(re.search(r"(interface\s+\w+|type\s+\w+|:\s*(int|str|bool|float|dict|List|Optional|def\s+\w+\(.*?:\s*\w+)|->\s*\w+)", text)),
        "has_security": bool(re.search(r"(auth|jwt|hash|sha256|bcrypt|crypto|sanitize|escape|rate.limit|password|token|session)", text, re.IGNORECASE)),
        "has_error_handling": bool(re.search(r"(try\s*{|except\s+\w+:|if\s+err\s*!=\s*nil|raise\s+\w+|return.*err)", text)),
        "has_test_assertion": bool(re.search(r"(assert|expect|t\.Fatal|t\.Error|should\.)", text)),
    }


def measure_files(project_dir, patterns):
    full_dir = WORKSPACE / project_dir
    files = sorted(set(f for pat in patterns for f in full_dir.glob(pat)))

    result = {"plain": [], "guided": [], "plain_totals": {}, "guided_totals": {}}
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue
        rel = f.relative_to(full_dir)
        group = "guided" if rel.parts[0] == "skill-guided" else "plain"
        result[group].append({
            "file": str(rel),
            "lines": len(text.splitlines()),
            "chars": len(text),
            "tokens": estimate_tokens(text),
            "features": analyze_code_features(text),
        })

    for grp in ("plain", "guided"):
        items = result[grp]
        result[f"{grp}_totals"] = {
            "file_count": len(items),
            "total_lines": sum(i["lines"] for i in items),
            "total_chars": sum(i["chars"] for i in items),
            "total_tokens": sum(i["tokens"] for i in items),
            "features_aggregate": {
                k: any(i["features"][k] for i in items)
                for k in ("has_typing", "has_security", "has_error_handling", "has_test_assertion")
            },
        }
    return result


def run_tests(project_dir, test_cmd, test_cwd=None, test_env=None):
    if test_cmd is None: 
        return {"exit_code": 0, "passed": True, "stdout": "", "stderr": ""}
    full_dir = WORKSPACE / project_dir
    cwd = str(full_dir / test_cwd) if test_cwd else str(full_dir)
    env = {**os.environ, **(test_env or {})}
    env.pop("VIRTUAL_ENV", None)
    try:
        res = subprocess.run(test_cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=120)
        return {
            "exit_code": res.returncode,
            "passed": res.returncode == 0,
            "stdout": res.stdout[-3000:] if len(res.stdout) > 3000 else res.stdout,
            "stderr": res.stderr[-2000:] if len(res.stderr) > 2000 else res.stderr,
        }
    except Exception as e:
        return {"exit_code": -1, "passed": False, "stdout": "", "stderr": str(e)}


def compute_robustness_score(test_result, totals, project_name):
    score = 50 if test_result["passed"] else (5 if test_result["exit_code"] == -1 else 15)
    profile = PROJECT_PROFILES.get(project_name, {"max_typing": 17, "max_security": 17, "max_error_handling": 16})
    feat = totals["features_aggregate"]
    
    if feat["has_typing"]: score += profile["max_typing"]
    if feat["has_security"]: score += profile["max_security"]
    if feat["has_error_handling"]: score += profile["max_error_handling"]

    max_available = 50 + profile["max_typing"] + profile["max_security"] + profile["max_error_handling"]
    return min(int(score / max_available * 100), 100)


def detect_tool_versions():
    versions = {}
    for cmd, flag, key in [("python3", "--version", "python"), ("pnpm", "--version", "pnpm"), ("go", "version", "go")]:
        try:
            r = subprocess.run([cmd, flag], capture_output=True, text=True, timeout=10)
            raw = r.stdout.strip() or r.stderr.strip()
            if key == "go" and raw.startswith("go version go"): 
                raw = raw.split(" ")[2].lstrip("go")
            elif key == "python" and raw.startswith("Python "): 
                raw = raw.split(" ")[1]
            versions[key] = raw
        except Exception: 
            versions[key] = "not found"
    return versions


def extract_skill_version():
    skill_path = WORKSPACE / "SKILL.md"
    if not skill_path.is_file():
        skill_path = PLAYGROUND.parent / "SKILL.md"
    if skill_path.is_file():
        try:
            content = skill_path.read_text()
            m = re.search(r'version:\s*"(\d+\.\d+(?:\.\d+)?)"', content)
            if m:
                return f"v{m.group(1)}"
            m = re.search(r"v(\d+\.\d+(?:\.\d+)?)", content)
            if m:
                return f"v{m.group(1)}"
        except Exception:
            pass
    return "unknown"


def load_merged_telemetry(agent_tag):
    """Discovers and merges token metrics across all possible file locations."""
    art_data = {
        "total_prompt_tokens": 0, "total_completion_tokens": 0,
        "total_cache_read_tokens": 0, "total_tokens": 0,
        "model_turns": 0, "active_mcps": [],
        "breakdown": {}, "phases": 0, "unsettled_phases": 0,
        "measured_breakdown": False
    }

    search_paths = [
        PLAYGROUND / "benchmarks" / "runtime-telemetry.json",
        WORKSPACE / "runtime-telemetry.json",
        PLAYGROUND / agent_tag / "runtime-telemetry.json"
    ]
    agent_dir = PLAYGROUND / agent_tag
    if agent_dir.exists():
        search_paths.extend(list(agent_dir.rglob("runtime-telemetry.json")))

    for path_loc in sorted(set(search_paths)):
        if not path_loc.is_file():
            continue
        try:
            loaded = json.loads(path_loc.read_text())
            if not isinstance(loaded, dict):
                continue
            totals = [
                "total_prompt_tokens", "total_completion_tokens",
                "total_cache_read_tokens", "total_tokens", "model_turns"
            ]
            for k in totals:
                if k in loaded and isinstance(loaded[k], (int, float)):
                    art_data[k] += int(loaded[k])
            if "active_mcps" in loaded and isinstance(loaded["active_mcps"], list):
                art_data["active_mcps"] = list(set(art_data["active_mcps"] + loaded["active_mcps"]))
            art_data["phases"] += count_phases(loaded)
            art_data["unsettled_phases"] += count_unsettled_phases(loaded)
            if "breakdown" in loaded and isinstance(loaded["breakdown"], dict):
                loaded_breakdown = loaded["breakdown"]
                for proj, variants in loaded_breakdown.items():
                    if not isinstance(variants, dict):
                        continue
                    if proj not in art_data["breakdown"]:
                        art_data["breakdown"][proj] = {}
                    for variant, metrics in variants.items():
                        if not isinstance(metrics, dict):
                            continue
                        if variant not in art_data["breakdown"][proj]:
                            art_data["breakdown"][proj][variant] = {
                                "prompt_tokens": 0, "completion_tokens": 0, "cache_read_tokens": 0
                            }
                        step = art_data["breakdown"][proj][variant]
                        step["prompt_tokens"] += metrics.get("prompt_tokens", 0)
                        step["completion_tokens"] += metrics.get("completion_tokens", 0)
                        step["cache_read_tokens"] += metrics.get("cache_read_tokens", 0)
        except Exception:
            pass

    art_data["measured_breakdown"] = any(
        sum(step.values()) > 0
        for variants in art_data["breakdown"].values()
        if isinstance(variants, dict)
        for step in variants.values()
        if isinstance(step, dict)
    )

    return art_data


def count_phases(loaded):
    """Count the phase records of one telemetry file."""
    phases = loaded.get("phases")
    return len(phases) if isinstance(phases, list) else 0


def count_unsettled_phases(loaded):
    """Count the phase records that no settle step has measured yet."""
    phases = loaded.get("phases")
    if not isinstance(phases, list):
        return 0
    return sum(
        1 for phase in phases if isinstance(phase, dict) and not phase.get("settled", False)
    )


def synthesize_missing_breakdown(art_data, results):
    """Allocates global metrics across subprojects based on code payload sizes.

    The allocation is an estimate. It runs only when no phase recorded a count,
    so the report must label the rows as estimated.
    """
    if art_data.get("measured_breakdown") or art_data["total_tokens"] <= 0:
        return

    total_fct = sum(r["plain"]["total_tokens"] + r["guided"]["total_tokens"] for r in results.values())
    if total_fct <= 0:
        return

    synthetic = {}
    rem_prompt = art_data["total_prompt_tokens"]
    rem_completion = art_data["total_completion_tokens"]
    rem_cache = art_data["total_cache_read_tokens"]
    proj_keys = list(PROJECTS.keys())

    for p_idx, proj in enumerate(proj_keys):
        synthetic[proj] = {"plain": {}, "skill-guided": {}}
        variants = [("plain", "plain"), ("skill-guided", "guided")]

        for v_idx, (var_name, res_key) in enumerate(variants):
            share = results[proj][res_key]["total_tokens"] / total_fct
            if p_idx == len(proj_keys) - 1 and v_idx == len(variants) - 1:
                p_tok = rem_prompt
                c_tok = rem_completion
                k_tok = rem_cache
            else:
                p_tok = int(art_data["total_prompt_tokens"] * share)
                c_tok = int(art_data["total_completion_tokens"] * share)
                k_tok = int(art_data["total_cache_read_tokens"] * share)
                rem_prompt -= p_tok
                rem_completion -= c_tok
                rem_cache -= k_tok

            synthetic[proj][var_name] = {
                "prompt_tokens": p_tok,
                "completion_tokens": c_tok,
                "cache_read_tokens": k_tok
            }

    art_data["breakdown"] = synthetic
    art_data["estimated_breakdown"] = True


def parse_agent_identity(agent_tag, provider, harness, model):
    """Resolve the provider/harness/model triple from explicit flags or the
    agent-tag directory name (``provider-harness-model``)."""
    prefix = f"{provider}-{harness}-"
    if model is None:
        if agent_tag.startswith(prefix):
            model = agent_tag[len(prefix):]
        else:
            model = agent_tag
    return provider, harness, model


def main():
    parser = argparse.ArgumentParser(
        description="Agent-agnostic benchmark: measures tokens, lines, features, "
                    "and test results for plain vs skill-guided implementations."
    )
    parser.add_argument("agent_tag", help="Agent directory name (provider-harness-model)")
    parser.add_argument("--provider", default="opencode-zen", help="Model provider, e.g. opencode-zen")
    parser.add_argument("--harness", default="opencode", help="Agent/harness name, e.g. opencode")
    parser.add_argument("--model", default=None, help="Model name, e.g. hy3-free (derived from tag if omitted)")
    parser.add_argument("--workspace", default=None, help="Workspace of the run (defaults to the agent directory)")
    parser.add_argument("--install-deps", action="store_true", help="Install pnpm deps for react-timer")
    args = parser.parse_args()

    provider, harness, model = parse_agent_identity(
        args.agent_tag, args.provider, args.harness, args.model
    )
    agent_tag = args.agent_tag

    global WORKSPACE
    WORKSPACE = Path(args.workspace).resolve() if args.workspace else PLAYGROUND / agent_tag
    if not WORKSPACE.is_dir():
        print(f"Workspace not found: {WORKSPACE}")
        sys.exit(1)
    agent_dir = WORKSPACE

    if args.install_deps:
        react_dir = agent_dir / "react-timer" / "skill-guided"
        if (react_dir / "package.json").exists() and not (react_dir / "node_modules").exists():
            print("Installing pnpm dependencies for react-timer...")
            subprocess.run(["pnpm", "install"], cwd=str(react_dir), capture_output=True, text=True, timeout=120)

    results = {}
    for proj_name, proj_info in PROJECTS.items():
        proj_dir = proj_name
        measured = measure_files(proj_dir, proj_info["patterns"])
        test_res = run_tests(proj_dir, proj_info["test_cmd_guided"], proj_info.get("test_cwd_guided"), proj_info.get("test_env_guided"))
        plain_res = {"passed": False, "exit_code": 1, "stdout": "", "stderr": ""}

        results[proj_name] = {
            "plain": {**measured["plain_totals"], "files": measured["plain"], "robustness": compute_robustness_score(plain_res, measured["plain_totals"], proj_name), "test_result": None},
            "guided": {**measured["guided_totals"], "files": measured["guided"], "robustness": compute_robustness_score(test_res, measured["guided_totals"], proj_name), "test_result": test_res},
        }

    skill_ver = extract_skill_version()
    art_data = load_merged_telemetry(agent_tag)
    synthesize_missing_breakdown(art_data, results)

    report_content = generate_markdown(results, provider, harness, model, agent_tag, skill_ver, art_data)
    report_dir = PLAYGROUND / "benchmarks" / agent_tag
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = report_dir / f"benchmark-report-{skill_ver}.md"
    report_file.write_text(report_content)
    
    old_file = report_dir / "benchmark-report.md"
    if old_file.exists():
        old_file.unlink()

    print(f"\nReport generated and archived cleanly at: {report_file}")


def generate_markdown(results, provider, harness, model, agent_tag, skill_ver, art_data):
    total_plain_tokens = sum(r["plain"]["total_tokens"] for r in results.values())
    total_guided_tokens = sum(r["guided"]["total_tokens"] for r in results.values())
    total_plain_lines = sum(r["plain"]["total_lines"] for r in results.values())
    total_guided_lines = sum(r["guided"]["total_lines"] for r in results.values())
    
    token_diff = total_guided_tokens - total_plain_tokens
    token_pct = (token_diff / max(total_plain_tokens, 1)) * 100
    tool_versions = detect_tool_versions()
    mcp_string = ", ".join(art_data.get("active_mcps", [])) if art_data.get("active_mcps") else "None detected"

    unsettled = art_data.get("unsettled_phases", 0)
    if unsettled > 0:
        art_source = (
            f"> **Unsettled phases.** {unsettled} of "
            f"{art_data.get('phases', 0)} phases hold no count. Run the settle "
            "step, which is `make telemetry-settle`, before this report."
        )
    elif art_data.get("measured_breakdown"):
        art_source = (
            "> **Measured runtime tokens.** The settle step read every count from "
            "the store of the host that ran the phase."
        )
    elif art_data.get("estimated_breakdown"):
        art_source = (
            "> **Estimated runtime tokens.** No phase recorded a count, so the "
            "rows below allocate the workspace total by code payload size. Do not "
            "use them as measurements."
        )
    else:
        art_source = (
            "> **No runtime tokens.** The host store held no counts for this "
            "workspace."
        )

    md = f"""# LCCST Playground Benchmark Report

**Provider:** {provider}
**Harness:** {harness}
**Model:** {model}
**Agent Tag:** {agent_tag}
**Active Ecosystem MCPs:** `{mcp_string}`
**Skill Protocol Engine:** {skill_ver}
**Python Runtime:** {tool_versions['python']} | **pnpm:** {tool_versions['pnpm']} | **Go:** {tool_versions['go']}

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | {total_plain_tokens} | {total_guided_tokens} | +{token_diff} ({token_pct:+.0f}%) |
| Total Program Lines | {total_plain_lines} | {total_guided_lines} | +{total_guided_lines - total_plain_lines} |
| Agent Runtime Tokens (ART) | {art_data.get('total_tokens', 0)} total tokens | {art_data.get('model_turns', 0)} model turns over {art_data.get('phases', 0)} phases | -- |

{art_source}

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
"""
    breakdown = art_data.get("breakdown", {})
    for proj in ["python-http-server", "react-timer", "go-login-crud"]:
        proj_data = breakdown.get(proj, {})
        for variant in ["plain", "skill-guided"]:
            v_data = proj_data.get(
                variant, {"prompt_tokens": 0, "completion_tokens": 0, "cache_read_tokens": 0}
            )
            p_tok = v_data.get("prompt_tokens", 0)
            c_tok = v_data.get("completion_tokens", 0)
            k_tok = v_data.get("cache_read_tokens", 0)
            md += (
                f"| {proj} | {variant} | {p_tok} | {c_tok} | {k_tok} | "
                f"**{p_tok + c_tok + k_tok} tokens** |\n"
            )

    md += """\n## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
"""
    for name, data in results.items():
        g_status = "PASSED" if data["guided"]["test_result"]["passed"] else f"FAILED (code {data['guided']['test_result']['exit_code']})"
        md += f"""| **{name}** | Plain Strategy | {data['plain']['total_lines']} | {data['plain']['total_tokens']} | `Skipped` | **{data['plain']['robustness']}%** |\n"""
        md += f"""| | Skill-Guided | {data['guided']['total_lines']} | {data['guided']['total_tokens']} | `{g_status}` | **{data['guided']['robustness']}%** |\n"""

    md += "\n## Feature Matrix Completeness\n\n"
    md += "| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |\n"
    md += "|---|---|:-:|:-:|:-:|:-:|\n"

    for name, data in results.items():
        for var in ("plain", "guided"):
            feat = data[var]["features_aggregate"]
            t = "(+)" if feat["has_typing"] else "(-)"
            s = "(+)" if feat["has_security"] else "(-)"
            e = "(+)" if feat["has_error_handling"] else "(-)"
            a = "(+)" if feat["has_test_assertion"] else "(-)"
            md += f"| {name} | {var.capitalize()} | {t} | {s} | {e} | {a} |\n"

    return md


if __name__ == "__main__":
    main()
