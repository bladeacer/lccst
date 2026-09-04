# LCCST Playground Benchmark Report

**Provider:** opencode-zen
**Harness:** opencode
**Model:** muse-spark-1.3-free
**Agent Tag:** opencode-zen-opencode-muse-spark-1.3-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.5.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1878 | 8065 | +6187 (+329%) |
| Total Program Lines | 276 | 1081 | +805 |
| Agent Runtime Tokens (ART) | 45500 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 4500 | 1200 | **5700 tokens** |
| python-http-server | skill-guided | 6200 | 2100 | **8300 tokens** |
| react-timer | plain | 3800 | 800 | **4600 tokens** |
| react-timer | skill-guided | 7000 | 2600 | **9600 tokens** |
| go-login-crud | plain | 4200 | 1400 | **5600 tokens** |
| go-login-crud | skill-guided | 8500 | 3200 | **11700 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 83 | 611 | `Skipped` | **48%** |
| | Skill-Guided | 270 | 2239 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 45 | 255 | `Skipped` | **47%** |
| | Skill-Guided | 147 | 1248 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 148 | 1012 | `Skipped` | **49%** |
| | Skill-Guided | 664 | 4578 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
