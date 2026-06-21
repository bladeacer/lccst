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
You are executing inside a clean, instrumented sandbox for the LCCST Playground Benchmark. 
Our goal is to implement the mentioned subprojects under live operational monitoring.

The rules in../../skill.md are fully active for this run.
Please parse and strictly reference ../../playground/README.md and ../../playground/guide.md 
for specific architectural constraints, file topology expectations, and implementation details.

### Target Specifications
1. Target Environment: [e.g., Python 3.13 / Go 1.26 / React TS]
2. Task Scope: [e.g., Build a complete REST HTTP user CRUD system with an in-memory database]
3. Structural Mandate: Follow strict decoupling, typing, and structural boundaries as dictated by the playground guide matrix.

### Pre-Flight Sandbox Boundary & Telemetry Constraints
Before executing the `/init` workspace scan, looking at the directory layout, or running any inspection commands (do not run `ls`, `find`, `git status`, `git diff`, `git log`, or open files):
* You are operating strictly inside the isolated workspace directory `playground/opencode-deepseek-v4-flash-free/` relative to the repository root. All relative path references to global resources require navigating up two directories (`../../`).
* You are explicitly commanded to execute a **blind deletion pass**. Immediately wipe (`rm -rf` equivalent) any existing `plain/` and `skill-guided/` folders inside your current directory without reading, listing, or querying version control metadata first.
* SYSTEM ENVIRONMENT NOTICE (MCP TELEMETRY): An active MCP server `lccst-telemetry` is plugged directly into your execution context. You are explicitly required to invoke the `log_turn_telemetry` tool at the conclusion of every single loop step, passing your session's true prompt and completion token counts to maintain benchmarking validity.
* CRITICAL INTEGRITY RULE: You do not need to configure any network settings or proxies. Simply interact with your native models normally.
* CRITICAL BOUNDARY: Do not touch, read, or delete any files or directories outside your specific `active_run/` working path scope.

Once the blind deletion pass is executed, run the `/init` workspace scan command now to audit the fresh sandbox setup, then output your pre-flight architectural plan before writing any code.

## Operational Constraints

1. **Incremental Implementation**: Complete one project type at a time (e.g., implement `python-http-server`, lint it, and run its tests). Do not proceed to the next project until the current one is completely finished.
2. **Turn-Based Telemetry Checkpointing**: At the end of every individual development phase or project completion turn, you MUST explicitly invoke the `log_turn_telemetry` tool with your token usage statistics before moving forward.
```

See [agent-prompt.md](./agent-prompt.md) for full prompt.

## Benchmarking & Token Telemetry

To measure both **File-Content Tokens (FCT)** and **Agent Runtime Tokens (ART)**, the benchmark must be executed through the orchestration framework. This connects your local `opencode.jsonc` runtime context to our decoupled telemetry tracker.

### 1. Build the MCP Telemetry Server

Ensure the low-level base MCP dependencies are compiled locally down to an active JavaScript target:
```bash
cd ./benchmarks/mcp-telemetry
pnpm install
pnpm run build
```

### 2. Configure `opencode.jsonc`
Inject the local custom server reference mapping into your workspace configuration block. Use the two-level step-out (`../../`) array configuration to bridge the subproject runtimes safely:

For example, set for Opencode at [opencode.jsonc](../opencode.jsonc).

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "lccst-telemetry": {
      "type": "local",
      "command": [
        "node",
        "../../playground/benchmarks/mcp-telemetry/build/index.js"
      ],
      "enabled": true
    }
  }
}
```

### 3. Execute Workflow Lifecycle

```bash
# 1. Clean previous caches and structure the isolation clean-room e.g.
make benchmark-free AGENT_NAME=opencode MODEL_NAME=deepseek-v4-flash-free

# 2. Run your agent, check lccst-telemetry MCP is active paste the prompt, let it run.
make AGENT_NAME=opencode MODEL_NAME=deepseek-v4-flash-free

# 3. Exit once done. Folder cleanup and benchmark files writing
will happen automatically

# 2. View versioned evaluation output report logs
cat ./benchmarks/opencode-deepseek-v4-flash-free/benchmark-report-v*.md
# e.g. cat ./benchmarks/opencode-deepseek-v4-flash-free/benchmark-report-v2.2.md
```

Run this in project root, not this directory.

## Methodology

Each project has two implementations: a minimal "plain" version and a structured "skill-guided" version following the protocol in `skill.md`. 

The framework evaluates data across two distinct metrics:
1. **File Payload Footprint (FCT):** Structural robustness, syntax verbosity, and test file generation weight calculated via `tiktoken` directly over the generated folder structures.
2. **Execution Cost Overhead (ART):** Direct token usage transaction records captured in `runtime-telemetry.json` by the active JSON-RPC stdio channel during model context switching loops.

See [`guide.md`](guide.md) for detailed methodology and implementation specifics.
