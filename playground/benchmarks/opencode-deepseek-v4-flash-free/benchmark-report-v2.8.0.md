# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v2.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2354 | 8078 | +5724 (+243%) |
| Total Program Lines | 334 | 1153 | +819 |
| Agent Runtime Tokens (ART) | 42050 total tokens | 6 execution loops tracked over development lifecycles | — |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 2071 | 568 | **2639 tokens** |
| python-http-server | skill-guided | 7051 | 1933 | **8984 tokens** |
| react-timer | plain | 1606 | 440 | **2046 tokens** |
| react-timer | skill-guided | 2435 | 667 | **3102 tokens** |
| go-login-crud | plain | 3767 | 1033 | **4800 tokens** |
| go-login-crud | skill-guided | 16070 | 4409 | **20479 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 90 | 655 | `Skipped` | **48%** |
| | Skill-Guided | 274 | 2229 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 73 | 508 | `Skipped` | **22%** |
| | Skill-Guided | 120 | 770 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 171 | 1191 | `Skipped` | **49%** |
| | Skill-Guided | 759 | 5079 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
