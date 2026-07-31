export const payload = {
  jsonrpc: "2.0",
  id: 7,
  method: "tools/call",
  params: {
    name: "version",
    arguments: {},
  },
};

export const expectedResponse = (response: any): boolean => {
  return (
    response.id === 7 &&
    response.result?.content?.[0]?.type === "text" &&
    /LCCST v\d+\.\d+\.\d+/.test(response.result.content[0].text)
  );
};
