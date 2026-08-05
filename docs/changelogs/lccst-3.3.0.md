### LCCST 3.3.0

Date: _2026-08-05_

Restores strict-by-default defensive guardrails and consolidates the skill
file to eliminate prompt redundancy.

## Correctness

### Restore Transport Guardrails Under `lean`

The v3.2.0 `lean` definition ("skips rate limiting, caching, structured
error types... unless the domain demands them") incentivized stripping core
defensive guardrails from HTTP server payloads, dropping the Robustness
Guardrails feature score from `(+)` to `(-)` in `python-http-server`.

`lean` now omits rate limiting and caching for pure logic/UI helpers only;
network/data handlers MUST still include boundary validation, typed errors,
and rate throttling. A dedicated `Defensive rules` bullet makes this
non-negotiable for every transport entry point.

### Bump Script Multi-Match Fix

`scripts/bump-version.ts` only replaced the first `version` occurrence in
`tests/init_handshake.test.ts`, so the `serverInfo` assertion could drift
from the `clientInfo` payload after a version sync, failing the MCP
handshake test. The test-file regex now uses the global flag to update every
occurrence.

## Consistency

### Section 4 & 6 Consolidation

The `## 6. Invariants` section duplicated rules already declared in
`## 1. Mandate`, `## 4. Guardrails`, and `## 5. Ecosystem Discovery`
(continuity, guard integrity, verify-first, token discipline). The two
sections were merged into `## 4. Guardrails & Execution Invariants`,
dropping ~7 lines of redundant text without losing behavioral constraints.
`## 7. Execution Path` renumbered to `## 6`.

### Compact Manifest Mapping

Section 5's `manifest_map` block was rewritten as a dense lookup list and the
5-rung Tooling Ladder collapsed to 4 rungs (global binaries folded into the
fallback tier). Ladder order, project-script preference, and state tracking
are preserved.

## New Features

### Strict Mode Default

`mode` now defaults to `strict`, guaranteeing 100% robustness on HTTP/DB
routes. `lean` remains available for pure logic/UI helpers.

## Breaking Changes

None. `strict` remains the behavior of record; `lean` is now scoped
narrower than before (network handlers are no longer exempt from core
guardrails).

## Version

Bumped from 3.2.0 to 3.3.0.
