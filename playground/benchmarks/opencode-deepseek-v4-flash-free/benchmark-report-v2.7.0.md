# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v2.7.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1874 | 7036 | +5162 (+275%) |
| Total Program Lines | 274 | 1042 | +768 |
| Agent Runtime Tokens (ART) | 35020 total tokens | 6 execution loops tracked over development lifecycles | — |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 1426 | 891 | **2317 tokens** |
| python-http-server | skill-guided | 5456 | 3410 | **8866 tokens** |
| react-timer | plain | 1376 | 860 | **2236 tokens** |
| react-timer | skill-guided | 2005 | 1253 | **3258 tokens** |
| go-login-crud | plain | 1729 | 1080 | **2809 tokens** |
| go-login-crud | skill-guided | 9558 | 5976 | **15534 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 89 | 590 | `Skipped` | **48%** |
| | Skill-Guided | 292 | 2256 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 67 | 569 | `Skipped` | **22%** |
| | Skill-Guided | 124 | 829 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 118 | 715 | `Skipped` | **49%** |
| | Skill-Guided | 626 | 3951 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
