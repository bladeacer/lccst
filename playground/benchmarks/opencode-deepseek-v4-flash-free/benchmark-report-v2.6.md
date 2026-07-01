# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v2.6
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2380 | 8107 | +5727 (+241%) |
| Total Program Lines | 338 | 1160 | +822 |
| Agent Runtime Tokens (ART) | 68000 total tokens | 3 execution loops tracked over development lifecycles | — |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 3165 | 627 | **3792 tokens** |
| python-http-server | skill-guided | 11694 | 2318 | **14012 tokens** |
| react-timer | plain | 2337 | 463 | **2800 tokens** |
| react-timer | skill-guided | 7278 | 1442 | **8720 tokens** |
| go-login-crud | plain | 7375 | 1462 | **8837 tokens** |
| go-login-crud | skill-guided | 24901 | 4938 | **29839 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 76 | 585 | `Skipped` | **48%** |
| | Skill-Guided | 279 | 2161 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 64 | 432 | `Skipped` | **22%** |
| | Skill-Guided | 202 | 1345 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 198 | 1363 | `Skipped` | **49%** |
| | Skill-Guided | 679 | 4601 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
