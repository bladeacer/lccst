# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.22 (/usr/bin/opencode)
**Model:** muse-spark-1.3-contributor-free
**Requested Model ID:** opencode/muse-spark-1.3-contributor-free
**Agent Tag:** opencode-opencode-muse-spark-1.3-contributor-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.3 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `opencode/muse-spark-1.3-contributor-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.3 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 6070 | 8123 | +2053 (+34%) |
| Total Program Lines | 838 | 1106 | +268 |
| Agent Runtime Tokens (ART) | 2429516 total tokens | 63 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 26669 | 8866 | 166762 | **202297 tokens** |
| python-http-server | skill-guided | 5301 | 4401 | 182694 | **192396 tokens** |
| react-timer | plain | 4932 | 3708 | 462909 | **471549 tokens** |
| react-timer | skill-guided | 5427 | 3684 | 515773 | **524884 tokens** |
| go-login-crud | plain | 44774 | 4535 | 312840 | **362149 tokens** |
| go-login-crud | skill-guided | 8201 | 6347 | 661693 | **676241 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 252 | 1995 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 2 | 346 | 2654 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 7 | 151 | 1052 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 7 | 215 | 1502 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 435 | 3023 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 4 | 545 | 3967 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
