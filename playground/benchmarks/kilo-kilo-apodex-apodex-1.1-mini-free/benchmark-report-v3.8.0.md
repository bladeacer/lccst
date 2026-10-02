# LCCST Playground Benchmark Report

**Provider:** kilo
**Harness:** kilo
**Harness Version:** 7.7.9 (~/.local/share/pnpm/bin/kilo)
**Model:** apodex-apodex-1.1-mini-free
**Requested Model ID:** kilo/apodex/apodex-1.1-mini:free
**Agent Tag:** kilo-kilo-apodex-apodex-1.1-mini-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.2 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `kilo/apodex/apodex-1.1-mini:free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.2 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 5358 | 6533 | +1175 (+22%) |
| Total Program Lines | 697 | 832 | +135 |
| Agent Runtime Tokens (ART) | 5740722 total tokens | 70 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 55020 | 23649 | 256320 | **334989 tokens** |
| python-http-server | skill-guided | 17628 | 20590 | 2202048 | **2240266 tokens** |
| react-timer | plain | 3420 | 4122 | 531200 | **538742 tokens** |
| react-timer | skill-guided | 3780 | 3725 | 661504 | **669009 tokens** |
| go-login-crud | plain | 6511 | 8106 | 1252928 | **1267545 tokens** |
| go-login-crud | skill-guided | 1973 | 6342 | 681856 | **690171 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 186 | 1530 | `PASSED` | **50%** |
| **python-http-server** | Skill-Guided | 2 | 279 | 2272 | `PASSED` | **67%** |
| **react-timer** | Plain Strategy | 5 | 116 | 878 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 5 | 132 | 1035 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 395 | 2950 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 4 | 421 | 3226 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (-) | (-) | (-) | (+) |
| python-http-server | Skill-guided | (-) | (+) | (-) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
