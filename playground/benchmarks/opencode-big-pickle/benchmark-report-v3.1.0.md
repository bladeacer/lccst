# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-big-pickle
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.1.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.5-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2957 | 13461 | +10504 (+355%) |
| Total Program Lines | 471 | 2106 | +1635 |
| Agent Runtime Tokens (ART) | 18300 total tokens | 9 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 1500 | 800 | **2300 tokens** |
| python-http-server | skill-guided | 2500 | 1700 | **4200 tokens** |
| react-timer | plain | 800 | 400 | **1200 tokens** |
| react-timer | skill-guided | 2300 | 1400 | **3700 tokens** |
| go-login-crud | plain | 1200 | 700 | **1900 tokens** |
| go-login-crud | skill-guided | 3000 | 2000 | **5000 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 141 | 988 | `Skipped` | **31%** |
| | Skill-Guided | 480 | 3343 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 121 | 779 | `Skipped` | **22%** |
| | Skill-Guided | 212 | 1530 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 209 | 1190 | `Skipped` | **49%** |
| | Skill-Guided | 1414 | 8588 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (-) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
