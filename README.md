# LCCST (Locust)

![Logo poster](./logo-poster.png)

An algorithmic workspace gatekeeper that decomposes complex codebase changes
into isolated, test-verified, atomic Git commits while rigorously enforcing
architectural cohesion and SOLID invariants.

Locust operates as a deterministic, zero-compromise guardian for codebase
health, test coverage, and structural boundaries -- built to put your
preferences first.

> "Swarming your messy diffs before they reach production."

1. **Discover & Format:** Run lints and compilers via a strict Tooling Ladder.
2. **Hunk Clustering:** Group workspace diffs into isolated, atomic units.
3. **Targeted Testing:** Verify changes and enforce strict, ecosystem-aware
   coverage boundaries.
4. **Atomic Commit Generation:** Issue clean Conventional Commits with
   detailed test metrics.
   > Note: The agent explicitly prompts for manual confirmation or
   > requires explicit pre-authorisation before writing to your history.

## Runtime Modes

Locust runs in two modes depending on your environment:

### Bare Skill Mode

The protocol specification (`SKILL.md`) is loaded directly into the LLM's
context window. The model follows the rules manually -- detecting languages,
running commands, and committing changes. No MCP server required.

### MCP Server Mode (Reference: `src/swarm/`)

The MCP server at `src/index.ts` (built to `dist/index.js`) exposes the full
protocol via tools and prompts -- all logic is self-contained in a single
distributable file. AI agents can call the `/init`, `/audit`, and `/swarm`
tools programmatically.

See [src/swarm/README.md](src/swarm/README.md) for more details.

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

## Operational Persona: The Virtual Staff & Release Engineer

Within your workspace ecosystem, Locust acts as a hybrid **Staff Architect**
and hyper-vigilant **Release Engineer**. It does not just facilitate changes;
it ensures every modification complies with long-term engineering health. Like
a disciplined peer, it actively prevents the creation of anti-patterns,
automates versioning overhead, and refuses to stage or commit code that drops
below strict quality thresholds.

## Ecosystem Placement: The Quality Counter-Weight

While the modern AI engineering space is heavily saturated with tools focusing
strictly on compression and cost-reduction, Locust provides the missing
philosophical balance. It is built to run standalone or alongside token-cutters.

| Tool Layer | Focus | Tactical Mechanism |
|---|---|---|
| **[Ponytail](https://github.com/DietrichGebert/ponytail)** | Code Minimisation | Prevents agent boilerplate bloat. |
| **[Headroom](https://github.com/chopratejas/headroom)** | History Reduction | Trims context logs and chat data. |
| **[Caveman](https://github.com/JuliusBrussee/caveman)** | Output Compression | Strips syntax token overhead. |
| **Locust (LCCST)** | **Payload Integrity** | **Enforces typing, lints, and tests.** |

### The Token Investment Philosophy

The project name itself embodies this duality: **LCCST** stands as a direct pun
on **Low Cost** asset management while algorithmically executing **Locality
Clustering** over your workspace tree.

Tools like Ponytail stop the AI from writing *too much* code, but they cannot
stop it from breaking your architectural boundaries. Locust treats tokens as
strategic capital. It invests tokens into multi-step validation loops (the
Tooling Ladder) to eliminate the exponentially higher downstream costs of
debugging broken production builds, untangling messy Git histories, or fixing
silent runtime type failures.

> **Higher token consumption is the intended tradeoff.** Our benchmarks
> consistently show +200-300% more FCT and ART for skill-guided
> implementations. This overhead is not waste -- it funds explicit type safety,
> security boundaries, error handling, and complete test coverage that plain
> generations systematically omit. Every extra token is an investment against
> the 10x cost of finding these defects in production.

## Core Philosophy

1. **UNIX philosophy over framework**: A simple single-file SKILL.md and
   index.js Model Context Protocol (MCP), nothing more required.
   Over-engineering is bad for auditing, adds technical debt and
   needless complexity for nothing.

2. **User Preference Overrides:** Your explicit preferred design patterns and
   target logic always take priority when defining application payloads.
   However, the core safety gates of the pipeline -- including atomic hunk
   isolation, the Tooling Ladder, and strict test-pass verification -- are
   non-negotiable workspace invariants designed to prevent structural
   regressions.

3. **Streamlined Initialisation:** Use the `/init` command on startup to kick
   off immediate, automated codebase scans, helping you audit repository
   health and catch architectural documentation gaps before any changes begin.

4. **Interactive Engagement Loop:** No abrupt dead ends. The system maintains
   continuous, collaborative dialogue -- prompting you for confirmations,
   staging approvals, or clarifying implementation paths.

5. **Proactive Semantic Discovery & Testing:** Leverages Language Server
   Protocol (LSP) data, Tree-sitter AST queries, and native testing frameworks
   to dynamically trace downstream side-effects.

6. **Ecosystem-Native Architecture:** Enforces strict type-safety boundaries,
   modern project layout orchestrators, and single-responsibility interfaces
   (while dynamically allowing cohesive multi-method structures like unified
   HTTP handlers).

7. **Defensive Engineering & Compliance:** Mandates validation boundaries
   across entry points, filters token overhead, audits package licences, and
   automatically adapts to both monolithic and modular/versioned changelog
   layouts using SemVer rules.

8. **Quality over Velocity:** Prioritise structural integrity and complete
   test verification over raw execution speed. Version 3.0.0 enforces strict
   Mode Gating: it maintains an ultra-lean token footprint during passive
   `/audit` scans, reserving heavy completion token investment exclusively for
   the execution loop where full verification overhead is justified.

9. **Granularity over Convenience:** Reject the temptation to bundle
   multi-domain fixes into single execution blocks. Locust applies strict
   **Locality Clustering** to group workspace diffs by their functional
   domain boundaries. The overhead of creating multiple atomic commits is
   deliberately chosen to guarantee easy code rollbacks and crystal-clear
   repository history.

---

## Playground and Benchmarking

See [`playground/README.md`](playground/README.md) for the benchmarking suite
that measures token impact of skill-guided vs plain code generation across
three reference projects (Python HTTP server, React timer, Go login CRUD).

### Verification Matrix & Baseline Benchmarks

The baseline metrics below were captured using our automated evaluation
harness. The data highlights the concrete performance delta observed between
unguided generation and structured protocol compliance.

Two distinct token metrics are tracked:
* **FCT (File-Content Tokens):** Static token footprint of final source
  files (measured via `tiktoken` post-run).
* **ART (Agent Runtime Tokens):** Cumulative prompt + completion tokens
  consumed during the agent loop (captured via the `track_runtime.py`
  proxy).

> ART is captured per-subproject via the `lccst-telemetry` MCP server, giving
> a perfect trace of agent development costs. See the
> [methodology guide](playground/README.md) for the full breakdown.

Scores are fully normalised to a 100-point scale using domain-specific
evaluation profiles. Each subproject is graded on features relevant to its
architectural domain (e.g., UI components are not penalised for missing
encryption patterns).

<!-- BENCHMARK_RESULTS_START -->

#### opencode-mimo-v2.5-free: skill version v2.8.0

| Agent Runtime | LLM Engine | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status | FCT (Plain) | FCT (Guided) | ART (Plain) | ART (Guided) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **opencode** | `mimo-v2.5-free` | `v2.8.0` | `lccst-telemetry` | **python-http-server** | 32/100 | **100/100** | PASSED | 1,621 | 2,684 | 5,207 | 8,622 |
| **opencode** | `mimo-v2.5-free` | `v2.8.0` | `lccst-telemetry` | **react-timer** | 22/100 | **100/100** | PASSED | 735 | 1,506 | 2,360 | 4,837 |
| **opencode** | `mimo-v2.5-free` | `v2.8.0` | `lccst-telemetry` | **go-login-crud** | 49/100 | **100/100** | PASSED | 2,452 | 5,756 | 7,877 | 18,497 |
| **Summary** | | | | **Workspace Totals / Avg** | **34/100** | **100/100** | **3/3 Passed** | **4,808** | **9,946** | **15,444** | **31,956** |

> **Highest ART subproject:** `go-login-crud` consumed the most guided runtime tokens.
> Skill-guided implementation used **+107%** more FCT and **+107%** more ART compared to plain implementation across the workspace suite.

#### opencode-deepseek-v4-flash-free: skill version v3.0.0

| Agent Runtime | LLM Engine | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status | FCT (Plain) | FCT (Guided) | ART (Plain) | ART (Guided) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **opencode** | `deepseek-v4-flash-free` | `v3.0.0` | `lccst-telemetry` | **python-http-server** | 32/100 | **100/100** | PASSED | 676 | 2,343 | 5,700 | 9,900 |
| **opencode** | `deepseek-v4-flash-free` | `v3.0.0` | `lccst-telemetry` | **react-timer** | 22/100 | **100/100** | PASSED | 485 | 1,589 | 10,500 | 14,700 |
| **opencode** | `deepseek-v4-flash-free` | `v3.0.0` | `lccst-telemetry` | **go-login-crud** | 65/100 | **100/100** | PASSED | 1,136 | 4,026 | 16,000 | 21,500 |
| **Summary** | | | | **Workspace Totals / Avg** | **40/100** | **100/100** | **3/3 Passed** | **2,297** | **7,958** | **32,200** | **46,100** |

> **Highest ART subproject:** `go-login-crud` consumed the most guided runtime tokens.
> Skill-guided implementation used **+246%** more FCT and **+43%** more ART compared to plain implementation across the workspace suite.

#### opencode-big-pickle: skill version v2.8.0

| Agent Runtime | LLM Engine | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status | FCT (Plain) | FCT (Guided) | ART (Plain) | ART (Guided) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **opencode** | `big-pickle` | `v2.8.0` | `lccst-telemetry` | **python-http-server** | 32/100 | **84/100** | PASSED | 610 | 2,210 | 3,575 | 12,952 |
| **opencode** | `big-pickle` | `v2.8.0` | `lccst-telemetry` | **react-timer** | 22/100 | **100/100** | PASSED | 384 | 685 | 2,250 | 4,014 |
| **opencode** | `big-pickle` | `v2.8.0` | `lccst-telemetry` | **go-login-crud** | 49/100 | **100/100** | PASSED | 823 | 4,621 | 4,823 | 27,086 |
| **Summary** | | | | **Workspace Totals / Avg** | **34/100** | **95/100** | **3/3 Passed** | **1,817** | **7,516** | **10,648** | **44,052** |

> **Highest ART subproject:** `go-login-crud` consumed the most guided runtime tokens.
> Skill-guided implementation used **+314%** more FCT and **+314%** more ART compared to plain implementation across the workspace suite.

<!-- BENCHMARK_RESULTS_END -->

| Metric | deepseek-v4-flash-free | mimo-v2.5-free | big-pickle |
|---|---|---|---|
| Plain score | 40/100 | 34/100 | 34/100 |
| Guided score | 100/100 | 100/100 | 95/100 |
| Plain FCT | 2,354 | 4,808 | 1,817 |
| Guided FCT | 8,078 | 9,946 | 7,516 |
| FCT overhead | +243% | +107% | +314% |
| Plain ART | 9,485 | 15,444 | 10,648 |
| Guided ART | 32,565 | 31,956 | 44,052 |
| ART overhead | +243% | +107% | +314% |
| Tests passed | 3/3 | 3/3 | 3/3 |

mimo-v2.5-free appears the most token-efficient at +107% overhead, but this
is misleading -- its plain scores (34/100) came at inflated FCT (4,808) and
ART (15,444) compared to deepseek (40/100, 2,354/9,485), indicating it choked
on the plain implementation and required more tokens to produce worse code.
The skill guide delivered a 100/100 score for all three, but the overhead
percentage looks artificially low because the plain baseline was already
elevated by struggle rather than efficiency. deepseek-v4-flash-free had the
strongest plain baseline and reached 100/100 with a +243% overhead that
represents genuine quality investment, not recovery from failure. big-pickle
was the only model below 100/100 (95/100, with 84/100 on
python-http-server) and incurred the highest overhead (+314%). go-login-crud
was the heaviest subproject across all runners.

### Core Architectural Insights

* **The Token Trade-Off (FCT):** The skill-guided protocol introduces a
  deliberate file-content token overhead (see FCT columns above) to fund
  explicit typing, robust error-handling, and mandatory unit testing.
* **Agent Runtime Tokens (ART):** The harness tracks a runtime investment
  across skill-guided development cycles. The heaviest subproject (noted in
  the table above) typically accounts for the largest share of guided ART,
  isolating structural errors during the gated plan-to-execute transition.

> Note: Detailed metric partitioning, line count growth, and feature
> completeness matrices are available in the comprehensive playground
> breakdown. See individual reports for per-version traces.
>
> `headroom` MCP is used for all benchmarks. Follow their setup instructions.

### Adding Benchmarks for Other Models

Feel free to clone the repository and contribute your agent-specific metrics
to the main matrix. Refer to the [playground README](./playground/README.md)
for further details.

Contributions are welcome, especially for frontier models and local
powerhouses like Claude, GPT, Gemma 4 and GLM 5.2.

---

## Installation

### Option A: GitHub Releases (Recommended)

> **Pre-built, no build step required.**

Download the latest release assets from the
[releases page](https://github.com/bladeacer/lccst/releases). Each release
bundles `dist/index.js` (self-contained MCP server), `SKILL.md`,
`dist/index.d.ts`, `LICENSE`, and `README.md`.

After downloading, set the correct path to `dist/index.js` in your agent
configuration file (see Option D for MCP configuration examples). No `npm
install` or build is needed -- `dist/index.js` is fully self-contained.

### Option B: Zero-Setup Declarative Ingestion

> **Download once, run everywhere.**

For instruction-driven workflows, direct CLI executions, or platforms that do
not need background processes.

#### Claude Code CLI

Inject the specification directly via runtime file referencing:

```bash
claude "Review the active git diff using the parameters in ./SKILL.md"
```

#### GitHub Copilot & OpenCode Agents

Reference or pin the file within your conversational prompt context using `@`
or `#` shortcuts depending on your host interface:
* Attach `#SKILL.md` or `@SKILL.md` into your chat input interface.
* Target Execution Prompt: `"Execute the protocol loop defined in this file
  over my uncommitted workspace changes."`

#### Codex & Independent Agent Harnesses

Pipe the raw text content into initialisation runs or supply it through
custom extension layers:

```bash
cat SKILL.md | your-agent-runner "Apply this system execution skill"
```

#### Project-Level Workspace Binding (Automated Rule Locking)

To permanently bind an AI agent to the Locust framework constraints without
typing manual prompt triggers, save or symlink `SKILL.md` directly into your
repository root using the appropriate file target:
* **Cursor IDE:** Save file as `.cursorrules` in your project root.
* **Cline / VS Code AI Agents:** Save file as `.clinerules` in your project
  root.
* **GitHub Copilot (Editor):** Save file as
  `.github/copilot-instructions.md`.

#### Global Editor Profiles

To apply these rules globally across all open development spaces on your
machine, copy the raw content of `SKILL.md` and paste it inside your
editor's global behavioural configuration field:
* **Cursor:** Navigate to `Settings -> Features -> Rules for AI` and append
  the ruleset.
* **Windsurf:** Navigate to `Settings -> Memories` and create or edit a
  global rules entry with the SKILL.md content.
* **VS Code (Cline / Continue):** Create or edit
  `~/.vscode/globalRules.json` with the ruleset content, or paste directly
  into the extension's global configuration panel.
* **JetBrains (AI Assistant):** Navigate to
  `Settings -> Tools -> AI Assistant -> Custom Prompts` and add the ruleset
  as a project-level or global instruction.
* **GitHub Copilot (CLI):** Set `GITHUB_COPILOT_INSTRUCTIONS` environment
  variable to point to a local copy of `SKILL.md`, or append the content to
  `~/.github/copilot-instructions.md`.

---

### Option C: Universal Package Registry Integration

> **The package manager route. One command, multi-agent deployment.**

For platforms and command-line interfaces that natively implement the
decentralised **Agent Skills Standard** (e.g., Claude Code, Cursor, Windsurf,
Roo Code, Gemini CLI, Codex). This directly registers the root-level
`SKILL.md` file layout to your environment using the global skills
infrastructure.

Install the skill block directly from the public GitHub source path:

```bash
npx skills add bladeacer/lccst
```

#### Executing the Workspace Module

Once mapped through the universal package engine, invoke the system execution
pipeline via your terminal runner profile or active agent interface:

```bash
/lccst
```

---

### Option D: Model Context Protocol (MCP) Server Setup

> **Clone, install, build, configure.**

Clone the repository and install dependencies:

```bash
git clone --depth 1 https://github.com/bladeacer/lccst
cd lccst
pnpm install
pnpm run build
```

For AI runners that support automated standard I/O (stdio) communication
daemons (e.g., Claude Code, Cursor, Cline, Windsurf, Codex, Pi, OpenCode,
Gemini CLI / Antigravity).

Add the following configuration object to your global or project-level MCP
server connection arrays (such as `claude_desktop_config.json`):

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

> **Important:** Replace `/absolute/path/to/lccst/dist/index.js` with the
> actual path to `dist/index.js` on your system. If you downloaded from
> GitHub Releases (Option A), point it to the downloaded file location.

The MCP server exposes three tools for programmatic use:
* **`init`** -- Map project conventions and verify environment
* **`audit`** -- Scan workspace diffs and generate commit plan
* **`swarm`** -- Execute the full discovery-cluster-test-commit loop

#### OpenCode Setup

OpenCode uses an `opencode.jsonc` file at the project root for MCP server
configuration and skill registration.

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

Replace the path with your actual `dist/index.js` location.

##### Referencing as a Skill

The `SKILL.md` file is an [Agent Skill](https://agentskills.io/specification).
OpenCode automatically discovers skills named `SKILL.md` at the project root.
To invoke Locust within a conversation, use the `/lccst` command or reference
`@SKILL.md` in your prompt.

##### Available Test Scripts

```bash
pnpm run build      # Bundle deps + source -> dist/index.js
pnpm run test       # Run all tests (22 unit + 6 integration)
pnpm run test:swarm # Swarm library unit tests only
pnpm run test:mcp   # MCP server integration tests only
pnpm run bump 3.0.1 # Bump version across all files
```

---

## Development

### Developer Dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | >= 9 | Package manager (engine + playground Node projects) |
| TypeScript | >= 5.4 | Compiling engine source |

Benchmarking has its own set of dependencies, see details in
[playground README](/playground/README.md).

## LLM Usage Disclosure

It's an AI skill, AI assistance was used in the making of this project.
Architectural, design decisions and ensuring the code works as intended was
done by a human.

## Credits

Locust was heavily inspired by
[ponytail](https://github.com/DietrichGebert/ponytail).

The logo and posters uses
[the Iceberg Dark colour scheme by cocopon](https://cocopon.github.io/iceberg.vim/).

[IBM Plex Mono](https://github.com/IBM/plex) was used for typography.

The [Agent Skills specification](https://agentskills.io/specification).

## License

This project is open-source and licensed under the terms of the MIT License.
