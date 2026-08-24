# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-hy3-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.3.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.27.0-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2040 | 6728 | +4688 (+230%) |
| Total Program Lines | 293 | 970 | +677 |
| Agent Runtime Tokens (ART) | 32700 total tokens | 7 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 8600 | 2400 | **11000 tokens** |
| python-http-server | skill-guided | 3200 | 1900 | **5100 tokens** |
| react-timer | plain | 1400 | 700 | **2100 tokens** |
| react-timer | skill-guided | 3400 | 2100 | **5500 tokens** |
| go-login-crud | plain | 1500 | 1100 | **2600 tokens** |
| go-login-crud | skill-guided | 3800 | 2600 | **6400 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 78 | 566 | `Skipped` | **32%** |
| | Skill-Guided | 240 | 1866 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 80 | 588 | `Skipped` | **22%** |
| | Skill-Guided | 143 | 1027 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 135 | 886 | `Skipped` | **49%** |
| | Skill-Guided | 587 | 3835 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (-) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (-) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
