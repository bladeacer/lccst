# /swarm — MCP Execution Library Reference

This directory documents the LCCST MCP server architecture. The actual
TypeScript source lives at `src/swarm/`.

## Structure

```
src/swarm/
  ladder.ts    Project detection + Tooling Ladder (manifest discovery, env scan)
  state.ts     .lccst_state file-backed persistence for mid-swarm context
  index.ts     Re-exports
```

## Tools exposed by the MCP server (`src/index.ts`)

| Tool     | Description                                                  |
|----------|--------------------------------------------------------------|
| `/init`  | Map project conventions and verify local environment state   |
| `/audit` | Scan workspace diffs and generate commit plan                |
| `/swarm` | Execute discovery-cluster-test-commit loop                   |

The MCP server at `dist/index.js` registers a `swarm` prompt and three tools.
All execution logic is delegated to `src/swarm/`.
