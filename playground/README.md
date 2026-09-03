# LCCST Playground

Implementation workspace for three reference projects used in benchmark evaluation.

## Projects

### Python HTTP Server
A single-file HTTP server with CRUD for users. Includes input validation, email regex, rate limiting, and type hints. Tests run via `uv run pytest`.

### React Timer
A TypeScript stopwatch with start, stop, and reset functionality. Split into a Timer class and `TimerDisplay` React component with a `formatTime()` utility. Tests use Jest, ts-jest, and @testing-library/react.

### Go Login CRUD
A layered Go server with model, repository, handler, middleware, and cache components. Uses interfaces and dependency injection. Tests run via `go test ./tests/ -v`.

## Environment

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 18 | Running the LCCST MCP server |
| pnpm | >= 9 | Package manager for Node projects |
| TypeScript | >= 5.4 | Compiling engine source |
| Python | >= 3.10 | Running playground benchmarks |
| Go | >= 1.21 | Reference project in playground |
| uv | >= 0.4 | Python package manager |

## Setup

Install the `headroom` MCP server. Follow the setup instructions at the [headroom repository](https://github.com/chopratejas/headroom). Headroom saves token usage while preserving context.

## Implementation Guide

See [`guide.md`](./guide.md) for project-specific constraints, mitigation rules, and known token traps. The guide covers TypeScript, pnpm, Python uv, and Go module layout concerns.

## Benchmarking

The benchmark suite measures token impact of skill-guided versus plain code generation. See the [`README.md`](../README.md) in the project root for the full benchmarking suite and results.

### Running the Benchmark

Install benchmark dependencies once:

```bash
cd playground/benchmarks
uv sync                           # installs tiktoken for accurate token counts
cd ../..
```

From the repository root, run the harness against a specific agent:

```bash
python3 playground/benchmarks/run_benchmark.py <agent-tag> [--install-deps]
```

`<agent-tag>` matches the agent directory name, for example:

```bash
python3 playground/benchmarks/run_benchmark.py opencode-deepseek-v4-flash-free --install-deps
```

The `--install-deps` flag installs dependencies (npm, not pnpm, for React
Timer) before benchmarking. Post-install, test commands
(`npx --no-install jest`) resolve from `node_modules/.bin`. The
`allow-builds=unrs-resolver` `.npmrc` directive is ignored by npm; pre-install
with `pnpm install` if pnpm-specific build approval is needed.

### What Gets Measured

| Metric | Description |
|--------|-------------|
| File count | Number of source files |
| Lines of code | Source lines (including blanks/comments) |
| Characters | Raw character count |
| Tokens | Estimated tokens (tiktoken if installed, heuristic fallback) |
| Robustness score | 0 to 100: 50 pts for passing tests + 50 pts for feature presence |
| Features | Typing, security patterns, error handling, test assertions |
| Test result | Pass/fail + exit code + stdout/stderr |
| Tool versions | Python, pnpm, Go versions at time of benchmark |

### Robustness Score Calculation

- Test execution (50 pts): 50 for passing, 15 for failing, 5 for missing tool.
- Feature presence (50 pts): 17 for typing/interfaces, 17 for security
  patterns, 16 for error handling.
- Capped at 100. No bonus for raw file volume or unneeded line counts.

## Reproducing Benchmarks

1. Set up the workspace: create `playground/{your-agent-tag}/` with the three
   project directories.
2. Generate plain implementations: without consulting SKILL.md, write minimal
   working code for each project.
3. Generate skill-guided implementations: with SKILL.md loaded, write
   structured, typed, tested code; use modern manifests (`pyproject.toml`,
   `tsconfig.json`, `go.mod`) and TypeScript (`.ts`/`.tsx`) over plain JS.
4. Install dependencies:
   - Python: `uv sync` in `python-http-server/skill-guided/` (installs pytest
     from dependency groups).
   - Node/React: `pnpm install` in `react-timer/skill-guided/`. If pnpm v11+
     blocks build scripts, add `.npmrc` with `allow-builds=unrs-resolver` or
     approve via `pnpm approve-builds`.
   - Go: `go mod tidy` in `go-login-crud/skill-guided/`. No external deps
     beyond stdlib.
5. Run the benchmark:
   `python3 playground/benchmarks/run_benchmark.py {your-agent-tag} --install-deps`.
6. Read the report at `playground/benchmarks/{your-agent-tag}/benchmark-report.md`.

## Adding New Agents

1. Create the implementation directory:

   ```
   playground/{agent-name}-{model-name}/
     python-http-server/{plain,skill-guided}/
     react-timer/{plain,skill-guided}/
     go-login-crud/{plain,skill-guided}/
   ```

2. Populate with the three projects following the plain/guided convention.
3. Run the script with the agent tag.
4. Compare reports across agents.

## Prerequisites

- Python 3.10+
- Go 1.21+
- Node.js 18+ and pnpm 9+
- `uv` for Python dependency management (benchmark + project deps)
- tiktoken (`uv sync` in `playground/benchmarks/` to install)
- pytest (`uv sync` installs it as a project dev dependency)
