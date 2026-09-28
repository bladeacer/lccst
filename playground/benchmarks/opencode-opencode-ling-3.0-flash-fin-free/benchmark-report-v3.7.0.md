# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.18 (/usr/bin/opencode)
**Model:** ling-3.0-flash-fin-free
**Requested Model ID:** opencode/ling-3.0-flash-fin-free
**Agent Tag:** opencode-opencode-ling-3.0-flash-fin-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.7.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.26.0 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `opencode/ling-3.0-flash-fin-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.26.0 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 5438 | 6836 | +1398 (+26%) |
| Total Program Lines | 753 | 905 | +152 |
| Agent Runtime Tokens (ART) | 2461390 total tokens | 51 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 136698 | 35644 | 2221184 | **2393526 tokens** |
| python-http-server | skill-guided | 228 | 244 | 67392 | **67864 tokens** |
| react-timer | plain | 0 | 0 | 0 | **0 tokens** |
| react-timer | skill-guided | 0 | 0 | 0 | **0 tokens** |
| go-login-crud | plain | 0 | 0 | 0 | **0 tokens** |
| go-login-crud | skill-guided | 0 | 0 | 0 | **0 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 251 | 1978 | `PASSED` | **84%** |
| **python-http-server** | Skill-Guided | 2 | 324 | 2615 | `PASSED` | **84%** |
| **react-timer** | Plain Strategy | 3 | 118 | 854 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 3 | 159 | 1188 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 3 | 384 | 2606 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 3 | 422 | 3033 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (+) | (-) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (-) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
