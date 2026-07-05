import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 1. Core global benchmark file location
const PRIMARY_TELEMETRY = path.resolve(__dirname, "../../runtime-telemetry.json");
function updateMetrics(subproject, variant, promptTokens, completionTokens) {
    // Use the current process directory as a secondary location hook to capture agent-specific logs safely
    const workspaceTelemetry = path.resolve(process.cwd(), "runtime-telemetry.json");
    // Decide target dynamically based on which baseline exists, defaulting to the benchmark home path
    const targetFile = fs.existsSync(workspaceTelemetry) ? workspaceTelemetry : PRIMARY_TELEMETRY;
    try {
        let data = {
            total_prompt_tokens: 0,
            total_completion_tokens: 0,
            total_tokens: 0,
            turns: 0,
            active_mcps: ["lccst-telemetry"],
            breakdown: {}
        };
        const targetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        if (fs.existsSync(targetFile)) {
            try {
                const content = fs.readFileSync(targetFile, "utf-8");
                if (content.trim()) {
                    const parsed = JSON.parse(content);
                    // Safely absorb keys from the external runtime tracker
                    data = { ...data, ...parsed };
                }
            }
            catch (e) {
                process.stderr.write(`[Telemetry Debug] Overwriting bad schema index profiles.\n`);
            }
        }
        // Increment and aggregate values
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
        if (!data.breakdown[subproject]) {
            data.breakdown[subproject] = {
                plain: { prompt_tokens: 0, completion_tokens: 0 },
                "skill-guided": { prompt_tokens: 0, completion_tokens: 0 }
            };
        }
        const targetVariant = variant === "plain" ? "plain" : "skill-guided";
        data.breakdown[subproject][targetVariant].prompt_tokens += promptTokens;
        data.breakdown[subproject][targetVariant].completion_tokens += completionTokens;
        fs.writeFileSync(targetFile, JSON.stringify(data, null, 2));
    }
    catch (globalErr) {
        process.stderr.write(`[Telemetry Error] Matrix trace write error: ${String(globalErr)}\n`);
    }
}
const server = new McpServer({
    name: "lccst-telemetry",
    version: "3.0.0"
});
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
                            description: "The targeted reference workspace module subproject under operational monitoring."
                        },
                        variant: {
                            type: "string",
                            enum: ["plain", "skill-guided"],
                            description: "The targeted code generation routine strategy layout variant."
                        },
                        prompt_tokens: {
                            type: "number",
                            description: "Tokens allocated on model prompt evaluation stage context bounds."
                        },
                        completion_tokens: {
                            type: "number",
                            description: "Tokens generated on model output generation routines."
                        }
                    },
                    required: ["subproject", "variant", "prompt_tokens", "completion_tokens"]
                }
            }
        ]
    };
});
server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "log_turn_telemetry") {
        const args = request.params.arguments;
        if (args) {
            updateMetrics(args.subproject, args.variant, Number(args.prompt_tokens || 0), Number(args.completion_tokens || 0));
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Telemetry metrics updated successfully for ${args?.subproject} (${args?.variant}).`
                }
            ]
        };
    }
    throw new Error(`Tool not found: ${request.params.name}`);
});
const transport = new StdioServerTransport();
await server.connect(transport);
