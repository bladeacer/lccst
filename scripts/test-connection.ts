import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../dist/index.js");
const testsDir = path.resolve(__dirname, "../tests");

console.log("LCCST: Commencing test suite runner parsing verification...");

if (!fs.existsSync(testsDir)) {
  console.error(`Runtime Error: Directory not found at path: ${testsDir}`);
  process.exit(1);
}

const testFiles = fs.readdirSync(testsDir)
  .filter(file => (file.endsWith(".test.ts") || file.endsWith(".ts")) && !file.endsWith(".d.ts"))
  .sort();

if (testFiles.length === 0) {
  console.log("No test files detected.");
  process.exit(0);
}

let pipelinePassed = true;

for (const file of testFiles) {
  const filePath = path.join(testsDir, file);
  console.log(`Running: ${file}`);

  try {
    const { payload, expectedResponse } = await import(`file://${filePath}`);
    const success = await executeMcpStreamFrame(payload, expectedResponse);
    
    if (success) {
      console.log(`Pass: ${file}`);
    } else {
      console.error(`Fail: ${file}`);
      pipelinePassed = false;
    }
  } catch (error: any) {
    console.error(`Execution Error processing file: ${file}`, error.message);
    pipelinePassed = false;
  }
}

if (pipelinePassed) {
  console.log("Status: Suite execution completed successfully. All tests passed.");
  process.exit(0);
} else {
  console.error("Status: Failure occurred within the testing lifecycle pipeline.");
  process.exit(1);
}

function executeMcpStreamFrame(payload: object, assertFn: (res: any) => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const processInstance = spawn("node", [serverPath]);
    let stdoutBuffer = "";
    let stderrBuffer = "";

    processInstance.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
    });

    processInstance.stderr.on("data", (data) => {
      stderrBuffer += data.toString();
    });

    // Write input JSON-RPC payload line to standard input
    processInstance.stdin.write(JSON.stringify(payload) + "\n");

    setTimeout(() => {
      processInstance.kill();

      if (stderrBuffer.trim().length > 0) {
        console.error("Runtime stream emitted unexpected stderr data:", stderrBuffer);
        return resolve(false);
      }

      try {
        const payloadLines = stdoutBuffer.trim().split("\n");
        if (payloadLines[0].length === 0) {
          console.error("Blank stdout response stream received.");
          return resolve(false);
        }
        
        const parsedJson = JSON.parse(payloadLines[0]);
        return resolve(assertFn(parsedJson));
      } catch (err) {
        console.error("Stream payload syntax could not be resolved to valid JSON:", stdoutBuffer);
        return resolve(false);
      }
    }, 250);
  });
}
