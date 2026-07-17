import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");

const targetVersion = process.argv[2];

if (!targetVersion || !/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error("Usage: pnpm tsx scripts/bump-version.ts <major.minor.patch>");
  process.exit(1);
}

console.log(`LCCST: Commencing version synchronization to version ${targetVersion}...`);

const filesToUpdate = [
  {
    filePath: path.join(rootDir, "package.json"),
    regex: /"version":\s*"\d+\.\d+\.\d+"/,
    replacement: `"version": "${targetVersion}"`,
  },
  {
    filePath: path.join(rootDir, "src/index.ts"),
    regex: /version:\s*"\d+\.\d+\.\d+"/,
    replacement: `version: "${targetVersion}"`,
  },
  {
    filePath: path.join(rootDir, "dist/index.js"),
    regex: /version:\s*"\d+\.\d+\.\d+"/,
    replacement: `version: "${targetVersion}"`,
  },
  {
    filePath: path.join(rootDir, "tests/init_handshake.test.ts"),
    regex: /version(?:\s*:\s*|\s*===?\s*)"\d+\.\d+\.\d+"/,
    replacement: (match) => match.replace(/\d+\.\d+\.\d+/, targetVersion),
  },
  {
    filePath: path.join(rootDir, "playground/benchmarks/mcp-telemetry/package.json"),
    regex: /"version":\s*"\d+\.\d+\.\d+"/,
    replacement: `"version": "${targetVersion}"`,
  },
  {
    filePath: path.join(rootDir, "playground/benchmarks/mcp-telemetry/src/index.ts"),
    regex: /version:\s*"\d+\.\d+\.\d+"/,
    replacement: `version: "${targetVersion}"`,
  },
  {
    filePath: path.join(rootDir, "playground/benchmarks/mcp-telemetry/build/index.js"),
    regex: /version:\s*"\d+\.\d+\.\d+"/,
    replacement: `version: "${targetVersion}"`,
  },
];

let errorsOccurred = false;

for (const file of filesToUpdate) {
  if (!fs.existsSync(file.filePath)) {
    console.warn(`Warning: Target file skip detected (Not found): ${file.filePath}`);
    continue;
  }

  try {
    const originalContent = fs.readFileSync(file.filePath, "utf-8");
    if (!file.regex.test(originalContent)) {
      console.error(`Error: Match target pattern missing in file: ${file.filePath}`);
      errorsOccurred = true;
      continue;
    }

    const updatedContent = originalContent.replace(file.regex, file.replacement);
    fs.writeFileSync(file.filePath, updatedContent, "utf-8");
    console.log(`Updated: ${path.relative(rootDir, file.filePath)}`);
  } catch (error: any) {
    console.error(`Failed updating file ${file.filePath}:`, error.message);
    errorsOccurred = true;
  }
}

if (errorsOccurred) {
  console.error("Status: Version sync completed with errors.");
  process.exit(1);
} else {
  console.log("Status: Version synchronization across target components passed.");
  process.exit(0);
}
