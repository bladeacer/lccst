# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.25 (/usr/bin/opencode)
**Model:** step-5-preview-free
**Requested Model ID:** opencode/step-5-preview-free
**Agent Tag:** opencode-opencode-step-5-preview-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.5 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `opencode/step-5-preview-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.5 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.
> **Install notes.** react-timer in plain: the install failed ([WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.onlyBuiltDependencies". See https://pnpm.io/settings for the new home of each setting.).

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 13518 | 17989 | +4471 (+33%) |
| Total Program Lines | 1816 | 2447 | +631 |
| Agent Runtime Tokens (ART) | 8102762 total tokens | 126 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 33019 | 19400 | 306112 | **358531 tokens** |
| python-http-server | skill-guided | 14086 | 8120 | 1103232 | **1125438 tokens** |
| react-timer | plain | 13860 | 10040 | 891584 | **915484 tokens** |
| react-timer | skill-guided | 15970 | 12708 | 1978112 | **2006790 tokens** |
| go-login-crud | plain | 10840 | 9074 | 873152 | **893066 tokens** |
| go-login-crud | skill-guided | 25796 | 20729 | 2756928 | **2803453 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 4 | 556 | 4156 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 4 | 673 | 5096 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 10 | 466 | 3226 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 13 | 475 | 3267 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 794 | 6136 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 7 | 1299 | 9626 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
