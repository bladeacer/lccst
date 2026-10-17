# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.29 (/usr/bin/opencode)
**Model:** deepseek-v4.1-flash-free
**Requested Model ID:** opencode/deepseek-v4.1-flash-free
**Agent Tag:** opencode-opencode-deepseek-v4.1-flash-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v4.0.0
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
| File-Content Tokens (FCT) | 6496 | 11309 | +4813 (+74%) |
| Total Program Lines | 884 | 1608 | +724 |
| Agent Runtime Tokens (ART) | 1409264 total tokens | 31 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 28364 | 12064 | 122752 | **163180 tokens** |
| python-http-server | skill-guided | 46950 | 8899 | 133504 | **189353 tokens** |
| react-timer | plain | 9101 | 7640 | 219264 | **236005 tokens** |
| react-timer | skill-guided | 6270 | 5564 | 199680 | **211514 tokens** |
| go-login-crud | plain | 8108 | 7644 | 168704 | **184456 tokens** |
| go-login-crud | skill-guided | 10863 | 9797 | 404096 | **424756 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 277 | 2360 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 12 | 587 | 4313 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 7 | 205 | 1460 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 9 | 338 | 2393 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 402 | 2676 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 10 | 683 | 4603 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
