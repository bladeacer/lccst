# LCCST Playground Guide

## Purpose

This guide states the environment and operational constraints for a
benchmark run. For implementation guidance, use `SKILL.md`.

## Clean-room sandbox rules

- Do not alter, upgrade, or modify global packages at run time.
- Do not read, write, or delete any path outside the current workspace.
- Do not use a global test runner when a project runner exists.
- Do not change the benchmark scanner or its file patterns.
- Do not create a symlink to bypass a Go `internal/` boundary.

Blocked inspection commands: `ls`, `find`, `git status`, `git diff`,
`git log`, `open`. Do not simulate their output.

## Supplied toolchain

- Go 1.26.4-X with `nodwarf5`.
- Python 3.13.11 with `uv` 0.4+.
- Node.js 18+ with pnpm 11.3.0+.
- Pre-cached TypeScript type definitions.

The system `python3` can resolve to Python 3.14.5. Use `uv run python3` to
select the supplied 3.13.11 environment. Do not run bare `pytest`.

## Token accounting

The `lccst-telemetry` MCP server measures the token usage of the model. At the
end of a phase, the server reads the counts of the model turns from the host
session store. The model does not supply the counts, because a model cannot
know its own token usage.

The server needs two items from the host:

- The host session store. The server reads the file that `OPENCODE_DB` names.
  Without the variable, the file sits in the host data directory.
- The host session identifier, or a session for the workspace directory. The
  host sends the identifier in the tool call metadata.

The server needs Node.js 22.5 or later, because it reads the store with
`node:sqlite`.

If the host supplies neither item, the server reports an error. The report
then states that no runtime tokens were measured. Do not enter an estimate.

Cache read tokens are counted apart from prompt tokens, because the host
re-reads the context on every turn.

## pnpm 11 build approval

pnpm 11 requires approval for packages that run build scripts. The Jest
dependency `unrs-resolver` can stop an install until it is approved.

If `unrs-resolver` stops the install:

- Add `allow-builds=unrs-resolver` to `.npmrc`.
- Or add `onlyBuiltDependencies: [unrs-resolver]` to `pnpm-workspace.yaml`.
- Or run `pnpm approve-builds`.

Then run `pnpm install --no-frozen-lockfile`.

## React and TypeScript files

Use a standard TypeScript and React project structure. Configuration files do
not add points. Functional source and test files must use the `.tsx` extension.

### Known traps

- **Missing `jest-environment-jsdom`**: Add it to `devDependencies` before
  install.
- **pnpm blocks `unrs-resolver`**: Add `allow-builds=unrs-resolver` before
  install.
- **`formatTime` floating-point drift**: Use
  `Math.floor((seconds - totalSecs) * 10 + 0.0001)` or
  `Math.round((seconds - totalSecs) * 10)`.
- **`TimerDisplay` stores a copy in state**: Render `formatTime(time)` from
  props. Remove local state.
- **`ts-jest` rejects `toHaveTextContent`**: Read `.textContent` and compare
  with `expect(...).toBe(...)`.
- **`.ts` file not counted**: Scanner matches `.tsx` only. Rename to `.tsx`.
- **Workspace install empty but Jest not found**: Add a `packages` key with the
  playground project paths to root `pnpm-workspace.yaml`. Run `pnpm install`
  again.

## Python environment

Declare dependencies in `[dependency-groups]` or `[tool.uv] dev-dependencies`.
Run `uv sync` in the skill-guided project. The benchmark removes `VIRTUAL_ENV`.
Use `uv run python3`.

### Known traps

- **Rate limiter blocks tests**: Set `DISABLE_RATE_LIMIT=1` before import.
- **Email expression too narrow**: Use
  `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`.
- **`uv` selects parent environment**: Remove `VIRTUAL_ENV` before the command.
- **Environment variable set too late**: Set before import.
- **Test does not consume server fixture**: Add `server_url` parameter to each
  HTTP test. Bind to port `0` and return the assigned URL.
- **Forked server has separate state**: Run server and tests in one process.
  Use `users.clear()` before each test.
- **Python is not 3.13.11**: Use `uv run python3`.
- **Python source under `src/`**: Scanner does not count it. Put source at the
  root of `skill-guided/`.

## Go test packages

Keep tests under `tests/` with `package tests`. Set up repository and handler
in test setup. Do not import `cmd/server` from a test package.

### Known traps

- **`package tests` imports `package main`**: Cannot compile. Import
  `internal/repository` and `internal/handler` directly.
- **Password field not absent from JSON**: Examine JSON keys, not the field.
- **Go returns cached test result**: Add `-count=1` for fresh results.
- **Module path does not match import**: Compare every import with `go.mod`.
- **Empty path value in test request**: Call `req.SetPathValue("id", "...")`
  after `httptest.NewRequest`.
- **Scanner checks error branches**: Keep `if err != nil` for clarity.
