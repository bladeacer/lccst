### LCCST 3.6.1

Date: _2026-09-27_

The playground agent prompt applies the `/init` intent as a manual step.

## Correctness

### Init Step Runs Without the Command Server

Section 2 of `playground/agent-prompt.md` told the agent to run the `/init`
tool. The `lccst` MCP server is disabled in every benchmark workspace, so the
tool was never available. The agent improvised the step or stopped.

Section 2 now defines a mapping step instead of a tool call. The step records
the target path, manifest, tools, and conventions. It also requires a short
architecture plan before the agent writes code. The step needs no tool, so it
now runs in the clean-room sandbox.

### Command List Defines Intents

Section 3 of `SKILL.md` listed each command as a tool name only. An agent that
reads the skill had no way to run a command when the host exposed no command
server. Section 3 now states that each entry defines an intent. If the host
does not expose the command server, the agent applies the intent as a manual
step.

## Consistency

### Manifest Choice per Subproject

The mapping step names the manifest for each subproject. The step does not
use the Tooling Ladder, because a `plain` run does not read `SKILL.md`. The
`skill-guided` conventions item uses the guardrails and the deliverables in
`SKILL.md`.

### Simplified Technical English

The new text uses short sentences, active voice, and conditions before
commands. It uses the terms `target path`, `manifest`, `tools`, and
`conventions` from the protocol. The document uses ASCII characters only.

## Breaking Changes

None. The MCP tools, the server runtime, and the telemetry interface are
unchanged.

## Version

Bumped from 3.6.0 to 3.6.1.
