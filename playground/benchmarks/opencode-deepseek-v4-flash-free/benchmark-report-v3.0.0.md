# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.0.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2074 | 8628 | +6554 (+316%) |
| Total Program Lines | 297 | 1299 | +1002 |
| Agent Runtime Tokens (ART) | 19800 total tokens | 3 execution loops tracked over development lifecycles | — |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 0 | 0 | **0 tokens** |
| python-http-server | skill-guided | 3500 | 2800 | **6300 tokens** |
| react-timer | plain | 0 | 0 | **0 tokens** |
| react-timer | skill-guided | 2800 | 3200 | **6000 tokens** |
| go-login-crud | plain | 0 | 0 | **0 tokens** |
| go-login-crud | skill-guided | 3000 | 4500 | **7500 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 74 | 540 | `Skipped` | **48%** |
| | Skill-Guided | 274 | 2203 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 70 | 582 | `Skipped` | **22%** |
| | Skill-Guided | 208 | 1365 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 153 | 952 | `Skipped` | **49%** |
| | Skill-Guided | 817 | 5060 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
