# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.21 (/usr/bin/opencode)
**Model:** mimo-v2.6-flash-free
**Requested Model ID:** opencode/mimo-v2.6-flash-free
**Agent Tag:** opencode-opencode-mimo-v2.6-flash-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.2 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `opencode/mimo-v2.6-flash-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.2 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 6768 | 15993 | +9225 (+136%) |
| Total Program Lines | 885 | 2083 | +1198 |
| Agent Runtime Tokens (ART) | 5364148 total tokens | 70 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 38419 | 30267 | 170304 | **238990 tokens** |
| python-http-server | skill-guided | 40091 | 34852 | 419712 | **494655 tokens** |
| react-timer | plain | 62470 | 47565 | 855296 | **965331 tokens** |
| react-timer | skill-guided | 36414 | 29434 | 1815680 | **1881528 tokens** |
| go-login-crud | plain | 21661 | 12747 | 659008 | **693416 tokens** |
| go-login-crud | skill-guided | 32695 | 32509 | 1025024 | **1090228 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 5 | 409 | 3169 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 8 | 748 | 5747 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 7 | 186 | 1312 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 5 | 231 | 1634 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 2 | 290 | 2287 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 7 | 1104 | 8612 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
