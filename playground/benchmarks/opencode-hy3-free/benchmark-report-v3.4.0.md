# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-hy3-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.4.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1823 | 7134 | +5311 (+291%) |
| Total Program Lines | 274 | 1087 | +813 |
| Agent Runtime Tokens (ART) | 90370 total tokens | 10 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 11700 | 520 | **12220 tokens** |
| python-http-server | skill-guided | 14600 | 970 | **15570 tokens** |
| react-timer | plain | 7800 | 350 | **8150 tokens** |
| react-timer | skill-guided | 18500 | 1370 | **19870 tokens** |
| go-login-crud | plain | 9800 | 600 | **10400 tokens** |
| go-login-crud | skill-guided | 22500 | 1660 | **24160 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 74 | 562 | `Skipped` | **32%** |
| | Skill-Guided | 283 | 2129 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 55 | 352 | `Skipped` | **22%** |
| | Skill-Guided | 150 | 933 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 145 | 909 | `Skipped` | **65%** |
| | Skill-Guided | 654 | 4072 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
