#!/usr/bin/env python3
"""Agent-agnostic benchmark: measures tokens, lines, features, and test results
for plain vs skill-guided implementations across all three projects.

The workspace folder is named ``provider-harness-model`` (e.g.
``opencode-opencode-hy3-free``) so results can be compared across providers,
harnesses, and models.

The scanner applies one rule to both variants. It counts the same kinds of
source files, and it runs the same test command, so the plain column and the
skill-guided column measure the same thing.

Usage:
    python3 run_benchmark.py <provider-harness-model> \\
        [--provider opencode] [--harness opencode] [--model hy3-free]
        [--model-id opencode/hy3-free] [--workspace /tmp/room] [--install-deps]
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

PLAYGROUND = Path(__file__).resolve().parent.parent

# Workspace of the run. The clean room sits outside the repository, so the
# default below only applies to an older layout.
WORKSPACE = PLAYGROUND

# Token encoder. The module sets it in `main`, so that a unit test can import
# this file without starting a second Python process.
ENCODER = None

# The three subprojects, each with one test command for both variants.
PROJECTS = {
    "python-http-server": {
        "manifest": "pyproject.toml",
        "install": ["uv", "sync"],
        "test_cmd": ["uv", "run", "python3", "-m", "pytest", "tests/", "-v", "--tb=short"],
        "test_env": {"DISABLE_RATE_LIMIT": "1", "VIRTUAL_ENV": ""},
        "usage_exit_codes": {4, 5},
    },
    "react-timer": {
        "manifest": "package.json",
        "install": ["pnpm", "install", "--no-frozen-lockfile"],
        "test_cmd": ["npx", "--no-install", "jest", "--no-coverage"],
        "test_env": {},
        "usage_exit_codes": set(),
    },
    "go-login-crud": {
        "manifest": "go.mod",
        "install": ["go", "mod", "download"],
        "test_cmd": ["go", "test", "./tests/", "-v"],
        "test_env": {},
        "usage_exit_codes": set(),
    },
}

# Order of the report tables.
PROJECT_ORDER = ["python-http-server", "react-timer", "go-login-crud"]
VARIANTS = ["plain", "skill-guided"]

# Points of the robustness score, and the ceiling of each project. The two
# variants share the profile, so the score means the same thing in both columns.
SCORE_PASSED = 50
SCORE_FAILED = 15
SCORE_ERROR = 5

PROJECT_PROFILES = {
    "python-http-server": {"max_typing": 17, "max_security": 17, "max_error_handling": 16},
    "react-timer": {"max_typing": 17, "max_security": 0, "max_error_handling": 0},
    "go-login-crud": {"max_typing": 17, "max_security": 17, "max_error_handling": 16},
}

# Source extensions that the scanner counts, for both variants.
SOURCE_EXTENSIONS = {
    ".py", ".go", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".html", ".css"
}

# Directories that hold installed or generated files, never source.
EXCLUDED_DIRECTORIES = {
    "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache", "dist",
    "build", "target", "coverage", ".git", ".next", ".lccst"
}

# Lock files and checksums, which are generated, not written.
EXCLUDED_NAMES = {"pnpm-lock.yaml", "package-lock.json", "uv.lock", "go.sum"}

# Seconds that one install or one test run may take.
INSTALL_TIMEOUT = 300
TEST_TIMEOUT = 300

# Toolchain that `playground/guide.md` declares. The report states a drift note
# when the machine does not match, because a drift changes every score.
DECLARED_TOOLCHAIN = {
    "python": "3.13.11",
    "pnpm": "11.3.0",
    "go": "1.26.4-X",
}


def load_encoder():
    """Load the token encoder of the file token counts.

    The function returns `False` when `tiktoken` is not installed. The report
    then uses a coarse estimate and says so.
    """
    global ENCODER
    try:
        import tiktoken
    except ImportError:
        return False
    ENCODER = tiktoken.get_encoding("cl100k_base")
    return True


def rerun_with_uv() -> None:
    """Re-run this script inside the benchmark environment, then stop.

    The benchmark environment declares `tiktoken`. The function starts it only
    when the current interpreter holds no encoder, and it stops the process
    because the child process writes the report.
    """
    script = Path(__file__).resolve()
    subprocess.run(
        ["uv", "run", "python3", str(script), *sys.argv[1:]], check=True, cwd=script.parent
    )
    sys.exit(0)


def estimate_tokens(text):
    """Count the tokens of one file."""
    if ENCODER:
        return len(ENCODER.encode(text))
    tokens_by_punctuation = len(re.findall(r"[{}()\[\].,:;+\-*/%&|^~=<>!]", text))
    words = len(re.findall(r"\b\w+\b", text))
    return words + (tokens_by_punctuation // 2)


def analyze_code_features(text):
    """Report the features that the robustness score rewards."""
    return {
        "has_typing": bool(re.search(r"(interface\s+\w+|type\s+\w+|:\s*(int|str|bool|float|dict|List|Optional|def\s+\w+\(.*?:\s*\w+)|->\s*\w+)", text)),
        "has_security": bool(re.search(r"(auth|jwt|hash|sha256|bcrypt|crypto|sanitize|escape|rate.limit|password|token|session)", text, re.IGNORECASE)),
        "has_error_handling": bool(re.search(r"(try\s*{|except\s+\w+:|if\s+err\s*!=\s*nil|raise\s+\w+|return.*err)", text)),
        "has_test_assertion": bool(re.search(r"(assert|expect|t\.Fatal|t\.Error|should\.)", text)),
    }


def collect_source_files(directory):
    """List the source files of one variant directory.

    The function applies one filter to both variants, so the plain column and
    the skill-guided column count the same kinds of file. It prunes installed
    and generated directories, and it returns an empty list when the directory
    does not exist.
    """
    if not directory.is_dir():
        return []

    found = []
    for root, directories, names in os.walk(directory):
        directories[:] = sorted(d for d in directories if d not in EXCLUDED_DIRECTORIES)
        for name in sorted(names):
            if name in EXCLUDED_NAMES:
                continue
            path = Path(root) / name
            if path.suffix in SOURCE_EXTENSIONS:
                found.append(path)
    return found


def measure_files(directory):
    """Measure one variant directory.

    The result holds the totals of the directory, and one entry per file.
    """
    files = []
    for path in collect_source_files(directory):
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        files.append({
            "file": str(path.relative_to(directory)),
            "lines": len(text.splitlines()),
            "chars": len(text),
            "tokens": estimate_tokens(text),
            "features": analyze_code_features(text),
        })

    return {
        "files": files,
        "file_count": len(files),
        "total_lines": sum(item["lines"] for item in files),
        "total_chars": sum(item["chars"] for item in files),
        "total_tokens": sum(item["tokens"] for item in files),
        "features_aggregate": {
            key: any(item["features"][key] for item in files)
            for key in ("has_typing", "has_security", "has_error_handling", "has_test_assertion")
        },
    }


def run_command(command, cwd, env=None, timeout=TEST_TIMEOUT):
    """Run one command and return the result, or an error when it cannot run."""
    merged = {**os.environ, **(env or {})}
    merged.pop("VIRTUAL_ENV", None)
    try:
        result = subprocess.run(
            command, cwd=str(cwd), env=merged, capture_output=True, text=True, timeout=timeout
        )
    except subprocess.TimeoutExpired:
        return {
            "exit_code": -1,
            "timed_out": True,
            "stdout": "",
            "stderr": f"The command exceeded {timeout} seconds.",
        }
    except Exception as error:  # noqa: BLE001 - the scanner must never crash
        return {"exit_code": -1, "timed_out": False, "stdout": "", "stderr": str(error)}
    return {
        "exit_code": result.returncode,
        "timed_out": False,
        "stdout": result.stdout[-3000:],
        "stderr": result.stderr[-2000:],
    }


def install_dependencies(directory, project_name, info):
    """Install the dependencies of one variant, and return a note when it fails.

    The function runs only when the caller asks for it. A failure is a note,
    not a crash, because the report must still state the test result.
    """
    if not (directory / info["manifest"]).is_file():
        return ""

    result = run_command(
        info["install"], directory, timeout=INSTALL_TIMEOUT
    )
    if result["exit_code"] != 0:
        detail = (result["stderr"] or result["stdout"] or "").strip().splitlines()
        tail = detail[-1] if detail else "no output"
        return f"{project_name} in {directory.name}: the install failed ({tail})."
    return ""


def classify_test(result, files_found, info):
    """Turn a finished test run into a status of `passed`, `failed` or `error`.

    The function separates a test failure from a scanner failure. A timeout, a
    usage error, and a directory that holds no source file are errors, because
    no test verdict exists. The function must never report `passed` for a
    directory that holds no source.
    """
    if files_found == 0:
        return {"status": "error", "reason": "the variant holds no source file"}
    if result["timed_out"]:
        return {"status": "error", "reason": "the test command timed out"}
    if result["exit_code"] < 0:
        return {"status": "error", "reason": (result["stderr"] or "the test command failed to start").strip()[:200]}
    if result["exit_code"] in info.get("usage_exit_codes", set()):
        return {"status": "error", "reason": f"the test command exited with usage code {result['exit_code']}"}
    if "No tests found" in result["stdout"] or "no tests ran" in result["stdout"]:
        return {"status": "error", "reason": "the test command found no test"}
    if result["exit_code"] == 0:
        return {"status": "passed", "reason": ""}
    return {"status": "failed", "reason": ""}


def run_variant(directory, project_name, info, install):
    """Measure one variant: its files, its install note, and its test status."""
    note = install_dependencies(directory, project_name, info) if install else ""
    measured = measure_files(directory)
    result = run_command(info["test_cmd"], directory, info.get("test_env"))
    verdict = classify_test(result, measured["file_count"], info)
    return {
        **measured,
        "install_note": note,
        "test_result": {
            "exit_code": result["exit_code"],
            "timed_out": result["timed_out"],
            "status": verdict["status"],
            "reason": verdict["reason"],
            "stdout": result["stdout"],
            "stderr": result["stderr"],
        },
    }


def compute_robustness_score(variant_result, project_name):
    """Score one variant out of 100.

    The same rubric scores both variants. A pass earns 50 points, a test
    failure earns 15, and a scanner error earns 5. The feature points are the
    same in both columns.
    """
    status = variant_result["test_result"]["status"]
    if status == "passed":
        score = SCORE_PASSED
    elif status == "failed":
        score = SCORE_FAILED
    else:
        score = SCORE_ERROR

    profile = PROJECT_PROFILES.get(
        project_name, {"max_typing": 17, "max_security": 17, "max_error_handling": 16}
    )
    features = variant_result["features_aggregate"]
    if features["has_typing"]:
        score += profile["max_typing"]
    if features["has_security"]:
        score += profile["max_security"]
    if features["has_error_handling"]:
        score += profile["max_error_handling"]

    ceiling = SCORE_PASSED + profile["max_typing"] + profile["max_security"] + profile["max_error_handling"]
    return min(int(score / ceiling * 100), 100)


def detect_harness_version(harness):
    """Read the version of the harness that ran the run.

    A harness version changes the prompt, the tool list, and the token
    accounting, so a report that names no version cannot be reproduced. The
    function asks the harness itself, and it returns the path of the command
    with the version, because two installs of one harness can differ.
    """
    path = shutil.which(harness)
    if not path:
        return f"{harness} is not on the path"

    try:
        result = subprocess.run(
            [harness, "--version"], capture_output=True, text=True, timeout=20
        )
    except Exception:
        return f"{harness} at {path}, version not reported"

    raw = (result.stdout or result.stderr or "").strip()
    if not raw:
        return f"{harness} at {path}, version not reported"

    # A harness may print a banner before the version, so the function keeps the
    # last line that holds a version number.
    version = ""
    for line in reversed(raw.splitlines()):
        text = line.strip()
        if re.search(r"\d+\.\d+", text):
            version = text
            break
    if not version:
        version = raw.splitlines()[-1].strip()
    return f"{version} ({path})"


def detect_tool_versions():
    """Read the version of each tool of the machine."""
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


def toolchain_notes(versions):
    """State every tool that does not match the declared toolchain."""
    notes = []
    for key, declared in DECLARED_TOOLCHAIN.items():
        found = versions.get(key, "not found")
        if not found.startswith(declared):
            notes.append(f"{key} {found} (the guide declares {declared})")
    return notes


def extract_skill_version():
    """Read the protocol version that the report covers."""
    for skill_path in (WORKSPACE / "SKILL.md", PLAYGROUND.parent / "SKILL.md"):
        if not skill_path.is_file():
            continue
        try:
            content = skill_path.read_text()
        except OSError:
            continue
        match = re.search(r'version:\s*"(\d+\.\d+(?:\.\d+)?)"', content)
        if match:
            return f"v{match.group(1)}"
        match = re.search(r"v(\d+\.\d+(?:\.\d+)?)", content)
        if match:
            return f"v{match.group(1)}"
    return "unknown"


def select_telemetry_file(agent_tag):
    """Return the one telemetry file of the run.

    The function reads the first file that exists, so a run never sums the
    phases of two runs into one report.
    """
    candidates = [
        WORKSPACE / "runtime-telemetry.json",
        PLAYGROUND / agent_tag / "runtime-telemetry.json",
        PLAYGROUND / "benchmarks" / "runtime-telemetry.json",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def empty_telemetry():
    """Build an empty telemetry record."""
    return {
        "total_prompt_tokens": 0,
        "total_completion_tokens": 0,
        "total_cache_read_tokens": 0,
        "total_tokens": 0,
        "model_turns": 0,
        "active_mcps": [],
        "breakdown": {},
        "phases": [],
        "unsettled_phases": 0,
        "measured_breakdown": False,
        "models": [],
        "prompt_verified": False,
    }


def load_telemetry(agent_tag):
    """Read the telemetry record of the run.

    The function returns an empty record when no file exists, so the report can
    state the absence instead of failing.
    """
    record = empty_telemetry()
    path = select_telemetry_file(agent_tag)
    if path is None:
        return record

    try:
        loaded = json.loads(path.read_text())
    except (OSError, ValueError):
        return record
    if not isinstance(loaded, dict):
        return record

    for key in ("total_prompt_tokens", "total_completion_tokens",
                "total_cache_read_tokens", "total_tokens", "model_turns"):
        if isinstance(loaded.get(key), (int, float)):
            record[key] = int(loaded[key])

    mcps = loaded.get("active_mcps")
    if isinstance(mcps, list):
        record["active_mcps"] = [str(name) for name in mcps]

    phases = loaded.get("phases")
    if isinstance(phases, list):
        record["phases"] = [phase for phase in phases if isinstance(phase, dict)]
        record["unsettled_phases"] = sum(
            1 for phase in record["phases"] if not phase.get("settled", False)
        )
        record["models"] = sorted({
            phase["model"] for phase in record["phases"]
            if phase.get("settled") and isinstance(phase.get("model"), str)
        })
        record["prompt_verified"] = any(
            bool(phase.get("token_seen")) for phase in record["phases"]
        )

    breakdown = loaded.get("breakdown")
    if isinstance(breakdown, dict):
        for project, variants in breakdown.items():
            if not isinstance(variants, dict):
                continue
            target = record["breakdown"].setdefault(project, {})
            for variant, metrics in variants.items():
                if not isinstance(metrics, dict):
                    continue
                step = target.setdefault(
                    variant,
                    {"prompt_tokens": 0, "completion_tokens": 0, "cache_read_tokens": 0},
                )
                step["prompt_tokens"] += int(metrics.get("prompt_tokens", 0))
                step["completion_tokens"] += int(metrics.get("completion_tokens", 0))
                step["cache_read_tokens"] += int(metrics.get("cache_read_tokens", 0))

    record["measured_breakdown"] = any(
        sum(step.values()) > 0
        for variants in record["breakdown"].values()
        for step in variants.values()
        if isinstance(step, dict)
    )
    return record


def model_part(name):
    """Return the model part of a `provider/model` name, without a tag.

    The function keeps every slash of the model part, so a nested name such as
    `stepfun/step-3.7-flash:free` stays one name. It removes the `:free` tag,
    because a host may or may not send it.
    """
    _, _, rest = str(name).partition("/")
    return rest.split(":")[0].strip().lower()


def model_matches(requested, measured):
    """Say whether a measured model is the model that the run requested.

    The run requests a full identifier, such as `kilo/stepfun/step-3.7-flash:free`.
    The host store names the provider and the model of every turn. The function
    compares the model part of both names, so a host that splits the provider
    differently does not fail the comparison, and a host that drops the tag
    does not fail it either.
    """
    if not requested or not measured:
        return False
    return model_part(requested) == model_part(measured)


def model_note(requested, measured_models):
    """State the source of the model name of the report."""
    if not measured_models:
        return (
            "> **Model unverified.** The host store recorded no model for the "
            "measured phases, so the run cannot confirm the model above."
        )
    if len(measured_models) > 1:
        names = ", ".join(f"`{name}`" for name in measured_models)
        return f"> **Several models ran.** The host store recorded {names}. The report measures no single model."
    measured = measured_models[0]
    if model_matches(requested, measured):
        return f"> **Model verified.** The host store recorded `{measured}` for the measured phases."
    return (
        f"> **Wrong model.** The run requested `{requested}`, and the host store "
        f"recorded `{measured}`. Do not use this report. A harness that cannot "
        "resolve the requested model starts a different model."
    )


def prompt_note(verified, token):
    """State whether the model received the project instructions.

    The instructions carry a token. A model that read them states the token in
    its first reply, and the settle step looks for it. A run without the token
    is a run that measured a different prompt.
    """
    if not token:
        return (
            "> **Prompt unverified.** The workspace holds no run token, so the "
            "report cannot confirm that the model received `AGENTS.md`."
        )
    if verified:
        return (
            f"> **Prompt verified.** The model stated the run token `{token}`, so "
            "it received the project instructions of this run."
        )
    return (
        f"> **Prompt unverified.** No turn of the run stated the run token "
        f"`{token}`, so the report cannot confirm that the model received "
        "`AGENTS.md`. Do not use this report."
    )


def token_note(record, encoder_loaded):
    """State the source of the runtime token counts."""
    unsettled = record["unsettled_phases"]
    if unsettled > 0:
        return (
            f"> **Unsettled phases.** {unsettled} of {len(record['phases'])} "
            "phases hold no count. Run `make telemetry-settle` before this report."
        )
    if record["measured_breakdown"]:
        return (
            "> **Measured runtime tokens.** The settle step read every count from "
            "the store of the host that ran the phase."
        )
    if record["total_tokens"] > 0:
        return (
            "> **Partial runtime tokens.** The store holds counts for the run, but "
            "no phase holds a breakdown. The rows below stay empty."
        )
    return "> **No runtime tokens.** The host store held no counts for this workspace."


def encoder_note(encoder_loaded):
    """State whether the file token counts come from an encoder or an estimate."""
    if encoder_loaded:
        return ""
    return (
        "> **Estimated file tokens.** `tiktoken` is not installed, so the file "
        "token counts use a coarse estimate. Run `uv sync` in "
        "`playground/benchmarks` to measure them."
    )


def synthesize_missing_breakdown(record, results):
    """Allocate the workspace total across the subprojects by payload size.

    The allocation runs only when no phase recorded a count. The report then
    labels the rows as an estimate.
    """
    if record["measured_breakdown"] or record["total_tokens"] <= 0:
        return

    total_payload = sum(
        results[project][variant]["total_tokens"]
        for project in PROJECT_ORDER
        for variant in VARIANTS
    )
    if total_payload <= 0:
        return

    synthetic = {}
    remaining = {
        "prompt_tokens": record["total_prompt_tokens"],
        "completion_tokens": record["total_completion_tokens"],
        "cache_read_tokens": record["total_cache_read_tokens"],
    }
    last = (len(PROJECT_ORDER) - 1, len(VARIANTS) - 1)
    for project_index, project in enumerate(PROJECT_ORDER):
        synthetic[project] = {}
        for variant_index, variant in enumerate(VARIANTS):
            share = results[project][variant]["total_tokens"] / total_payload
            if (project_index, variant_index) == last:
                step = {key: remaining[key] for key in remaining}
            else:
                step = {
                    key: int(record[f"total_{key}"] * share)
                    for key in ("prompt_tokens", "completion_tokens", "cache_read_tokens")
                }
                for key in step:
                    remaining[key] -= step[key]
            synthetic[project][variant] = step

    record["breakdown"] = synthetic
    record["estimated_breakdown"] = True


def parse_agent_identity(agent_tag, provider, harness, model):
    """Resolve the provider, harness and model from the flags or the tag."""
    prefix = f"{provider}-{harness}-"
    if model is None:
        model = agent_tag[len(prefix):] if agent_tag.startswith(prefix) else agent_tag
    return provider, harness, model


def read_prompt_token(workspace):
    """Read the run token that the instructions of the run carry."""
    path = workspace / "prompt-token.txt"
    if not path.is_file():
        return None
    token = path.read_text(encoding="utf-8").strip()
    return token or None


def collect_results(install):
    """Measure both variants of every subproject."""
    results = {}
    for project in PROJECT_ORDER:
        info = PROJECTS[project]
        results[project] = {}
        for variant in VARIANTS:
            results[project][variant] = run_variant(
                WORKSPACE / project / variant, project, info, install
            )
    return results


def test_status_text(variant_result):
    """Return the status of one variant as the report prints it."""
    outcome = variant_result["test_result"]
    if outcome["status"] == "passed":
        return "`PASSED`"
    if outcome["status"] == "failed":
        return f"`FAILED (code {outcome['exit_code']})`"
    return f"`ERROR: {outcome['reason']}`"


def generate_markdown(results, provider, harness, model, model_id, agent_tag,
                      skill_ver, record, encoder_loaded, harness_version=None):
    """Build the report of one run.

    The function states the harness version, because a harness version changes
    the prompt, the tool list, and the token accounting. A report that names no
    version cannot be reproduced.
    """
    plain_fct = sum(results[p]["plain"]["total_tokens"] for p in PROJECT_ORDER)
    guided_fct = sum(results[p]["skill-guided"]["total_tokens"] for p in PROJECT_ORDER)
    plain_lines = sum(results[p]["plain"]["total_lines"] for p in PROJECT_ORDER)
    guided_lines = sum(results[p]["skill-guided"]["total_lines"] for p in PROJECT_ORDER)
    token_diff = guided_fct - plain_fct
    token_pct = (token_diff / max(plain_fct, 1)) * 100
    versions = detect_tool_versions()
    drift = toolchain_notes(versions)
    if record["active_mcps"]:
        mcps = ", ".join(record["active_mcps"])
    elif record["phases"]:
        mcps = "none recorded"
    else:
        mcps = "unknown, the run recorded no phase"

    notes = [model_note(model_id or model, record["models"])]
    notes.append(prompt_note(record["prompt_verified"], read_prompt_token(WORKSPACE)))
    notes.append(token_note(record, encoder_loaded))
    if record.get("estimated_breakdown"):
        notes.append(
            "> **Estimated breakdown.** No phase recorded a count, so the rows "
            "below allocate the workspace total by code payload size. Do not use "
            "them as measurements."
        )
    if drift:
        notes.append(
            "> **Toolchain drift.** " + "; ".join(drift) +
            ". A drift changes every score, so do not compare this report with a "
            "run on another machine."
        )
    install_notes = [
        note for project in PROJECT_ORDER for note in
        (results[project][variant]["install_note"] for variant in VARIANTS)
        if note
    ]
    if install_notes:
        notes.append("> **Install notes.** " + "; ".join(install_notes))
    encoder = encoder_note(encoder_loaded)
    if encoder:
        notes.append(encoder)

    harness_note = ""
    if harness_version and "not reported" in harness_version or (
        harness_version and "not on the path" in harness_version
    ):
        harness_note = (
            "> **Harness version unreported.** The report names no harness "
            "version, so the run cannot be reproduced. "
            f"{harness_version}."
        )
        notes.append(harness_note)

    md = f"""# LCCST Playground Benchmark Report

**Provider:** {provider}
**Harness:** {harness}
**Harness Version:** {harness_version or 'not stated'}
**Model:** {model}
**Requested Model ID:** {model_id or 'not stated'}
**Agent Tag:** {agent_tag}
**Active Ecosystem MCPs:** {mcps}
**Skill Protocol Engine:** {skill_ver}
**Python Runtime:** {versions['python']} | **pnpm:** {versions['pnpm']} | **Go:** {versions['go']}

{chr(10).join(notes)}

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | {plain_fct} | {guided_fct} | +{token_diff} ({token_pct:+.0f}%) |
| Total Program Lines | {plain_lines} | {guided_lines} | +{guided_lines - plain_lines} |
| Agent Runtime Tokens (ART) | {record['total_tokens']} total tokens | {record['model_turns']} model turns over {len(record['phases'])} phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
"""
    for project in PROJECT_ORDER:
        for variant in VARIANTS:
            step = record["breakdown"].get(project, {}).get(
                variant, {"prompt_tokens": 0, "completion_tokens": 0, "cache_read_tokens": 0}
            )
            prompt_tokens = step.get("prompt_tokens", 0)
            completion = step.get("completion_tokens", 0)
            cache_read = step.get("cache_read_tokens", 0)
            md += (
                f"| {project} | {variant} | {prompt_tokens} | {completion} | "
                f"{cache_read} | **{prompt_tokens + completion + cache_read} tokens** |\n"
            )

    md += """
## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
"""
    for project in PROJECT_ORDER:
        for variant in VARIANTS:
            data = results[project][variant]
            label = "Plain Strategy" if variant == "plain" else "Skill-Guided"
            score = compute_robustness_score(data, project)
            md += (
                f"| **{project}** | {label} | {data['file_count']} | "
                f"{data['total_lines']} | {data['total_tokens']} | "
                f"{test_status_text(data)} | **{score}%** |\n"
            )

    md += """
## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
"""
    for project in PROJECT_ORDER:
        for variant in VARIANTS:
            features = results[project][variant]["features_aggregate"]
            marks = [
                "(+)" if features[key] else "(-)"
                for key in ("has_typing", "has_security", "has_error_handling", "has_test_assertion")
            ]
            md += f"| {project} | {variant.capitalize()} | " + " | ".join(marks) + " |\n"

    return md


def main():
    """Measure the workspace and write the report."""
    parser = argparse.ArgumentParser(
        description="Agent-agnostic benchmark: measures tokens, lines, features, "
                    "and test results for plain vs skill-guided implementations."
    )
    parser.add_argument("agent_tag", help="Agent directory name (provider-harness-model)")
    parser.add_argument("--provider", default="opencode-zen", help="Model provider, e.g. opencode-zen")
    parser.add_argument("--harness", default="opencode", help="Agent/harness name, e.g. opencode")
    parser.add_argument("--model", default=None, help="Model name, e.g. hy3-free (derived from tag if omitted)")
    parser.add_argument("--model-id", default=None, help="Full model identifier that the run pinned, e.g. kilo/stepfun/step-3.7-flash:free")
    parser.add_argument("--workspace", default=None, help="Workspace of the run (defaults to the agent directory)")
    parser.add_argument("--install-deps", action="store_true", help="Install the dependencies of every variant before the tests")
    parser.add_argument("--approximate-tokens", action="store_true", help="Do not start the benchmark environment for `tiktoken`")
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

    if not load_encoder() and not args.approximate_tokens:
        rerun_with_uv()
    encoder_loaded = ENCODER is not None
    results = collect_results(args.install_deps)
    for project in PROJECT_ORDER:
        for variant in VARIANTS:
            data = results[project][variant]
            if data["test_result"]["status"] == "error":
                print(
                    f"[Scanner] {project}/{variant}: {data['test_result']['reason']}"
                )

    skill_ver = extract_skill_version()
    record = load_telemetry(agent_tag)
    synthesize_missing_breakdown(record, results)

    report = generate_markdown(
        results, provider, harness, model, args.model_id, agent_tag,
        skill_ver, record, encoder_loaded, detect_harness_version(harness)
    )
    report_dir = PLAYGROUND / "benchmarks" / agent_tag
    report_dir.mkdir(parents=True, exist_ok=True)
    report_file = report_dir / f"benchmark-report-{skill_ver}.md"
    report_file.write_text(report, encoding="utf-8")
    (report_dir / "benchmark-report.md").unlink(missing_ok=True)

    print(f"\nReport generated at: {report_file}")


if __name__ == "__main__":
    main()
