# LCCST Playground

Benchmarking harness for measuring the impact of skill-guided vs plain code generation across three reference projects.

## Benchmark project dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 18 | Running the LCCST MCP server |
| pnpm | >= 9 | Package manager (engine + playground Node projects) |
| TypeScript | >= 5.4 | Compiling engine source |
| Python | >= 3.10 | Running playground benchmarks |
| Go | >= 1.21 | Reference project in playground |
| uv | >= 0.4 | Python package manager (benchmark + playground project deps) |

## Quick Start

Direct your agent to make use of guide.md to implement the code then run the benchmarks.

Prompt your agent with the following:

```md
You are executing inside a clean sandbox for the LCCST Playground Benchmark. 
Our goal is to implement the mentioned subprojects.

The rules in `./skill.md` (Protocol Specification v2.1) are fully active for this run.
Please parse and strictly reference `playground/README.md` and `playground/guide.md` 
for specific architectural constraints, file topology expectations, and implementation details.

### Target Specifications
1. Target Environment: [e.g., Python 3.13 / Go 1.26 / React TS]
2. Task Scope: [e.g., Build a complete REST HTTP user CRUD system with an in-memory database]
3. Structural Mandate: Follow strict decoupling, typing, and structural boundaries as dictated by the playground guide matrix.

Run the `/init` workspace scan command now to audit the workspace setup, then output your pre-flight architectural plan before writing any code.
```

## Benchmarking

```bash
# Install benchmark deps (tiktoken for accurate token counts)
cd playground/benchmarks && uv sync && cd ../..

# Run the benchmark for the current agent
python3 playground/benchmarks/run_benchmark.py opencode-deepseek-v4-flash-free --install-deps

# Read the report
cat playground/benchmarks/opencode-deepseek-v4-flash-free/benchmark-report.md
```

## Projects

| Project | Plain (no skill) | Skill-guided |
|---------|:-:|:-:|
| Python HTTP Server | Single-file CRUD | Typed, validated, rate-limited, pyproject.toml |
| React Timer | HTML + JS stopwatch | TypeScript (`.ts`/`.tsx`), Timer + React component, Jest |
| Go Login CRUD | Monolithic main.go | Layered architecture, interfaces, middleware |

## Methodology

Each project has two implementations: a minimal "plain" version and a structured "skill-guided" version following the protocol in `skill.md`. The benchmark script measures token counts, code features, test results, and robustness scores.

See [`guide.md`](guide.md) for detailed methodology.
