# LCCST Playground Benchmark Report

**Provider:** kilo-gateway
**Harness:** kilo
**Model:** step-3.7-flash-free
**Agent Tag:** kilo-gateway-kilo-step-3.7-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.5.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1675 | 5778 | +4103 (+245%) |
| Total Program Lines | 257 | 823 | +566 |
| Agent Runtime Tokens (ART) | 162200 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 20000 | 1200 | **21200 tokens** |
| python-http-server | skill-guided | 22000 | 2500 | **24500 tokens** |
| react-timer | plain | 24000 | 1000 | **25000 tokens** |
| react-timer | skill-guided | 26000 | 3000 | **29000 tokens** |
| go-login-crud | plain | 28000 | 1000 | **29000 tokens** |
| go-login-crud | skill-guided | 30000 | 3500 | **33500 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 87 | 598 | `Skipped` | **32%** |
| | Skill-Guided | 249 | 1921 | `PASSED` | **84%** |
| **react-timer** | Plain Strategy | 51 | 399 | `Skipped` | **22%** |
| | Skill-Guided | 172 | 1157 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 119 | 678 | `Skipped` | **49%** |
| | Skill-Guided | 402 | 2700 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (-) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
