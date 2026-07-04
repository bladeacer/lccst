# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-mimo-v2.5-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v2.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 4808 | 9946 | +5138 (+107%) |
| Total Program Lines | 683 | 1470 | +787 |
| Agent Runtime Tokens (ART) | 47400 total tokens | 6 execution loops tracked over development lifecycles | — |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 3625 | 1582 | **5207 tokens** |
| python-http-server | skill-guided | 6003 | 2619 | **8622 tokens** |
| react-timer | plain | 1643 | 717 | **2360 tokens** |
| react-timer | skill-guided | 3368 | 1469 | **4837 tokens** |
| go-login-crud | plain | 5484 | 2393 | **7877 tokens** |
| go-login-crud | skill-guided | 12877 | 5620 | **18497 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 208 | 1621 | `Skipped` | **32%** |
| | Skill-Guided | 329 | 2684 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 109 | 735 | `Skipped` | **22%** |
| | Skill-Guided | 229 | 1506 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 366 | 2452 | `Skipped` | **49%** |
| | Skill-Guided | 912 | 5756 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (+) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (+) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
