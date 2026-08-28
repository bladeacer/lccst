# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-mimo-v2.5-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.4.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1844 | 5870 | +4026 (+218%) |
| Total Program Lines | 248 | 815 | +567 |
| Agent Runtime Tokens (ART) | 29620 total tokens | 7 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 5170 | 2050 | **7220 tokens** |
| python-http-server | skill-guided | 2100 | 3200 | **5300 tokens** |
| react-timer | plain | 450 | 650 | **1100 tokens** |
| react-timer | skill-guided | 2800 | 2900 | **5700 tokens** |
| go-login-crud | plain | 1200 | 1500 | **2700 tokens** |
| go-login-crud | skill-guided | 3500 | 4100 | **7600 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 71 | 588 | `Skipped` | **32%** |
| | Skill-Guided | 219 | 1826 | `PASSED` | **84%** |
| **react-timer** | Plain Strategy | 51 | 401 | `Skipped` | **22%** |
| | Skill-Guided | 95 | 646 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 126 | 855 | `Skipped` | **49%** |
| | Skill-Guided | 501 | 3398 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (-) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
