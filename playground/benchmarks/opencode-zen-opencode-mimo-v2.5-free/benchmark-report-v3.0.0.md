# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-mimo-v2.5-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.0.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1387 | 8673 | +7286 (+525%) |
| Total Program Lines | 188 | 1214 | +1026 |
| Agent Runtime Tokens (ART) | 131700 total tokens | 8 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 31000 | 6000 | **37000 tokens** |
| python-http-server | skill-guided | 23700 | 6700 | **30400 tokens** |
| react-timer | plain | 8200 | 1800 | **10000 tokens** |
| react-timer | skill-guided | 11800 | 3900 | **15700 tokens** |
| go-login-crud | plain | 10500 | 5200 | **15700 tokens** |
| go-login-crud | skill-guided | 16800 | 6100 | **22900 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 86 | 685 | `Skipped` | **32%** |
| | Skill-Guided | 334 | 2666 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 66 | 465 | `Skipped` | **22%** |
| | Skill-Guided | 178 | 1215 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 36 | 237 | `Skipped` | **15%** |
| | Skill-Guided | 702 | 4792 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (-) | (-) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
