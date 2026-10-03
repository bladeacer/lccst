# LCCST Playground Benchmark Report

**Provider:** kilo
**Harness:** kilo
**Harness Version:** 7.7.9 (~/.local/share/pnpm/bin/kilo)
**Model:** inclusionai-ling-3.1-flash
**Requested Model ID:** kilo/inclusionai/ling-3.1-flash
**Agent Tag:** kilo-kilo-inclusionai-ling-3.1-flash
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.2 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `kilo/inclusionai/ling-3.1-flash` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.2 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 6878 | 12849 | +5971 (+87%) |
| Total Program Lines | 942 | 1734 | +792 |
| Agent Runtime Tokens (ART) | 4308517 total tokens | 44 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 32323 | 13891 | 249536 | **295750 tokens** |
| python-http-server | skill-guided | 8656 | 30170 | 384640 | **423466 tokens** |
| react-timer | plain | 11302 | 20369 | 1216448 | **1248119 tokens** |
| react-timer | skill-guided | 29468 | 23215 | 990080 | **1042763 tokens** |
| go-login-crud | plain | 12673 | 14279 | 270912 | **297864 tokens** |
| go-login-crud | skill-guided | 16738 | 17545 | 966272 | **1000555 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 4 | 264 | 2024 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 11 | 654 | 4831 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 8 | 187 | 1264 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 8 | 229 | 1539 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 491 | 3590 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 7 | 851 | 6479 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
