# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.1.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.5-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2201 | 8162 | +5961 (+271%) |
| Total Program Lines | 347 | 1195 | +848 |
| Agent Runtime Tokens (ART) | 23400 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 4500 | 800 | **5300 tokens** |
| python-http-server | skill-guided | 3200 | 1500 | **4700 tokens** |
| react-timer | plain | 1500 | 300 | **1800 tokens** |
| react-timer | skill-guided | 2800 | 1200 | **4000 tokens** |
| go-login-crud | plain | 1800 | 500 | **2300 tokens** |
| go-login-crud | skill-guided | 3500 | 1800 | **5300 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 86 | 590 | `Skipped` | **48%** |
| | Skill-Guided | 288 | 2284 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 69 | 462 | `Skipped` | **22%** |
| | Skill-Guided | 217 | 1614 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 192 | 1149 | `Skipped` | **49%** |
| | Skill-Guided | 690 | 4264 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
