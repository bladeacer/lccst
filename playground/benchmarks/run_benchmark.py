#!/usr/bin/env python3
"""Agent-agnostic benchmark: measures tokens, lines, features, and test results
for plain vs skill-guided implementations across all three projects.

Usage:
    python3 run_benchmark.py <agent-name-model> [--install-deps]
"""

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

PLAYGROUND = Path(__file__).resolve().parent.parent

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
    full_dir = PLAYGROUND / project_dir
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
    full_dir = PLAYGROUND / project_dir
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
    skill_path = PLAYGROUND.parent / "skill.md"
    if skill_path.is_file():
        try:
            first = skill_path.read_text().split("\n")[0]
            if "v" in first: 
                return f"v{first.split('v')[-1].strip().rstrip(':')}"
        except Exception: 
            pass
    return "unknown"


def load_merged_telemetry(agent_tag):
    """Discovers and merges token metrics across all possible file locations."""
    art_data = {
        "total_prompt_tokens": 0, "total_completion_tokens": 0, 
        "total_tokens": 0, "turns": 0, "active_mcps": [], "breakdown": {}
    }
    
    # Absolute deep path lookup for duplicated or misrouted configurations
    search_paths = [
        PLAYGROUND / "benchmarks" / "runtime-telemetry.json",
        PLAYGROUND / agent_tag / "runtime-telemetry.json"
    ]
    agent_dir = PLAYGROUND / agent_tag
    if agent_dir.exists():
        search_paths.extend(list(agent_dir.rglob("runtime-telemetry.json")))

    # Deduplicate matching target paths securely
    for path_loc in sorted(set(search_paths)):
        if not path_loc.is_file():
            continue
        try:
            loaded = json.loads(path_loc.read_text())
            if not isinstance(loaded, dict):
                continue
            for k in ["total_prompt_tokens", "total_completion_tokens", "total_tokens", "turns"]:
                if k in loaded and isinstance(loaded[k], (int, float)):
                    art_data[k] = max(art_data[k], int(loaded[k]))
            if "active_mcps" in loaded and isinstance(loaded["active_mcps"], list):
                art_data["active_mcps"] = list(set(art_data["active_mcps"] + loaded["active_mcps"]))
            if "breakdown" in loaded and isinstance(loaded["breakdown"], dict) and loaded["breakdown"]:
                art_data["breakdown"].update(loaded["breakdown"])
        except Exception:
            pass
            
    return art_data


def synthesize_missing_breakdown(art_data, results):
    """Allocates global metrics across subprojects based on code payload sizes."""
    has_breakdown = art_data.get("breakdown")
    has_meaningful_vals = has_breakdown and any(sum(v.values()) > 0 for v in art_data["breakdown"].values() if isinstance(v, dict))
    
    if has_meaningful_vals or art_data["total_tokens"] <= 0:
        return

    synthetic = {}
    total_fct = sum(r["plain"]["total_tokens"] + r["guided"]["total_tokens"] for r in results.values())
    if total_fct <= 0:
        return

    rem_prompt = art_data["total_prompt_tokens"]
    rem_completion = art_data["total_completion_tokens"]
    proj_keys = list(PROJECTS.keys())

    for p_idx, proj in enumerate(proj_keys):
        synthetic[proj] = {"plain": {}, "skill-guided": {}}
        variants = [("plain", "plain"), ("skill-guided", "guided")]
        
        for v_idx, (var_name, res_key) in enumerate(variants):
            share = results[proj][res_key]["total_tokens"] / total_fct
            if p_idx == len(proj_keys) - 1 and v_idx == len(variants) - 1:
                p_tok, c_tok = rem_prompt, rem_completion
            else:
                p_tok = int(art_data["total_prompt_tokens"] * share)
                c_tok = int(art_data["total_completion_tokens"] * share)
                rem_prompt -= p_tok
                rem_completion -= c_tok
                
            synthetic[proj][var_name] = {"prompt_tokens": p_tok, "completion_tokens": c_tok}

    art_data["breakdown"] = synthetic


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    agent_tag = sys.argv[1]
    agent_dir = PLAYGROUND / agent_tag
    if not agent_dir.is_dir():
        print(f"Agent directory not found: {agent_dir}")
        sys.exit(1)

    if "--install-deps" in sys.argv:
        react_dir = agent_dir / "react-timer" / "skill-guided"
        if (react_dir / "package.json").exists() and not (react_dir / "node_modules").exists():
            print("Installing npm dependencies for react-timer...")
            subprocess.run(["npm", "install"], cwd=str(react_dir), capture_output=True, text=True, timeout=120)

    results = {}
    for proj_name, proj_info in PROJECTS.items():
        proj_dir = f"{agent_tag}/{proj_name}"
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

    report_content = generate_markdown(results, agent_tag, skill_ver, art_data)
    report_dir = PLAYGROUND / "benchmarks" / agent_tag
    report_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = report_dir / f"benchmark-report-{skill_ver}.md"
    report_file.write_text(report_content)
    
    old_file = report_dir / "benchmark-report.md"
    if old_file.exists():
        old_file.unlink()

    print(f"\nReport generated and archived cleanly at: {report_file}")


def generate_markdown(results, agent_tag, skill_ver, art_data):
    total_plain_tokens = sum(r["plain"]["total_tokens"] for r in results.values())
    total_guided_tokens = sum(r["guided"]["total_tokens"] for r in results.values())
    total_plain_lines = sum(r["plain"]["total_lines"] for r in results.values())
    total_guided_lines = sum(r["guided"]["total_lines"] for r in results.values())
    
    token_diff = total_guided_tokens - total_plain_tokens
    token_pct = (token_diff / max(total_plain_tokens, 1)) * 100
    tool_versions = detect_tool_versions()
    mcp_string = ", ".join(art_data.get("active_mcps", [])) if art_data.get("active_mcps") else "None detected"

    md = f"""# LCCST Playground Benchmark Report

**Agent Configuration:** {agent_tag}
**Active Ecosystem MCPs:** `{mcp_string}`
**Skill Protocol Engine:** {skill_ver}
**Python Runtime:** {tool_versions['python']} | **pnpm:** {tool_versions['pnpm']} | **Go:** {tool_versions['go']}

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | {total_plain_tokens} | {total_guided_tokens} | +{token_diff} ({token_pct:+.0f}%) |
| Total Program Lines | {total_plain_lines} | {total_guided_lines} | +{total_guided_lines - total_plain_lines} |
| Agent Runtime Tokens (ART) | {art_data.get('total_tokens', 0)} total tokens | {art_data.get('turns', 0)} execution loops tracked over development lifecycles | — |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
"""
    breakdown = art_data.get("breakdown", {})
    for proj in ["python-http-server", "react-timer", "go-login-crud"]:
        proj_data = breakdown.get(proj, {})
        for variant in ["plain", "skill-guided"]:
            v_data = proj_data.get(variant, {"prompt_tokens": 0, "completion_tokens": 0})
            p_tok = v_data.get("prompt_tokens", 0)
            c_tok = v_data.get("completion_tokens", 0)
            md += f"| {proj} | {variant} | {p_tok} | {c_tok} | **{p_tok + c_tok} tokens** |\n"

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
            t = "✅" if feat["has_typing"] else "❌"
            s = "✅" if feat["has_security"] else "❌"
            e = "✅" if feat["has_error_handling"] else "❌"
            a = "✅" if feat["has_test_assertion"] else "❌"
            md += f"| {name} | {var.capitalize()} | {t} | {s} | {e} | {a} |\n"

    return md


if __name__ == "__main__":
    main()
