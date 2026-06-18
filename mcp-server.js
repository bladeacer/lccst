import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize the Locust MCP Server
const server = new Server({
  name: "lccst-locust",
  version: "1.0.0"
}, {
  capabilities: { prompts: {} }
});

// Register the prompt availability
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "swarm",
        description: "Activate Locust to lint, cluster, split, test, and commit your codebase changes."
      }
    ]
  };
});

// Load skill.md dynamically when the prompt is invoked
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "swarm") {
    throw new Error("Prompt not found");
  }

  try {
    const skillPath = path.join(__dirname, "skill.md");
    const skillContent = fs.readFileSync(skillPath, "utf-8");

    return {
      description: "Locust Code Quality & Split-Commit Protocol",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Adopt the Locust persona and strictly follow these instructions:\n\n${skillContent}`
          }
        }
      ]
    };
  } catch (error) {
    throw new Error(`Failed to read skill.md: ${error.message}`);
  }
});

// Establish Standard I/O connection
const transport = new StdioServerTransport();
await server.connect(transport);
