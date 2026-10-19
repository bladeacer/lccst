export declare function resolveTarget(raw: string | undefined, base?: string): string | null;
export interface ProjectInfo {
    type: "python" | "node" | "go" | "rust" | "cmake" | "makefile" | "unknown";
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
/** Say whether a mise.toml declares the task, by section or by key. */
export declare function declaresMiseTask(root: string, kind: ProjectStep): boolean;
/** Say whether a justfile declares the recipe. */
export declare function declaresJustRecipe(root: string, kind: ProjectStep): boolean;
/** Say whether a Taskfile.yml declares the task under its tasks table. */
export declare function declaresTaskfileTask(root: string, kind: ProjectStep): boolean;
export declare function resolveCommand(root: string, kind: ProjectStep): string[] | null;
/** The most evidence paths that one reply lists. The count is always exact. */
export declare const COMPLIANCE_EVIDENCE_LIMIT = 10;
export interface ComplianceEvidence {
    /** The first `COMPLIANCE_EVIDENCE_LIMIT` matched paths. */
    paths: string[];
    /** The total number of matched paths. */
    count: number;
}
export interface ComplianceReport {
    mustHave: {
        unitTests: boolean;
        docstrings: boolean;
        unitTestFiles: ComplianceEvidence;
        docstringFiles: ComplianceEvidence;
    };
    niceToHave: {
        apiDocs: boolean;
        changelog: boolean;
        apiDocPaths: string[];
        changelogPaths: string[];
    };
}
export declare function auditCompliance(root: string): ComplianceReport;
/** The maximum number of output characters that a reply carries. */
export declare const MAX_COMMAND_OUTPUT_CHARS = 20000;
export interface RunResult {
    command: string[];
    output: string;
    code: number;
    /** Whether the output was cut at `MAX_COMMAND_OUTPUT_CHARS`. */
    truncated: boolean;
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
    mode?: "strict" | "lean";
    timestamp: number;
}
export declare class SwarmState {
    private filePath;
    /** Structured warnings for the caller. A tool reads them from the reply. */
    readonly warnings: string[];
    constructor(root: string);
    read(): SwarmStateData;
    write(data: Partial<SwarmStateData>): void;
    clear(): void;
    get path(): string;
}
/** The size cap of `events.jsonl` in bytes. Past the cap the file rotates. */
export declare const EVENT_FILE_MAX_BYTES: number;
/**
 * Append one JSON line to `events.jsonl`.
 *
 * When the file passes `EVENT_FILE_MAX_BYTES`, the file keeps the newest
 * entries up to half the cap. Logging must never break a tool, so a failure
 * here is silent by design; the state warnings carry the errors that a
 * caller must see.
 */
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
export interface GitChanges {
    /** Whether git answered. A false value means the path is no repository. */
    ok: boolean;
    /** File lines of `git diff --cached --stat`. */
    staged: string[];
    /** File lines of `git diff --stat`. */
    unstaged: string[];
    /** Paths that `git status --porcelain` marks untracked (`??`). */
    untracked: string[];
}
/**
 * Read the changed files of a Git working tree.
 *
 * A commit plan must see a new file, so the untracked paths join the staged
 * and the unstaged file lines. The commands run without a shell.
 */
export declare function gitChanges(root: string): GitChanges;
/**
 * Group file paths by their top-level directory into commit clusters.
 *
 * A path without a slash belongs to the `root` scope. Each cluster carries a
 * commit-message suggestion.
 */
export declare function clusterPaths(paths: string[]): Cluster[];
export declare function clusterHunks(lines: string[]): Cluster[];
export interface VerifyReport {
    /** One entry per step. A later step after a failure is reported, not run. */
    results: Record<string, unknown>;
    /** The number of steps that ran and failed. */
    failures: number;
}
/**
 * Run the quality gate: format, lint, test, build.
 *
 * The gate covers all four steps. A step with no command is `skipped`, a
 * step after a failure is `skipped_after_failure`, and a dry run reports
 * `dry_run` for every runnable step. A failed step is never hidden.
 */
export declare function runVerifySteps(root: string, dryRun: boolean): VerifyReport;
