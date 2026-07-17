# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v2.5 (Standalone Single-File System)
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 2105 | 7113 | +5008 (+238%) |
| Total Program Lines | 306 | 1009 | +703 |
| Agent Runtime Tokens (ART) | 17429 total tokens | 6 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 913 | 186 | **1099 tokens** |
| python-http-server | skill-guided | 2771 | 565 | **3336 tokens** |
| react-timer | plain | 604 | 123 | **727 tokens** |
| react-timer | skill-guided | 1480 | 302 | **1782 tokens** |
| go-login-crud | plain | 1786 | 364 | **2150 tokens** |
| go-login-crud | skill-guided | 6919 | 1416 | **8335 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 76 | 582 | `Skipped` | **48%** |
| | Skill-Guided | 217 | 1765 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 60 | 385 | `Skipped` | **22%** |
| | Skill-Guided | 132 | 943 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 170 | 1138 | `Skipped` | **65%** |
| | Skill-Guided | 660 | 4405 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | [+] | [-] | [+] | [-] |
| python-http-server | Guided | [+] | [+] | [+] | [+] |
| react-timer | Plain | [-] | [-] | [-] | [-] |
| react-timer | Guided | [+] | [-] | [-] | [+] |
| go-login-crud | Plain | [+] | [+] | [+] | [+] |
| go-login-crud | Guided | [+] | [+] | [+] | [+] |
