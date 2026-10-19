# LCCST Playground Benchmark Report

**Provider:** kilo
**Harness:** kilo
**Harness Version:** 7.7.9 (~/.local/share/pnpm/bin/kilo)
**Model:** minimax-minimax-m3.1-flash-free
**Requested Model ID:** kilo/minimax/minimax-m3.1-flash:free
**Agent Tag:** kilo-kilo-minimax-minimax-m3.1-flash-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v4.1.0
**Python Runtime:** 3.13.11 | **pnpm:** 12.14.0 | **Go:** 1.27.2-X:nodwarf5

> **Model verified.** The host store recorded `kilo/minimax/minimax-m3.1-flash:free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 12.14.0 (the guide declares 11.3.0); go 1.27.2-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 8961 | 16064 | +7103 (+79%) |
| Total Program Lines | 1203 | 2218 | +1015 |
| Agent Runtime Tokens (ART) | 8064545 total tokens | 73 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 26226 | 27280 | 326564 | **380070 tokens** |
| python-http-server | skill-guided | 18499 | 41739 | 1868098 | **1928336 tokens** |
| react-timer | plain | 10917 | 9974 | 808521 | **829412 tokens** |
| react-timer | skill-guided | 8307 | 14155 | 2371994 | **2394456 tokens** |
| go-login-crud | plain | 471 | 15291 | 765963 | **781725 tokens** |
| go-login-crud | skill-guided | 571 | 18490 | 1731485 | **1750546 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 309 | 2554 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 14 | 825 | 5979 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 7 | 216 | 1452 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 10 | 344 | 2564 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 6 | 678 | 4955 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 7 | 1049 | 7521 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
