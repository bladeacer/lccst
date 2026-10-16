import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "../dist/index.js");
const testsDir = path.resolve(__dirname, "../tests");

// The server answers in about 80 ms on an idle machine, and a loaded machine
// pushed the first answer past 250 ms, which made a fixed wait fail at random.
// The runner therefore reads the frame as it arrives and keeps this limit only
// for a server that stays silent.
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
    const { payload, sequence, expectedResponse } = await import(`file://${filePath}`);
    // A test may export a `sequence` of frames, such as `initialize` before a
    // tool call. A test that exports one `payload` keeps the old behaviour.
    const frames: object[] = Array.isArray(sequence) ? sequence : [payload];
    const success = await executeMcpStreamFrame(frames, expectedResponse);
    
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

function executeMcpStreamFrame(payloads: object[], assertFn: (res: any) => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const processInstance = spawn("node", [serverPath]);
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let settled = false;

    // The last payload that carries an id names the response frame that the
    // test asserts. A sequence can hold an id-less notification.
    const expectedId = [...payloads]
      .reverse()
      .find((p: any) => p && typeof p === "object" && "id" in p)?.id;

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

      // A chunk can hold half a line, so the runner reads every complete line.
      let lineEnd = stdoutBuffer.indexOf("\n");
      while (lineEnd >= 0 && !settled) {
        const frame = stdoutBuffer.slice(0, lineEnd);
        stdoutBuffer = stdoutBuffer.slice(lineEnd + 1);
        if (frame.trim().length > 0) {
          try {
            const parsedJson = JSON.parse(frame);
            // An intermediate frame, such as the `initialize` response of a
            // sequence, is read but not asserted.
            if (parsedJson.id === expectedId) settle(assertFn(parsedJson));
          } catch (err) {
            console.error("Stream payload syntax could not be resolved to valid JSON:", frame);
            settle(false);
          }
        }
        lineEnd = stdoutBuffer.indexOf("\n");
      }
    };

    processInstance.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
      inspectStream();
    });

    processInstance.stderr.on("data", (data) => {
      stderrBuffer += data.toString();
      // Stderr is debug output, not a failure. Only treat an idle server as a
      // failure, so a healthy server that emits a log line still passes.
    });

    // Write the input JSON-RPC payload lines to standard input.
    // Always send initialize first, because a stricter SDK could reject a
    // tool call that follows no handshake frame.
    const orderedPayloads = [...payloads].sort((a: any, b: any) => {
      if (a.method === "initialize" && b.method !== "initialize") return -1;
      if (a.method !== "initialize" && b.method === "initialize") return 1;
      return 0;
    });
    processInstance.stdin.write(orderedPayloads.map(p => JSON.stringify(p)).join("\n") + "\n");

    setTimeout(() => {
      if (settled) return;
      console.error("Blank stdout response stream received.");
      settle(false);
    }, RESPONSE_TIMEOUT_MS);
  });
}
