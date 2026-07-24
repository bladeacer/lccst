# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-ling-3.0-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.1.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.5-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1768 | 7708 | +5940 (+336%) |
| Total Program Lines | 273 | 1151 | +878 |
| Agent Runtime Tokens (ART) | 10700 total tokens | 7 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 3300 | 600 | **3900 tokens** |
| python-http-server | skill-guided | 1500 | 350 | **1850 tokens** |
| react-timer | plain | 600 | 150 | **750 tokens** |
| react-timer | skill-guided | 1200 | 400 | **1600 tokens** |
| go-login-crud | plain | 600 | 200 | **800 tokens** |
| go-login-crud | skill-guided | 1500 | 300 | **1800 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 81 | 528 | `Skipped` | **32%** |
| | Skill-Guided | 316 | 2221 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 60 | 428 | `Skipped` | **22%** |
| | Skill-Guided | 149 | 992 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 132 | 812 | `Skipped` | **65%** |
| | Skill-Guided | 686 | 4495 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
