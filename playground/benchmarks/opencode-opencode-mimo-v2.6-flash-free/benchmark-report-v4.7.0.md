# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.2.1 (/usr/bin/opencode)
**Model:** mimo-v2.6-flash-free
**Requested Model ID:** opencode/mimo-v2.6-flash-free
**Agent Tag:** opencode-opencode-mimo-v2.6-flash-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v4.7.0
**Python Runtime:** 3.13.11 | **pnpm:** 12.16.1 | **Go:** 1.27.3-X:nodwarf5

> **Model verified.** The host store recorded `opencode/mimo-v2.6-flash-free` for the measured phases.
> **Prompt verified.** The model stated the run token `6299ae4f`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 4497 | 5851 | +1354 (+30%) |
| Total Program Lines | 341 | 387 | +46 |
| Agent Runtime Tokens (ART) | 2095802 total tokens | 58 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 8547 | 2948 | 53504 | **64999 tokens** |
| python-http-server | skill-guided | 42837 | 12698 | 87936 | **143471 tokens** |
| react-timer | plain | 16274 | 5692 | 83136 | **105102 tokens** |
| react-timer | skill-guided | 29169 | 16970 | 329856 | **375995 tokens** |
| go-login-crud | plain | 35534 | 28307 | 184192 | **248033 tokens** |
| go-login-crud | skill-guided | 84275 | 73031 | 1000896 | **1158202 tokens** |

## Robustness Metrics

The score below is a text-level proxy, not a proof of design quality. The
feature detectors read the text of the source files, so a term in a comment
can earn what a real implementation earns. The test run is the only
behavioural proof in this report.

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 111 | 1593 | `PASSED` | **66%** |
| **python-http-server** | Skill-Guided | 2 | 134 | 1792 | `PASSED` | **74%** |
| **react-timer** | Plain Strategy | 3 | 35 | 456 | `PASSED` | **74%** |
| **react-timer** | Skill-Guided | 5 | 54 | 997 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 3 | 195 | 2448 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 3 | 199 | 3062 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (-) | (-) | (+) | (-) |
| python-http-server | Skill-guided | (+) | (-) | (+) | (-) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Skill-guided | (+) | (-) | (-) | (-) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (-) |
