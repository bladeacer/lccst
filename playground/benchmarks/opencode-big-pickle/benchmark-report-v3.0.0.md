# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-big-pickle
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.0.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1700 | 7927 | +6227 (+366%) |
| Total Program Lines | 261 | 1195 | +934 |
| Agent Runtime Tokens (ART) | 85400 total tokens | 6 execution loops tracked over development lifecycles | — |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 8500 | 1200 | **9700 tokens** |
| python-http-server | skill-guided | 12000 | 3800 | **15800 tokens** |
| react-timer | plain | 8500 | 1200 | **9700 tokens** |
| react-timer | skill-guided | 14000 | 4200 | **18200 tokens** |
| go-login-crud | plain | 9000 | 1500 | **10500 tokens** |
| go-login-crud | skill-guided | 16000 | 5500 | **21500 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 76 | 582 | `Skipped` | **48%** |
| | Skill-Guided | 259 | 2197 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 57 | 360 | `Skipped` | **22%** |
| | Skill-Guided | 251 | 1479 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 128 | 758 | `Skipped` | **49%** |
| | Skill-Guided | 685 | 4251 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
