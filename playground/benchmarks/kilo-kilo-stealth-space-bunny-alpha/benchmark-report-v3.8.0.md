# LCCST Playground Benchmark Report

**Provider:** kilo
**Harness:** kilo
**Harness Version:** 7.7.9 (~/.local/share/pnpm/bin/kilo)
**Model:** stealth-space-bunny-alpha
**Requested Model ID:** kilo/stealth/space-bunny-alpha
**Agent Tag:** kilo-kilo-stealth-space-bunny-alpha
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.26.0 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `kilo/stealth/space-bunny-alpha` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.26.0 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 10190 | 28790 | +18600 (+183%) |
| Total Program Lines | 1294 | 3535 | +2241 |
| Agent Runtime Tokens (ART) | 6732731 total tokens | 108 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 22766 | 5754 | 201771 | **230291 tokens** |
| python-http-server | skill-guided | 4616 | 12957 | 763613 | **781186 tokens** |
| react-timer | plain | 669 | 3767 | 440223 | **444659 tokens** |
| react-timer | skill-guided | 1538 | 9654 | 1133824 | **1145016 tokens** |
| go-login-crud | plain | 617 | 9671 | 1063614 | **1073902 tokens** |
| go-login-crud | skill-guided | 1627 | 26324 | 3029726 | **3057677 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 3 | 284 | 2397 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 12 | 1054 | 8309 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 4 | 213 | 1533 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 12 | 447 | 3725 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 5 | 797 | 6260 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 15 | 2034 | 16756 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
