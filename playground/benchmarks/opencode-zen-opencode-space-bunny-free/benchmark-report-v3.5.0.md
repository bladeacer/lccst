# LCCST Playground Benchmark Report

**Provider:** opencode-zen
**Harness:** opencode
**Model:** space-bunny-free
**Agent Tag:** opencode-zen-opencode-space-bunny-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.5.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.26.0 | **Go:** 1.27.1-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 4274 | 21115 | +16841 (+394%) |
| Total Program Lines | 603 | 2979 | +2376 |
| Agent Runtime Tokens (ART) | 45310 total tokens | 12 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 795 | 3210 | **4005 tokens** |
| python-http-server | skill-guided | 2385 | 6820 | **9205 tokens** |
| react-timer | plain | 795 | 1200 | **1995 tokens** |
| react-timer | skill-guided | 2385 | 6690 | **9075 tokens** |
| go-login-crud | plain | 795 | 2350 | **3145 tokens** |
| go-login-crud | skill-guided | 2385 | 15500 | **17885 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 203 | 1708 | `Skipped` | **48%** |
| | Skill-Guided | 676 | 5253 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 130 | 877 | `Skipped` | **47%** |
| | Skill-Guided | 356 | 2402 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 270 | 1689 | `Skipped` | **65%** |
| | Skill-Guided | 1947 | 13460 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
