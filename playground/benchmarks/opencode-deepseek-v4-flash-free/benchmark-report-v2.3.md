# LCCST Playground Benchmark Report

**Agent Configuration:** opencode-deepseek-v4-flash-free
**Active Ecosystem MCPs:** `None detected`
**Skill Protocol Engine:** v2.3
**Python Runtime:** 3.13.11 | **pnpm:** 11.3.0 | **Go:** 1.26.4-X:nodwarf5

## Operational Metrics Summary

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 1928 | 6716 | +4788 (+248%) |
| Total Program Lines | 289 | 995 | +706 |
| Agent Runtime Tokens (ART) | — | 0 | 0 prompt / 0 completion (0 turns) |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 84 | 639 | `Skipped` | **48%** |
| | Skill-Guided | 261 | 2038 | `PASSED` | **84%** |
| **react-timer** | Plain Strategy | 59 | 402 | `Skipped` | **22%** |
| | Skill-Guided | 117 | 794 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 146 | 887 | `Skipped` | **49%** |
| | Skill-Guided | 617 | 3884 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | ✅ | ❌ | ✅ | ❌ |
| python-http-server | Guided | ✅ | ✅ | ❌ | ✅ |
| react-timer | Plain | ❌ | ❌ | ❌ | ❌ |
| react-timer | Guided | ✅ | ❌ | ❌ | ✅ |
| go-login-crud | Plain | ✅ | ✅ | ❌ | ❌ |
| go-login-crud | Guided | ✅ | ✅ | ✅ | ✅ |
