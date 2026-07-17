import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRIMARY_TELEMETRY = path.resolve(__dirname, "../../runtime-telemetry.json");
function updateMetrics(subproject, variant, promptTokens, completionTokens) {
    const workspaceTelemetry = path.resolve(process.cwd(), "runtime-telemetry.json");
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
                    data = { ...data, ...parsed };
                }
            }
            catch (e) {
                process.stderr.write(`[Telemetry Debug] Overwriting bad schema index profiles.\n`);
            }
        }
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
    version: "3.1.0"
});
server.tool("log_turn_telemetry", "Commit operational token usage statistics partitioned by subproject and strategy variant.", {
    subproject: z.enum(["python-http-server", "react-timer", "go-login-crud"]),
    variant: z.enum(["plain", "skill-guided"]),
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
}, async (args) => {
    updateMetrics(args.subproject, args.variant, args.prompt_tokens, args.completion_tokens);
    return {
        content: [{ type: "text", text: `Telemetry metrics updated successfully for ${args.subproject} (${args.variant}).` }]
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
