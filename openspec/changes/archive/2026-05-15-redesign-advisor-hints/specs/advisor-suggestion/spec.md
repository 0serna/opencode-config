# advisor-suggestion Specification — Delta

## MODIFIED Requirements

### Requirement: Extension suggests advisor after substantial work

When the agent has done substantial work, the extension SHALL suggest using `advisor`.

The suggestion SHALL operate at two levels:

1. A passive guideline appended to the system prompt at the start of each user prompt
2. Active steer messages injected via `pi.sendMessage` with `customType: "advisor-hint"` at `turn_end` whenever counted tool calls reach another multiple of `TOOL_CALL_THRESHOLD` and `advisor` was not called in that turn

The hint message SHALL use a custom message type rather than a user message, to avoid polluting the conversation history.

The extension SHALL track the following turn-level state:

- Total calls to `bash`, `read`, `edit`, or `write` since the last `advisor` call (other tools are not counted)
- The next tool-call threshold at which a `turn_end` hint should fire
- Whether the `advisor` tool was called during the current turn

The extension SHALL gate `turn_end` hints on:

- The `advisor` tool was NOT called during the current turn
- The counted tool total meets or exceeds the next threshold multiple of `TOOL_CALL_THRESHOLD`

The extension SHALL only count `bash`, `read`, `edit`, and `write` tool calls toward the threshold. Other tools (`web_search`, `web_fetch`, `question`, `advisor`, etc.) SHALL NOT increment the counter.

The extension SHALL reset the counted tool total and next threshold progression when `advisor` is used, so that work already reviewed via advisor does not immediately re-trigger a `turn_end` hint.

The extension SHALL NOT use cooldown or debounce logic. Hints are never suppressed based on timing of previous hints or advisor usage.

All thresholds SHALL be defined as module-level constants.

The extension SHALL deliver active hints **without** `triggerTurn` — hints SHALL be added to the conversation context without forcing an extra model turn.

#### Scenario: Tool counter resets at each new prompt

- **WHEN** a new prompt begins processing (`agent_start`)
- **THEN** the counted tool total SHALL be reset to `0`
- **AND** the next hint threshold SHALL be reset to `TOOL_CALL_THRESHOLD`

#### Scenario: Passive guideline covers difficulty and pre-response validation

- **WHEN** a user prompt begins processing
- **THEN** the system prompt SHALL include a guideline stating that if the agent is having difficulty it should use `advisor` to escalate
- **AND** the guideline SHALL also state that before responding to the user, the agent should consider whether the work is important enough to validate with `advisor` first

#### Scenario: Active hint is injected at turn_end after the first threshold is reached

- **WHEN** the agent completes a turn
- **AND** counted tool calls since the last `advisor` use meet or exceed `TOOL_CALL_THRESHOLD`
- **AND** the `advisor` tool was NOT called during that turn
- **THEN** the extension SHALL inject a steer message via `pi.sendMessage`
- **AND** the steer message SHALL NOT set `triggerTurn`

#### Scenario: Active hint repeats at later threshold multiples with escalating wording

- **WHEN** the agent continues working without using `advisor`
- **AND** counted tool calls later reach another multiple of `TOOL_CALL_THRESHOLD`
- **THEN** the extension SHALL inject another `turn_end` hint
- **AND** the hint wording SHALL escalate based on how many hints have been injected since the last `advisor` call:
  - **Level 1** (first hint): gentle reminder to consider using `advisor` before responding
  - **Level 2** (second hint): reinforced statement that work should be validated
  - **Level 3+** (third and subsequent hints): firm instruction using mandatory language

#### Scenario: Turn_end hint is suppressed when advisor was called this turn

- **WHEN** the agent completes a turn
- **AND** the `advisor` tool was called during that turn
- **THEN** the extension SHALL NOT inject a steer message at `turn_end`

#### Scenario: TUI notification shown with warning severity

- **WHEN** the extension injects a `turn_end` hint
- **THEN** the extension SHALL display a notification via `ctx.ui.notify`
- **AND** the notification severity SHALL be `warning` regardless of how many hints have been injected

#### Scenario: Advisor usage is logged

- **WHEN** the agent calls the `advisor` tool
- **THEN** the extension SHALL log an `advisor` event to `~/.local/state/pi/advisor-hints.log`
- **AND** the log entry SHALL include `sessionId` and `toolCalls` (before reset) in JSON format

#### Scenario: Advisor usage resets threshold progression

- **WHEN** the agent calls the `advisor` tool
- **THEN** the counted tool total SHALL be reset to `0`
- **AND** the next hint threshold SHALL be reset to `TOOL_CALL_THRESHOLD`

#### Scenario: Hint delivery is logged

- **WHEN** the extension injects a `turn_end` steer message
- **THEN** the extension SHALL log a `hint` event to `~/.local/state/pi/advisor-hints.log`
- **AND** the log entry SHALL include `sessionId` and `toolCalls` in JSON format

#### Scenario: Log file rotation

- **GIVEN** the log file exceeds 2000 lines
- **WHEN** the extension appends a new event
- **THEN** the extension SHALL truncate the file to the most recent 2000 lines

#### Scenario: Logging never blocks hint delivery

- **GIVEN** file system is unwritable (permissions, full disk, etc.)
- **WHEN** the extension tries to log an event
- **THEN** the extension SHALL silently ignore the error
- **AND** the hint SHALL still be injected

## ADDED Requirements

_(No new capabilities — all changes are modifications of existing requirements.)_

## REMOVED Requirements

_(No standalone requirements removed — scenario removed via MODIFIED requirement replacement)_
