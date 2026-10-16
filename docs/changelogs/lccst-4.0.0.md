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
