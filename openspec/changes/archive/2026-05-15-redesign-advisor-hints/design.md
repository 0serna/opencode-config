## Context

The `advisor-hints` extension (`dotfiles/pi/agent/extensions/advisor-hints.ts`) currently injects hints suggesting `advisor` use at two levels:

1. **Passive**: A guideline appended to the system prompt at `before_agent_start`
2. **Active**: A steer message injected at `turn_end` every 10 counted tool calls (bash/read/edit/write), delivered with `triggerTurn: true`

Session analysis of a real 142-tool-call session showed:

- 11 hints fired
- **Zero** autonomous advisor calls by the agent
- Both advisor invocations were manually typed by the user
- The agent accumulated up to 8 consecutive hints without calling advisor

The root cause is the hint text itself: "If you're having difficulty... otherwise if important... you can skip it" — this conditional framing gives the model permission to skip every time. The agent never perceives difficulty and never considers the work "important enough" mid-task.

The extension uses the shared logger at `./shared/logger.js` — no changes needed there.

## Goals / Non-Goals

**Goals:**

- Make the agent call `advisor` autonomously when hints accumulate
- Remove conditional escape clauses from active hints
- Escalate progressively across 3 levels of firmness
- Save tokens by removing `triggerTurn: true`
- Keep all existing mechanics (threshold, tool counting, reset logic, logging)

**Non-Goals:**

- No changes to the shared logger
- No changes to other extensions
- No changes to threshold mechanics (still 10 tool calls)
- No changes to tool counting logic (still bash/read/edit/write)
- No limit on maximum hints (still unlimited)

## Decisions

### Decision 1: Passive guideline covers both difficulty and importance

**Choice:** The system prompt guideline now includes both escalation paths:

> "If you're having difficulty, use \`advisor\` to escalate. Before responding to the user, always consider whether the work is important enough to validate with \`advisor\` first."

**Rationale:** Removing the difficulty condition from the active hints means it needs a home elsewhere. The system prompt is the right place — it sets baseline expectations before any work begins. Including both difficulty and pre-response validation covers the two scenarios where advisor is useful without making the active hints conditional.

**Alternatives considered:**

- Put difficulty back in active hints — rejected because that's exactly the conditional escape that failed
- Omit difficulty entirely — rejected because difficulty-based escalation is still valid, just shouldn't be in the active hint that fires mid-work

### Decision 2: Three levels of progressive firmness

**Choice:** Active hints escalate across 3 distinct levels:

| Level | When                    | Wording Strategy                        |
| ----- | ----------------------- | --------------------------------------- |
| 1     | 1st hint since advisor  | Gentle reminder                         |
| 2     | 2nd hint since advisor  | Reinforced expectation                  |
| 3+    | 3rd+ hint since advisor | Mandatory language with `MANDATORY` tag |

**Rationale:** A single text repeated 8 times gets ignored. Progressive escalation signals increasing urgency to the model. The word `MANDATORY` at level 3+ is an attention-capture token that breaks through the pattern of repeated similar messages.

**Alternatives considered:**

- Same text every time — rejected, proven to be ignorable
- 5 levels of escalation — rejected, excessive complexity for marginal gain
- 2 levels — rejected, jump from "consider" to "MANDATORY" is too abrupt

### Decision 3: Remove `triggerTurn: true`

**Choice:** Steer messages delivered with `{ triggerTurn: false }` (default).

**Rationale:** Each hint currently forces a model turn, consuming tokens and disrupting flow. Since the agent ignores them anyway, forcing turns is pure waste. Without `triggerTurn`, the hint sits in context and is seen on the next natural assistant turn.

**Risk:** The model might not see the hint until several more tool calls later. This is acceptable — the threshold already fires every 10 tools, so the next hint will reference the updated count. The delay is bounded.

### Decision 4: All TUI notifications use `warning` severity

**Choice:** `ctx.ui.notify("[advisor-hint] " + hintText, "warning")` for all levels.

**Rationale:** Consistency. The first hint was `info` (less visible), but it's equally important as subsequent ones. The user should see all hints with the same visual weight. The TUI notification is the only channel the user sees (steer messages have `display: false`), and it was effective in the session — the user typed "advisor" after seeing notifications.

## Risks / Trade-offs

| Risk                                                                                                          | Mitigation                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model still ignores hints** despite stronger wording                                                        | The mandatory language (`MANDATORY`) and escalation are designed to counter this. If it persists, a stronger mechanism (e.g., blocking tool calls after N hints) could be added later, but that's a significant behavior change |
| **"MANDATORY" causes confusion** — model might interpret it as a hard block rather than a strong suggestion   | The text still says "Do not respond... without validating" not "You must call advisor now" — it guides the response flow, not the tool calling                                                                                  |
| **No triggerTurn delays hint visibility** — model may complete several more tool calls before seeing the hint | Acceptable. Hints still fire at consistent thresholds. The model will see the hint before its next text response, which is the critical moment                                                                                  |
| **User gets annoyed by repeated warnings**                                                                    | All `warning` severity is more visible than before. User opted to keep notifications visible and in warning. If annoying, it can be dialed back                                                                                 |
