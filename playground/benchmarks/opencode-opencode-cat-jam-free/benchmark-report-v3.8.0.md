# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.28 (/usr/bin/opencode)
**Model:** cat-jam-free
**Requested Model ID:** opencode/cat-jam-free
**Agent Tag:** opencode-opencode-cat-jam-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.5 | **Go:** 1.27.2-X:nodwarf5

> **Model verified.** The host store recorded `opencode/cat-jam-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.5 (the guide declares 11.3.0); go 1.27.2-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.
> **Install notes.** python-http-server in plain: the install failed (invalid basic string).

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 5697 | 6592 | +895 (+16%) |
| Total Program Lines | 814 | 947 | +133 |
| Agent Runtime Tokens (ART) | 2484673 total tokens | 69 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 0 | 0 | 0 | **0 tokens** |
| python-http-server | skill-guided | 29800 | 12438 | 536448 | **578686 tokens** |
| react-timer | plain | 8345 | 5745 | 449152 | **463242 tokens** |
| react-timer | skill-guided | 640 | 122 | 77184 | **77946 tokens** |
| go-login-crud | plain | 62861 | 11007 | 1186304 | **1260172 tokens** |
| go-login-crud | skill-guided | 1091 | 112 | 103424 | **104627 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 5 | 310 | 2309 | `FAILED (code 2)` | **65%** |
| **python-http-server** | Skill-Guided | 6 | 402 | 2870 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 4 | 78 | 541 | `FAILED (code 1)` | **47%** |
| **react-timer** | Skill-Guided | 5 | 84 | 607 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 426 | 2847 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 4 | 461 | 3115 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (+) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
