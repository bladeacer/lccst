// Input frame sent to the MCP server stdin
export const payload = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "lccst-test-harness", version: "1.0.0" }
  }
};

// Assertion predicate run against the stdout response
export const expectedResponse = (response: any): boolean => {
  return (
    response.id === 1 &&
    response.result?.serverInfo?.name === "lccst-locust" &&
    response.result?.capabilities?.prompts !== undefined
  );
};
