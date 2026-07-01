# LCCST (Locust)

![Logo poster](./logo-poster.png)

An algorithmic workspace gatekeeper that decomposes complex codebase changes
into isolated, test-verified, atomic Git commits while rigorously enforcing
architectural cohesion and SOLID invariants.

Locust operates as a deterministic, zero-compromise guardian for codebase
health, test coverage, and structural boundaries - built to put your
preferences first.

> "Swarming your messy diffs before they reach production."

1. **Discover & Format:** Run lints and compilers via a strict Tooling Ladder.
2. **Hunk Clustering:** Group workspace diffs into isolated, atomic units.
3. **Targeted Testing:** Verify changes and enforce strict, ecosystem-aware
coverage boundaries.
4. **Atomic Commit Generation:** Issue clean Conventional Commits with detailed
test metrics. 
> Note: The agent explicitly prompts and requests authorization before
writing commits.

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
| **[Ponytail](https://github.com/DietrichGebert/ponytail)** | Code Minimization | Prevents agent boilerplate bloat. |
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

## Core Philosophy

* **User Preference Overrides:** Your explicit instructions and preferred
  patterns always come first. If any rule in this protocol clashes with your
  desired workflow, the system automatically prioritises your choice.
* **Streamlined Initialisation:** Use the `/init` command on startup to kick
  off immediate, automated codebase scans, helping you audit repository health
  and catch architectural documentation gaps before any changes begin.
* **Interactive Engagement Loop:** No abrupt dead ends. The system maintains
  continuous, collaborative dialogue - prompting you for confirmations, staging
  approvals, or clarifying implementation paths.
* **Proactive Semantic Discovery & Testing:** Leverages Language Server
  Protocol (LSP) data, Tree-sitter AST queries, and native testing frameworks
  to dynamically trace downstream side-effects.
* **Ecosystem-Native Architecture:** Enforces strict type-safety boundaries,
  modern project layout orchestrators, and single-responsibility interfaces
  (while dynamically allowing cohesive multi-method structures like unified
  HTTP handlers).
* **Defensive Engineering & Compliance:** Mandates validation boundaries
  across entry points, filters token overhead, audits package licences, and
  automatically adapts to both monolithic and modular/versioned changelog
  layouts using SemVer rules.
* **Quality over Velocity:** Prioritise structural integrity and complete test
  verification over raw execution speed. Spending extra LLM tokens and time
  to run the Tooling Ladder is an explicit design choice to prevent technical
  debt downstream.
* **Granularity over Convenience:** Reject the temptation to bundle multi-domain
  fixes into single execution blocks. Locust applies strict **Locality
  Clustering** to group workspace diffs by their functional domain boundaries.
  The overhead of creating multiple atomic commits is deliberately chosen to
  guarantee easy code rollbacks and crystal-clear repository history.

---

## Playground and Benchmarking

See [`playground/README.md`](playground/README.md) for the benchmarking suite
that measures token impact of skill-guided vs plain code generation across
three reference projects (Python HTTP server, React timer, Go login CRUD).

### Verification Matrix & Baseline Benchmarks

The baseline metrics below were captured using our automated evaluation harness.
The data highlights the concrete performance delta observed between unguided 
generation and structured protocol compliance.

Two distinct token metrics are tracked:
* **FCT (File-Content Tokens):** Static token footprint of final source files
  (measured via `tiktoken` post-run).
* **ART (Agent Runtime Tokens):** Cumulative prompt + completion tokens consumed
  during the agent loop (captured via the `track_runtime.py` proxy).

Scores are fully normalised to a 100-point scale using project-specific
evaluation profiles. Each target subproject is graded exclusively on features
relevant to its architectural domain (for instance, front-end presentation 
components are not penalised for a lack of database encryption patterns).

For more details, see [playground/README.md](/playground/README.md).

#### opencode-deepseek-v4-flash-free: skill version 2.5

| Agent Runtime | LLM Engine | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status | FCT (Plain/Guided) | ART (Plain/Guided) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **opencode** | `deepseek-v4-flash-free` | `skill.md v2.5` | `lccst-telemetry` | **Python HTTP Server** | 48/100 | **100/100** | PASSED | 582 / 1,765 | 1,099 / 3,336 |
| **opencode** | `deepseek-v4-flash-free` | `skill.md v2.5` | `lccst-telemetry` | **React Timer** | 22/100 | **100/100** | PASSED | 385 / 943 | 727 / 1,782 |
| **opencode** | `deepseek-v4-flash-free` | `skill.md v2.5` | `lccst-telemetry` | **Go Login CRUD** | 65/100 | **100/100** | PASSED | 1,138 / 4,405 | 2,150 / 8,335 |
| **Summary** | | | | **Workspace Totals / Avg** | **45/100** | **100/100** | **3/3 Passed** | **2,105 / 7,113** | **3,976 / 13,453** |

### Core Architectural Insights

* **The Token Trade-Off (FCT):** The skill-guided protocol introduces a deliberate
  **+238%** file-content token overhead (+5,008 FCT across the workspace suite). 
  This represents a streamlined footprint optimization over v2.3, directly funding explicit 
  typing interfaces, robust error-handling pipelines, and mandatory unit testing modules.
* **Agent Runtime Tokens (ART):** The harness tracked a total runtime investment of
  **13,453 tokens** for the guided routines over the active development cycles. The cost 
  distribution reveals that building the foundational scaffolding for the complex `go-login-crud` 
  module accounted for over **61%** of the guided runtime investment (8,335 tokens), blocking 
  multi-turn regression loops before execution.
* **Profile-Aware Calibration:** Adjusting the scoring harness to use domain
  isolation profiles prevents metric flatlining. By eliminating security bias
  from purely declarative UI modules (React timer), the framework accurately
  tracks valid modular scaling victories (achieving a true 100% standing) without 
  penalizing a lack of database encryption patterns.
* **Deterministic Tool Integration:** Structuring the session with the active 
  `lccst-telemetry` MCP server ensures bulletproof compliance checkpointing. By capturing 
  every token transaction directly via the JSON-RPC channel on each development loop, the 
  framework maintains a perfect trace of development costs without altering the code runtime.

> Note: Detailed metric partitioning, line count growth, and feature completeness matrices are available in the comprehensive playground breakdown. 
> 
> `headroom` and `codegraph` MCP is used for all benchmarks but not mentioned by the benchmarking. Follow their setup instructions.

Full verification traces are logged natively at:  
[`playground/benchmarks/opencode-deepseek-v4-flash-free/benchmark-report-v2.5 (Standalone Single-File System).md`](/playground/benchmarks/opencode-deepseek-v4-flash-free/benchmark-report-v2.5%20%28Standalone%20Single-File%20System%29.md)

### Adding Benchmarks for Other Models

Feel free to clone the repository and contribute your agent-specific metrics
to the main matrix. Refer to the [playground README](./playground/README.md)
for further details.

---

## Installation

### Option A: Model Context Protocol (MCP) Server Setup

> **Minimum effort, maximum yield.**

To clone only the latest commit state and save setup overhead, use a shallow
clone:

```bash
git clone --depth 1 https://github.com/bladeacer/lccst
cd lccst
```

For AI runners that support automated standard I/O (stdio) communication daemons
(e.g., Claude Code, Cursor, Cline, Windsurf, Codex, Pi, OpenCode, Gemini CLI /
Antigravity).

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
*Once registered, invoke the `swarm` prompt through your agent's interface.*

---

### Option B: Zero-Setup Declarative Ingestion

> **Download once, run everywhere.**

For instruction-driven workflows, direct CLI executions, or platforms that do
not need background processes.

#### Claude Code CLI

Inject the specification directly via runtime file referencing:
```bash
claude "Review the active git diff using the parameters in ./skill.md"
```

#### GitHub Copilot & OpenCode Agents

Reference or pin the file within your conversational prompt context using `@` 
or `#` shortcuts depending on your host interface:
* Attach `#skill.md` or `@skill.md` into your chat input interface.
* Target Execution Prompt: `"Execute the protocol loop defined in this file
  over my uncommitted workspace changes."`

#### Codex & Independent Agent Harnesses

Pipe the raw text content into initialization runs or supply it through custom
extension layers:
```bash
cat skill.md | your-agent-runner "Apply this system execution skill"
```

#### Project-Level Workspace Binding (Automated Rule Locking)

To permanently bind an AI agent to the Locust framework constraints without
typing manual prompt triggers, save or symlink `skill.md` directly into your
repository root using the appropriate file target:
* **Cursor IDE:** Save file as `.cursorrules` in your project root.
* **Cline / VS Code AI Agents:** Save file as `.clinerules` in your project
  root.
* **GitHub Copilot (Editor):** Save file as `.github/copilot-instructions.md`.

#### Global Editor Profiles

To apply these rules globally across all open development spaces on your
machine, copy the raw content of `skill.md` and paste it inside your editor's
global behavioural configuration field:
* **Cursor:** Navigate to `Settings -> Features -> Rules for AI` and append
  the ruleset.

---

## Development

### Developer Dependencies

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | >= 9 | Package manager (engine + playground Node projects) |
| TypeScript | >= 5.4 | Compiling engine source |

## LLM Usage Disclosure

It's an AI skill, AI assistance was used in the making of this project.
Architectural, design decisions and ensuring the code works as intended was
done by a human.

## Credits

Locust was heavily inspired by [ponytail](https://github.com/DietrichGebert/ponytail).

The logo and posters uses
[the Iceberg Dark colour scheme by cocopon](https://cocopon.github.io/iceberg.vim/).

[IBM Plex Mono](https://github.com/IBM/plex) was used for typography.

## License

This project is open-source and licensed under the terms of the MIT License.
