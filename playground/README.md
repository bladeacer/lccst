# LCCST Playground

Benchmarking harness for measuring the impact of skill-guided vs plain code generation across three reference projects.

## Quick Start

```bash
# Run the benchmark for the current agent
python3 playground/benchmarks/run_benchmark.py opencode-deepseek-v4-flash-free --install-deps

# Read the report
cat playground/benchmarks/opencode-deepseek-v4-flash-free/benchmark-report.md
```

## Projects

| Project | Plain (no skill) | Skill-guided |
|---------|:-:|:-:|
| Python HTTP Server | Single-file CRUD | Typed, validated, rate-limited, pyproject.toml |
| React Timer | HTML + JS stopwatch | TSX component + Timer class, Jest tests |
| Go Login CRUD | Monolithic main.go | Layered architecture, interfaces, middleware |

## Methodology

Each project has two implementations: a minimal "plain" version and a structured "skill-guided" version following the protocol in `skill.md`. The benchmark script measures token counts, code features, test results, and robustness scores.

See [`guide.md`](guide.md) for detailed methodology.
