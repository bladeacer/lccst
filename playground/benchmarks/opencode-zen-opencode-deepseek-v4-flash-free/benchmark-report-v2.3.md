# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v2.3
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2235 | 8861 | +6626 (+296%) |
| Total Program Lines | 317 | 1233 | +916 |
| Agent Runtime Tokens (ART) | 173420 total tokens | 13 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 7032 | 3001 | **10033 tokens** |
| python-http-server | skill-guided | 28492 | 12158 | **40650 tokens** |
| react-timer | plain | 5652 | 2412 | **8064 tokens** |
| react-timer | skill-guided | 10143 | 4328 | **14471 tokens** |
| go-login-crud | plain | 11797 | 5034 | **16831 tokens** |
| go-login-crud | skill-guided | 58434 | 24937 | **83371 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 79 | 642 | `Skipped` | **48%** |
| | Skill-Guided | 302 | 2601 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 68 | 516 | `Skipped` | **22%** |
| | Skill-Guided | 134 | 926 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 170 | 1077 | `Skipped` | **49%** |
| | Skill-Guided | 797 | 5334 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | [+] | [-] | [+] | [-] |
| python-http-server | Guided | [+] | [+] | [+] | [+] |
| react-timer | Plain | [-] | [-] | [-] | [-] |
| react-timer | Guided | [+] | [-] | [-] | [+] |
| go-login-crud | Plain | [+] | [+] | [-] | [-] |
| go-login-crud | Guided | [+] | [+] | [+] | [+] |
