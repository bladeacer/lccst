# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.3.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.5-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1857 | 9109 | +7252 (+391%) |
| Total Program Lines | 260 | 1260 | +1000 |
| Agent Runtime Tokens (ART) | 271500 total tokens | 8 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 89900 | 8500 | **98400 tokens** |
| python-http-server | skill-guided | 29800 | 4200 | **34000 tokens** |
| react-timer | plain | 30100 | 1800 | **31900 tokens** |
| react-timer | skill-guided | 30500 | 5200 | **35700 tokens** |
| go-login-crud | plain | 30700 | 2600 | **33300 tokens** |
| go-login-crud | skill-guided | 31200 | 7000 | **38200 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 77 | 617 | `Skipped` | **32%** |
| | Skill-Guided | 393 | 3337 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 58 | 445 | `Skipped` | **22%** |
| | Skill-Guided | 182 | 1336 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 125 | 795 | `Skipped` | **49%** |
| | Skill-Guided | 685 | 4436 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
