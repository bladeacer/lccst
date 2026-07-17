# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-big-pickle
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v2.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1817 | 7516 | +5699 (+314%) |
| Total Program Lines | 276 | 1110 | +834 |
| Agent Runtime Tokens (ART) | 54700 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 2464 | 1111 | **3575 tokens** |
| python-http-server | skill-guided | 8927 | 4025 | **12952 tokens** |
| react-timer | plain | 1551 | 699 | **2250 tokens** |
| react-timer | skill-guided | 2767 | 1247 | **4014 tokens** |
| go-login-crud | plain | 3324 | 1499 | **4823 tokens** |
| go-login-crud | skill-guided | 18667 | 8419 | **27086 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 83 | 610 | `Skipped` | **32%** |
| | Skill-Guided | 270 | 2210 | `PASSED` | **84%** |
| **react-timer** | Plain Strategy | 59 | 384 | `Skipped` | **22%** |
| | Skill-Guided | 114 | 685 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 134 | 823 | `Skipped` | **49%** |
| | Skill-Guided | 726 | 4621 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (-) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
