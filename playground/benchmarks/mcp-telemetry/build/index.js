import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkPhase, phaseOutcomeText, readTelemetry, recordPhase, resolveTelemetryFile, resolveWorkspace, writeTelemetry } from "./telemetry.js";
import { readHostSessionId } from "./usage.js";
const server = new McpServer({
    name: "lccst-telemetry",
    version: "3.8.0"
});
server.tool("log_turn_telemetry", "Record the end of one benchmark phase. Call the tool once, at the end of the " +
    "real work of the phase. The server checks the workspace, and it refuses a " +
    "call that arrives before the phase holds its directory and its manifest. A " +
    "refused call records nothing, so the phase can still be measured. A second " +
    "call for the same phase corrects the end of that phase, so a call that came " +
    "too early is not final. The server stores the time span of the phase, and " +
    "the host settles the token counts after the phase. Pass the subproject and " +
    "the variant only. Do not pass token values.", {
    subproject: z.enum(["python-http-server", "react-timer", "go-login-crud"]),
    variant: z.enum(["plain", "skill-guided"])
}, async (args, extra) => {
    const phase = `${args.subproject} (${args.variant})`;
    const check = checkPhase(resolveWorkspace(), args.subproject, args.variant);
    if (!check.ready) {
        process.stderr.write(`[Telemetry] Refused an early phase call for ${phase}.\n`);
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: `The phase ${phase} was not recorded. ${check.reason} ` +
                        "Do the work of the phase, then call the tool again. " +
                        "A call that the server refuses changes nothing."
                }
            ]
        };
    }
    const targetFile = resolveTelemetryFile();
    const data = readTelemetry(targetFile);
    try {
        const outcome = recordPhase(data, {
            subproject: args.subproject,
            variant: args.variant,
            toTime: Date.now(),
            sessionId: readHostSessionId(extra?._meta) ?? null
        });
        writeTelemetry(targetFile, outcome.data);
        return {
            content: [
                {
                    type: "text",
                    text: phaseOutcomeText(phase, outcome.status, outcome.count)
                }
            ]
        };
    }
    catch (error) {
        process.stderr.write(`[Telemetry Error] Phase write error: ${String(error)}\n`);
        return {
            isError: true,
            content: [{ type: "text", text: `Write failed for ${phase}.` }]
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
