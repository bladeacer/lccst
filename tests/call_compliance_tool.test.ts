export const payload = {
  jsonrpc: "2.0",
  id: 9,
  method: "tools/call",
  params: {
    name: "compliance",
    arguments: {},
  },
};

export const expectedResponse = (response: any): boolean => {
  return (
    response.id === 9 &&
    response.result?.content?.[0]?.type === "text" &&
    response.result.content[0].text.includes("MUST HAVE") &&
    response.result.content[0].text.includes("Unit tests")
  );
};
