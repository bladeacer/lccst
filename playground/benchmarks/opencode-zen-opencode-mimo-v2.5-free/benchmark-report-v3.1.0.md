# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-mimo-v2.5-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.1.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.5-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1877 | 6241 | +4364 (+232%) |
| Total Program Lines | 260 | 900 | +640 |
| Agent Runtime Tokens (ART) | 36550 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 4800 | 350 | **5150 tokens** |
| python-http-server | skill-guided | 5200 | 1800 | **7000 tokens** |
| react-timer | plain | 2800 | 650 | **3450 tokens** |
| react-timer | skill-guided | 5800 | 2200 | **8000 tokens** |
| go-login-crud | plain | 3200 | 750 | **3950 tokens** |
| go-login-crud | skill-guided | 6200 | 2800 | **9000 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 68 | 542 | `Skipped` | **32%** |
| | Skill-Guided | 271 | 2254 | `PASSED` | **84%** |
| **react-timer** | Plain Strategy | 63 | 459 | `Skipped` | **22%** |
| | Skill-Guided | 142 | 902 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 129 | 876 | `Skipped` | **49%** |
| | Skill-Guided | 487 | 3085 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (-) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
