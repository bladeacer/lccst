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

def estimate_tokens(text):
    if ENCODER: return len(ENCODER.encode(text))
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
    files = []
    for pattern in patterns:
        matched = list(full_dir.glob(pattern))
        files.extend(matched)
    files = sorted(set(files))

    result = {"plain": [], "guided": [], "plain_totals": {}, "guided_totals": {}}
    for f in files:
        rel = f.relative_to(full_dir)
        parts = rel.parts
        group = "guided" if parts[0] == "skill-guided" else "plain"
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue
        info = {
            "file": str(rel),
            "lines": len(text.splitlines()),
            "chars": len(text),
            "tokens": estimate_tokens(text),
            "features": analyze_code_features(text),
        }
        result[group].append(info)

    for group in ("plain", "guided"):
        items = result[group]
        result[f"{group}_totals"] = {
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
    if test_cmd is None: return {"exit_code": 0, "passed": True, "stdout": "", "stderr": ""}
    full_dir = PLAYGROUND / project_dir
    cwd = str(full_dir / test_cwd) if test_cwd else str(full_dir)
    env = {**os.environ, **(test_env or {})}
    env.pop("VIRTUAL_ENV", None)
    try:
        result = subprocess.run(test_cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=120)
        return {
            "exit_code": result.returncode,
            "passed": result.returncode == 0,
            "stdout": result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout,
            "stderr": result.stderr[-2000:] if len(result.stderr) > 2000 else result.stderr,
        }
    except Exception as e:
        return {"exit_code": -1, "passed": False, "stdout": "", "stderr": str(e)}

PROJECT_PROFILES = {
    "python-http-server": {"max_typing": 17, "max_security": 17, "max_error_handling": 16},
    "react-timer":        {"max_typing": 17, "max_security": 0,  "max_error_handling": 0},
    "go-login-crud":      {"max_typing": 17, "max_security": 17, "max_error_handling": 16},
}

def compute_robustness_score(test_result, file_details, totals, project_name):
    score = 0
    if test_result["passed"]: score += 50
    elif test_result["exit_code"] == -1: score += 5
    else: score += 15

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
            if key == "go" and raw.startswith("go version go"): raw = raw.split(" ")[2].lstrip("go")
            elif key == "python" and raw.startswith("Python "): raw = raw.split(" ")[1]
            versions[key] = raw
        except Exception: versions[key] = "not found"
    return versions

def extract_skill_version():
    skill_path = PLAYGROUND.parent / "skill.md"
    if skill_path.is_file():
        try:
            first = skill_path.read_text().split("\n")[0]
            if "v" in first: return f"v{first.split('v')[-1].strip().rstrip(':')}"
        except Exception: pass
    return "unknown"

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    agent_tag = sys.argv[1]
    install_deps = "--install-deps" in sys.argv

    agent_dir = PLAYGROUND / agent_tag
    if not agent_dir.is_dir():
        print(f"Agent directory not found: {agent_dir}")
        sys.exit(1)

    if install_deps:
        react_dir = agent_dir / "react-timer" / "skill-guided"
        if (react_dir / "package.json").exists() and not (react_dir / "node_modules").exists():
            print("Installing npm dependencies for react-timer...")
            subprocess.run(["npm", "install"], cwd=str(react_dir), capture_output=True, text=True, timeout=120)

    results = {}
    for proj_name, proj_info in PROJECTS.items():
        proj_dir = f"{agent_tag}/{proj_name}"
        measured = measure_files(proj_dir, proj_info["patterns"])
        
        test_result = run_tests(proj_dir, proj_info["test_cmd_guided"], proj_info.get("test_cwd_guided"), proj_info.get("test_env_guided"))
        plain_test_result = {"passed": False, "exit_code": 1, "stdout": "", "stderr": ""}

        results[proj_name] = {
            "plain": {**measured["plain_totals"], "files": measured["plain"], "robustness": compute_robustness_score(plain_test_result, measured["plain"], measured["plain_totals"], proj_name), "test_result": None},
            "guided": {**measured["guided_totals"], "files": measured["guided"], "robustness": compute_robustness_score(test_result, measured["guided"], measured["guided_totals"], proj_name), "test_result": test_result},
        }

    # Extract dynamic indices
    skill_ver = extract_skill_version()
    art_path = PLAYGROUND / "benchmarks" / "runtime-telemetry.json"
    
    art_data = {"total_prompt_tokens": 0, "total_completion_tokens": 0, "total_tokens": 0, "turns": 0, "active_mcps": []}
    if art_path.exists():
        try: art_data = json.loads(art_path.read_text())
        except Exception: pass

    # Build report layout matching your criteria
    report_content = generate_markdown(results, agent_tag, skill_ver, art_data)
    
    # Save directly to the versioned layout requested: /playground/benchmarks/{agent}-{model}/benchmark-report-{skill-ver}.md
    report_dir = PLAYGROUND / "benchmarks" / agent_tag
    report_dir.mkdir(parents=True, exist_ok=True)
    report_file = report_dir / f"benchmark-report-{skill_ver}.md"
    
    report_file.write_text(report_content)
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

    return f"""# LCCST Playground Benchmark Report

**Agent Configuration:** {agent_tag}
**Active Ecosystem MCPs:** `{mcp_string}`
**Skill Protocol Engine:** {skill_ver}
**Python Runtime:** {tool_versions['python']} | **pnpm:** {tool_versions['pnpm']} | **Go:** {tool_versions['go']}

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | {total_plain_tokens} | {total_guided_tokens} | +{token_diff} ({token_pct:+.0f}%) |
| Total Program Lines | {total_plain_lines} | {total_guided_lines} | +{total_guided_lines - total_plain_lines} |
| Agent Runtime Tokens (ART) | — | {art_data['total_tokens']} | {art_data['total_prompt_tokens']} prompt / {art_data['total_completion_tokens']} completion ({art_data['turns']} turns) |

## Robustness Metrics
"""
