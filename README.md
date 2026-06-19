# LCCST (Locust)

An algorithmic codebase gatekeeper that breaks down complex workspace
mutations into structured, atomic, test-verified Git commits while enforcing
strict SOLID principles and architectural alignment.

Think of it as that one senior dev who can clean up even the most messy
codebase.

```
1. Discover project linter, formatter, and test suites.
2. Cluster unstructured workspace diffs into isolated logical groups.
3. Verify changes using LSP context and local testing engines.
4. Issue atomic conventional commits with thorough descriptions.
```

## Core Philosophy

* **Architectural Alignment:** Adapts directly to the host architecture
  (e.g., Hexagonal, Elm, Domain-Driven Design) rather than imposing
  conflicting paradigms. Actively stops the creation of God Objects.
* **Semantic Analysis:** Leverages language server contexts (LSP), Tree-sitter
  queries, and static analysis tools to verify structural modifications and
  downstream side-effects.
* **Atomic Integrity:** Deconstructs complex multi-file diffs into isolated,
  test-verified commits containing distinct headers and analytical body
  descriptions.
* **Non-Technical Audits:** Enforces compliance with test coverage baselines
  and flags updates needed for external documentation systems.

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
