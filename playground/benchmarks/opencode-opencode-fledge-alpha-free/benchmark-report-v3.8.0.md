# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.21 (/usr/bin/opencode)
**Model:** fledge-alpha-free
**Requested Model ID:** opencode/fledge-alpha-free
**Agent Tag:** opencode-opencode-fledge-alpha-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.2 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `opencode/fledge-alpha-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.2 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 3959 | 5041 | +1082 (+27%) |
| Total Program Lines | 581 | 743 | +162 |
| Agent Runtime Tokens (ART) | 2151212 total tokens | 72 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 25323 | 5646 | 344448 | **375417 tokens** |
| python-http-server | skill-guided | 5248 | 4502 | 151552 | **161302 tokens** |
| react-timer | plain | 5249 | 3299 | 454144 | **462692 tokens** |
| react-timer | skill-guided | 72364 | 3307 | 375680 | **451351 tokens** |
| go-login-crud | plain | 5342 | 4241 | 385152 | **394735 tokens** |
| go-login-crud | skill-guided | 48603 | 4184 | 252928 | **305715 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 3 | 206 | 1467 | `PASSED` | **67%** |
| **python-http-server** | Skill-Guided | 3 | 308 | 2079 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 7 | 114 | 775 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 7 | 129 | 902 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 261 | 1717 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 4 | 306 | 2060 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
