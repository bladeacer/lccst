You are executing inside a clean, instrumented sandbox for the LCCST Playground Benchmark. 
Our goal is to implement the mentioned subprojects under live operational monitoring.

The rules in../../skill.md are fully active for this run.
Please parse and strictly reference ../../playground/README.md and ../../playground/guide.md 
for specific architectural constraints, file topology expectations, and implementation details.

### Target Specifications
1. Target Environment: [e.g., Python 3.13 / Go 1.26 / React TS]
2. Task Scope: [e.g., Build a complete REST HTTP user CRUD system with an in-memory database]
3. Structural Mandate: Follow strict decoupling, typing, and structural boundaries as dictated by the playground guide matrix.

### Pre-Flight Sandbox Boundary & Telemetry Constraints
Before executing the `/init` workspace scan, looking at the directory layout, or running any inspection commands (do not run `ls`, `find`, `git status`, `git diff`, `git log`, or open files):
* You are operating strictly inside the isolated workspace directory `playground/opencode-deepseek-v4-flash-free/` relative to the repository root. All relative path references to global resources require navigating up two directories (`../../`).
* You are explicitly commanded to execute a **blind deletion pass**. Immediately wipe (`rm -rf` equivalent) any existing `plain/` and `skill-guided/` folders inside your current directory without reading, listing, or querying version control metadata first.
* SYSTEM ENVIRONMENT NOTICE (MCP TELEMETRY): An active MCP server `lccst-telemetry` is plugged directly into your execution context. You are explicitly required to invoke the `log_turn_telemetry` tool at the conclusion of every single loop step. You MUST supply the `subproject` target name, the active strategy `variant` mode, along with prompt and completion counts to maintain benchmarking validity.
* CRITICAL INTEGRITY RULE: You do not need to configure any network settings or proxies. Simply interact with your native models normally.
* CRITICAL BOUNDARY: Do not touch, read, or delete any files or directories outside your specific active working path scope.

Once the blind deletion pass is executed, run the `/init` workspace scan command now to audit the fresh sandbox setup, then output your pre-flight architectural plan before writing any code.

## Operational Constraints

1. **Incremental Implementation**: Complete one project type at a time (e.g., implement `python-http-server` plain mode first, call telemetry checkpoint, then implement its skill-guided variant, call telemetry checkpoint, then run its tests). Do not proceed to the next project until the current one is completely finished.
2. **Turn-Based Telemetry Checkpointing**: At the end of every individual development phase or project completion turn, you MUST explicitly invoke the `log_turn_telemetry` tool passing:
   - `subproject`: ("python-http-server" | "react-timer" | "go-login-crud")
   - `variant`: ("plain" | "skill-guided")
   - `prompt_tokens`: <true_count>
   - `completion_tokens`: <true_count>
