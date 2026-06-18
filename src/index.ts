import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = new McpServer({
  name: "lccst-locust",
  version: "1.2.0"
});

server.registerPrompt(
  "swarm",
  {
    description: "Enforce strict lint-cluster-split-test-commit boundaries over the active workspace layout."
  },
  async () => {
    try {
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

const transport = new StdioServerTransport();
await server.connect(transport);
