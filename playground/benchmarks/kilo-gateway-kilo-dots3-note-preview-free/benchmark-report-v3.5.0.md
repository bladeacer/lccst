# LCCST Playground Benchmark Report

**Provider:** kilo-gateway
**Harness:** kilo
**Model:** dots3-note-preview-free
**Agent Tag:** kilo-gateway-kilo-dots3-note-preview-free
**Active Ecosystem MCPs:** `lccst-telemetry`
**Skill Protocol Engine:** v3.5.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.26.0 | **Go:** 1.27.1-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1964 | 6874 | +4910 (+250%) |
| Total Program Lines | 271 | 949 | +678 |
| Agent Runtime Tokens (ART) | 3692 total tokens | 7 execution loops tracked over development lifecycles | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|
| python-http-server | plain | 121 | 41 | **162 tokens** |
| python-http-server | skill-guided | 480 | 220 | **700 tokens** |
| react-timer | plain | 200 | 90 | **290 tokens** |
| react-timer | skill-guided | 620 | 320 | **940 tokens** |
| go-login-crud | plain | 380 | 180 | **560 tokens** |
| go-login-crud | skill-guided | 700 | 340 | **1040 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 88 | 714 | `Skipped` | **48%** |
| | Skill-Guided | 246 | 2000 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 70 | 480 | `Skipped` | **22%** |
| | Skill-Guided | 174 | 1232 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 113 | 770 | `Skipped` | **65%** |
| | Skill-Guided | 529 | 3642 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (-) |
| python-http-server | Guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (-) | (-) | (-) | (-) |
| react-timer | Guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (-) |
| go-login-crud | Guided | (+) | (+) | (+) | (+) |
