# LCCST Playground Traps

The `skill-guided` variant reads this file. The `plain` variant does not. The
file names the mistakes that cost the most time in earlier runs, so the guided
variant does not repeat them. The plain variant finds them alone, which is the
point of the comparison.

A trap is a known failure of the supplied toolchain or of the scanner. A trap is
not a target specification. Read `README.md` and `guide.md` for the
specification.

## pnpm 11 build approval

pnpm 11 requires approval for packages that run build scripts. The Jest
dependency `unrs-resolver` can stop an install until it is approved.

If `unrs-resolver` stops the install:

- Add `allow-builds=unrs-resolver` to `.npmrc`.
- Or add `onlyBuiltDependencies: [unrs-resolver]` to `pnpm-workspace.yaml`.
- Or run `pnpm approve-builds`.

Then run `pnpm install --no-frozen-lockfile`.

## React and TypeScript files

Use a standard TypeScript and React project structure. The scanner counts
functional source and test files with the `.tsx` extension. A `.ts` file is not
counted.

### Traps

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
- **`.ts` file not counted**: The scanner matches `.tsx` only. Rename to `.tsx`.
- **Workspace install empty but Jest not found**: Add a `packages` key with the
  playground project paths to the root `pnpm-workspace.yaml`. Run `pnpm install`
  again.

## Python environment

Declare dependencies in `[dependency-groups]` or `[tool.uv] dev-dependencies`.
The benchmark removes `VIRTUAL_ENV`. Use `uv run python3`.

### Traps

- **Rate limiter blocks tests**: Set `DISABLE_RATE_LIMIT=1` before import.
- **Email expression too narrow**: Use
  `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`.
- **`uv` selects parent environment**: Remove `VIRTUAL_ENV` before the command.
- **Environment variable set too late**: Set before import.
- **Test does not consume server fixture**: Add `server_url` parameter to each
  HTTP test. Bind to port `0` and return the assigned URL.
- **Forked server has separate state**: Run server and tests in one process.
  Use `users.clear()` before each test.
- **Python is not the declared version**: Use `uv run python3`.
- **Python source under `src/`**: The scanner counts the whole variant
  directory, so a source file under `src/` is counted.

## Go test packages

Keep tests under `tests/` with `package tests`. Set up repository and handler in
test setup. Do not import `cmd/server` from a test package.

### Traps

- **`package tests` imports `package main`**: Cannot compile. Import
  `internal/repository` and `internal/handler` directly.
- **Password field not absent from JSON**: Examine JSON keys, not the field.
- **Go returns cached test result**: Add `-count=1` for fresh results.
- **Module path does not match import**: Compare every import with `go.mod`.
- **Empty path value in test request**: Call `req.SetPathValue("id", "...")`
  after `httptest.NewRequest`.
- **Scanner checks error branches**: Keep `if err != nil` for clarity.
