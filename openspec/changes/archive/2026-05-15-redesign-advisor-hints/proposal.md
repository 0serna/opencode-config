## Why

The current `advisor-hints` extension has two mechanisms — a passive system-prompt guideline and an active tool-call-threshold hint system — that no longer match how the user works. The passive guideline is too generic to be useful, and the turn-end threshold hints fire based on tool volume rather than actual signs of the agent being stuck. The user wants to replace both with two focused mechanisms: blockage detection (reacting to real failure signals) and keyword-triggered follow-ups (validating specific types of work).

## What Changes

- **BREAKING**: Remove the passive system-prompt guideline about using `advisor` appended in `before_agent_start`
- **BREAKING**: Remove the turn-end tool-call threshold hints (counting `bash`/`read`/`edit`/`write` calls and injecting escalating steer messages at multiples of `TOOL_CALL_THRESHOLD`)
- **BREAKING**: Remove TUI notifications for hints — all hints are now session-visible messages (`display: true`)
- **NEW**: Add **blockage detection** — monitors bash exit codes across a sliding window of the last 5 bash calls; if 3 or more have non-zero exit codes, sends a `customType: "advisor-blockage"` steer message once per blockage episode
- **NEW**: Add **keyword follow-up** — detects configured keywords (`opsx-propose`, `opsx-apply`) in the user's prompt; when found, sends a user message at `agent_end` asking to validate work with `advisor`
- Remove the old `customType: "advisor-hint"` in favor of the new `customType: "advisor-blockage"` for blockage steers

## Capabilities

### New Capabilities

- `blockage-detection`: Detecting when the agent is stuck (bash errors in a sliding window) and injecting a blockage steer message
- `keyword-followup`: Detecting keywords in user input and sending a follow-up validation message after the agent finishes

### Modified Capabilities

- `advisor-suggestion`: The entire spec is replaced — the old passive guideline and volume-based thresholds are removed. The two new capabilities take their place.

## Impact

- Single file changed: `dotfiles/pi/agent/extensions/advisor-hints.ts` — complete rewrite
- Removes dependency on `TOOL_CALL_THRESHOLD` constant and `ordinalSuffix` helper
- The old `advisor-hint` customType is no longer emitted; any message filtering by that type will stop matching
- `session_start`, `before_agent_start`, `agent_start`, `tool_result`, `turn_end`, `agent_end` event handlers all change
- Logging schema stays the same (shared logger, same source name `advisor-hints`)
