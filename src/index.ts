import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = new McpServer({
  name: "lccst-locust",
  version: "2.1.0"
});

// Enforce type contract constraints directly on prompt payload generation
server.registerPrompt(
  "swarm",
  {
    description: "Enforce strict lint-cluster-split-test-commit boundaries over the active workspace layout."
  },
  async () => {
    try {
      // Look one directory up from dist/index.js to find the project root asset
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
