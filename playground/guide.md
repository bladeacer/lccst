# LCCST Playground Implementation Guide

## Purpose

This guide describes the three reference projects and their implementation constraints. Follow it to build the plain and skill-guided variants.

## Projects

### 1. Python HTTP Server

A single-file Python HTTP server with CRUD for users (GET, POST, PUT, DELETE). The skill-guided variant adds input validation, email regex, rate limiting, and type hints. Tests run via `uv run pytest`. Dependencies are installed with `uv sync` from `pyproject.toml`.

### 2. React Timer

A vanilla HTML and JavaScript stopwatch with start, stop, and reset. The skill-guided variant uses TypeScript (`.tsx`) split into a Timer class and `TimerDisplay` React component with a `formatTime()` utility. Tests use Jest, ts-jest, and @testing-library/react. Install with `pnpm install`.

### 3. Go Login CRUD

A single `main.go` with all-in-one server, SHA-256 hashing, and in-memory store. The skill-guided variant uses a layered architecture with model, repository, handler, middleware, and cache components. Tests run via `go test ./tests/ -v`. The Go module has no external dependencies beyond the stdlib.

## Protocol Invariants for Agent Runs

These invariants are enforced by the benchmark harness, not by SKILL.md itself. They isolate the agent behaviour for each run variant to prevent context bleeding between the plain and guided phases.

### Strategy Gating Invariants

If the variant is "plain", the agent must ignore all telemetry and protocol rules in SKILL.md. Write minimal code to fulfil the basic target specs without running tests or invoking MCP telemetry. If the variant is "skill-guided", the agent must strictly activate the pre-flight sequence and telemetry checkpoints defined in SKILL.md.

### Gated Tool Blocklist

The following system commands are severed from the agent sandbox during benchmarking. Invoking them or attempting to simulate their output results in immediate evaluation failure:

- Prohibited: ls, find, git status, git diff, git log, open.
- Permitted: /init, rm -rf, log_turn_telemetry.

## Clean-Room Environment Reference

The playground runner provides strict target execution invariants to stop agents from looping on infrastructure configuration. Do not alter, upgrade, or dynamically modify global packages.

- Go Environment: Version 1.26.4-X with nodwarf5. Modules are pre-initialised. Execute tests via `go test ./tests/...` or `go test ./...`.
- Node.js and TypeScript Environment: Node.js >= 18, pnpm >= 11.3.0. Typings are pre-cached. Invoke testing via `pnpm test`. Never run bare global installations.
- Python Environment: Version 3.13.11, manager uv >= 0.4. Run tests exclusively via `uv run pytest`. Virtual environments are kept hermetic. Note that the system python3 binary defaults to 3.14.5; always use `uv run python3` to lock to the 3.13.11 .venv version.

## Automated Grading Matrix

The benchmarking engine runs static file analyses to calculate the final robustness score. Clean-room implementations must satisfy the design criteria matching the SKILL.md protocol:

| Assessment Criteria | Target Metrics for Max Score |
|---------------------|------------------------------|
| Separation of Concerns | Zero data-access code or inline JSON parsing inside transport layers. |
| Interface Boundaries | Domain boundaries must interact via abstract contracts or interfaces. |
| Test Coverage | Minimum 80% line coverage. Every domain module must have an adjacent test file. |
| Defensive Input | Type guarding, contract validation, and sanitisation active at all entries. |

## Implementation Pitfalls and Loop Prevention

The following findings were collected from actual implementation runs. Agents frequently exhaust tokens by looping on these specific issues. Enforce the mitigation rules below to avoid repeated test-fix cycles.

### TypeScript and pnpm Sandbox Constraints

When executing the React Timer subproject, agents frequently exhaust tokens by looping on implicit type dependencies or attempting to modify root configurations.

**Enforced Mitigation Rules for Future Runs:**

1. Pre-Baked Configuration: The runtime workspace must pre-supply a working tsconfig.json and a basic package.json with standard testing packages.
2. Strict Module Resolution: Force the agent to use explicit relative paths and native sub-component imports (.tsx) rather than attempting to refactor global compiler paths.
3. No Dynamic Linkage: Explicitly forbid the agent from running pnpm link or global installs during the execution loop. If a type dependency is missing, it must log the gap and proceed with static assertions.

**Known Token Traps:**

| Trap | Symptom | One-Shot Fix |
|------|---------|--------------|
| Missing jest-environment-jsdom | Jest 29+ does not ship jsdom. Test fails with "Test environment not found." | Add jest-environment-jsdom to devDependencies in package.json before first pnpm install. |
| allow-builds blocks Jest deps | pnpm v11 refuses to build unrs-resolver, halting install | Create .npmrc with allow-builds=unrs-resolver before install. |
| formatTime floating-point drift | Math.floor((5.3 - 5) * 10) yields 2 due to IEEE 754 precision | Use Math.floor((seconds - totalSecs) * 10 + 0.0001) or Math.round((seconds - totalSecs) * 10). |
| TimerDisplay double-render via useState | Component wraps time in state, causing initial render to show stale 0 | Render formatTime(time) directly from props. Remove local state. |
| jest-dom v6 toHaveTextContent ts-jest type error | ts-jest diagnostics fail: Property toHaveTextContent does not exist | Assert on .textContent property instead: expect(el.textContent).toBe("..."). |
| Benchmark under-counts guided source files | Scanner picks only .ts/.tsx source and .test.ts/.test.tsx test files; config files are invisible to metrics | Place all functional source under src/ and all tests under tests/ with correct extensions. Config-only files do not count toward robustness. |
| .ts extension blindness for feature detection | Pure .ts utility modules are invisible to the benchmark scanner, which only matches skill-guided/src/*.tsx and skill-guided/tests/*.tsx | Give all source and test files the .tsx extension even if they contain no JSX. Feature detection only scans matched files. |
| pnpm workspace isolation | pnpm install reports "Already up to date" but node_modules is empty; Jest exits with "command not found" | Ensure the root pnpm-workspace.yaml includes a packages: key with playground project paths. Without this, pnpm silently skips installation. |

**Rubric ceiling for this project:** The React Timer maximum interpretable score is 67/100 (50 for passing tests plus 17 for typing). The scanner's has_security regex targets auth, hash, and token patterns absent in any stopwatch, and has_error_handling targets exception-catching patterns unused in well-structured declarative React. Do not loop on security or error-handling improvements for this subproject; they cannot raise the score. A project-aware benchmark script normalises this ceiling to 100/100 by weighting only relevant criteria per project.

### Python uv and Test Isolation Constraints

When executing the Python HTTP Server subproject, agents loop on import path resolution, rate-limiter mocking strategy, and email regex false positives.

**Enforced Mitigation Rules for Future Runs:**

1. Test-Friendly Rate Limiting: The rate limiter must check an environment variable (DISABLE_RATE_LIMIT) to allow tests to bypass throttling without mocking time.monotonic(). Do not attempt to mock or monkey-patch time.
2. Explicit Test Runner Path: Run tests exclusively via `uv run python3 -m pytest tests/ -v --tb=short`. Do not use bare pytest which may resolve the wrong interpreter or missing .venv.
3. No Global sys.path Mutation: The test file must import the server module with a relative `from server import ...` and a `# noqa: E402` comment if placed after the os.environ override. Never mutate sys.path.

**Known Token Traps:**

| Trap | Symptom | One-Shot Fix |
|------|---------|--------------|
| Rate-limiter blocks tests in CI | time.monotonic() is unmockable in simple unittest; tests timeout | Gate rate limiter behind DISABLE_RATE_LIMIT env var; set it at module import time. |
| Email regex too strict or loose | Common valid emails like user+tag@domain.co get rejected | Use ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ derived from RFC 5322 simplified. |
| ID type mismatch in assertions | Plain version uses int IDs, guided uses uuid strings; comparing causes failure | Decide ID strategy per variant: plain uses sequential int, guided uses uuid.uuid4(). |
| uv sync venv path collision | Running uv run pytest from root picks wrong venv if parent has one | Ensure VIRTUAL_ENV is unset before running; the benchmark script handles this. |
| DISABLE_RATE_LIMIT env var not visible at import time | Setting env var inside a test function/fixture is too late: module-level code reads os.environ at import | Set os.environ["DISABLE_RATE_LIMIT"] = "1" at the TOP of the test file, before the server import, then use # noqa: E402 on the import line. |
| Server fixture not consumed by test functions | Test suite defines a session-scoped server fixture but tests call urlopen() directly without accepting the fixture parameter | Every test function that makes HTTP requests must accept the server_url fixture as a parameter. The fixture must bind to port 0 and report the assigned port back. |
| Module-level state shared between test thread and server thread | The users dict is cleared by an autouse fixture, but the server thread holds the same module reference | The autouse fixture clears users before each test via users.clear(). This works only when server and test run in the same process. Do not fork a subprocess for the server. |
| python3 version mismatch with clean-room spec | python3 --version reports 3.14.5 but the clean-room env specifies 3.13.11. Running pytest directly picks the wrong interpreter | Always invoke tests via uv run python3 -m pytest. The uv run prefix locks execution to the 3.13.11 .venv interpreter. |
| Scanner blind to src/ subdirectory | Benchmark globs scan skill-guided/*.py and skill-guided/tests/*.py only. Source at skill-guided/src/server.py is invisible to metrics | Place all Python source files at the root of skill-guided/, not under a src/ subdirectory. |

### Go Module Layout and Test Isolation Constraints

When executing the Go Login CRUD subproject, agents loop on package main import restrictions, internal/ directory visibility, and test output assertions.

**Enforced Mitigation Rules for Future Runs:**

1. Never Import package main from Tests: Go test files in a tests/ subdirectory use package tests and cannot import cmd/server (which is package main). Wire handlers directly in test setup by importing internal/repository and internal/handler.
2. Strict internal/ Boundaries: The Go toolchain enforces that packages under internal/ are only importable by code rooted at the parent of internal/. Keep all domain logic under internal/ and all entry points in cmd/server. Do not attempt to bypass this with symlinks.
3. Password Field Test Strategy: The User.Password struct field has json:"-" which excludes it from JSON serialization, but the Go field still holds a value. To verify passwords are not leaked, test JSON marshalling explicitly: marshal to JSON, unmarshal to a map, and assert the password key is absent. Never assert user.Password == "".

**Known Token Traps:**

| Trap | Symptom | One-Shot Fix |
|------|---------|--------------|
| package tests cannot access main | Handler tests fail to compile: imports cmd/server | Never import cmd/server. Create handler via handler.NewUserHandler(repo) directly. |
| json:"-" field test fails | user.Password != "" assertion fails because the field IS set internally | Assert on JSON output: json.Marshal(user), unmarshal to map, check for absence of password key. |
| Cached test results hide fixes | go test ./tests/ -v returns cached PASS after code changes | Append -count=1 to force uncached execution: go test ./tests/ -v -count=1. |
| Module path mismatch across files | One internal file imports path with wrong layout or missing prefixes | Audit all import statements to match the single module path declared in go.mod. |
| httptest.NewRequest + SetPathValue not called for path parameters | Handler uses r.PathValue("id") which returns empty string if path value not set on the test request | Call req.SetPathValue("id", "...") after constructing the test request when using Go 1.22+ routing patterns. |
| Benchmark error-handling regex does not match if err := ...; err != nil | The benchmark scans for the contiguous substring if\s+err\s*!\=\s*nil. Go's idiomatic form separates if err from != nil by the pre-call statement | Use the two-line form: err := call(); if err != nil { ... }. The regex matches if err != nil only when err and != are adjacent in the same statement. |

## Traceability

Each benchmark report includes the SKILL.md version, the agent tag, Python, pnpm, and Go versions detected at runtime, and a full breakdown of tokens, lines, and features per project. This ensures results are reproducible and comparable across agents and toolchain versions.
