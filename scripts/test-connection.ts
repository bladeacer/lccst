import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../dist/index.js");
const testsDir = path.resolve(__dirname, "../tests");

// The server needs time to start and to answer. A short wait made the suite
// fail on a loaded machine, so the runner waits for a slow start instead.
const RESPONSE_TIMEOUT_MS = 5000;

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
    let settled = false;

    // Resolve the frame as soon as the server answers. The timer only covers a
    // server that stays silent, so a slow start no longer fails the test.
    const settle = (passed: boolean) => {
      if (settled) return;
      settled = true;
      processInstance.kill();
      resolve(passed);
    };

    const inspectStream = () => {
      if (settled) return;

      if (stderrBuffer.trim().length > 0) {
        console.error("Runtime stream emitted unexpected stderr data:", stderrBuffer);
        return settle(false);
      }

      // A chunk can hold half a line, so the runner waits for the line break.
      const lineEnd = stdoutBuffer.indexOf("\n");
      if (lineEnd < 0) return;

      const frame = stdoutBuffer.slice(0, lineEnd);
      try {
        const parsedJson = JSON.parse(frame);
        settle(assertFn(parsedJson));
      } catch (err) {
        console.error("Stream payload syntax could not be resolved to valid JSON:", stdoutBuffer);
        settle(false);
      }
    };

    processInstance.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
      inspectStream();
    });

    processInstance.stderr.on("data", (data) => {
      stderrBuffer += data.toString();
    });

    // Write input JSON-RPC payload line to standard input
    processInstance.stdin.write(JSON.stringify(payload) + "\n");

    setTimeout(() => {
      if (settled) return;
      console.error("Blank stdout response stream received.");
      settle(false);
    }, RESPONSE_TIMEOUT_MS);
  });
}
