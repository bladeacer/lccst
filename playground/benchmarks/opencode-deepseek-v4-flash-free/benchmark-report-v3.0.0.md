# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.0.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2297 | 7958 | +5661 (+246%) |
| Total Program Lines | 351 | 1181 | +830 |
| Agent Runtime Tokens (ART) | 78300 total tokens | 6 execution loops tracked over development lifecycles | — |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 4500 | 1200 | **5700 tokens** |
| python-http-server | skill-guided | 6800 | 3100 | **9900 tokens** |
| react-timer | plain | 8500 | 2000 | **10500 tokens** |
| react-timer | skill-guided | 10500 | 4200 | **14700 tokens** |
| go-login-crud | plain | 13500 | 2500 | **16000 tokens** |
| go-login-crud | skill-guided | 16000 | 5500 | **21500 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 96 | 676 | `Skipped` | **32%** |
| | Skill-Guided | 278 | 2343 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 67 | 485 | `Skipped` | **22%** |
| | Skill-Guided | 259 | 1589 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 188 | 1136 | `Skipped` | **65%** |
| | Skill-Guided | 644 | 4026 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
