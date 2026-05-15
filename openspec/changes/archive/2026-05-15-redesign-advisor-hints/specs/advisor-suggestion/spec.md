## REMOVED Requirements

### Requirement: Extension suggests advisor after substantial work

**Reason**: Replaced by two new capabilities — `blockage-detection` (reacts to bash errors as real blockage signals) and `keyword-followup` (triggers validation after specific skill commands). The old system of passive guidelines and volume-based tool-call thresholds did not detect actual agent stuckness.
**Migration**: Use the new `blockage-detection` and `keyword-followup` capabilities. The old `TOOL_CALL_THRESHOLD`, `ordinalSuffix`, and `PASSIVE_GUIDELINE` are no longer used. The `customType: "advisor-hint"` is replaced by `customType: "advisor-blockage"`.

### Requirement: Passive guideline covers difficulty and pre-response validation

**Reason**: Static system-prompt text is too generic. Replaced by active blockage detection.
**Migration**: Remove the `before_agent_start` handler that appended the passive guideline.

### Requirement: Active hint is injected at turn_end after the first threshold is reached

**Reason**: Volume-based thresholds don't detect actual stuckness. Replaced by error-rate-based blockage detection.
**Migration**: Remove `turn_end` tool-call counting logic. Use the new sliding-window bash error detection instead.

### Requirement: Active hint repeats at later threshold multiples with escalating wording

**Reason**: Escalation removed by design — the new blockage steer is one-shot per episode.
**Migration**: No replacement for escalation. The blockage steer is fixed, non-escalating.

### Requirement: TUI notification shown with warning severity

**Reason**: Hints are now session-visible only. TUI notifications removed by design.
**Migration**: Remove `ctx.ui.notify` calls. Hints use `pi.sendMessage` with `display: true`.
