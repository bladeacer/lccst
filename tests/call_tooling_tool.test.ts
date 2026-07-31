export const payload = {
  jsonrpc: "2.0",
  id: 8,
  method: "tools/call",
  params: {
    name: "tooling",
    arguments: {},
  },
};

export const expectedResponse = (response: any): boolean => {
  return (
    response.id === 8 &&
    response.result?.content?.[0]?.type === "text" &&
    response.result.content[0].text.includes("Makefile targets")
  );
};
