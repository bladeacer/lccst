# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-hy3-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.1.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.5-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1930 | 6992 | +5062 (+262%) |
| Total Program Lines | 269 | 1004 | +735 |
| Agent Runtime Tokens (ART) | 78080 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 3200 | 480 | **3680 tokens** |
| python-http-server | skill-guided | 6800 | 1450 | **8250 tokens** |
| react-timer | plain | 8200 | 1750 | **9950 tokens** |
| react-timer | skill-guided | 11500 | 3200 | **14700 tokens** |
| go-login-crud | plain | 13500 | 3900 | **17400 tokens** |
| go-login-crud | skill-guided | 18500 | 5600 | **24100 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 84 | 620 | `Skipped` | **32%** |
| | Skill-Guided | 277 | 2214 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 66 | 490 | `Skipped` | **22%** |
| | Skill-Guided | 171 | 1177 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 119 | 820 | `Skipped` | **32%** |
| | Skill-Guided | 556 | 3601 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (-) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
