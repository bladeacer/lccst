# LCCST Playground Traps

The `skill-guided` variant reads this file. The `plain` variant does not. The
file names the mistakes that cost the most time in earlier runs, so the guided
variant does not repeat them. The plain variant finds them alone, which is the
point of the comparison.

A trap is a known failure of the supplied toolchain, or a known habit that
ruins an implementation. A trap is not a target specification. Read `guide.md`
for the specification. A trap never asks for a behaviour that `guide.md` does
not state. A guard whose need the assignment does not state is waste, and the
variant removes it.

## pnpm 11 build approval

pnpm 11 requires approval for packages that run build scripts. The Jest
dependency `unrs-resolver` can stop an install until it is approved.

If `unrs-resolver` stops the install:

- Add `allow-builds=unrs-resolver` to `.npmrc`.
- Or add `onlyBuiltDependencies: [unrs-resolver]` to `pnpm-workspace.yaml`.
- Or run `pnpm approve-builds`.

Then run `pnpm install --no-frozen-lockfile`.

## React and TypeScript files

Use a standard TypeScript and React project structure. Store components and
tests in `.tsx` files.

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
- **Types that hold only casts**: A wrapper type that holds only casts
  describes no data. Declare the real shapes: an interface for the data, typed
  props, and typed function signatures.

## Python environment

The benchmark removes `VIRTUAL_ENV`. Use `uv run python3`.

### Traps

- **Rate limiter blocks tests**: The assignment states no rate limiter. A
  rate limiter that no rule asks for blocks the tests: remove it, or set
  `DISABLE_RATE_LIMIT=1` before import when one exists.
- **Email expression too narrow**: Use
  `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`.
- **`uv` selects parent environment**: Remove `VIRTUAL_ENV` before the command.
- **Environment variable set too late**: Set before import.
- **Test does not consume server fixture**: Add `server_url` parameter to each
  HTTP test. Bind to port `0` and return the assigned URL.
- **Forked server has separate state**: Run server and tests in one process.
  Use `users.clear()` before each test.
- **Python is not the declared version**: Use `uv run python3`.
- **Source under `src/`**: The variant directory is one small server. Place
  the module at its root, and the tests under `tests/`.

## Go test packages

### Traps

- **`package tests` imports `package main`**: Cannot compile. Move the types
  and handlers into one importable package, such as `internal/store`, and
  import that.
- **Password field not absent from JSON**: Examine JSON keys, not the field.
- **Go returns cached test result**: Add `-count=1` for fresh results.
- **Module path does not match import**: Compare every import with `go.mod`.
- **Empty path value in test request**: Call `req.SetPathValue("id", "...")`
  after `httptest.NewRequest`.
- **Missing error branches**: Check each error that a call returns when the
  caller must see the failure: `if err != nil`. A missing branch hides a
  failure from the caller.

## Guards

The traps in this section apply only to a behaviour that the assignment
states.

- **Security by proxy only**: When the assignment states a security need, a
  thin wrapper around a library protects nothing. Give the source its own
  check: hash a password, check a session, or enforce a stated limit.
- **Error handling only in tests**: When the assignment states a failure
  mode, write the guard in the source: a `try`/`except` around a risky call,
  or an error branch. A passing test does not guard a caller.
