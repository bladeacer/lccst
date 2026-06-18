export const payload = {
  jsonrpc: "2.0",
  id: 3,
  method: "prompts/get",
  params: {
    name: "non_existent_persona_template"
  }
};

export const expectedResponse = (response: any): boolean => {
  // Assert JSON-RPC specification compliant standard error formats
  return (
    response.id === 3 &&
    response.error !== undefined &&
    typeof response.error.message === "string"
  );
};
