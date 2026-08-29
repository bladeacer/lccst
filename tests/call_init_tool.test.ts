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
  const text = response.result?.content?.[0]?.text;
  if (!text) return false;
  const parsed = JSON.parse(text);
  return (
    response.id === 6 &&
    response.result?.content?.[0]?.type === "text" &&
    typeof text === "string" &&
    parsed.success === true &&
    parsed.step === "/init" &&
    parsed.payload?.project_type !== undefined
  );
};