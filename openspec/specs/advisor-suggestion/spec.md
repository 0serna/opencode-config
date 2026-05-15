# advisor-suggestion Specification

## Purpose

The advisor-suggestion capability was replaced by the new `blockage-detection` and `keyword-followup` capabilities. This spec documents the removed requirements for migration reference.

## Requirements

### Requirement: Extension suggests advisor after substantial work

The old advisor-suggestion extension SHALL be removed and replaced by `blockage-detection` and `keyword-followup`.

**Reason**: Replaced by two new capabilities — `blockage-detection` (reacts to bash errors as real blockage signals) and `keyword-followup` (triggers validation after specific skill commands). The old system of passive guidelines and volume-based tool-call thresholds did not detect actual agent stuckness.
**Migration**: Use the new `blockage-detection` and `keyword-followup` capabilities. The old `TOOL_CALL_THRESHOLD`, `ordinalSuffix`, and `PASSIVE_GUIDELINE` are no longer used. The `customType: "advisor-hint"` is replaced by `customType: "advisor-blockage"`.

#### Scenario: Requirement is superseded

- **WHEN** reviewing the change history
- **THEN** this requirement SHALL be considered superseded by `blockage-detection` and `keyword-followup`

### Requirement: Passive guideline covers difficulty and pre-response validation

The passive guideline system-prompt text SHALL be removed and replaced by active blockage detection.

**Reason**: Static system-prompt text is too generic. Replaced by active blockage detection.
**Migration**: Remove the `before_agent_start` handler that appended the passive guideline.

#### Scenario: Requirement is superseded

- **WHEN** reviewing the change history
- **THEN** this requirement SHALL be considered superseded by active blockage detection

### Requirement: Active hint is injected at turn_end after the first threshold is reached

The volume-based threshold system SHALL be removed and the `turn_end` hint logic SHALL no longer be used.

**Reason**: Volume-based thresholds don't detect actual stuckness. Replaced by error-rate-based blockage detection.
**Migration**: Remove `turn_end` tool-call counting logic. Use the new sliding-window bash error detection instead.

#### Scenario: Requirement is superseded

- **WHEN** reviewing the change history
- **THEN** this requirement SHALL be considered superseded by error-rate-based blockage detection

### Requirement: Active hint repeats at later threshold multiples with escalating wording

The escalating hint wording SHALL be removed. The blockage steer SHALL be a fixed one-shot message per episode.

**Reason**: Escalation removed by design — the new blockage steer is one-shot per episode.
**Migration**: No replacement for escalation. The blockage steer is fixed, non-escalating.

#### Scenario: Requirement is superseded

- **WHEN** reviewing the change history
- **THEN** this requirement SHALL be considered superseded by the one-shot blockage steer design

### Requirement: TUI notification shown with warning severity

The TUI notification SHALL be removed. Hints SHALL use `pi.sendMessage` with `display: true` instead.

**Reason**: Hints are now session-visible only. TUI notifications removed by design.
**Migration**: Remove `ctx.ui.notify` calls. Hints use `pi.sendMessage` with `display: true`.

#### Scenario: Requirement is superseded

- **WHEN** reviewing the change history
- **THEN** this requirement SHALL be considered superseded by session-visible messages
