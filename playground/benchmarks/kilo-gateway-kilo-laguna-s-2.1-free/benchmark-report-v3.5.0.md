# LCCST Playground Benchmark Report

**Provider:** kilo-gateway
**Harness:** kilo
**Model:** laguna-s-2.1-free
**Agent Tag:** kilo-gateway-kilo-laguna-s-2.1-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.5.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1727 | 10056 | +8329 (+482%) |
| Total Program Lines | 265 | 1438 | +1173 |
| Agent Runtime Tokens (ART) | 50500 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 8200 | 2100 | **10300 tokens** |
| python-http-server | skill-guided | 4100 | 6200 | **10300 tokens** |
| react-timer | plain | 2500 | 1800 | **4300 tokens** |
| react-timer | skill-guided | 3500 | 5500 | **9000 tokens** |
| go-login-crud | plain | 2800 | 1800 | **4600 tokens** |
| go-login-crud | skill-guided | 3500 | 8500 | **12000 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 96 | 647 | `Skipped` | **48%** |
| | Skill-Guided | 405 | 3014 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 75 | 497 | `Skipped` | **22%** |
| | Skill-Guided | 184 | 1222 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 94 | 583 | `Skipped` | **65%** |
| | Skill-Guided | 849 | 5820 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
