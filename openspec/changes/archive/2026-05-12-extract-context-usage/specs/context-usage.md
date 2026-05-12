# context-usage Specification

## Overview

This spec describes the `context-usage` extension, which reports current context-window occupancy and prompt-side cache reuse as a combined extension status. The external display behavior is specified by `pi-footer-token-metrics`; this spec documents the extension's internal contract.

## Requirements

### Requirement: Extension publishes context usage and cache hit as a combined status

The context-usage extension SHALL compute current context-window occupancy and cumulative prompt-side cache reuse on relevant session events, and publish them as a single styled status string via `ctx.ui.setStatus("context-usage", ...)`.

#### Scenario: Status published on session_start

- **WHEN** a session starts
- **THEN** the extension computes context usage and cache hit and calls `ctx.ui.setStatus("context-usage", <combined-styled-string>)`

#### Scenario: Status published on turn_end

- **WHEN** an agent turn ends (new assistant message available)
- **THEN** the extension recomputes context usage and cache hit and calls `ctx.ui.setStatus("context-usage", <combined-styled-string>)`

#### Scenario: Status published on model_select

- **WHEN** the active model changes
- **THEN** the extension recomputes context usage and calls `ctx.ui.setStatus("context-usage", <combined-styled-string>)`

### Requirement: Status string combines context and cache values

The combined status string SHALL include both context-window occupancy and cache hit percentage, formatted consistently with the existing `pi-footer-token-metrics` spec requirements.

#### Scenario: Both values available

- **WHEN** context usage and cache hit percentage are both computable
- **THEN** the status string includes both values

#### Scenario: Cache percentage unknown

- **WHEN** cache hit percentage cannot be computed (no prompt-side input tokens)
- **THEN** the status string omits or indicates unknown cache percentage
- **AND** context usage is still displayed when available

### Requirement: Status string uses theme-based styling

The extension SHALL apply theme-based styling to the status string: normal colors when context usage is within typical bounds, and warning colors when usage exceeds a configured threshold.

#### Scenario: Context usage above warning threshold

- **WHEN** current context usage exceeds the warning threshold
- **THEN** the context usage portion of the status string SHALL use warning styling (`mdHeading` theme color)

#### Scenario: Context usage at or below warning threshold

- **WHEN** current context usage is at or below the warning threshold
- **THEN** the context usage portion of the status string SHALL use normal styling (`dim` theme color)
