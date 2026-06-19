# LCCST (Locust)

An algorithmic workspace gatekeeper that decomposes complex codebase changes
into isolated, test-verified, atomic Git commits while rigorously enforcing
architectural cohesion and SOLID invariants.

Locust operates as a deterministic, zero-compromise guardian for codebase
health, test coverage, and structural boundaries—built to put your preferences
first.

```
1. Discover & Format: Run lints and compilers via a strict Tooling Ladder.
2. Hunk Clustering: Group workspace diffs into isolated, atomic units.
3. Targeted Testing: Verify changes and enforce strict coverage boundaries.
4. Atomic Commit Generation: Issue clean commits with detailed test metrics.
```

## Core Philosophy

* **User Preference Overrides:** Your explicit instructions and preferred
  patterns always come first. If any rule in this protocol clashes with your
  desired workflow, the system automatically prioritises your choice.
* **Streamlined Initialisation:** Use the `/init` command on startup to kick off
  immediate, automated codebase scans, helping you audit repository health and
  catch architectural documentation gaps before any changes begin.
* **Interactive Engagement Loop:** No abrupt dead ends. The system maintains
  continuous, collaborative dialogue—prompting you for confirmations, staging Wait
  approvals, or clarifying implementation paths.
* **Proactive Semantic Discovery:** Leverages Language Server Protocol (LSP)
  data, Tree-sitter AST queries, and native project manifest scripts to trace
  downstream side-effects before compilation.
* **Defensive Engineering & Compliance:** Mandates validation boundaries across
  all entry points while automatically auditing external package licences and
  generating SemVer-compliant changelog updates.

---

## Integration Topologies

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

Alternatively, there are folder locations specific to each editor for storing
skill files that work across different projects.

---

## Installation

Compile the TypeScript engine components using `pnpm`:

```bash
pnpm install
pnpm run build
```

## Credits & Inspiration

Locust was heavily inspired by the atomic diff clustering concepts introduced
in [ponytail](https://github.com/DietrichGebert/ponytail).

## License

This project is open-source and licensed under the terms of the MIT License.
