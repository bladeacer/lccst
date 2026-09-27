import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { addPhase, nextPhaseStart, readTelemetry, resolveTelemetryFile, writeTelemetry } from "./telemetry.js";
import { readHostSessionId } from "./usage.js";

const server = new McpServer({
  name: "lccst-telemetry",
  version: "3.7.0"
});

server.tool(
  "log_turn_telemetry",
  "Record the end of one benchmark phase. The server stores the time span of " +
    "the phase, and the host settles the token counts after the phase. Pass " +
    "the subproject and the variant only. Do not pass token values.",
  {
    subproject: z.enum(["python-http-server", "react-timer", "go-login-crud"]),
    variant: z.enum(["plain", "skill-guided"])
  },
  async (args, extra) => {
    const phase = `${args.subproject} (${args.variant})`;
    const targetFile = resolveTelemetryFile();
    const data = readTelemetry(targetFile);

    try {
      writeTelemetry(
        targetFile,
        addPhase(data, {
          subproject: args.subproject,
          variant: args.variant,
          fromTime: nextPhaseStart(data),
          toTime: Date.now(),
          sessionId: readHostSessionId(extra?._meta) ?? null
        })
      );
    } catch (error) {
      process.stderr.write(`[Telemetry Error] Phase write error: ${String(error)}\n`);
      return {
        isError: true,
        content: [{ type: "text", text: `Write failed for ${phase}.` }]
      };
    }

    return {
      content: [
        {
          type: "text",
          text:
            `Recorded the end of ${phase} as phase ${data.phases.length + 1}. ` +
            "The host settles the token counts after the phase."
        }
      ]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
