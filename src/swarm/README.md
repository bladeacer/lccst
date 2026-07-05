# /swarm -- MCP Execution Library Reference

The entire LCCST MCP server -- including the protocol handlers, project
detection, state persistence, and hunk clustering -- lives in a single
self-contained source file:

```
src/index.ts   ->   dist/index.js   (single distributable file)
```

The MCP server at `dist/index.js` registers a `swarm` prompt and three tools.
No additional files are needed at runtime.

## Tools exposed

| Tool     | Description                                                  |
|----------|--------------------------------------------------------------|
| `/init`  | Map project conventions and verify local environment state   |
| `/audit` | Scan workspace diffs and generate commit plan                |
| `/swarm` | Execute discovery-cluster-test-commit loop                   |

## Internal modules (within `src/index.ts`)

| Export           | Purpose                                                |
|------------------|--------------------------------------------------------|
| `detectProject`  | Manifest discovery + Tooling Ladder                    |
| `scanEnvironment`| Full env scan (tools, conventions, project type)       |
| `SwarmState`     | `.lccst/state.json` file-backed persistence                 |
| `clusterHunks`   | Git diff -> cluster grouping for atomic commits         |
