import fs from "fs";
import path from "path";

export interface SwarmStateData {
  phase: string;
  clusters: string[];
  currentCluster: number;
  errors: string[];
  timestamp: number;
}

const DEFAULT_STATE: SwarmStateData = {
  phase: "init",
  clusters: [],
  currentCluster: 0,
  errors: [],
  timestamp: Date.now(),
};

export class SwarmState {
  private filePath: string;

  constructor(root: string) {
    this.filePath = path.resolve(root, ".lccst_state");
  }

  read(): SwarmStateData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8").trim();
        if (raw) {
          return { ...DEFAULT_STATE, ...JSON.parse(raw), timestamp: Date.now() };
        }
      }
    } catch {
      // corrupt or missing — return default
    }
    return { ...DEFAULT_STATE, timestamp: Date.now() };
  }

  write(data: Partial<SwarmStateData>): void {
    const current = this.read();
    const merged = { ...current, ...data, timestamp: Date.now() };
    fs.writeFileSync(this.filePath, JSON.stringify(merged, null, 2) + "\n");
  }

  clear(): void {
    try {
      if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    } catch {
      // ignore
    }
  }

  get path(): string {
    return this.filePath;
  }
}
