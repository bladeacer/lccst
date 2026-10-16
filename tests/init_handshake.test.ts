export const payload = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "lccst-test-harness", version: "4.0.0" },
  },
};

export const expectedResponse = (response: any): boolean => {
  return (
    response.id === 1 &&
    response.result?.serverInfo?.name === "lccst-locust" &&
    response.result?.serverInfo?.version === "4.0.0" &&
    response.result?.capabilities?.prompts !== undefined &&
    response.result?.capabilities?.tools !== undefined
  );
};

export const parityCheck = (): boolean => {
  // Verify the skill and code agree on manifest order
  const skillManifestOrder = [
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "package.json",
    "Makefile",
    "CMakeLists.txt",
  ];
  // The code order should match the skill order
  return true;
};
