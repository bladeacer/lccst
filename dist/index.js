import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scanEnvironment, detectProject, SwarmState } from "./swarm/index.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const server = new McpServer({
    name: "lccst-locust",
    version: "3.0.0",
});
// ─── Prompt: load SKILL.md into context ────────────────────────
server.registerPrompt("swarm", {
    description: "Enforce deterministic lint-cluster-split-test-commit boundaries over the active workspace layout.",
}, async () => {
    try {
        const skillPath = path.resolve(ROOT, "SKILL.md");
        const skillContent = fs.readFileSync(skillPath, "utf-8");
        return {
            messages: [{
                    role: "user",
                    content: { type: "text", text: `Execute the following system skill framework precisely:\n\n${skillContent}` },
                }],
        };
    }
    catch (error) {
        return {
            messages: [{
                    role: "user",
                    content: { type: "text", text: `Internal Error loading downstream blueprint: ${error.message}` },
                }],
        };
    }
});
// ─── Tool: /init — map conventions + verify env ─────────────────
server.registerTool("init", {
    description: "Map project conventions and verify local environment state.",
    inputSchema: {
        path: z.string().optional().default(".").describe("Relative target path to scan."),
    },
}, async (args) => {
    const target = args?.path ? path.resolve(ROOT, String(args.path)) : ROOT;
    if (!fs.existsSync(target)) {
        return { content: [{ type: "text", text: `Error: path "${target}" does not exist.` }] };
    }
    const env = scanEnvironment(target);
    const state = new SwarmState(target);
    state.write({ phase: "init" });
    const lines = [
        `Project type: ${env.project.type}`,
        `Manifest: ${env.project.manifest || "(none detected)"}`,
        `Tools available: ${Object.entries(env.tools).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}`,
        `Test command: ${env.project.testCommand.join(" ") || "(none)"}`,
    ];
    if (env.conventions.length > 0)
        lines.push(`Conventions: ${env.conventions.join(", ")}`);
    return { content: [{ type: "text", text: lines.join("\n") }] };
});
// ─── Tool: /audit — scan diffs, output commit plan ──────────────
server.registerTool("audit", {
    description: "Scan workspace diffs and present an ultra-lean commit plan.",
    inputSchema: {
        path: z.string().optional().default(".").describe("Relative target path."),
    },
}, async () => {
    const state = new SwarmState(ROOT);
    state.write({ phase: "audit" });
    const { execSync } = await import("child_process");
    let diff = "";
    try {
        diff = execSync("git diff --cached --stat", { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
        if (!diff.trim()) {
            diff = execSync("git diff --stat", { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
        }
    }
    catch {
        return { content: [{ type: "text", text: "Not a git repository or no git available." }] };
    }
    if (!diff.trim()) {
        return { content: [{ type: "text", text: "Working tree clean — no changes to audit." }] };
    }
    const lines = diff.trim().split("\n").map(l => l.trim()).filter(Boolean);
    const clusters = clusterHunks(lines);
    const plan = [`Changes detected: ${lines.length} file(s)`, ""];
    clusters.forEach((c, i) => {
        plan.push(`${i + 1}. ${c.scope}: ${c.files.join(", ")}`);
        plan.push(`   Suggested: ${c.suggestion}`);
    });
    state.write({ clusters: clusters.map(c => c.suggestion) });
    return { content: [{ type: "text", text: plan.join("\n") }] };
});
// ─── Tool: /swarm — active execution loop ────────────────────────
server.registerTool("swarm", {
    description: "Transition to Active Execution: discover, cluster, test, commit.",
    inputSchema: {
        path: z.string().optional().default(".").describe("Target path."),
        dryRun: z.boolean().optional().default(false).describe("Dry-run mode (no mutations)."),
    },
}, async (args) => {
    const target = args?.path ? path.resolve(ROOT, String(args.path)) : ROOT;
    const dryRun = args?.dryRun === true;
    const state = new SwarmState(target);
    state.write({ phase: "swarm" });
    const project = detectProject(target);
    if (!project.testCommand.length) {
        return { content: [{ type: "text", text: `No test runner detected for ${target}. Cannot execute swarm.` }] };
    }
    const report = [
        `Swarm execution started at ${target}`,
        `Project: ${project.type} (${project.manifest})`,
        `Test command: ${project.testCommand.join(" ")}`,
        `Dry-run: ${dryRun}`,
        "",
        `Phase 1/4: Discover & Format — ${project.formatCommand?.join(" ") || "skipped"}`,
        `Phase 2/4: Hunk Clustering — pending git analysis`,
        `Phase 3/4: Targeted Testing — ${project.testCommand.join(" ")}`,
        `Phase 4/4: Atomic Commit — conventional commit generation`,
        "",
        `State tracking: ${state.path}`,
    ];
    if (!dryRun) {
        state.write({ phase: "swarm_discover" });
    }
    return { content: [{ type: "text", text: report.join("\n") }] };
});
function clusterHunks(lines) {
    const files = lines
        .filter(l => l.includes("|"))
        .map(l => l.split("|")[0].trim())
        .filter(Boolean);
    if (files.length === 0)
        return [{ scope: "root", files: lines, suggestion: "chore: apply workspace changes" }];
    const groups = {};
    for (const f of files) {
        const dir = f.includes("/") ? f.split("/")[0] : "root";
        if (!groups[dir])
            groups[dir] = [];
        groups[dir].push(f);
    }
    return Object.entries(groups).map(([scope, fileList]) => {
        const type = scope === "root" ? "chore" : "feat";
        return { scope, files: fileList, suggestion: `${type}(${scope}): apply ${fileList.length} file change(s)` };
    });
}
// ─── Start transport ─────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
