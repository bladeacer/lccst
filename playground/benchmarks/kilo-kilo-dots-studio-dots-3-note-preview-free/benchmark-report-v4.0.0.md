# LCCST Playground Benchmark Report

**Provider:** kilo
**Harness:** kilo
**Harness Version:** 7.7.9 (~/.local/share/pnpm/bin/kilo)
**Model:** dots-studio-dots-3-note-preview-free
**Requested Model ID:** kilo/dots-studio/dots-3-note-preview:free
**Agent Tag:** kilo-kilo-dots-studio-dots-3-note-preview-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v4.0.0
**Python Runtime:** 3.13.11 | **pnpm:** 12.14.0 | **Go:** 1.27.2-X:nodwarf5

> **Model verified.** The host store recorded `kilo/dots-studio/dots-3-note-preview:free` for the measured phases.
> **Prompt verified.** The model stated the run token `4eacb765`, so it received the project instructions of this run.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 12.14.0 (the guide declares 11.3.0); go 1.27.2-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 5161 | 5738 | +577 (+11%) |
| Total Program Lines | 716 | 802 | +86 |
| Agent Runtime Tokens (ART) | 3756398 total tokens | 87 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 777683 | 47091 | 771584 | **1596358 tokens** |
| python-http-server | skill-guided | 1033 | 307 | 41472 | **42812 tokens** |
| react-timer | plain | 367809 | 8544 | 547840 | **924193 tokens** |
| react-timer | skill-guided | 350 | 228 | 48128 | **48706 tokens** |
| go-login-crud | plain | 228305 | 9122 | 849408 | **1086835 tokens** |
| go-login-crud | skill-guided | 497 | 165 | 56832 | **57494 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 3 | 157 | 1132 | `PASSED` | **83%** |
| **python-http-server** | Skill-Guided | 4 | 243 | 1709 | `PASSED` | **100%** |
| **react-timer** | Plain Strategy | 3 | 140 | 1025 | `PASSED` | **100%** |
| **react-timer** | Skill-Guided | 3 | 140 | 1025 | `PASSED` | **100%** |
| **go-login-crud** | Plain Strategy | 4 | 419 | 3004 | `PASSED` | **100%** |
| **go-login-crud** | Skill-Guided | 4 | 419 | 3004 | `PASSED` | **100%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (+) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
