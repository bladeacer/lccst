### LCCST 4.0.0

Date: _2026-10-16_

The manifest order now matches the Tooling Ladder, the Julia manifest is removed,
and the version policy is documented.

## Breaking Changes

### Manifest Order Aligned with Tooling Ladder

The manifest priority order in the code now matches the order in `SKILL.md`.
A repository that holds both `package.json` and `Cargo.toml` resolves to Rust
instead of Node, because `Cargo.toml` now appears before `package.json`.

The order is: `pyproject.toml`, `Cargo.toml`, `go.mod`, `package.json`,
`Makefile`, `CMakeLists.txt`. The `Makefile` manifest is new.

### Julia Manifest Removed

`Project.toml` is no longer a recognised manifest. A Julia project that held
only `Project.toml` now reports type `unknown` and no test command. The manifest
was never documented in `SKILL.md` or `README.md`.

### Error Replies Use One Envelope

A path error or a "not a git repository" reply was plain text with the MCP
`isError` flag, so a client had to parse two reply shapes. A client that read
plain text could not read the envelope, and vice versa.

Every tool error now returns the envelope with `success: false` and a
`payload.error` object. The plain-text `errorReply` is removed. A client that
read plain-text errors must read `payload.error` instead.

## Correctness

### Manifest Order Matches the Specification

The code order was `pyproject.toml`, `package.json`, `Cargo.toml`, `go.mod`,
`CMakeLists.txt`, `Project.toml`. The `SKILL.md` order was `pyproject.toml`,
`Cargo.toml`, `go.mod`, `package.json`, `Makefile`, `CMakeLists.txt`. A
repository with both `package.json` and `Cargo.toml` therefore resolved to
different types in the code and in the specification.

The code order is now the same as the `SKILL.md` order. The `Makefile` manifest
is added to the code and gains a test command of `make test` and a build command
of `make build`.

### Unknown Subproject Is Refused

`checkPhase` recorded `ready: true` for a subproject the server does not know,
so the telemetry record could hold a phantom phase for a subproject with no
manifest.

It now returns `ready: false` with a reason for an unknown subproject, so the
record holds no phase until the subproject is known.

### The Integration Runner Treats Stderr as Debug

The test runner failed on any standard-error byte, so a debug line failed a
healthy server. Standard error is now debug output and never fails a run. Only a
server that sends no valid frame before the timeout fails.

## Consistency

### Version Policy Documented

`SKILL.md` now states the version policy: major for breaking protocol changes,
minor for new features, patch for bug fixes. The policy was implicit before.

## New Features

### Makefile as a Manifest

A repository with a `Makefile` and no other manifest now resolves to type
`makefile` with a test command of `make test` and a build command of `make build`.
The `Makefile` manifest has no format or lint command.

## Version

Bumped from 3.10.0 to 4.0.0.
