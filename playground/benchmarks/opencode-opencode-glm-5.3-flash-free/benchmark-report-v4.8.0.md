# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.2.7 (/usr/bin/opencode)
**Model:** glm-5.3-flash-free
**Requested Model ID:** opencode/glm-5.3-flash-free
**Agent Tag:** opencode-opencode-glm-5.3-flash-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v4.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 12.19.0 | **Go:** 1.27.4-X:nodwarf5

> **Model verified.** The host store recorded `opencode/glm-5.3-flash-free` for the measured phases.
> **Prompt verified.** The model stated the run token `216389d1`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 4123 | 4499 | +376 (+9%) |
| Total Program Lines | 358 | 347 | -11 |
| Agent Runtime Tokens (ART) | 1401024 total tokens | 66 model turns over 6 phases, 6 passed | prompt 40568/pass |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 15995 | 2995 | 58752 | **77742 tokens** |
| python-http-server | skill-guided | 24671 | 4429 | 70720 | **99820 tokens** |
| react-timer | plain | 44905 | 6449 | 276352 | **327706 tokens** |
| react-timer | skill-guided | 26151 | 5606 | 126208 | **157965 tokens** |
| go-login-crud | plain | 65622 | 19916 | 361216 | **446754 tokens** |
| go-login-crud | skill-guided | 66062 | 32399 | 192576 | **291037 tokens** |


## Robustness Metrics

The score below is a text-level proxy, not a proof of design quality. The
feature detectors read the text of the source files, so a term in a comment
can earn what a real implementation earns. The test run is the only
behavioural proof in this report.


| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 109 | 1331 | `PASSED` | **50%** |
| **python-http-server** | Skill-Guided | 2 | 96 | 1290 | `PASSED` | **83%** |
| **react-timer** | Plain Strategy | 3 | 52 | 628 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 4 | 52 | 723 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 197 | 2164 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 4 | 199 | 2486 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (-) | (-) | (-) | (-) |
| python-http-server | Skill-guided | (+) | (-) | (+) | (-) |
| react-timer | Plain | (+) | (-) | (-) | (-) |
| react-timer | Skill-guided | (+) | (-) | (-) | (-) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (-) |
