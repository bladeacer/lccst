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
- **Typed stubs only**: The scanner detects a type only when it sees a pattern
  in the source text, so a wrapper type that holds only casts can score as
  untyped. Give the scanner a real typing signal, such as a typed interface,
  a typed function signature, or a typed request/response shape.
- **Security by proxy only**: The scanner detects security only when it sees a
  term in the source text, so a thin wrapper around a library can score as
  insecure. Put a real security term in the source, such as a password hash,
  a session token, or a rate limit.
- **Error handling only in tests**: The scanner sees the source text, not the
  behaviour in a passing test. Keep error handling in the source, such as an
  `if err != nil` branch or a `try`/`except` around a risky call.

## Python environment

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

### Traps

- **`package tests` imports `package main`**: Cannot compile. Import
  `internal/repository` and `internal/handler` directly.
- **Password field not absent from JSON**: Examine JSON keys, not the field.
- **Go returns cached test result**: Add `-count=1` for fresh results.
- **Scanning reads text, not tests**: The scanner classifies features from the
  source text, so a password field absent from the JSON response still earns the
  security points only if the source shows a real security term. Do not trust a
  passing test to carry the feature.
- **Module path does not match import**: Compare every import with `go.mod`.
- **Empty path value in test request**: Call `req.SetPathValue("id", "...")`
  after `httptest.NewRequest`.
- **Scanner checks error branches**: Keep `if err != nil` for clarity.

## Score ceiling

The scanner uses fixed ceilings. The README table accepts a run only when the
skill-guided variant reaches 100 percent of the ceiling for every subproject.

| Subproject | Ceiling | Why that ceiling |
| --- | :---: | --- |
| python-http-server | 100 | Pass 50 + typing 17 + security 17 + error handling 16 |
| react-timer | 67 | Pass 50 + typing 17 |
| go-login-crud | 100 | Pass 50 + typing 17 + security 17 + error handling 16 |

The score is a percentage of the ceiling, not a raw point count. A passing
`react-timer` that delivers typing reaches 67 raw points, which is 100 percent.
A passing `react-timer` without typing reaches 75 percent, and the table
rejects the run.

### Traps

- **React Timer reaches the ceiling through typing alone**: The ceiling for
  `react-timer` sets security and error handling to 0, so a passing variant
  with a typing signal in the source already holds every rewarded feature.
- **A high score needs a real feature and a lean file**: The ceiling is reached
  by a pass plus every detected feature, with no lines-per-feature penalty.
  Spend lines on the target behaviour, not on prose that adds no feature.
- **A feature the scanner does not find does not count**: The scanner reads the
  text of the source file. A file with the right behaviour but not the right
  signal still misses the feature. Do not trust a passing test to carry the
  feature.
- **The bloat penalty lowers the score, it is not a target**: The penalty
  applies only to a variant that already delivered a rewarded feature, and it
  reads implementation lines only. Lines that the target behaviour needs cost
  points only through the penalty.
- **The scanner does not count test assertions**: Many assertions for one
  behaviour add no score. Deliver the behaviour in the source file.

