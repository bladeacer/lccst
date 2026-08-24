# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-muse-spark-1.2-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.3.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1828 | 10149 | +8321 (+455%) |
| Total Program Lines | 266 | 1434 | +1168 |
| Agent Runtime Tokens (ART) | 86100 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 8200 | 2100 | **10300 tokens** |
| python-http-server | skill-guided | 14500 | 4200 | **18700 tokens** |
| react-timer | plain | 7600 | 1800 | **9400 tokens** |
| react-timer | skill-guided | 13800 | 3900 | **17700 tokens** |
| go-login-crud | plain | 7900 | 2100 | **10000 tokens** |
| go-login-crud | skill-guided | 15200 | 4800 | **20000 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 98 | 810 | `Skipped` | **32%** |
| | Skill-Guided | 370 | 3014 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 43 | 239 | `Skipped` | **22%** |
| | Skill-Guided | 230 | 1676 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 125 | 779 | `Skipped` | **49%** |
| | Skill-Guided | 834 | 5459 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
