# LCCST Playground Benchmark Report

**Provider:** opencode
**Harness:** opencode
**Harness Version:** opencode v2.0.22 (/usr/bin/opencode)
**Model:** longcat-2.5-preview-free
**Requested Model ID:** opencode/longcat-2.5-preview-free
**Agent Tag:** opencode-opencode-longcat-2.5-preview-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.8.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.28.3 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `opencode/longcat-2.5-preview-free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.28.3 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.
> **Install notes.** react-timer in skill-guided: the install failed (Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.).

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 7007 | 10745 | +3738 (+53%) |
| Total Program Lines | 888 | 1351 | +463 |
| Agent Runtime Tokens (ART) | 3240244 total tokens | 42 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 63053 | 48142 | 173952 | **285147 tokens** |
| python-http-server | skill-guided | 10215 | 9071 | 242560 | **261846 tokens** |
| react-timer | plain | 4650 | 3383 | 333056 | **341089 tokens** |
| react-timer | skill-guided | 19334 | 16755 | 1655936 | **1692025 tokens** |
| go-login-crud | plain | 8823 | 8343 | 292992 | **310158 tokens** |
| go-login-crud | skill-guided | 10473 | 9906 | 329600 | **349979 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 2 | 281 | 2303 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 7 | 503 | 4090 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 3 | 108 | 766 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 7 | 168 | 1281 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 499 | 3938 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 5 | 680 | 5374 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
