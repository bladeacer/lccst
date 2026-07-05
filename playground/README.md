# LCCST Playground

Benchmarking harness for measuring the impact of skill-guided vs plain code
generation across three reference projects.

## Runtime Modes

LCCST can operate in two modes:

* **Bare prompt** — Load `SKILL.md` directly into your LLM context window.
  The model follows the protocol manually (fallback language detection, manual
  approval steps).
* **MCP server** — Run `node dist/index.js` to serve the protocol as tools.
  The server source lives at `src/index.ts`; the execution library is under
  `swarm/`.

## Benchmark project dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 18 | Running the LCCST MCP server |
| pnpm | >= 9 | Package manager (engine + playground Node projects) |
| TypeScript | >= 5.4 | Compiling engine source |
| Python | >= 3.10 | Running playground benchmarks |
| Go | >= 1.21 | Reference project in playground |
| uv | >= 0.4 | Python package manager (benchmark deps) |

## Quick Start

Direct your agent to make use of guide.md to implement the code then run the
benchmarks.

Prompt your agent with the full prompt in [agent-prompt.md](./agent-prompt.md).

### Setup

Install `headroom` MCP.

It is used for all benchmarks but not mentioned by the benchmarking.
Follow their setup instructions.

- [headroom repo](https://github.com/chopratejas/headroom)

`headroom` is used to save on token usage while still preserving context.

## Benchmarking & Token Telemetry

To measure both **File-Content Tokens (FCT)** and **Agent Runtime Tokens (ART)**,
the benchmark must be executed through the orchestration framework. This
connects your local agent configuration to our decoupled
telemetry tracker.

### 1. Build the MCP Telemetry Server

Ensure the low-level base MCP dependencies are compiled locally down to an
active JavaScript target:

```bash
cd ./benchmarks/mcp-telemetry
pnpm install
pnpm run build
```

### 2. Configure your agent
Inject the local custom server reference mapping into your workspace
configuration block. Use the two-level step-out (`../../`) array
configuration to bridge the subproject runtimes safely:

For example, in your agent's configuration file:

```json
{
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
make benchmark-free AGENT_NAME=your-agent MODEL_NAME=your-model

# 2. Run your agent in a NEW SESSION, check lccst-telemetry MCP is active
# paste the prompt, let it run.
# You can set values to override the defaults used in the Makefile
make AGENT_NAME=your-agent MODEL_NAME=your-model

# 3. Exit once done. Folder cleanup and benchmark files writing
# will happen automatically

# 4. View versioned evaluation output report logs
cat ./benchmarks/${AGENT_NAME}-${MODEL_NAME}/benchmark-report-v*.md

# 5. Aggregated results in README (project root)
cat README.md
```

Run this in project root, not this directory.

## Methodology & Scoring Framework

Each project contains two implementations: a minimal "plain" version and a
structured "skill-guided" version following the protocol rules in `SKILL.md`.

The evaluation framework captures data across two metrics:
1. **File Payload Footprint (FCT):** Structural robustness, syntax verbosity,
   and test file generation weight calculated via `tiktoken` (cl100k_base).
2. **Execution Cost Overhead (ART):** Direct token usage transaction records
   captured in `runtime-telemetry.json` by the active JSON-RPC stdio channel.

### Robustness Score Calculation

Robustness scores are programmatically normalized to a 100-point scale based on
a strict combination of runtime testing and code feature mapping:

1. **Base Verification (50 pts):** Awarded automatically if the subproject's
   native unit test suite exits with a successful code (`PASSED`). Retaining or
   failing tests natively yields a maximum of 15 points, while timeouts or env
   failures drop the baseline score to 5 points. Unguided "plain" code automatically
   scores 0 here as they fail to generate or execute testing suites.
2. **Static Feature Discovery (Up to 50 pts):** The evaluation framework uses
   targeted regex engines to discover required structural guarantees:
   * **Explicit Typing:** Identifies type definitions, interfaces, strict
     function signatures, schemas, or contract variables.
   * **Security Measures:** Discovers authentication schemes, tokens, hashing
     algorithms, crypto params, rate limiters, or input sanitizers.
   * **Robustness Guardrails:** Scans for explicit try/catch blocks, native error
     propagation routines, exception traps, or error returns.

### Profile Weight Calibration Matrix

To prevent architectural bias across different software stacks, features that
are irrelevant to a subproject's target domain are omitted from its total point
denominator. The resulting raw score is then normalized to a 100-point scale:

$$\text{Final Score} = \left( \frac{\text{Earned Points}}{\text{Max Denominator}} \right) \times 100$$

| Project Submodule Target | Base Test | Typing | Security | Error Handle | Max Denom | Final Scale |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`python-http-server`** | 50 pts | +17 pts | +17 pts | +16 pts | **100 Pts** | **100% Max** |
| **`react-timer`** | 50 pts | +17 pts | 0 pts   | 0 pts   | **67 Pts** | **100% Max** |
| **`go-login-crud`** | 50 pts | +17 pts | +17 pts | +16 pts | **100 Pts** | **100% Max** |
