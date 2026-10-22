### LCCST 4.3.0

Date: _2026-10-22_

The README opening claim now names the invariants the protocol actually
enforces. The skill file and the MCP server already enforced single
responsibility, cohesion, and strict test verification; the README over-claimed
SOLID enforcement and a production gate that the server does not implement.
The parity check gains a capability-claim rule so a README claim must match a
SKILL.md rule or an MCP check.

## Correctness

### README Claim Aligned to the Protocol

The opening paragraph previously named "architectural cohesion and SOLID
invariants". The server enforces neither. It now names the three invariants
that the skill and the server do enforce: single responsibility, cohesion, and
strict test verification.

### SKILL.md Line Split

The hermetic-lockfile rule and the manifest rule ran together on one line.
They now occupy separate bullets.

## Consistency

### Parity Check Gains a Capability-Claim Rule

`scripts/test-parity.ts` previously checked command sets, argument docs, the
tooling ladder, versions, and the reply envelope. It now also checks that
every capability claim in the README opening paragraph matches a rule in
SKILL.md or a check in the MCP server. A claim with no backing rule fails the
check.

## New Features

- A capability-claim parity rule in `scripts/test-parity.ts`.

## Breaking Changes

None. The release is a minor version bump.

## Version

Bumped from 4.2.0 to 4.3.0.