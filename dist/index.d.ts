export declare function resolveTarget(raw: string | undefined, base?: string): string | null;
export interface ProjectInfo {
    type: "python" | "node" | "go" | "rust" | "cmake" | "julia" | "unknown";
    manifest: string;
    testCommand: string[];
    formatCommand?: string[];
    lintCommand?: string[];
    buildCommand?: string[];
}
export declare function detectProject(root: string): ProjectInfo;
export interface ToolingReport {
    makeTargets: string[];
    packageScripts: Record<string, string>;
    shellScripts: string[];
}
export declare function listMakeTargets(root: string): string[];
export declare function listPackageScripts(root: string): Record<string, string>;
export declare function listShellScripts(root: string): string[];
export declare function discoverTooling(root: string): ToolingReport;
export type ProjectStep = "test" | "lint" | "format" | "build";
export declare function resolveCommand(root: string, kind: ProjectStep): string[] | null;
export interface ComplianceReport {
    mustHave: {
        unitTests: boolean;
        docstrings: boolean;
    };
    niceToHave: {
        apiDocs: boolean;
        changelog: boolean;
    };
}
export declare function auditCompliance(root: string): ComplianceReport;
export interface RunResult {
    command: string[];
    output: string;
    code: number;
}
export declare function runCommand(command: string[], cwd: string): RunResult;
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
/**
 * Read the file lines of a `git diff --stat` output.
 *
 * The output ends with a summary line, such as `3 files changed, 7
 * insertions(+)`, which names no file. A file line holds a `|` separator, so
 * the helper keeps those lines only. The count of the result is the file count.
 */
export declare function diffStatFiles(stat: string): string[];
export declare function clusterHunks(lines: string[]): Cluster[];
