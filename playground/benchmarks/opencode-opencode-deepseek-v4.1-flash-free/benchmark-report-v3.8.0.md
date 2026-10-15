# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.29 (/usr/bin/opencode)
**Model:** deepseek-v4.1-flash-free
**Requested Model ID:** opencode/deepseek-v4.1-flash-free
**Agent Tag:** opencode-opencode-deepseek-v4.1-flash-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 12.13.0 | **Go:** 1.27.2-X:nodwarf5

> **Model verified.** The host store recorded `opencode/deepseek-v4.1-flash-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 12.13.0 (the guide declares 11.3.0); go 1.27.2-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 6288 | 13069 | +6781 (+108%) |
| Total Program Lines | 866 | 1868 | +1002 |
| Agent Runtime Tokens (ART) | 1538535 total tokens | 28 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 25390 | 13433 | 66176 | **104999 tokens** |
| python-http-server | skill-guided | 14373 | 12308 | 168448 | **195129 tokens** |
| react-timer | plain | 11240 | 10660 | 133504 | **155404 tokens** |
| react-timer | skill-guided | 12632 | 10501 | 413312 | **436445 tokens** |
| go-login-crud | plain | 9420 | 4438 | 275712 | **289570 tokens** |
| go-login-crud | skill-guided | 17795 | 17145 | 322048 | **356988 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 286 | 2362 | `PASSED` | **66%** |
| **python-http-server** | Skill-Guided | 15 | 636 | 4588 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 3 | 142 | 967 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 11 | 391 | 2760 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 438 | 2959 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 11 | 841 | 5721 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (-) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
