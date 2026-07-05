export interface ProjectInfo {
    type: "python" | "node" | "go" | "rust" | "unknown";
    manifest: string;
    testCommand: string[];
    formatCommand?: string[];
    lintCommand?: string[];
}
export declare function detectProject(root: string): ProjectInfo;
export declare function detectTool(name: string): boolean;
export interface EnvReport {
    project: ProjectInfo;
    tools: Record<string, boolean>;
    conventions: string[];
}
export declare function scanEnvironment(root: string): EnvReport;
export interface SwarmStateData {
    phase: string;
    clusters: string[];
    currentCluster: number;
    errors: string[];
    timestamp: number;
}
export declare class SwarmState {
    private filePath;
    constructor(root: string);
    read(): SwarmStateData;
    write(data: Partial<SwarmStateData>): void;
    clear(): void;
    get path(): string;
}
export declare function logEvent(root: string, event: Record<string, unknown>): void;
export interface Cluster {
    scope: string;
    files: string[];
    suggestion: string;
}
export declare function clusterHunks(lines: string[]): Cluster[];
