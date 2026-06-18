export const payload = {
  jsonrpc: "2.0",
  id: 2,
  method: "prompts/list"
};

export const expectedResponse = (response: any): boolean => {
  if (response.id !== 2 || !response.result?.prompts) {
    return false;
  }
  const swarmPrompt = response.result.prompts.find((p: any) => p.name === "swarm");
  return swarmPrompt !== undefined && typeof swarmPrompt.description === "string";
};
