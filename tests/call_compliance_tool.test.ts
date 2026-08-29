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
  const text = response.result?.content?.[0]?.text;
  if (!text) return false;
  const parsed = JSON.parse(text);
  return (
    response.id === 9 &&
    response.result?.content?.[0]?.type === "text" &&
    typeof text === "string" &&
    parsed.success === true &&
    parsed.step === "/compliance" &&
    parsed.payload?.must_have !== undefined
  );
};