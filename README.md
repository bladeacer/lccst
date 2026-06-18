# LCCST (Locust)

An engineering gatekeeper built on explicit SOLID validations that splits complex, unstructured development workspaces into verified, atomic, sequential Git commits.

---

## Execution Topologies

LCCST is decoupled to support both background automation workflows and direct declarative configuration files.

### MCP Server

To attach LCCST to your background system-wide Model Context Protocol environments, register the compiled build within the target host configuration file.

#### Claude Desktop Configuration

Add the server entry to `claude_desktop_config.json`:
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

#### Other Native Agent Implementations

For runner environments that orchestrate background processes using standard I/O (such as Cline, Cursor MCP, or Windsurf), append the following item to their respective MCP server connection arrays:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/lccst/dist/index.js"]
}
```

---

### Option B: Zero-Setup Declarative Skill Ingestion

For coding environments and runtime CLI agents that do not require an active background server process, use the direct declarative file injection route instead.

#### 1. Claude Code

Provide the instructions via the system file context during runtime operation:

```bash
claude "Review the active git diff using the instructions in ./skill.md"
```

#### 2. GitHub Copilot CLI & GitHub Copilot Chat

Reference the file directly within the runtime user execution interface:
* Append or pin `#skill.md` or `@skill.md` inside your conversational input frame.
* Prompt: `"Process my uncommitted workspace changes using the protocol defined in this file."`

#### 3. Codex & Independent Agent Runners

Provide the file text inline during initialization or pass it down via custom execution scripts:
```bash
cat skill.md | your-agent-runner "Apply this system execution skill to the workspace diffs"
```

#### 4. Project-Level Workspace Binding (Automated Rule Locking)

To make the execution constraints active across a specific repository without manual prompt invocation, save or link the raw content of `skill.md` directly into the project root using your tool's native rule filename:
* **Cursor IDE:** Save file as `.cursorrules` in your project root.
* **Cline / VS Code AI Agents:** Save file as `.clinerules` in your project root.

#### 5. Global Editor Profiles

To apply these behavioral constraints globally across all code spaces, paste the raw markdown specifications from `skill.md` directly inside your editor's global configurations:
* **Cursor:** Navigate to `Settings -> Features -> Rules for AI` and insert the content blocks.

---

## Development

Clone the repository

```bash
git clone https://github.com/bladeacer/lccst
```

### Environment Initialization

Install the dependencies and build the TypeScript codebase via `pnpm`:

```bash
pnpm install
pnpm run build
```

---

## License

This software is open-source and licensed under the terms of the MIT License.
```
