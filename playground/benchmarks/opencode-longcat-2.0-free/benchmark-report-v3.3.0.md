# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-longcat-2.0-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.3.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.5-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1492 | 14724 | +13232 (+887%) |
| Total Program Lines | 237 | 2092 | +1855 |
| Agent Runtime Tokens (ART) | 209000 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 17420 | 1180 | **18600 tokens** |
| python-http-server | skill-guided | 24310 | 5240 | **29550 tokens** |
| react-timer | plain | 26150 | 760 | **26910 tokens** |
| react-timer | skill-guided | 33180 | 4720 | **37900 tokens** |
| go-login-crud | plain | 35060 | 1520 | **36580 tokens** |
| go-login-crud | skill-guided | 49820 | 9640 | **59460 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 67 | 487 | `Skipped` | **32%** |
| | Skill-Guided | 544 | 4096 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 50 | 295 | `Skipped` | **22%** |
| | Skill-Guided | 312 | 2058 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 120 | 710 | `Skipped` | **49%** |
| | Skill-Guided | 1236 | 8570 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
