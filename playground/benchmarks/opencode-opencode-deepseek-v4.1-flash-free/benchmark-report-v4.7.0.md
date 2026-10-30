# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.2.1 (/usr/bin/opencode)
**Model:** deepseek-v4.1-flash-free
**Requested Model ID:** opencode/deepseek-v4.1-flash-free
**Agent Tag:** opencode-opencode-deepseek-v4.1-flash-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v4.7.0
**Python Runtime:** 3.13.11 | **pnpm:** 12.16.1 | **Go:** 1.27.3-X:nodwarf5

> **Model verified.** The host store recorded `opencode/deepseek-v4.1-flash-free` for the measured phases.
> **Prompt verified.** The model stated the run token `6299ae4f`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 4229 | 4663 | +434 (+10%) |
| Total Program Lines | 360 | 373 | +13 |
| Agent Runtime Tokens (ART) | 2376143 total tokens | 89 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 22438 | 10364 | 172288 | **205090 tokens** |
| python-http-server | skill-guided | 19173 | 5150 | 109056 | **133379 tokens** |
| react-timer | plain | 9990 | 5579 | 104448 | **120017 tokens** |
| react-timer | skill-guided | 39797 | 7549 | 87168 | **134514 tokens** |
| go-login-crud | plain | 38341 | 29193 | 828672 | **896206 tokens** |
| go-login-crud | skill-guided | 51970 | 37911 | 797056 | **886937 tokens** |

## Robustness Metrics

The score below is a text-level proxy, not a proof of design quality. The
feature detectors read the text of the source files, so a term in a comment
can earn what a real implementation earns. The test run is the only
behavioural proof in this report.

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 116 | 1452 | `PASSED` | **50%** |
| **python-http-server** | Skill-Guided | 2 | 111 | 1467 | `PASSED` | **83%** |
| **react-timer** | Plain Strategy | 3 | 44 | 536 | `PASSED` | **74%** |
| **react-timer** | Skill-Guided | 5 | 62 | 702 | `PASSED` | **96%** |
| **go-login-crud** | Plain Strategy | 2 | 200 | 2241 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 3 | 200 | 2494 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (-) | (-) | (-) | (-) |
| python-http-server | Skill-guided | (+) | (-) | (+) | (-) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Skill-guided | (+) | (-) | (-) | (-) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (-) |
