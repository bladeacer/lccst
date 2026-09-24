# LCCST Playground Implementation Guide

## Purpose

This guide defines the three benchmark subprojects, the two implementation
variants, and the clean-room rules for each run. Use the target specification
in this guide. For a skill-guided run, also apply `SKILL.md`.

The benchmark harness supplies the sandbox and records telemetry. The harness
does not change the target specification.

## Terms

Use these terms with one meaning:

- A **benchmark workspace** is a directory named
  `<provider>-<harness>-<model>`.
- A **subproject** is one of `python-http-server`, `react-timer`, or
  `go-login-crud`.
- A **variant** is `plain` or `skill-guided`.
- A **target path** is the path below the benchmark workspace that contains one
  subproject.
- A **target specification** defines the required behaviour and file layout for
  a subproject.
- A **source file** is a project file that matches a scanner path.
- A **test file** is a test file that matches a scanner path.
- The **scanner** is the file matcher and feature detector in
  `benchmarks/run_benchmark.py`.
- A **mode** is the LCCST `strict` or `lean` defence level. A mode is not a
  benchmark variant.

## Variant contract

The benchmark prompt defines the variant sequence before implementation starts.
Follow this contract exactly:

- For `plain`, do not load or apply the rules in `SKILL.md`. Implement the
  smallest working program that meets the target specification. Do not add
  tests, manifests, or layers unless the target specification requires them.
- For `skill-guided`, load and apply `SKILL.md`. Add the required structure,
  type boundaries, tests, and public docstrings.
- For both variants, stay inside the benchmark workspace. Do not read, write,
  or delete files outside it.
- For both variants, call `log_turn_telemetry` at the end of each requested
  implementation phase. Pass `subproject`, `variant`, `prompt_tokens`, and
  `completion_tokens`. Do not submit telemetry when a token count is
  unavailable. Telemetry is benchmark instrumentation, not part of the plain
  implementation.

The harness does not run plain-variant tests. It measures plain source files
and feature markers. It runs the skill-guided test command for each subproject.

## Project targets

### 1. Python HTTP Server

The plain variant provides user create, read, update, and delete operations:
`GET`, `POST`, `PUT`, and `DELETE`.

The skill-guided variant must:

- Add boundary validation for request data.
- Add an email regular expression.
- Add a rate limiter that reads `DISABLE_RATE_LIMIT` at module import time.
- Add type hints.
- Add a `pyproject.toml` manifest with a test dependency.

Put skill-guided source files at the root of `skill-guided/`. Put skill-guided
tests in `skill-guided/tests/`. The scanner does not count
`skill-guided/src/*.py`.

Run the benchmark test command from `python-http-server/skill-guided/`:

```bash
uv run python3 -m pytest tests/ -v --tb=short
```

The harness sets `DISABLE_RATE_LIMIT=1` and removes `VIRTUAL_ENV` for this
command. The test process and the server must use the same interpreter.

### 2. React Timer

The plain variant uses HTML and JavaScript. It provides start, stop, and reset
actions.

The skill-guided variant uses TypeScript and React. It must contain:

- A `Timer` class for timer state
- A `TimerDisplay` component for the view
- A `formatTime()` utility
- Tests for timer logic and component rendering

The scanner reads only these skill-guided paths:

```text
skill-guided/src/*.tsx
skill-guided/tests/*.tsx
```

Use the `.tsx` extension for all skill-guided source and test files, even when
a file contains no JSX. A `.ts` file is outside the scanner patterns.

Run the benchmark test command from `react-timer/skill-guided/`:

```bash
npx --no-install jest --no-coverage
```

Use `pnpm install` for dependencies. The project can define `pnpm test`, but
the benchmark harness uses the command above. Do not install Jest globally.

### 3. Go Login CRUD

The plain variant uses one `main.go` file. It provides login create, read,
update, and delete operations, SHA-256 password hashing, and an in-memory
store.

The skill-guided variant separates these responsibilities:

- The model defines the user and password fields
- The repository stores users through an interface
- The handler maps HTTP requests to use cases
- The middleware applies the request checks defined by the target specification
- The cache stores lookup results through an interface

The Go module uses only the standard library. Run `go mod tidy` in the
skill-guided directory. Run the benchmark test command from that directory:

```bash
go test ./tests/ -v
```

## Clean-room sandbox rules

The sandbox prevents infrastructure changes and repeated discovery loops.
Apply these rules before writing code.

- Do not alter, upgrade, or modify global packages at run time.
- Do not read, write, or delete any path outside the current workspace.
- Do not use a global test runner when a project runner exists.
- Do not change the benchmark scanner or its file patterns.
- Do not create a symlink to bypass a Go `internal/` boundary.

The following inspection commands are blocked during an agent run:

- `ls`
- `find`
- `git status`
- `git diff`
- `git log`
- `open`

Do not simulate the output of a blocked command. Use the target specification
and the files that the task supplies.

### Supplied toolchain

The clean-room environment supplies these versions:

- Go 1.26.4-X with `nodwarf5`.
- Python 3.13.11 with `uv` 0.4 or later.
- Node.js 18 or later with pnpm 11.3.0 or later.
- The environment supplies pre-cached TypeScript type definitions.

The system `python3` command can resolve to Python 3.14.5. Use
`uv run python3` to select the supplied Python 3.13.11 environment. Do not
run bare `pytest`.

## Grading contract

The runner uses static file patterns and skill-guided test results to calculate
a robustness score. The score is normalised to 100 for each skill-guided
subproject.

The following design rules define the skill-guided target specification:

- **Separation of concerns**: Keep data access and JSON parsing out of
  transport code.
- **Interfaces**: Use contracts or interfaces at domain boundaries.
- **Tests**: Require at least 80% line coverage. Put a test file next to each
  domain module.
- **Input handling**: Validate types, contracts, and untrusted data at every
  entry point.

The runner does not calculate line coverage. The 80% value remains a project
requirement. A test file outside the scanner paths does not contribute to the
report.

The runner gives 50 points for the skill-guided test result and up to 50
points for feature markers. The React profile has zero security and
error-handling points.
Do not add unrelated security code to the React Timer.

## React Timer rules

These rules prevent repeated TypeScript and pnpm failures.

### Required configuration

Supply a working `package.json` and `tsconfig.json` before the first install.
Use explicit relative imports for source files. Do not run `pnpm link`. Do not
install a global package. If a type dependency is missing, record its name and
continue with the available files.

Use this configuration checklist:

- `package.json`: Include `jest`, `ts-jest`, `@testing-library/react`,
  `typescript`, `react`, and `react-dom`.
- `tsconfig.json`: Set `compilerOptions.jsx: "react-jsx"`, `rootDir`, and
  `strict` mode.
- `jest.config.js`: Set `preset: "ts-jest"`, `testEnvironment: "jsdom"`, and
  `roots` to `tests/`.
- `.npmrc`: When pnpm requires build approval, add
  `allow-builds=unrs-resolver`.

### Known traps

- **Missing `jest-environment-jsdom`**: Jest 29 or later does not provide the
  jsdom test environment. Add `jest-environment-jsdom` to `devDependencies`
  before `pnpm install`.
- **pnpm build approval stops Jest**: pnpm 11 blocks `unrs-resolver`. Add
  `allow-builds=unrs-resolver` before installation.
- **`formatTime` floating-point drift**: A value such as `5.3` can produce the
  wrong decimal digit. Use
  `Math.floor((seconds - totalSecs) * 10 + 0.0001)` or
  `Math.round((seconds - totalSecs) * 10)`.
- **`TimerDisplay` stores a copy in state**: The first render can show the old
  value `0`. Render `formatTime(time)` from props. Remove the local state.
- **`ts-jest` rejects `toHaveTextContent`**: The type definition for
  `toHaveTextContent` is missing. Read `.textContent` and compare it with
  `expect(...).toBe(...)`.
- **A skill-guided `.ts` file is not counted**: The scanner matches `.tsx` paths
  only. Rename the source and test files to `.tsx`.
- **Workspace install is empty**: pnpm reports that it is up to date, but Jest
  is not found. Add a `packages` key with the playground project paths to the
  root `pnpm-workspace.yaml`. Run `pnpm install` again.

## Python rules

These rules prevent import, rate-limit, and environment failures.

### Required test setup

1. Make the rate limiter read `DISABLE_RATE_LIMIT` at module import time.
2. Run tests only with `uv run python3 -m pytest tests/ -v --tb=short`.
3. Import the server with `from server import ...`.
4. If a test process needs the override, set
   `os.environ["DISABLE_RATE_LIMIT"] = "1"` before you import the server.
5. Add `# noqa: E402` to the import line after the environment override.
6. Do not mutate `sys.path` and do not mock `time.monotonic()`.

### Known traps

- **The rate limiter blocks tests**: Tests wait for a throttle window. Set
  `DISABLE_RATE_LIMIT=1` before you import the server.
- **The email expression is too narrow**: An address such as `user+tag@domain.co`
  is rejected. Use the project expression
  `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`.
- **IDs have different types**: Plain tests use integers, while skill-guided
  tests use UUID strings. Keep the ID strategy separate for each variant.
- **`uv` selects the parent environment**: The interpreter or virtual
  environment does not match the supplied environment. Remove `VIRTUAL_ENV`
  before the command.
- **The environment variable is set too late**: Module code reads the old
  value at import time. Set the variable before you import the server.
- **A test does not consume the server fixture**: The test calls `urlopen()`
  without accepting the `server_url` fixture. Add the fixture parameter to
  each HTTP test. Bind the fixture to port `0` and return the assigned URL.
- **A forked server has separate state**: The test thread and server thread
  use different module state. Run the server and tests in one process. Use
  `users.clear()` before each test.
- **Python is not 3.13.11**: `python3` reports a different system version. Use
  `uv run python3` for the test command.
- **Python source is under `src/`**: The scanner does not count the file. Put
  skill-guided source files at the root of `skill-guided/`.

## Go rules

These rules prevent package, password, and test-command failures.

### Package boundaries

- Put domain logic under `internal/`.
- Put the server entry point under `cmd/server/`.
- Put tests under `tests/` and use `package tests`.
- Do not import `package main` from `tests/`.
- Call `handler.NewUserHandler(repo)` in the test setup.
- Do not use a symlink to bypass the `internal/` import boundary.

### Password tests

The `User.Password` field has the JSON tag `json:"-"`. The field can still
contain a value in memory. To test password privacy, marshal the user to JSON.
Unmarshal the JSON into a map. Make sure that the map has no `password` key.
Do not test `user.Password == ""`.

### Known traps

- **`package tests` imports `package main`**: The test package cannot compile.
  Import `internal/repository` and `internal/handler` directly.
- **A password field is not absent from JSON**: The direct field comparison is
  the wrong test. Examine the JSON keys for the password field.
- **Go returns a cached test result**: The output says `PASS` after a code
  change. Add `-count=1` to the test command when a manual check needs fresh
  results.
- **A module path does not match an import**: The Go compiler cannot find an
  internal package. Compare every import with the module path in `go.mod`.
- **A path value is empty in a test request**: `r.PathValue("id")` returns an
  empty string. Call `req.SetPathValue("id", "...")` after
  `httptest.NewRequest`.
- **The scanner checks error branches**: The scanner looks for `if err != nil`,
  `try`, `except`, `raise`, or a returned error. Keep the condition in the
  form `if err != nil` for clarity.

## Platform setup

### pnpm 11 build approval

pnpm 11 requires approval for packages that run build scripts. The Jest
dependency `unrs-resolver` can stop an install until it is approved.

Use one of these methods:

- Add `allow-builds=unrs-resolver` to the project `.npmrc` file.
- Add `onlyBuiltDependencies: [unrs-resolver]` to the workspace
  `pnpm-workspace.yaml` file.
- Run `pnpm approve-builds` in the project directory.

After approval, regenerate the project lockfile with
`pnpm install --no-frozen-lockfile`.

### React and TypeScript files

Keep the scanner paths and the module layout aligned:

```text
skill-guided/
  package.json
  tsconfig.json
  jest.config.js
  src/
    Timer.tsx
    TimerDisplay.tsx
    formatTime.tsx
  tests/
    Timer.test.tsx
    TimerDisplay.test.tsx
```

Configuration files do not add points for detected features. Functional
source and test files must use the scanner paths and the `.tsx` extension.

### Python environment

Declare development dependencies in `[dependency-groups]` or
`[tool.uv] dev-dependencies`. Run `uv sync` in the skill-guided project. The
benchmark removes `VIRTUAL_ENV` before it starts the Python test process. Use
`uv run python3` to select the supplied interpreter.

### Go test packages

Keep test files under `tests/`. Use `package tests`. Set up the repository and
handler in the test setup. Do not import `cmd/server` from a test package.

## Traceability

Each benchmark report records the `SKILL.md` version, agent tag, provider,
harness, model, Python version, pnpm version, and Go version. It also records
file counts, lines, characters, tokens, test results, and feature markers.
These fields make runs comparable across agents and toolchain versions.
