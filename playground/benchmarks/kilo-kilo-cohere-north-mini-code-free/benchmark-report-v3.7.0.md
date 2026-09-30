# LCCST Playground Benchmark Report

**Provider:** kilo
**Harness:** kilo
**Harness Version:** 7.7.9 (~/.local/share/pnpm/bin/kilo)
**Model:** cohere-north-mini-code-free
**Requested Model ID:** kilo/cohere/north-mini-code:free
**Agent Tag:** kilo-kilo-cohere-north-mini-code-free
**Active Ecosystem MCPs:** lccst-telemetry
**Skill Protocol Engine:** v3.7.0
**Python Runtime:** 3.13.11 | **pnpm:** 11.26.0 | **Go:** 1.27.1-X:nodwarf5

> **Model verified.** The host store recorded `kilo/cohere/north-mini-code:free` for the measured phases.
> **Prompt unverified.** No turn of the run stated the run token `4eacb765`, so the report cannot confirm that the model received `AGENTS.md`. Do not use this report.
> **Measured runtime tokens.** The settle step read every count from the store of the host that ran the phase.
> **Toolchain drift.** pnpm 11.26.0 (the guide declares 11.3.0); go 1.27.1-X:nodwarf5 (the guide declares 1.26.4-X). A drift changes every score, so do not compare this report with a run on another machine.
> **Install notes.** react-timer in plain: the install failed (Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.).; react-timer in skill-guided: the install failed (Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.).; go-login-crud in plain: the install failed (go.mod:5: unknown directive: directory).; go-login-crud in skill-guided: the install failed (go.mod:5: unknown directive: directory).

## Operational Metrics Summary

Both columns were measured with the same file filter and the same test command,
so the delta is a difference between two implementations and not between two
rules.

| Metric Dimension | Plain Strategy | Skill-Guided Routine | Delta Variance |
|---|:-:|:-:|:-:|
| File-Content Tokens (FCT) | 11678 | 13951 | +2273 (+19%) |
| Total Program Lines | 1659 | 1989 | +330 |
| Agent Runtime Tokens (ART) | 1409691 total tokens | 54 model turns over 6 phases | -- |

## Runtime Cost Partitioning (ART breakdown)

| Project Target Module | Variant Strategy | Prompt Tokens | Completion Tokens | Cache Read Tokens | Combined Cost Overhead |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | plain | 574254 | 12690 | 0 | **586944 tokens** |
| python-http-server | skill-guided | 164448 | 7093 | 0 | **171541 tokens** |
| react-timer | plain | 186752 | 3678 | 0 | **190430 tokens** |
| react-timer | skill-guided | 193276 | 3837 | 0 | **197113 tokens** |
| go-login-crud | plain | 109424 | 7138 | 0 | **116562 tokens** |
| go-login-crud | skill-guided | 138933 | 8168 | 0 | **147101 tokens** |

## Robustness Metrics

| Project Submodule Target | Strategy Variant | Files | Lines | Tokens | Unit Test Standing | Robustness Score |
|---|---|:-:|:-:|:-:|:-:|:-:|
| **python-http-server** | Plain Strategy | 4 | 540 | 4177 | `FAILED (code 1)` | **48%** |
| **python-http-server** | Skill-Guided | 4 | 704 | 5361 | `FAILED (code 1)` | **48%** |
| **react-timer** | Plain Strategy | 3 | 330 | 1892 | `ERROR: the test command found no test` | **32%** |
| **react-timer** | Skill-Guided | 3 | 364 | 2157 | `ERROR: the test command found no test` | **32%** |
| **go-login-crud** | Plain Strategy | 2 | 789 | 5609 | `FAILED (code 1)` | **65%** |
| **go-login-crud** | Skill-Guided | 2 | 921 | 6433 | `FAILED (code 1)` | **65%** |

## Feature Matrix Completeness

| Project Target | Strategy | Explicit Typing | Security Measures | Robustness Guardrails | Test Assertions |
|---|---|:-:|:-:|:-:|:-:|
| python-http-server | Plain | (+) | (-) | (+) | (+) |
| python-http-server | Skill-guided | (+) | (-) | (+) | (+) |
| react-timer | Plain | (+) | (-) | (-) | (+) |
| react-timer | Skill-guided | (+) | (-) | (-) | (+) |
| go-login-crud | Plain | (+) | (+) | (+) | (+) |
| go-login-crud | Skill-guided | (+) | (+) | (+) | (+) |
