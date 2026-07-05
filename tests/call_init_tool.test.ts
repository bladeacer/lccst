export const payload = {
  jsonrpc: "2.0",
  id: 6,
  method: "tools/call",
  params: {
    name: "init",
    arguments: {},
  },
};

export const expectedResponse = (response: any): boolean => {
  return (
    response.id === 6 &&
    response.result?.content?.[0]?.type === "text" &&
    typeof response.result.content[0].text === "string" &&
    response.result.content[0].text.includes("Project type")
  );
};
