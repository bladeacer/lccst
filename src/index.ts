import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Instantiate modern MCP server
const server = new McpServer({
  name: "lccst-locust",
  version: "1.0.0"
});

// Register the prompt capability using standard specification rules
server.prompt(
  "swarm",
  "Enforce strict lint-cluster-split-test-commit boundaries over the active workspace layout.",
  async () => {
    try {
      // Traverse upward to read skill.md safely from the project root
      const skillPath = path.resolve(__dirname, "../skill.md");
      const skillContent = fs.readFileSync(skillPath, "utf-8");

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Execute the following system skill framework precisely:\n\n${skillContent}`
            }
          }
        ]
      };
    } catch (error: any) {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Internal Error loading downstream blueprint: ${error.message}`
            }
          }
        ]
      };
    }
  }
);

// Establish Standard I/O connection
const transport = new StdioServerTransport();
await server.connect(transport);
