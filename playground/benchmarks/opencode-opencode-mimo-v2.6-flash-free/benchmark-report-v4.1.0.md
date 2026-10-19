# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.32 (/usr/bin/opencode)
**Model:** mimo-v2.6-flash-free
**Requested Model ID:** opencode/mimo-v2.6-flash-free
**Agent Tag:** opencode-opencode-mimo-v2.6-flash-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v4.1.0
**Python Runtime:** 3.13.11 | **pnpm:** 12.14.0 | **Go:** 1.27.2-X:nodwarf5

> **Model verified.** The host store recorded `opencode/mimo-v2.6-flash-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 12.14.0 (the guide declares 11.3.0); go 1.27.2-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 6548 | 16208 | +9660 (+148%) |
| Total Program Lines | 834 | 2073 | +1239 |
| Agent Runtime Tokens (ART) | 3979802 total tokens | 58 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 19786 | 9530 | 72832 | **102148 tokens** |
| python-http-server | skill-guided | 16551 | 11023 | 203584 | **231158 tokens** |
| react-timer | plain | 18509 | 7640 | 495936 | **522085 tokens** |
| react-timer | skill-guided | 28134 | 9180 | 457024 | **494338 tokens** |
| go-login-crud | plain | 9112 | 8059 | 1328448 | **1345619 tokens** |
| go-login-crud | skill-guided | 19300 | 17858 | 1247296 | **1284454 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 257 | 2101 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 10 | 603 | 4697 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 5 | 139 | 1072 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 11 | 385 | 2966 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 3 | 438 | 3375 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 9 | 1085 | 8545 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
