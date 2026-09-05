# LCCST Playground Benchmark Report

**Provider:** kilo-gateway
**Harness:** kilo
**Model:** ling-3.0-flash-fin-free
**Agent Tag:** kilo-gateway-kilo-ling-3.0-flash-fin-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.5.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1346 | 4045 | +2699 (+201%) |
| Total Program Lines | 226 | 621 | +395 |
| Agent Runtime Tokens (ART) | 12958 total tokens | 3 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 0 | 0 | **0 tokens** |
| python-http-server | skill-guided | 2221 | 1850 | **4071 tokens** |
| react-timer | plain | 0 | 0 | **0 tokens** |
| react-timer | skill-guided | 992 | 1600 | **2592 tokens** |
| go-login-crud | plain | 0 | 0 | **0 tokens** |
| go-login-crud | skill-guided | 4495 | 1800 | **6295 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 82 | 570 | `Skipped` | **32%** |
| | Skill-Guided | 196 | 1581 | `PASSED` | **84%** |
| **react-timer** | Plain Strategy | 45 | 219 | `Skipped` | **22%** |
| | Skill-Guided | 99 | 592 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 99 | 557 | `Skipped` | **49%** |
| | Skill-Guided | 326 | 1872 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (-) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
