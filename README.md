# LCCST (Locust)

A deterministic workspace gatekeeper. It enforces architectural cohesion and SOLID invariants through a lean execution protocol. Decomposes codebase changes into isolated, test-verified, atomic Git commits.

Locust acts as a structural integrity guardian for codebase health, test coverage, and architectural boundaries.

> "Swarming your messy diffs before they reach production."

The execution model is a flat 3-step path: wipe stale artefacts, seed via `/init`, then generate application files directly. Architectural guardrails and ecosystem discovery remain active during code generation.

## Runtime Modes

### Bare Skill Mode

The protocol specification (`SKILL.md`) loads directly into the LLM context window. The model follows the rules manually. No MCP server required.

### MCP Server Mode

The MCP server at `src/index.ts` (built to `dist/index.js`) exposes the full protocol via tools. AI agents call `/init`, `/audit`, `/swarm`, `/tooling`, `/lint`, `/format`, `/test`, `/build`, `/verify`, `/compliance`, and `/version` programmatically.

The server is self-contained in a single file. See `src/index.ts` for implementation details.

```bash
# Go Example
/init -> Detects go.mod -> swarm runs `go test ./...`
# Rust Example
/init -> Detects Cargo.toml -> swarm runs `cargo test`
# Python Example
/init -> Detects pyproject.toml -> swarm runs `uv run pytest`
# Node.js Example
/init -> Detects package.json -> swarm runs `pnpm test`
# Julia Example
/init -> Detects Project.toml -> swarm runs `julia --project=. -e "using Pkg; Pkg.test()"`
# CMake Example
/init -> Detects CMakeLists.txt -> swarm runs `cmake --build .`
```

## Installation

### Option A: GitHub Releases (Recommended)

Download the latest release assets from the [releases page](https://github.com/bladeacer/lccst/releases). Each release bundles `dist/index.js`, `SKILL.md`, `dist/index.d.ts`, `LICENSE`, and `README.md`.

After downloading, set the correct path to `dist/index.js` in your agent configuration file. No `npm install` or build is needed.

### Option B: Zero-Setup Declarative Ingestion

For instruction-driven workflows or platforms that do not need background processes.

#### Claude Code CLI

Inject the specification directly via runtime file referencing:

```bash
claude "Review the active git diff using the parameters in ./SKILL.md"
```

#### GitHub Copilot & OpenCode Agents

Reference or pin the file within your conversational prompt context using `@` or `#` shortcuts. Attach `#SKILL.md` or `@SKILL.md` into your chat input interface.

#### Codex & Independent Agent Harnesses

Pipe the raw text content into initialisation runs:

```bash
cat SKILL.md | your-agent-runner "Apply this system execution skill"
```

#### Project-Level Workspace Binding (Automated Rule Locking)

To permanently bind an AI agent to the Locust framework constraints, save or symlink `SKILL.md` directly into your repository root:
- **Cursor IDE:** Save file as `.cursorrules` in your project root.
- **Cline / VS Code AI Agents:** Save file as `.clinerules` in your project root.
- **GitHub Copilot (Editor):** Save file as `.github/copilot-instructions.md`.

#### Global Editor Profiles

To apply these rules globally, copy the raw content of `SKILL.md` and paste it inside your editor's global behavioural configuration field:
- **Cursor:** `Settings -> Features -> Rules for AI`
- **Windsurf:** `Settings -> Memories`
- **VS Code (Cline / Continue):** `~/.vscode/globalRules.json`
- **JetBrains (AI Assistant):** `Settings -> Tools -> AI Assistant -> Custom Prompts`
- **GitHub Copilot (CLI):** Set `GITHUB_COPILOT_INSTRUCTIONS` or append to `~/.github/copilot-instructions.md`.

### Option C: Universal Package Registry Integration

For platforms that natively implement the decentralised Agent Skills Standard:

```bash
npx skills add bladeacer/lccst
```

Once mapped, invoke the system execution pipeline via your terminal runner profile or active agent interface:

```bash
/lccst
```

### Option D: Model Context Protocol (MCP) Server Setup

Clone the repository and install dependencies:

```bash
git clone --depth 1 https://github.com/bladeacer/lccst
cd lccst
pnpm install
pnpm run build
```

For AI runners that support automated standard I/O communication daemons.

Add the following configuration object to your global or project-level MCP server connection arrays:

```json
{
  "mcpServers": {
    "lccst": {
      "command": "node",
      "args": ["/absolute/path/to/lccst/dist/index.js"]
    }
  }
}
```

> **Important:** Replace `/absolute/path/to/lccst/dist/index.js` with the actual path to `dist/index.js`.

The MCP server exposes eleven tools for programmatic use:
- **`init`** -- Map project conventions and verify environment
- **`audit`** -- Scan workspace diffs and generate commit plan
- **`swarm`** -- Execute the full discovery-cluster-test-commit loop
- **`tooling`** -- Inventory Makefile targets, `scripts/` helpers, and package scripts
- **`lint`** -- Run lint (Makefile target first, manifest fallback)
- **`format`** -- Run format
- **`test`** -- Run test
- **`build`** -- Run build
- **`verify`** -- Run the full quality gate (format, lint, test, build)
- **`compliance`** -- Audit deliverable tiers
- **`version`** -- Report the current LCCST version

Every path-taking tool accepts a `path` argument. The default `.` resolves to the client project's cwd. Absolute paths are preserved. `~` expands to your home directory. Relative paths resolve under the workspace root. To override the workspace root, set the `LCCST_WORKSPACE` environment variable.

#### OpenCode Setup

OpenCode uses an `opencode.jsonc` file at the project root for MCP server configuration and skill registration.

##### Registering the Main LCCST MCP Server

Add the following to your `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "lccst": {
      "type": "local",
      "command": ["node", "/absolute/path/to/lccst/dist/index.js"],
      "enabled": true
    }
  }
}
```

Replace the path with your actual `dist/index.js` location. The server is disabled by default (`enabled: false`). Flip it to `true` to keep it active for a session. Inside benchmark playground workspaces the main server stays disabled so runs remain isolated from protocol tooling.

##### Referencing as a Skill

The `SKILL.md` file is an [Agent Skill](https://agentskills.io/specification). OpenCode automatically discovers skills named `SKILL.md` at the project root. To invoke Locust within a conversation, use the `/lccst` command or reference `@SKILL.md` in your prompt.

##### Available Test Scripts

```bash
pnpm run build      # Bundle deps + source -> dist/index.js
pnpm run test       # Run all tests
pnpm run test:swarm # Swarm library unit tests only
pnpm run test:mcp   # MCP server integration tests only
pnpm run bump 3.0.1 # Bump version across all files
```

## Development

Agents working on this repository should read `AGENTS.md` for build and test commands, deliverable tiers, changelog conventions, and structural invariants.

### Developer Dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | >= 9 | Package manager |
| TypeScript | >= 5.4 | Compiling engine source |

Benchmarking has its own set of dependencies. See [playground README](/playground/README.md).

## Playground and Benchmarking

See [`playground/README.md`](playground/README.md) for the benchmarking suite
that measures token impact of skill-guided vs plain code generation across
three reference projects (Python HTTP server, React timer, Go login CRUD).

<!-- BENCHMARK_RESULTS_START -->

#### opencode-ling-3.0-flash-free: skill version v3.1.0

| Agent Runtime | LLM Engine | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status | FCT (Plain) | FCT (Guided) | ART (Plain) | ART (Guided) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **opencode** | `ling-3.0-flash-free` | `v3.1.0` | `lccst-telemetry` | **python-http-server** | 32/100 | **100/100** | PASSED | 528 | 2,221 | 3,900 | 1,850 |
| **opencode** | `ling-3.0-flash-free` | `v3.1.0` | `lccst-telemetry` | **react-timer** | 22/100 | **100/100** | PASSED | 428 | 992 | 750 | 1,600 |
| **opencode** | `ling-3.0-flash-free` | `v3.1.0` | `lccst-telemetry` | **go-login-crud** | 65/100 | **100/100** | PASSED | 812 | 4,495 | 800 | 1,800 |
| **Summary** | | | | **Workspace Totals / Avg** | **40/100** | **100/100** | **3/3 Passed** | **1,768** | **7,708** | **5,450** | **5,250** |

> **Highest ART subproject:** `python-http-server` consumed the most guided
> runtime tokens.
> **Highest FCT subproject:** `go-login-crud` consumed the most guided FCT
> tokens.
> Skill-guided implementation used **+336%** more FCT and **-4%** more ART
> compared to plain implementation across the workspace suite.

#### opencode-deepseek-v4-flash-free: skill version v3.3.0

| Agent Runtime | LLM Engine | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status | FCT (Plain) | FCT (Guided) | ART (Plain) | ART (Guided) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **opencode** | `deepseek-v4-flash-free` | `v3.3.0` | `lccst-telemetry` | **python-http-server** | 32/100 | **100/100** | PASSED | 617 | 3,337 | 98,400 | 34,000 |
| **opencode** | `deepseek-v4-flash-free` | `v3.3.0` | `lccst-telemetry` | **react-timer** | 22/100 | **100/100** | PASSED | 445 | 1,336 | 31,900 | 35,700 |
| **opencode** | `deepseek-v4-flash-free` | `v3.3.0` | `lccst-telemetry` | **go-login-crud** | 49/100 | **100/100** | PASSED | 795 | 4,436 | 33,300 | 38,200 |
| **Summary** | | | | **Workspace Totals / Avg** | **34/100** | **100/100** | **3/3 Passed** | **1,857** | **9,109** | **163,600** | **107,900** |

> **Highest ART subproject:** `go-login-crud` consumed the most guided runtime
> tokens.
> **Highest FCT subproject:** `go-login-crud` consumed the most guided FCT
> tokens.
> Skill-guided implementation used **+391%** more FCT and **-34%** more ART
> compared to plain implementation across the workspace suite.

#### opencode-hy3-free: skill version v3.4.0

| Agent Runtime | LLM Engine | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status | FCT (Plain) | FCT (Guided) | ART (Plain) | ART (Guided) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **opencode** | `hy3-free` | `v3.4.0` | `lccst-telemetry` | **python-http-server** | 32/100 | **100/100** | PASSED | 562 | 2,129 | 12,220 | 15,570 |
| **opencode** | `hy3-free` | `v3.4.0` | `lccst-telemetry` | **react-timer** | 22/100 | **100/100** | PASSED | 352 | 933 | 8,150 | 19,870 |
| **opencode** | `hy3-free` | `v3.4.0` | `lccst-telemetry` | **go-login-crud** | 65/100 | **100/100** | PASSED | 909 | 4,072 | 10,400 | 24,160 |
| **Summary** | | | | **Workspace Totals / Avg** | **40/100** | **100/100** | **3/3 Passed** | **1,823** | **7,134** | **30,770** | **59,600** |

> **Highest ART subproject:** `go-login-crud` consumed the most guided runtime
> tokens.
> **Highest FCT subproject:** `go-login-crud` consumed the most guided FCT
> tokens.
> Skill-guided implementation used **+291%** more FCT and **+94%** more ART
> compared to plain implementation across the workspace suite.


### Benchmark Summary

| Metric | opencode-ling-3.0-flash-free | opencode-deepseek-v4-flash-free | opencode-hy3-free |
| --- | --- | --- | --- |
| Plain score | 40/100 | 34/100 | 40/100 |
| Guided score | 100/100 | 100/100 | 100/100 |
| Plain FCT | 1,768 | 1,857 | 1,823 |
| Guided FCT | 7,708 | 9,109 | 7,134 |
| FCT overhead | +336% | +391% | +291% |
| Plain ART | 5,450 | 163,600 | 30,770 |
| Guided ART | 5,250 | 107,900 | 59,600 |
| ART overhead | -4% | -34% | +94% |
| Tests passed | 3/3 | 3/3 | 3/3 |

#### Token Efficiency

All evaluated models (`opencode-ling-3.0-flash-free`,
`opencode-deepseek-v4-flash-free`, and `opencode-hy3-free`) achieved a perfect
guided score of 100/100 under the protocol. However, their resource efficiency
varied significantly:

* **opencode-ling-3.0-flash-free** entered with the strongest plain baseline
  (40/100) and reached perfection with +336% FCT and -4% ART overhead --
  representing a genuine quality investment rather than recovery from failure.

* **opencode-hy3-free** was the most token-efficient at +291% FCT with +94% ART
  overhead, though its lower plain baseline (40/100) means the overhead figure
  partly reflects additional rounds of correction.

* **opencode-deepseek-v4-flash-free** also delivered a perfect guided score,
  with +391% FCT and -34% ART overhead.

Across all runners, `go-login-crud` remained the most resource-intensive
subproject.

#### Least Token Usage

opencode-ling-3.0-flash-free consumed the fewest tokens overall (20,176): 1,768
plain FCT, 7,708 guided FCT, 5,450 plain ART, and 5,250 guided ART.

#### Overall Top Models

| Rank | Agent-Model | Plain Score | Guided Score | FCT Overhead | ART Overhead | Verdict |
| ---: | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | opencode-ling-3.0-flash-free | 40/100 | 100/100 | +336% | -4% | Best overall |
| 2 | opencode-deepseek-v4-flash-free | 34/100 | 100/100 | +391% | -34% | Strong contender |
| 3 | opencode-hy3-free | 40/100 | 100/100 | +291% | +94% | Strong contender |

<!-- BENCHMARK_RESULTS_END -->


## LLM Usage Disclosure

AI assistance was used in the making of this project. Architectural and design decisions and ensuring the code works as intended was done by a human.

## Credits

Locust was heavily inspired by [ponytail](https://github.com/DietrichGebert/ponytail).

The logo and posters use [the Iceberg Dark colour scheme by cocopon](https://cocopon.github.io/iceberg.vim/).

[IBM Plex Mono](https://github.com/IBM/plex) was used for typography.

The [Agent Skills specification](https://agentskills.io/specification).

Skill writing and docs follows ASD-STE100 Simplified Technical English. The [SimpleEnglish skill](https://github.com/AminBlg/SimpleEnglish) guides this work.

## License

This project is open-source and licensed under the terms of the MIT License.
