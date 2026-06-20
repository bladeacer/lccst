# LCCST Playground Benchmark Guide

## Purpose

Compare two implementation approaches—**plain** (no skill guidance) vs **skill-guided** (following a skill.md protocol)—across three small projects. Measure token usage, code features, test results, and robustness.

## Directory Structure

```
playground/
  guide.md                          # This file
  benchmarks/
    run_benchmark.py                # Agent-agnostic benchmark script
    {agent-name}-{model-name}/      # Per-agent output (auto-created)
      benchmark-report.md
  {agent-name}-{model-name}/        # Per-agent implementations
    python-http-server/
      plain/server.py
      skill-guided/server.py + pyproject.toml
      skill-guided/tests/test_server.py
    react-timer/
      plain/index.html + timer.js
      skill-guided/package.json + tsconfig + src/timer.tsx
      skill-guided/tests/timer.test.tsx
    go-login-crud/
      plain/main.go + go.mod
      skill-guided/go.mod + cmd/server/main.go
      skill-guided/internal/{model,repository,handler,middleware,cache}/
      skill-guided/tests/{repository,cache,handler}_test.go
```

## Three Projects

### 1. Python HTTP Server
- **Plain**: Single-file Python HTTP server with CRUD for users (GET/POST/PUT/DELETE)
- **Skill-guided**: Same API with input validation, email regex, rate limiting, type hints, `pyproject.toml` manifest
- **Tests**: pytest (runs via `uv run pytest` or `python3 -m pytest`)

### 2. React Timer
- **Plain**: Vanilla HTML + JS stopwatch with start/stop/reset
- **Skill-guided**: TypeScript + TSX—Timer class and `TimerDisplay` React component with `formatTime()` utility
- **Tests**: Jest + ts-jest + @testing-library/react, both logic tests and component render test

### 3. Go Login CRUD
- **Plain**: Single `main.go` with all-in-one server, SHA-256 hashing, in-memory store
- **Skill-guided**: Layered architecture—`model`, `repository`, `handler`, `middleware`, `cache`—with interfaces and dependency injection
- **Tests**: `go test` on repository, cache, and handler packages

## Methodology

### For Each Project

1. **Plain implementation** — single file, minimal dependencies, no error handling, no typing
2. **Skill-guided implementation** — structured into modules/packages, typed, security-aware, test-covered, with modern tooling manifests

### Running the Benchmark

```bash
# From repository root:
python3 playground/benchmarks/run_benchmark.py <agent-tag> [--install-deps]
```

Where `<agent-tag>` matches the agent directory name, e.g.:

```bash
python3 playground/benchmarks/run_benchmark.py opencode-deepseek-v4-flash-free
python3 playground/benchmarks/run_benchmark.py opencode-deepseek-v4-flash-free --install-deps
```

The `--install-deps` flag installs dependencies (npm for React timer) before benchmarking.

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

### Robustness Score Calculation

- **Test execution (50 pts)**: 50 for passing, 15 for failing, 5 for missing tool
- **Feature presence (50 pts)**: 17 for typing/interfaces, 17 for security patterns, 16 for error handling
- Capped at 100. No bonus for file volume or line count.

## Reproducing Benchmarks

1. **Set up the workspace**: Create `playground/{your-agent-tag}/` with the three project directories
2. **Generate plain implementations**: Without consulting skill.md, write minimal working code for each project
3. **Generate skill-guided implementations**: With skill.md loaded, write structured, typed, tested code; use modern manifests (pyproject.toml, tsconfig, go.mod)
4. **Install dependencies**:
   - Python: `uv sync` or `pip install -e ".[dev]"` in `python-http-server/skill-guided/`
   - Node: `npm install` in `react-timer/skill-guided/`
   - Go: no external deps beyond stdlib
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

- Python 3.10+
- Go 1.21+
- Node.js 18+ / npm 9+
- `uv` (recommended) or `pip` for Python dependency management
- pytest (`uv run pytest` or `pip install pytest`)
- (Optional) tiktoken (`pip install tiktoken`) for accurate token counts
