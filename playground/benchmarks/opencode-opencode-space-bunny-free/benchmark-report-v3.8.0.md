# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.20 (/usr/bin/opencode)
**Model:** space-bunny-free
**Requested Model ID:** opencode/space-bunny-free
**Agent Tag:** opencode-opencode-space-bunny-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.26.0 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `opencode/space-bunny-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.26.0 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 9346 | 25734 | +16388 (+175%) |
| Total Program Lines | 1248 | 3392 | +2144 |
| Agent Runtime Tokens (ART) | 6418692 total tokens | 80 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 19091 | 11782 | 148300 | **179173 tokens** |
| python-http-server | skill-guided | 4254 | 20512 | 477815 | **502581 tokens** |
| react-timer | plain | 1977 | 14887 | 882911 | **899775 tokens** |
| react-timer | skill-guided | 925 | 11585 | 553207 | **565717 tokens** |
| go-login-crud | plain | 2118 | 21532 | 1705853 | **1729503 tokens** |
| go-login-crud | skill-guided | 4134 | 19729 | 2518080 | **2541943 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 269 | 2345 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 12 | 1061 | 8116 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 8 | 390 | 2544 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 12 | 594 | 4166 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 589 | 4457 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 12 | 1737 | 13452 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
