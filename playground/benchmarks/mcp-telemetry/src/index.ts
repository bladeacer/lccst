import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

const REPO_ROOT = process.env.LCCST_REPO_ROOT || process.cwd();
const TELEMETRY_FILE = path.resolve(REPO_ROOT, "playground/benchmarks/runtime-telemetry.json");

interface TelemetryData {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  turns: number;
  active_mcps: string[];
}

function updateMetrics(promptTokens: number, completionTokens: number): void {
  try {
    let data: TelemetryData = {
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0,
      turns: 0,
      active_mcps: ["lccst-telemetry"]
    };

    const targetDir = path.dirname(TELEMETRY_FILE);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(TELEMETRY_FILE)) {
      try {
        const content = fs.readFileSync(TELEMETRY_FILE, "utf-8");
        if (content.trim()) {
          data = { ...data, ...JSON.parse(content) };
        }
      } catch (readErr) {
        process.stderr.write(`[Telemetry Debug] Failed reading log index: ${String(readErr)}\n`);
      }
    }

    data.total_prompt_tokens += promptTokens;
    data.total_completion_tokens += completionTokens;
    data.total_tokens += (promptTokens + completionTokens);
    data.turns += 1;

    if (!data.active_mcps.includes("lccst-telemetry")) {
      data.active_mcps.push("lccst-telemetry");
    }

    fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(data, null, 2));
  } catch (globalErr) {
    process.stderr.write(`[Telemetry Error] System write crash: ${String(globalErr)}\n`);
  }
}

// Using the low-level base class guarantees perfect transport type assignment
const server = new Server(
  { name: "lccst-telemetry", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register the tool list payload directly
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "log_turn_telemetry",
      description: "Commit operational token usage statistics for the current agent turn.",
      inputSchema: {
        type: "object",
        properties: {
          prompt_tokens: { type: "number", description: "Tokens consumed during prompt phase" },
          completion_tokens: { type: "number", description: "Tokens generated during generation phase" }
        },
        required: ["prompt_tokens", "completion_tokens"]
      }
    }
  ]
}));

// Route tool call events cleanly
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "log_turn_telemetry") {
    const args = request.params.arguments as { prompt_tokens?: number; completion_tokens?: number };
    updateMetrics(args?.prompt_tokens || 0, args?.completion_tokens || 0);
    return {
      content: [{ type: "text", text: "Telemetry metrics integrated cleanly." }]
    };
  }
  throw new Error(`Tool not found: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
