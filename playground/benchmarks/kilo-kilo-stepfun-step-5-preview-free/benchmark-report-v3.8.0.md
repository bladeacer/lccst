# LCCST Playground Benchmark Report

**Provider:** kilo
**Harness:** kilo
**Harness Version:** 7.7.9 (~/.local/share/pnpm/bin/kilo)
**Model:** stepfun-step-5-preview-free
**Requested Model ID:** kilo/stepfun/step-5-preview-free
**Agent Tag:** kilo-kilo-stepfun-step-5-preview-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.5 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `kilo/stepfun/step-5-preview-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.5 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.
> **Install notes.** react-timer in plain: the install failed (Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.).

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 15392 | 24257 | +8865 (+58%) |
| Total Program Lines | 2142 | 3196 | +1054 |
| Agent Runtime Tokens (ART) | 10443943 total tokens | 125 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 44052 | 11826 | 285696 | **341574 tokens** |
| python-http-server | skill-guided | 74524 | 20938 | 1635328 | **1730790 tokens** |
| react-timer | plain | 14858 | 11266 | 475136 | **501260 tokens** |
| react-timer | skill-guided | 39504 | 8488 | 1587200 | **1635192 tokens** |
| go-login-crud | plain | 45849 | 18830 | 1785856 | **1850535 tokens** |
| go-login-crud | skill-guided | 82045 | 31443 | 4271104 | **4384592 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 7 | 605 | 4343 | `FAILED (code 1)` | **48%** |
| **python-http-server** | Skill-Guided | 16 | 1071 | 8285 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 4 | 256 | 1692 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 9 | 435 | 3080 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 9 | 1281 | 9357 | `FAILED (code 1)` | **65%** |
| **go-login-crud** | Skill-Guided | 12 | 1690 | 12892 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
