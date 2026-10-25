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
- **Scanner checks error branches**: Keep `if err != nil` for clarity.## Score ceiling

The scanner uses fixed ceilings. The README table accepts a run only when the
skill-guided variant reaches the ceiling for every subproject. The ceilings are
not advice. They are the same numbers the scanner awards.

| Subproject | Ceiling | Why that ceiling |
| --- | :---: | --- |
| python-http-server | 100 | Pass 50 + typing 17 + security 17 + error handling 16 |
| react-timer | 67 | Pass 50 + typing 17 |
| go-login-crud | 100 | Pass 50 + typing 17 + security 17 + error handling 16 |

### Traps

- **Plain React Timer cannot earn security points**: The rubric ceiling for
  `react-timer` sets `Max Security` to 0 and `Max Error Handling` to 0. Do not
  chase those features for the plain React Timer.
- **Plain React Timer can still pass**: A pass earns 50 points, and the typing
  ceiling adds 17 points. That is enough for a passing plain React Timer.
- **Skill-guided variants must reach the ceiling on every subproject**: The README
  table rejects a run whose skill-guided variant falls below the ceiling on any
  subproject.
- **Same rubric, different ceiling**: The plain variant and the skill-guided
  variant share the same rubric. The feature ceiling is the only thing that
  differs by subproject.
- **`Max Typing`, `Max Security`, and `Max Error Handling` are rubric ceilings**:
  they are not separate bonuses. They set the maximum points the rubric can award
  for each feature class on that subproject.
- **A skill-guided React Timer must reach 67, not 100**: the ceiling for
  `react-timer` is 67. A skill-guided React Timer that passes and delivers every
  rewarded feature for that subproject reaches 67. A skill-guided React Timer that
  passes and delivers only typing reaches at most 67.
- **A skill-guided React Timer can fail the gate with a passing test**: the README
  table rejects a skill-guided React Timer that passes but scores below 67.
- **Do not confuse ceiling with target**: the 100 gate is the README table, not
  the rubric. The rubric ceiling for `react-timer` is 67, and the rubric ceiling
  for `python-http-server` and `go-login-crud` is 100.
- **A high score needs a real feature and a short file**: The ceiling is reached
  by a pass plus every detected feature, with no lines-per-feature penalty. A file
  that carries a feature but also carries many lines of prose can fail the gate
even with the right feature text, so keep the variant small and the feature real.
- **A feature the scanner does not find does not count**: The scanner checks the
  text of the source file. If the file has the right behaviour but not the right
  term, the score still misses that feature. Do not assume the test proves the
  feature to the scanner.
- **Do not split the score into the wrong buckets**: The scanner and the report
  use the words `plain` and `skill-guided`. Do not use `Strategy` and
  `Routine` in your own work, except when you quote the report labels. The report
  labels are not a second model and they are not a second rubric.
- **The ceiling and the bloat penalty are not the same check**: The ceiling says
  how many points the rubric can award. The bloat penalty says whether a variant
  that already reached the ceiling stays there after the scanner looks at its
  lines. A variant can hit the ceiling and still lose points to bloat. Do not
  confuse the two.
- **The scanner does not check the test for the feature score**: The scanner looks
  at the source file, not at the test result, for typing, security, and error
  handling. A test that asserts the feature does not put the feature into the
  source score. It also does not count the number of assertions. Do not pad the
  test file with many assertions expecting the same thing. The scanner does not
  turn that into score, and it can turn into bloat, and it can fail the gate even
  when the test passes.
