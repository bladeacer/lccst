export const payload = {
  jsonrpc: "2.0",
  id: 5,
  method: "tools/list",
};

export const expectedResponse = (response: any): boolean => {
  if (response.id !== 5 || !response.result?.tools) return false;
  const names = response.result.tools.map((t: any) => t.name);
  return names.includes("init") && names.includes("audit") && names.includes("swarm");
};
