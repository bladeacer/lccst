![Logo Poster](./logo-poster.png)

# lccst (Locust)

lccst handles messy workspace diffs by grouping changed files into verified,
atomic Git commits. Operating as a deterministic workspace gatekeeper, it
enforces single-responsibility, cohesion, and strict test-verification
invariants through a lean, test-verified execution protocol.

> "Swarming your messy diffs before they reach production."

## Runtime Modes

### Bare Skill Mode

Load `SKILL.md` directly into the LLM context window. The model follows the
rules manually. Bare Skill Mode needs no server, no dependencies, and no
background processes -- just feed the skill file to the model and run.

### MCP Server Mode

The MCP server at `src/index.ts` (built to `dist/index.js`) is an optional
programmatic wrapper that exposes the protocol tools via Model Context
Protocol:

- **`init`** -- Map project conventions and verify environment
- **`audit`** -- Scan workspace diffs and generate commit plan
- **`swarm`** -- Discover and cluster workspace changes into a commit plan (the caller stages and commits)
- **`tooling`** -- Inventory Makefile targets, `scripts/` helpers, and package scripts
- **`lint`** -- Run lint (Makefile target first, manifest fallback)
- **`format`** -- Run format
- **`test`** -- Run test
- **`build`** -- Run build
- **`verify`** -- Run the full quality gate (format, lint, test, build)
- **`compliance`** -- Audit deliverable tiers
- **`version`** -- Report the current LCCST version

The server also registers a `swarm` prompt that returns the SKILL.md content
for the active workspace. This prompt is for Bare Skill Mode.

These tools map 1:1 to the slash commands documented in `SKILL.md`. The skill
runs standalone; the server is an optional programmatic front end.

Every path-taking tool accepts a `path` argument (default `.`). Absolute paths
preserved; `~` expands to `$HOME`; set `LCCST_WORKSPACE` to override the
workspace root. The state-changing tools (`init`, `audit`, `swarm`, `lint`,
`format`, `test`, `build`, `verify`) also accept a `mode` argument (`strict`
or `lean`, default `strict`); the server records the mode and echoes it, and
the caller enforces it.

Additional arguments:
- `dryRun`: accepted by `/swarm`, `/verify`, `/lint`, `/format`, `/test`, and
  `/build`. A dry run reports what the command would do without running it.
- `abort`: accepted by `/swarm` only. Clears an interrupted state file.

See `src/index.ts` for implementation details.

The Tooling Ladder checks task runners before manifests. A runner wins only
when its file declares the command; a runner file that declares no command is
skipped:

```bash
# Task runners (checked first):
- Makefile: make <command>
- mise.toml: mise run <command>
- justfile: just <command>
- Taskfile.yml: task <command>

# Language manifests (checked second):
- pyproject.toml: uv run pytest / uv run ruff format / uv run ruff check
- Cargo.toml: cargo test / cargo fmt / cargo clippy / cargo build
- go.mod: go test ./... / gofmt -l . / go vet ./... / go build ./...
- package.json: pnpm test / pnpm run format / pnpm run lint / pnpm run build
- Makefile: make test / make lint / make build
- CMakeLists.txt: ctest / cmake --build .
```

The server detects the user's platform once, before the first command, and
chooses the appropriate shell:
- Windows without WSL/MSYS: uses PowerShell for .sh scripts
- Unix-like: uses bash for .sh scripts
- Python, TypeScript, and Node scripts run with their native runtimes

The server searches `scripts/` for helpers whose base name matches the command
or its plural (`scripts/<command>` or `scripts/<commands>`). A helper counts
when it is executable or has a `.sh`, `.py`, `.js`, `.ts`, `.mjs`, or `.cjs`
extension. The server does not search `tools/`, `bin/`, or `script/`.

## Core Philosophy

- **UNIX philosophy over framework:** One skill file and one server file. No
  scaffolding the domain does not justify. Over-engineering is a correctness
  defect.
- **User conventions first:** Existing patterns, manifest commands, and
  explicit preferences take priority. Atomic hunk isolation, the Tooling
  Ladder, and strict test-pass verification are non-negotiable.
- **Quality over velocity:** Structural integrity and complete test
  verification beat raw speed. Token discipline applies to output, not
  internal reasoning.
- **Granularity over convenience:** Locality Clustering groups changed files by
  their top-level directory so each atomic commit rolls back cleanly. The extra
  commits buy a clear, reversible history. Hunk-level isolation is the duty of
  the caller with `git add -p`, in Bare Skill Mode and in host-tool mode alike.
- **Proportional defence:** Validation, rate limiting, and caching apply only
  where module exposure justifies them. Omit fabricated attack or load
  scenarios.
- **Ecosystem-native discovery:** LSP, Tree-sitter, and native test runners
  trace side effects; the Tooling Ladder prefers project scripts over bare
  binaries.
- **Token investment:** LCCST puns on low-cost asset management while
  clustering by locality. Tokens are strategic capital -- spent on tests,
  typing, and the Tooling Ladder, not on boilerplate.

## Structural Invariants

The protocol enforces three invariants on every change. The server checks
the first two and runs the project's own test command for the third; the
caller owns the commit boundary.

- **Single responsibility.** Keep one file focused on one domain. Permit a
  cohesive multi-method interface only when its methods share one
  responsibility. `src/index.ts` is the exception because it holds the whole
  MCP server and swarm helpers.
- **Cohesion.** Locality Clustering groups changed files by their top-level
  directory so each atomic commit rolls back cleanly. Two files in one
  directory form one cluster; one cohesive domain split across directories
  becomes two clusters. The extra commits buy a clear, reversible history.
- **Strict test verification.** No functional change reaches a commit without
  a passing test. The server runs the project's own test command and reports
  a failure as a defect, never as a pass.

## Installation

### Option A: GitHub Releases (Recommended)

Download the latest release from the
[releases page](https://github.com/bladeacer/lccst/releases). Each release
bundles `dist/index.js`, `SKILL.md`, `dist/index.d.ts`, `LICENSE`, and
`README.md`. Set the path to `dist/index.js` in your agent config. No install
or build needed.

### Option B: Zero-Setup Declarative Ingestion

For instruction-driven workflows that need no background processes.

- **Claude Code CLI:** `claude "Review the active git diff using the parameters in ./SKILL.md"`
- **GitHub Copilot & OpenCode:** Attach `#SKILL.md` or `@SKILL.md` in chat
- **Codex & harnesses:** `cat SKILL.md | your-agent-runner "Apply this system execution skill"`
- **Project-level binding:** Symlink `SKILL.md` as `.cursorrules`,
  `.clinerules`, or `.github/copilot-instructions.md`
- **Global profiles:** Paste into Cursor Rules, Windsurf Memories, VS Code
  `globalRules.json`, or JetBrains Custom Prompts

### Option C: Universal Package Registry

```bash
npx skills add bladeacer/lccst
/lccst
```

### Option D: MCP Server Setup

```bash
git clone --depth 1 https://github.com/bladeacer/lccst
cd lccst && pnpm install && pnpm run build
```

Add to your harness config:

```json
{
  "mcpServers": {
    "lccst": {
      "command": "node",
      "args": ["/absolute/path/to/lccst/dist/index.js"]
    }
  }
}
```

> Replace the path with your actual `dist/index.js`. The server is disabled by
> default (`enabled: false`).
> 
> Note: A harness is a programme you use to interface with and run AI models

**OpenCode:** Add the above to `opencode.jsonc` under `mcp.lccst`. The
`SKILL.md` is auto-discovered as an Agent Skill -- use `/lccst` or `@SKILL.md`
to invoke it.

## Development

Read `AGENTS.md` for build/test commands, deliverable tiers, and structural invariants.

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | >= 9 | Package manager |
| TypeScript | >= 5.4 | Compiling engine source |
| Node.js | >= 20 | Runtime |

```bash
pnpm run build           # Bundle deps + source -> dist/index.js
pnpm run test            # Run all tests
pnpm run test:swarm      # Swarm library unit tests only
pnpm run test:telemetry  # Telemetry MCP unit tests only
pnpm run test:picker     # Benchmark picker unit tests only
pnpm run test:e2e        # Telemetry end-to-end tests on real harnesses
pnpm run test:mcp        # MCP server integration tests only
pnpm run bench:list      # Models that the benchmark picker offers
pnpm run bump 1.0.0      # Bump version across all files
```

The end-to-end test starts a real harness with a real model, so it needs a
network connection. Set `E2E_HARNESS` or `LCCST_E2E_MODEL` to narrow the run.

Benchmarking has its own dependencies -- see [`playground/README.md`](playground/README.md).

## Playground and Evaluation

The playground is a clean-room environment for testing and evaluating the LCCST
protocol with different AI models and configurations. It provides a standardized
way to measure implementation quality, test coverage, and code structure across
multiple reference projects.

```bash
make benchmark-free     # Select a model (including Kiro) and run the evaluation
make bench-list         # List the models that the picker offers
```

### fzf picker integration

The picker lists the models available from each supported harness and presents
a fuzzy search interface. Type part of a model name and press Enter to select
one. Without `fzf`, the picker asks for a filter and a number instead. A model
is offered only when it supports tool calling, text input, and text output. The
run happens in an isolated clean room outside the repository.

The picker needs a terminal, because the evaluation runs actual models and
consumes tokens. Set `BENCH_ALLOW_PIPE=1` to allow scripts to choose models
without a terminal.

### Evaluation Process

1. The evaluation measures the model it selects.

The run checks that the harness offers the model before building the clean room,
and it gives the harness its own configuration directory (under `/tmp`). This
ensures the model under test cannot be influenced by the user's plugins, skills,
agents, or servers. The run also gives the harness its own state directory to
isolate the model choice.

2. The evaluation measures the prompt it receives.

The instructions include a unique token that the model must state in its first
reply. This proves the model read and processed the full prompt.

3. Standardized measurement.

The evaluation applies the same file filters and test commands to every
implementation. A test failure is a valid measurement. A test run that cannot
start, times out, or contains no tests is an error and never scores as a pass.

4. Clean-room isolation.

The playground seeds only the protocol documents (`SKILL.md`, `guide.md`,
`traps.md`) and the task prompt into the clean room. The evaluation rubric
(stated in `playground/README.md`) never reaches the clean room, so the model
under test cannot see the scoring criteria.

5. Comprehensive reporting.

Every report includes the harness version, token counts for each phase, model
identifier confirmation, toolchain versions, and test results. A run that fails
any validation stays on disk for inspection and is excluded from the summary
table.

6. How runtime tokens are measured.

A model cannot read its own token usage, so the `lccst-telemetry` MCP server
measures it. The model marks the end of each phase, and the settle step then
reads the token counts of every model turn of that phase from the store of
the harness that ran it. The reader names no harness, so the same
server measures `opencode` and `kilo`.

The server checks the workspace before it records a phase. A call that arrives
before the phase holds its directory and its manifest records nothing, and a
second call for the same phase corrects the end of that phase. A call that
came too early therefore costs one more call, and it never costs a phase.

Every run before `v3.7.0` used counts that the model under test supplied, so
those Agent Runtime Tokens (ART) figures were estimates. The old findings are
removed. The table below fills again after the next benchmark run.

The scanner changed after the first `v3.7.0` run, so the file token counts and
the robustness scores of a new report are not comparable with the removed
reports. A report that predates the change counted the test files of one
variant and not the other.

### Benchmark Results

> **Legend:** ART stands for Agent Runtime Tokens. A negative ART overhead
> (e.g. `-12%`) means the skill-guided variant used fewer runtime tokens than
> the plain variant -- token savings gained by avoiding repetitive
> error-fix cycles. FCT (File Context Tokens) is the context overhead of the
> files the model reads.

<!-- BENCHMARK_RESULTS_START -->

#### opencode/opencode/mimo-v2.6-flash-free: skill version v4.7.0

| Provider | Harness | Harness Version | Model | Skill Layer | Context Tools (MCP) | Subproject | Plain Score | Skill-Guided | Test Status | FCT (Plain) | FCT (Guided) | ART (Plain) | ART (Guided) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `opencode` | **opencode** | `v2.2.1` | `mimo-v2.6-flash-free` | `v4.7.0` | `lccst-telemetry` | **python-http-server** | 66/100 | **74/100** | PASSED | 1,593 | 1,792 | 64,999 | 143,471 |
| `opencode` | **opencode** | `v2.2.1` | `mimo-v2.6-flash-free` | `v4.7.0` | `lccst-telemetry` | **react-timer** | 74/100 | **100/100** | PASSED | 456 | 997 | 105,102 | 375,995 |
| `opencode` | **opencode** | `v2.2.1` | `mimo-v2.6-flash-free` | `v4.7.0` | `lccst-telemetry` | **go-login-crud** | 100/100 | **100/100** | PASSED | 2,448 | 3,062 | 248,033 | 1,158,202 |
| **Summary** | | | | | **Workspace Totals / Avg** | **80/100** | **91/100** | **3/3 Passed** | **4,497** | **5,851** | **418,134** | **1,677,668** |

> **Highest ART subproject:** `go-login-crud` consumed the most guided runtime
> tokens.
> **Highest FCT subproject:** `go-login-crud` consumed the most guided FCT
> tokens.
> Skill-guided implementation used **+30%** more FCT and **+301%** more ART
> compared to plain implementation across the workspace suite.


### Benchmark Summary

| Metric | `opencode-opencode-mimo-v2.6-flash-free` |
| --- | --- |
| Harness | opencode |
| Harness version | v2.2.1 |
| Plain score | 80/100 |
| Guided score | 91/100 |
| Plain FCT | 4,497 |
| Guided FCT | 5,851 |
| FCT overhead | +30% |
| Plain ART | 418,134 |
| Guided ART | 1,677,668 |
| ART overhead | +301% |
| Tests passed | 3/3 |

#### Token Efficiency

* **`opencode-opencode-mimo-v2.6-flash-free`** was the most token-efficient
  overall (+30% FCT, +301% ART overhead) but scored 91/100 (weakest:
  python-http-server at 74/100).

Across all runners, `go-login-crud` remained the most resource-intensive
subproject.

#### Least Token Usage

`opencode-opencode-mimo-v2.6-flash-free` consumed the fewest tokens overall
(2,106,150): 4,497 plain FCT, 5,851 guided FCT, 418,134 plain ART, and 1,677,668
guided ART.

#### Overall Top Models

| Rank | Agent-Model | Plain Score | Guided Score | FCT Overhead | ART Overhead | Verdict |
| ---: | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | `opencode-opencode-mimo-v2.6-flash-free` | 80/100 | 91/100 | +30% | +301% | Best overall |

See [`model-ranking.md`](model-ranking.md) for the full ranking of all benchmark runs.

> Only benchmark runs which perform well enough are included


<!-- BENCHMARK_RESULTS_END -->


