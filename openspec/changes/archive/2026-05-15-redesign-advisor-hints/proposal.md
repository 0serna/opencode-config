## Why

The advisor-hints extension fires hints every 10 tool calls suggesting the agent use `advisor`, but session analysis shows the agent **never** calls advisor autonomously — across 142 tool calls and 11 hints, every advisor invocation was manually typed by the user. The current hint wording ("If you're having difficulty... otherwise if important... you can skip it") gives the model an easy conditional escape that it consistently takes. The hints need to be redesigned so the agent actually follows them.

## What Changes

- **Rewrite passive guideline** (system prompt): replace the existing vague suggestion with text covering both difficulty escalation and pre-response validation importance
- **Rewrite active hint texts**: remove conditional escape clauses, make hints progressively firmer across 3 levels (reminder → reinforcement → mandatory instruction)
- **Remove `triggerTurn: true`** from steer messages: hints no longer force an extra model turn, saving tokens
- **Change UI notification severity**: all hint notifications use `warning` severity (was `info` for first, `warning` for subsequent)
- **BREAKING**: The hint message content changes — the conditional "skip if simple" framing is removed entirely. Active hints no longer leave the decision to the agent; level 3+ hints use mandatory language (`MANDATORY`).

## Capabilities

### New Capabilities

_(None — this is a redesign of existing capability, not a new one.)_

### Modified Capabilities

- `advisor-suggestion`: Requirements change for passive guideline content, active hint wording, triggerTurn behavior, notification severity, and escalation strategy

## Impact

- **File**: `dotfiles/pi/agent/extensions/advisor-hints.ts` — rewrite of hint text constants, passive guideline, and delivery options
- **Spec**: `openspec/specs/advisor-suggestion/spec.md` — requirements updated to reflect new wording, escalation, and delivery behavior
- **No changes** to shared logger (`lib/log.ts`), other extensions, or the linker
