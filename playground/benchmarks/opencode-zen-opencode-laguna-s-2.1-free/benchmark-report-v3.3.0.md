# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-laguna-s-2.1-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.3.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.5-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1853 | 13249 | +11396 (+615%) |
| Total Program Lines | 252 | 1804 | +1552 |
| Agent Runtime Tokens (ART) | 19280 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 1150 | 280 | **1430 tokens** |
| python-http-server | skill-guided | 3400 | 980 | **4380 tokens** |
| react-timer | plain | 3800 | 210 | **4010 tokens** |
| react-timer | skill-guided | 2100 | 620 | **2720 tokens** |
| go-login-crud | plain | 1100 | 290 | **1390 tokens** |
| go-login-crud | skill-guided | 4100 | 1250 | **5350 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 60 | 485 | `Skipped` | **32%** |
| | Skill-Guided | 373 | 3076 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 60 | 544 | `Skipped` | **22%** |
| | Skill-Guided | 332 | 2300 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 132 | 824 | `Skipped` | **49%** |
| | Skill-Guided | 1099 | 7873 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (+) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
