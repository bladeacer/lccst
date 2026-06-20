# LCCST (Locust)

An algorithmic workspace gatekeeper that decomposes complex codebase changes
into isolated, test-verified, atomic Git commits while rigorously enforcing
architectural cohesion and SOLID invariants.

Locust operates as a deterministic, zero-compromise guardian for codebase
health, test coverage, and structural boundaries - built to put your
preferences first.

> **"Swarming your messy diffs before they reach production."**

1. **Discover & Format:** Run lints and compilers via a strict Tooling Ladder.
2. **Hunk Clustering:** Group workspace diffs into isolated, atomic units.
3. **Targeted Testing:** Verify changes and enforce strict, ecosystem-aware
   coverage boundaries.
4. **Atomic Commit Generation:** Issue clean Conventional Commits with detailed
   test metrics.

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
  fixes into single execution blocks. The overhead of creating multiple atomic
  commits is deliberately chosen to guarantee easy code rollbacks and crystal-
  clear repository history.

## Playground and Benchmarking

See [`playground/README.md`](playground/README.md) for the benchmarking suite
that measures token impact of skill-guided vs plain code generation across
three reference projects (Python HTTP server, React timer, Go login CRUD).

### Verification Matrix & Baseline Benchmarks

The baseline metrics below were captured using our automated evaluation harness.
The data highlights the concrete performance delta observed between unguided 
generation and structured protocol compliance. 

Scores are fully normalised to a 100-point scale using project-specific
evaluation profiles. Each target subproject is graded exclusively on features
relevant to its architectural domain (for instance, front-end presentation 
components are not penalised for a lack of database encryption patterns).

### opencode-deepseek-v4-flash-free

| Agent Runtime | LLM Engine | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **opencode** | `deepseek-v4-flash-free` | `skill.md v2.2` | Headroom MCP | **Python HTTP Server** | 48/100 | **100/100** | 11/11 Passed |
| **opencode** | `deepseek-v4-flash-free` | `skill.md v2.2` | Headroom MCP | **React Timer** | 22/100 | **100/100** | 9/9 Passed |
| **opencode** | `deepseek-v4-flash-free` | `skill.md v2.2` | Headroom MCP | **Go Login CRUD** | 65/100 | **100/100** | 12/12 Passed |
| **Summary** | | | | **Workspace Average** | **45/100** | **100/100** | **32/32 Total** |

### Core Architectural Insights

* **The Token Trade-Off:** The skill-guided protocol introduces an expected
  +133% token overhead (+4,001 tokens total across the workspace suite). This
  focused context investment directly translates into ironclad interface types,
  explicit error boundary catches, and comprehensive unit testing suites.
* **Profile-Aware Calibration:** Adjusting the scoring harness to use domain
  isolation profiles prevents metric flatlining. By eliminating security bias
  from purely declarative UI modules (React timer), the framework accurately
  tracks valid modular scaling victories without rewarding hallucinated
  compliance features.
* **Deterministic Tool Integration:** Organising the run via a Headroom MCP 
  server acts as an essential system buffer layer. By handling file operations
  and local compiler steps natively, it completely isolates the core language
  model context from syntax drift during file staging sequences.

Full verification traces are logged natively at:  
`playground/benchmarks/opencode-deepseek-v4-flash-free/benchmark-report.md`

### Adding Benchmarks for Other Models

Feel free to clone the repository and contribute your agent-specific metrics
to the main matrix.

---

## Installation

To clone only the latest commit state and save setup overhead, use a shallow
clone:

```bash
git clone --depth 1 https://github.com/bladeaccer/lccst
cd lccst
```

### Option A: Model Context Protocol (MCP) Server Setup

> **Minimum effort, maximum yield.**

For AI runners that support automated standard I/O communication daemons
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

## Credits & Inspiration

Locust was heavily inspired by [ponytail](https://github.com/DietrichGebert/ponytail).

## License

This project is open-source and licensed under the terms of the MIT License.
