# LCCST Playground Benchmark Report

**Provider:** opencode-zen
**Harness:** opencode
**Model:** ling-3.0-flash-fin-free
**Agent Tag:** opencode-zen-opencode-ling-3.0-flash-fin-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.5.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2131 | 6422 | +4291 (+201%) |
| Total Program Lines | 313 | 914 | +601 |
| Agent Runtime Tokens (ART) | 113100 total tokens | 10 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 8500 | 3200 | **11700 tokens** |
| python-http-server | skill-guided | 26000 | 14300 | **40300 tokens** |
| react-timer | plain | 3500 | 1700 | **5200 tokens** |
| react-timer | skill-guided | 15000 | 9000 | **24000 tokens** |
| go-login-crud | plain | 3500 | 1700 | **5200 tokens** |
| go-login-crud | skill-guided | 16200 | 10500 | **26700 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 87 | 637 | `Skipped` | **32%** |
| | Skill-Guided | 275 | 2248 | `PASSED` | **84%** |
| **react-timer** | Plain Strategy | 65 | 527 | `Skipped` | **22%** |
| | Skill-Guided | 152 | 1061 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 161 | 967 | `Skipped` | **65%** |
| | Skill-Guided | 487 | 3113 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (-) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
