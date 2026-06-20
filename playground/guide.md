# LCCST Playground Benchmark Guide

## Purpose

Compare two implementation approaches—**plain** (no skill guidance) vs **skill-guided** (following a skill.md protocol)—across three small projects. Measure token usage, code features, test results, and robustness.

## Directory Structure

```
playground/
  guide.md                          # This file
  benchmarks/
    run_benchmark.py                # Agent-agnostic benchmark script
    pyproject.toml                  # Benchmark Python deps (tiktoken, etc.)
    {agent-name}-{model-name}/      # Per-agent output (auto-created)
      benchmark-report.md
  {agent-name}-{model-name}/        # Per-agent implementations
    python-http-server/
      plain/server.py
      skill-guided/server.py + pyproject.toml
      skill-guided/tests/test_server.py
    react-timer/
      plain/index.html + timer.js
      skill-guided/package.json + tsconfig + jest.config + src/timer.tsx
      skill-guided/tests/timer.test.tsx
    go-login-crud/
      plain/main.go + go.mod
      skill-guided/go.mod + cmd/server/{main,app}.go
      skill-guided/internal/{model,repository,handler,middleware,cache}/
      skill-guided/tests/{repository,cache,handler,model}_test.go
```

## Three Projects

### 1. Python HTTP Server
- **Plain**: Single-file Python HTTP server with CRUD for users (GET/POST/PUT/DELETE)
- **Skill-guided**: Same API with input validation, email regex, rate limiting, type hints, `pyproject.toml` manifest
- **Tests**: pytest (runs via `uv run pytest` or `python3 -m pytest`)
- **Dependencies**: `uv sync` installs pytest from `pyproject.toml` (`[dependency-groups] dev` or `[tool.uv] dev-dependencies`)

### 2. React Timer
- **Plain**: Vanilla HTML + JS stopwatch with start/stop/reset
- **Skill-guided**: TypeScript (`.tsx`) — Timer class and `TimerDisplay` React component with `formatTime()` utility
- **Tests**: Jest + ts-jest + @testing-library/react, both logic tests and component render test
- **Dependencies**: `pnpm install` (from project dir or workspace root). Build-approval config may be needed for `unrs-resolver` (jest dependency) in pnpm v11+.

### 3. Go Login CRUD
- **Plain**: Single `main.go` with all-in-one server, SHA-256 hashing, in-memory store
- **Skill-guided**: Layered architecture—`model`, `repository`, `handler`, `middleware`, `cache`—with interfaces and dependency injection
- **Tests**: `go test ./tests/ -v` on repository, cache, and handler packages
- **Dependencies**: stdlib only. `go mod tidy` resolves module.

## Methodology

### For Each Project

1. **Plain implementation** — single file, minimal dependencies, no error handling, no typing
2. **Skill-guided implementation** — structured into modules/packages, typed, security-aware, test-covered, with modern tooling manifests

### Running the Benchmark

```bash
# Install benchmark deps once
cd playground/benchmarks
uv sync                           # installs tiktoken for accurate token counts
cd ../..

# From repository root:
python3 playground/benchmarks/run_benchmark.py <agent-tag> [--install-deps]
```

Where `<agent-tag>` matches the agent directory name, e.g.:

```bash
python3 playground/benchmarks/run_benchmark.py opencode-deepseek-v4-flash-free
python3 playground/benchmarks/run_benchmark.py opencode-deepseek-v4-flash-free --install-deps
```

The `--install-deps` flag installs dependencies (pnpm for React timer) before benchmarking.

### What Gets Measured

| Metric | Description |
|--------|-------------|
| File count | Number of source files |
| Lines of code | Source lines (including blanks/comments) |
| Characters | Raw character count |
| Tokens | Estimated tokens (tiktoken if installed, heuristic fallback) |
| Robustness score | 0–100: 50 pts for passing tests + 50 pts for feature presence |
| Features | Typing, security patterns, error handling, test assertions |
| Test result | Pass/fail + exit code + stdout/stderr |
| Tool versions | Python, pnpm, Go versions at time of benchmark |

### Robustness Score Calculation

- **Test execution (50 pts)**: 50 for passing, 15 for failing, 5 for missing tool
- **Feature presence (50 pts)**: 17 for typing/interfaces, 17 for security patterns, 16 for error handling
- Capped at 100. No bonus for file volume or line count.

## Reproducing Benchmarks

1. **Set up the workspace**: Create `playground/{your-agent-tag}/` with the three project directories
2. **Generate plain implementations**: Without consulting skill.md, write minimal working code for each project
3. **Generate skill-guided implementations**: With skill.md loaded, write structured, typed, tested code; use modern manifests (pyproject.toml, tsconfig, go.mod), TypeScript (`.ts`/`.tsx`) not plain JS
4. **Install dependencies**:
   - **Python**: `uv sync` in `python-http-server/skill-guided/` (installs pytest from `[dependency-groups]`)
   - **Node/React**: `pnpm install` in `react-timer/skill-guided/`. If pnpm v11+ blocks `unrs-resolver` build scripts, add `.npmrc` with `allow-builds=unrs-resolver` or approve via `pnpm approve-builds`. For workspace projects, add `onlyBuiltDependencies: [unrs-resolver]` to root `pnpm-workspace.yaml`.
   - **Go**: `go mod tidy` in `go-login-crud/skill-guided/`. No external deps beyond stdlib.
5. **Run the benchmark**: `python3 playground/benchmarks/run_benchmark.py {your-agent-tag} --install-deps`
6. **Read the report**: `playground/benchmarks/{your-agent-tag}/benchmark-report.md`

## Adding New Agents

1. Create your implementation directory:
   ```
   playground/{agent-name}-{model-name}/
     python-http-server/{plain,skill-guided}/
     react-timer/{plain,skill-guided}/
     go-login-crud/{plain,skill-guided}/
   ```
2. Populate with the three projects following the plain/guided convention
3. Run the script with your tag
4. Compare reports across agents

## Prerequisites

- Python 3.10+ (currently 3.14.5)
- Go 1.21+ (currently 1.26.4)
- Node.js 18+ / pnpm 9+ (currently pnpm 11.3.0)
- `uv` for Python dependency management (benchmark + project deps)
- tiktoken (`uv sync` in `playground/benchmarks/` to install)
- pytest (`uv sync` installs it as a project dev dependency)

## Platform-Specific Notes

### pnpm v11 Build Approval

pnpm v11 requires explicit approval for packages that run build scripts. Dependencies like `unrs-resolver` (a Jest transitive dep) will block install + test until approved:

- **Per-project**: Create `.npmrc` with `allow-builds=unrs-resolver`
- **Workspace-wide**: Add to root `pnpm-workspace.yaml`:
  ```yaml
  onlyBuiltDependencies:
    - unrs-resolver
  ```
- **Interactive**: Run `pnpm approve-builds` in the project directory

Once approved, regenerate the lockfile with `pnpm install --no-frozen-lockfile`.

### React/TypeScript Setup Checklist

The skill-guided React timer needs these config files (common pitfalls):

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: jest, ts-jest, @testing-library/react, typescript, react, react-dom |
| `tsconfig.json` | `compilerOptions.jsx: "react-jsx"`, rootDir, strict mode |
| `jest.config.js` | `preset: "ts-jest"`, `testEnvironment: "jsdom"`, roots pointing to tests/ |
| `.npmrc` (if needed) | `allow-builds=unrs-resolver` for pnpm v11 build approval |

### Go Test Package Isolation

Go test files inside a `tests/` subdirectory must use a separate package name (`package tests`). They cannot import from `package main` (cmd/server package). Structure handler tests to import `internal/repository` and `internal/handler` directly and wire them in test setup.

### uv for Python

Python projects use `uv` for dependency management. The `pyproject.toml` can declare dev dependencies under `[dependency-groups]` (PEP 735) or `[tool.uv] dev-dependencies`. Run `uv sync` to install, then `uv run pytest` to execute tests. The benchmark script unsets `VIRTUAL_ENV` before running Python tests to avoid venv mismatch.

## Implementation Pitfalls & Loop Prevention

The following findings were collected from actual implementation runs. Agents
frequently exhaust tokens by looping on these specific issues. Enforce the
mitigation rules below to avoid repeated test-fix-rerem cycles.

### TypeScript & pnpm Sandbox Constraints

When executing the React Timer subproject, agents frequently exhaust tokens by
looping on implicit type dependencies (e.g., `@types/jest` or React testing
utilities) or attempting to modify root configurations.

**Enforced Mitigation Rules for Future Runs:**
1. **Pre-Baked Configuration:** The runtime workspace MUST pre-supply a working
   `tsconfig.json` and basic `package.json` with standard testing packages.
2. **Strict Module Resolution:** Force the agent to use explicit relative paths
   and native sub-component imports (`.tsx`) rather than attempting to refactor
   global compiler paths.
3. **No Dynamic Linkage:** Explicitly forbid the agent from running `pnpm link`
   or global installs during the execution loop. If a type dependency is missing,
   it must log the gap and proceed with static assertions rather than looping.

**Known Token Traps (do not iterate on these):**

| Trap | Symptom | One-Shot Fix |
|------|---------|-------------|
| Missing `jest-environment-jsdom` | Jest 29+ does not ship jsdom. Test fails with "Test environment not found." | Add `jest-environment-jsdom` to `devDependencies` in `package.json` before first `pnpm install`. |
| `allow-builds` blocks Jest deps | pnpm v11 refuses to build `unrs-resolver` (ts-jest transitive dep), halting install | Create `.npmrc` with `allow-builds=unrs-resolver` before install, or add to root `pnpm-workspace.yaml` `onlyBuiltDependencies`. |
| `formatTime` floating-point drift | `Math.floor((5.3 - 5) * 10)` yields 2 due to IEEE 754 representation | Use `Math.floor((seconds - totalSecs) * 10 + 0.0001)` or `Math.round((seconds - totalSecs) * 10)`. |
| TimerDisplay double-render via useState | Component wraps time in `useState`/`useEffect`, causing initial render to show stale `0` instead of prop | Render `formatTime(time)` directly from props. Remove local state. |

### Python uv & Test Isolation Constraints

When executing the Python HTTP Server subproject, agents loop on import path
resolution, rate-limiter mocking strategy, and email regex false positives.

**Enforced Mitigation Rules for Future Runs:**
1. **Test-Friendly Rate Limiting:** The rate limiter MUST check an environment
   variable (`DISABLE_RATE_LIMIT`) to allow tests to bypass throttling without
   mocking `time.monotonic()`. Do not attempt to mock or monkey-patch time.
2. **Explicit Test Runner Path:** Run tests exclusively via `uv run python3 -m pytest tests/ -v --tb=short`. Do not use bare `pytest` which may resolve the wrong
   interpreter or missing `.venv`.
3. **No Global `sys.path` Mutation:** The test file MUST import the server module
   with a relative `from server import ...` and a `# noqa: E402` comment if
   placed after the `os.environ` override. Never mutate `sys.path`.

**Known Token Traps (do not iterate on these):**

| Trap | Symptom | One-Shot Fix |
|------|---------|-------------|
| Rate-limiter blocks tests in CI | `time.monotonic()` is unmockable in simple unittest; tests timeout | Gate rate limiter behind `DISABLE_RATE_LIMIT` env var; set it at module import time before importing server. |
| Email regex too strict/too loose | Common valid emails like `user+tag@domain.co` get rejected | Use `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` — the standard pattern from RFC 5322 simplified. |
| ID type mismatch in assertions | Plain version uses `int` IDs, skill-guided uses `uuid` strings; comparing across versions causes false negatives | Decide ID strategy per variant: plain uses sequential `int`, guided uses `uuid.uuid4()`. Never assert ID type across variants. |
| `uv sync` venv path collision | Running `uv run pytest` from project root picks wrong `.venv` if parent also has one | Ensure `VIRTUAL_ENV` is unset before running; the benchmark script already does this. |

### Go Module Layout & Test Isolation Constraints

When executing the Go Login CRUD subproject, agents loop on `package main`
import restrictions, `internal/` directory visibility, and test output
assertions.

**Enforced Mitigation Rules for Future Runs:**
1. **Never Import `package main` from Tests:** Go test files in a `tests/`
   subdirectory use `package tests` and CANNOT import `cmd/server` (which is
   `package main`). Wire handlers directly in test setup by importing
   `internal/repository` and `internal/handler`.
2. **Strict `internal/` Boundaries:** The Go toolchain enforces that packages
   under `internal/` are only importable by code rooted at the parent of
   `internal/`. Keep all domain logic under `internal/` and all entry points in
   `cmd/server`. Do not attempt to bypass this with symlinks or vendoring.
3. **Password Field Test Strategy:** The `User.Password` struct field has
   `json:"-"` which excludes it from JSON serialization, but the Go field still
   holds a value. To verify passwords are not leaked, test JSON marshalling
   explicitly: marshal to JSON, unmarshal to `map[string]interface{}`, and
   assert the `"password"` key is absent. Never assert `user.Password == ""`.

**Known Token Traps (do not iterate on these):**

| Trap | Symptom | One-Shot Fix |
|------|---------|-------------|
| `package tests` cannot access `package main` | Handler tests in `tests/` fail to compile: `imports cmd/server` | Never import `cmd/server`. Create handler via `handler.NewUserHandler(repo)` directly, using `httptest.NewRecorder()` and `httptest.NewRequest()`. |
| `json:"-"` field test fails | `user.Password != ""` assertion fails because the field IS set internally | Assert on JSON output: `json.Marshal(user)`, unmarshal to map, check for absence of `"password"` key. |
| Cached test results hide fixes | `go test ./tests/ -v` returns cached (stale) PASS after code changes | Append `-count=1` to force uncached execution: `go test ./tests/ -v -count=1`. |
| Module path mismatch across files | One internal file imports `go-login-crud-skill/model` while another uses `go-login-crud-skill/internal/model` | Audit all `import` statements to match the single module path declared in `go.mod`. All internal imports MUST include the `internal/` prefix in the import path. |

## Traceability

Each benchmark report includes:
- The **skill.md version** listed at the top of the spec (`vX.Y`)
- The **agent tag** (name + model identifier)
- **Python, pnpm, Go versions** detected at runtime
- Full breakdown of tokens, lines, features per project

This ensures results are reproducible and comparable across agents and toolchain versions.
