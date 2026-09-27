### LCCST 3.7.0

Date: _2026-09-27_

The telemetry server measures the token usage of the model under test.

## Correctness

### The Telemetry Server Reads the Token Counts

The `log_turn_telemetry` tool asked the model under test for `prompt_tokens`
and `completion_tokens`. A model cannot read its own token usage, so the model
sent invented counts. The benchmark report then presented the invented counts
as measurements.

The tool now takes only the `subproject` and the `variant`. The server reads
the counts of the model turns from the host session store. The server sums
every model turn of the phase that no earlier phase recorded, and it stores
the identifiers of those turns. A second call for the same phase therefore
adds no tokens, and it returns an error.

The server finds the session in two steps:

1. It uses the session identifier that the host sends in the tool call
   metadata.
2. Without that identifier, it uses the newest session of the workspace
   directory. The sessions of a subagent count towards the same phase.

The reader supports both host schemas. The newest schema stores the author in
the `type` column of `session_message`. The older schema stores the author in
the `data` column of `message`.

### The Report Labels an Estimated Count

`run_benchmark.py` allocated the workspace total across the subprojects when
no phase recorded a count. The report did not say that the rows were
estimates.

The report now states the source of the runtime tokens. It prints `Measured`
when the phases recorded counts, `Estimated` when the rows come from the
allocation, and `No runtime tokens` when the host store held no counts.

### Cache Read Tokens Count Apart

The host re-reads the context on every turn. Cache read tokens are larger
than the prompt and completion tokens together. The report listed no column
for them, so the plain and guided rows looked comparable when they were not.

The server now records `cache_read_tokens` apart from `prompt_tokens`, and
the report shows a column for it. The combined column is the sum of the three
columns.

### The Integration Test Runner Waits for the Answer

`scripts/test-connection.ts` read the answer after 250 milliseconds. The
server needs about 400 milliseconds to start, so the suite failed on a loaded
machine. The runner now reads the frame as soon as the server writes it. The
runner keeps a five second limit for a server that stays silent.

## Consistency

### The Prompt and Guide Describe the Source of the Counts

Section 4 of `playground/agent-prompt.md` told the agent to pass exact token
counts. The section now tells the agent to pass only the subproject and the
variant, and to state that the count is unavailable when the tool fails.

The `Token accounting` section of `playground/guide.md` states the two items
that the host must supply, and it states that the server reports an error
without them. The section also states the Node.js version that the server
needs, because the reader uses `node:sqlite`.

### The README Generator Reads the Last Column

`scripts/update_readme_benchmarks.py` read the fifth column of the runtime
cost table. The table has six columns now, so the generator reads the last
column. Reports in the old format keep the same values.

## New Features

### A Unit Test for the Usage Reader

`scripts/test-telemetry-usage.ts` covers the pure sum, the recorded turn set,
both store schemas, the newest session of a directory, a child session, the
host session identifier, an unknown schema, and an absent store. The test
builds its own store files, so it does not read the store of the developer.

`make test` and `make test:telemetry` run the test. The CI workflow runs it
as its own step.

### The Report Counts Model Turns

The report now states the number of model turns and the number of phases
next to the runtime token total.

## Breaking Changes

The `log_turn_telemetry` tool no longer accepts `prompt_tokens` and
`completion_tokens`. A caller that passes them keeps working, because the
server drops the values. A host that does not keep a session store, such as a
host other than `opencode`, records no runtime tokens. The report labels the
rows as unmeasured.

The runtime token files gain the fields `total_cache_read_tokens`,
`model_turns`, and `recorded_messages`. The step objects gain
`cache_read_tokens`.

The telemetry MCP server now needs Node.js 22.5 or later, because the reader
uses `node:sqlite`.

## Version

Bumped from 3.6.1 to 3.7.0.
