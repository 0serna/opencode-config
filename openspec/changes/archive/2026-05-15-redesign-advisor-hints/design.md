## Context

The `advisor-hints.ts` extension currently implements two hint mechanisms using the pi extension API:

1. A static passive guideline appended to the system prompt in `before_agent_start`
2. Active turn-end hints triggered when counted tool calls (`bash`/`read`/`edit`/`write`) cross multiples of `TOOL_CALL_THRESHOLD` (10), with escalating wording

Both mechanisms are being removed and replaced by two new independent mechanisms that react to real signals rather than tool volume.

The pi extension API provides the following hooks used by this design: `session_start`, `before_agent_start`, `agent_start`, `agent_end`, `turn_start`, `turn_end`, `tool_result`. Messages are sent via `pi.sendMessage()` (custom steer messages) and `pi.sendUserMessage()` (user messages that trigger turns). Diagnostic logging uses the shared logger at `./shared/logger.js`.

## Goals / Non-Goals

**Goals:**

- Detect when the agent is stuck (repeated bash failures) and inject a one-time steer message per episode
- Detect specific keywords (`opsx-propose`, `opsx-apply`) in the user's prompt and append a follow-up user message at `agent_end`
- Keep all hints visible in the session (`display: true`) — no separate TUI notifications
- Remove the old passive guideline and volume-based threshold system entirely
- Hardcode all configuration (keywords, thresholds) as module-level constants

**Non-Goals:**

- Not building a generic config file or settings UI — configuration stays in the `.ts` file
- Not adding cooldown, debounce, or rate-limiting logic
- Not detecting keywords in assistant messages or tool results (only user input)
- Not adding escalation or multi-level messaging for either mechanism

## Decisions

### Decision: Sliding window of 5 bash calls, threshold of 3 errors

The blockage detection uses a fixed-size FIFO buffer of the last 5 bash tool results. If 3 or more have a non-zero exit code at `turn_end`, a blockage steer is sent.

- **Alternative considered**: Counting total consecutive errors. Rejected because a single success among errors shouldn't fully reset the window.
- **Alternative considered**: Looking at all tool types, not just bash. Rejected because non-bash errors (web_search, read) are expected operations, not blockage signals.

### Decision: One steer per episode, reset on advisor or agent_start

Once a blockage steer is sent for an episode, no further steers are sent until either the agent calls `advisor` (resetting the error buffer) or a new user prompt starts (`agent_start`).

- **Rationale**: Repeated messages every turn_end would be noisy and counterproductive. The agent either unblocks itself or needs a single nudge.

### Decision: Keywords detected in `input` event via `event.text`

The `input` event fires before skill/template expansion, so `event.text` contains the raw user input including skill command names like `opsx-propose` and `opsx-apply`. If these matched after expansion the keyword would be gone.

Keywords are matched as plain substring checks against `event.text`. Messages with `event.source === "extension"` SHALL be skipped to avoid self-triggering on the extension's own follow-up.

- **Alternative considered**: Using `before_agent_start` / `event.prompt`. Rejected because skill commands may be expanded before that point, removing the keyword from the prompt text.

### Decision: Follow-up sent as `sendUserMessage` at `agent_end`

When a keyword is detected, at `agent_end` the extension calls `pi.sendUserMessage("validate the work done so far with `advisor`")`. This triggers a new turn immediately, asking the agent to validate.

- **Alternative considered**: Using `pi.sendMessage` with `deliverAs: "followUp"` and `triggerTurn: true`. Rejected because `sendUserMessage` creates an actual user message visible in the session, which is the desired behavior — it looks like a user prompt.
- **Alternative considered**: Using `deliverAs: "steer"` with `triggerTurn: true`. Rejected because steers are custom messages, not user messages, and the follow-up should appear as a natural user input.

### Decision: Session-visible messages, no TUI notifications

Both blockage steers and keyword follow-ups are visible in the session UI (the steer has `display: true`, the follow-up is a user message). No `ctx.ui.notify` calls are made.

- **Rationale**: The user can see hints directly in the conversation. Notifications are redundant noise.

### Decision: Hardcoded constants, no external config

Keywords, threshold values, window size, and the follow-up message are all defined as module-level `const` or `let` values at the top of the file.

- **Rationale**: The user explicitly chose this approach. Keeps the extension self-contained and avoids needing a config file reader.

## Risks / Trade-offs

| Risk                                                                                                  | Mitigation                                                                                                                |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Keywords match unexpectedly in non-command context (e.g., someone types "how does opsx-propose work") | Acceptable — the follow-up is harmless ("validate with advisor") and the agent will handle it gracefully                  |
| Blockage false positives when bash errors are expected (e.g., testing error handling)                 | The steer is a one-shot soft suggestion, not a block — the agent can ignore it                                            |
| `sendUserMessage` at `agent_end` adds token cost per keyword match                                    | Keywords are specific skill commands, so matches are rare (only when running openspec workflows)                          |
| Agent ignores blockage steer entirely                                                                 | Acceptable — no escalation is designed; advisor reset works if the agent does call it, else the next prompt resets        |
| Both blockage steer and keyword follow-up fire in same session                                        | They're independent and non-conflicting: steer is delivered during turns, follow-up happens after agent_end in a new turn |
