// A strict MCP server rejects a tool call that follows no `initialize`
// frame. This test sends the handshake first, then calls the `test` tool in
// dry-run mode with `mode: "lean"`, and asserts the mode echo, the
// `caller_duty` enforcement note, and the structured content.
// Note: the test tool uses dry_run phase when dryRun is true.
export const sequence = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "lccst-test-harness", version: "1.0.0" },
    },
  },
  { jsonrpc: "2.0", method: "notifications/initialized" },
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "test",
      arguments: { path: ".", dryRun: true, mode: "lean" },
    },
  },
];

export const expectedResponse = (response: any): boolean => {
  if (response.id !== 2 || response.error !== undefined) return false;
  const text = response.result?.content?.[0]?.text;
  if (!text) return false;
  const parsed = JSON.parse(text);
  return (
    parsed.success === true &&
    parsed.step === "test" &&
    parsed.payload?.phase === "dry_run" &&
    parsed.payload?.mode === "lean" &&
    parsed.payload?.mode_enforcement === "caller_duty" &&

    response.result?.structuredContent?.step === "test" &&
    response.result?.structuredContent?.payload?.phase === "dry_run" &&
    response.result?.structuredContent?.payload?.mode === "lean" &&
    response.result?.structuredContent?.success === true
  );
};
