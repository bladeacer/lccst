# LCCST (Locust)

> **L**int, **C**lean, **C**luster, **S**plit, **T**est.  
> *Devouring messy diffs before they reach production.*

LCCST (Locust) is a declarative AI skill and Model Context Protocol (MCP) server that forces AI engineering agents to act with extreme discipline. It stops massive "vibe coding" diffs from polluting your Git history by dynamically slicing your code into clean, atomic, test-verified commits.

## Core Philosophy
* **No Code Slop:** Rejects high cyclomatic complexity, violations of SOLID, and obvious/redundant comments.
* **Atomic Integrity:** Splits complex, multi-file changes into independent, logical logical commits.
* **Continuous Validation:** Never allows a commit to pass through without running your local linter, formatter, and test suites first.

## Setup & Usage

### Autoload via MCP (Cursor, Claude, Cline)
Add the server to your global MCP configurations (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lccst": {
      "command": "node",
      "args": ["/absolute/path/to/lccst/mcp-server.js"]
    }
  }
}

Once loaded, tell your AI Agent:

"Run the swarm prompt from LCCST on my repository."

### Manual Markdown Injection

If you aren't using an MCP ecosystem, simply drop skill.md into your project prompt context (e.g., @skill.md in Cursor or Copilot Chat) and tell the AI:

"Execute this skill on my current workspace changes."

## License

This project is open-source software licensed under the MIT License.
