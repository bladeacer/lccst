export const payload = {
  jsonrpc: "2.0",
  id: 4,
  method: "prompts/get",
  params: {
    name: "swarm"
  }
};

export const expectedResponse = (response: any): boolean => {
  if (response.id !== 4 || !response.result?.messages) {
    return false;
  }
  const userMessage = response.result.messages[0];
  return (
    userMessage.role === "user" &&
    userMessage.content?.type === "text" &&
    userMessage.content.text.includes("Locust")
  );
};
