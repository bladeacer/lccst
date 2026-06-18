import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../dist/index.js");
const testsDir = path.resolve(__dirname, "../tests");

console.log("LCCST: Initializing dynamic test suite runner...");

if (!fs.existsSync(testsDir)) {
  console.error(`Error: Tests directory not found at ${testsDir}`);
  process.exit(1);
}

// Locate all valid test files within the target directory
const testFiles = fs.readdirSync(testsDir).filter(file => 
  (file.endsWith(".test.ts") || file.endsWith(".ts")) && !file.endsWith(".d.ts")
);

if (testFiles.length === 0) {
  console.log("No test files detected in the tests directory.");
  process.exit(0);
}

let passedAll = true;

// Iterate through each detected test file sequentially
for (const file of testFiles) {
  const filePath = path.join(testsDir, file);
  console.log(`Running: ${file}`);

  try {
    // Import the payload sequence from the test file dynamically
    const { payload, expectedResponse } = await import(`file://${filePath}`);

    const success = await runTestPayload(payload, expectedResponse);
    if (!success) {
      passedAll = false;
    }
  } catch (error: any) {
    console.error(`Failed to execute test file ${file}:`, error.message);
    passedAll = false;
  }
}

if (passedAll) {
  console.log("Status: All tests passed successfully.");
  process.exit(0);
} else {
  console.error("Status: Test suite execution failed.");
  process.exit(1);
}

// Spawns server instance and pipes JSON-RPC sequences
function runTestPayload(payload: object, expectedResponse: (res: any) => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const server = spawn("node", [serverPath]);
    let outputData = "";
    let errorData = "";

    server.stdout.on("data", (data) => {
      outputData += data.toString();
    });

    server.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    server.stdin.write(JSON.stringify(payload) + "\n");

    setTimeout(() => {
      server.kill();

      if (errorData) {
        console.error("Server execution error log contains stderr noise:\n", errorData);
        return resolve(false);
      }

      try {
        const lines = outputData.trim().split("\n");
        const parsedResponse = JSON.parse(lines[0]);
        
        const isMatch = expectedResponse(parsedResponse);
        if (isMatch) {
          return resolve(true);
        } else {
          console.error("Response assertion failed. Payload received:", parsedResponse);
          return resolve(false);
        }
      } catch (err) {
        console.error("Failed to parse JSON-RPC response from stdout stream:", outputData);
        return resolve(false);
      }
    }, 400);
  });
}
