import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Pin the directory context relative to the compiled file location to guarantee accuracy
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TELEMETRY_FILE = path.resolve(__dirname, "../../runtime-telemetry.json");

interface StepMetrics {
  prompt_tokens: number;
  completion_tokens: number;
}

interface TelemetryData {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  turns: number;
  active_mcps: string[];
  breakdown?: {
    [project: string]: {
      plain: StepMetrics;
      "skill-guided": StepMetrics;
    };
  };
}

function updateMetrics(
  subproject: string,
  variant: "plain" | "skill-guided",
  promptTokens: number,
  completionTokens: number
): void {
  try {
    let data: TelemetryData = {
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      total_tokens: 0,
      turns: 0,
      active_mcps: ["lccst-telemetry"],
      breakdown: {}
    };

    const targetDir = path.dirname(TELEMETRY_FILE);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (fs.existsSync(TELEMETRY_FILE)) {
      try {
        const content = fs.readFileSync(TELEMETRY_FILE, "utf-8");
        if (content.trim()) {
          const parsed = JSON.parse(content);
          // Gracefully merge with any pre-existing keys
          data = { ...data, ...parsed };
        }
      } catch (e) {
        process.stderr.write(`[Telemetry Debug] Overwriting bad schema index.\n`);
      }
    }

    // Accumulate total metrics
    data.total_prompt_tokens += promptTokens;
    data.total_completion_tokens += completionTokens;
    data.total_tokens += (promptTokens + completionTokens);
    data.turns += 1;

    if (!data.active_mcps.includes("lccst-telemetry")) {
      data.active_mcps.push("lccst-telemetry");
    }

    if (!data.breakdown) {
      data.breakdown = {};
    }

    // Initialize module keys if they don't exist yet
    if (!data.breakdown[subproject]) {
      data.breakdown[subproject] = {
        plain: { prompt_tokens: 0, completion_tokens: 0 },
        "skill-guided": { prompt_tokens: 0, completion_tokens: 0 }
      };
    }

    const targetVariant = variant === "plain" ? "plain" : "skill-guided";
    data.breakdown[subproject][targetVariant].prompt_tokens += promptTokens;
    data.breakdown[subproject][targetVariant].completion_tokens += completionTokens;

    fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(data, null, 2));
  } catch (globalErr) {
    process.stderr.write(`[Telemetry Error] Failed to commit: ${String(globalErr)}\n`);
  }
}

const server = new McpServer({
  name: "lccst-telemetry",
  version: "2.8.0"
});

// Drop to base handlers to use plain objects without signature errors
server.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "log_turn_telemetry",
        description: "Commit operational token usage statistics partitioned by subproject and strategy variant.",
        inputSchema: {
          type: "object",
          properties: {
            subproject: {
              type: "string",
              enum: ["python-http-server", "react-timer", "go-login-crud"],
              description: "The targeted workspace module subproject."
            },
            variant: {
              type: "string",
              enum: ["plain", "skill-guided"],
              description: "The execution variant style mode."
            },
            prompt_tokens: { type: "number", description: "Prompt context evaluation tokens." },
            completion_tokens: { type: "number", description: "Generation tokens." }
          },
          required: ["subproject", "variant", "prompt_tokens", "completion_tokens"]
        }
      }
    ]
  };
});

server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "log_turn_telemetry") {
    const args = request.params.arguments as {
      subproject: string;
      variant: "plain" | "skill-guided";
      prompt_tokens: number;
      completion_tokens: number;
    };

    if (args) {
      updateMetrics(
        args.subproject,
        args.variant,
        Number(args.prompt_tokens || 0),
        Number(args.completion_tokens || 0)
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Telemetry transaction integrated successfully for ${args?.subproject} (${args?.variant}).`
        }
      ]
    };
  }
  throw new Error(`Tool not found: ${request.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
