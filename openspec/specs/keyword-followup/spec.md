# keyword-followup Specification

## Purpose

The keyword-followup capability detects configured keywords in the user's prompt and sends a follow-up user message at agent_end to prompt validation of completed work.

## Requirements

### Requirement: Detect keywords in user prompt

The extension SHALL check the user's raw input text against a configured set of keywords. Keywords SHALL be defined as a module-level array of strings. The check SHALL occur at the `input` event, using `event.text` as the source text. Messages with `event.source === "extension"` SHALL be skipped to avoid self-triggering.

If at least one keyword is found as a substring of the input text, the extension SHALL record that a follow-up is needed. If no keyword matches, no follow-up SHALL be recorded.

#### Scenario: Keyword detected in user input

- **WHEN** the user submits input
- **AND** the input text contains one of the configured keywords (e.g., `opsx-propose`) as a substring
- **AND** `event.source` is NOT `"extension"`
- **THEN** the extension SHALL record that a follow-up message is needed at `agent_end`

#### Scenario: No keyword in user input

- **WHEN** the user submits input
- **AND** the input text does NOT contain any configured keyword
- **THEN** the extension SHALL NOT record a follow-up

#### Scenario: Extension-generated input is skipped

- **WHEN** the `input` event fires with `event.source === "extension"`
- **THEN** the extension SHALL NOT check for keywords
- **AND** SHALL NOT record a follow-up

#### Scenario: Multiple keyword matches produce one follow-up

- **WHEN** the user input contains multiple configured keywords
- **THEN** the extension SHALL record exactly one follow-up (not one per keyword)

#### Scenario: Keywords are configured as module-level constants

- **WHEN** the extension is loaded
- **THEN** the default keywords SHALL be `["opsx-propose", "opsx-apply"]`

### Requirement: Send follow-up user message at agent_end

When a keyword was detected in the user prompt, the extension SHALL send a user message at `agent_end`. The message SHALL be sent via `pi.sendUserMessage()` with `deliverAs: "followUp"` because the agent is still in a processing state at `agent_end`. The follow-up SHALL be delivered once the agent finishes all work.

#### Scenario: Follow-up sent after agent completes

- **WHEN** the agent finishes processing (`agent_end`)
- **AND** a keyword was detected in the user prompt
- **THEN** the extension SHALL call `pi.sendUserMessage` with the follow-up text and `{ deliverAs: "followUp" }`
- **AND** the follow-up SHALL be queued until the agent finishes its current cycle
- **AND** the follow-up SHALL trigger a new agent turn

#### Scenario: No follow-up when no keyword matched

- **WHEN** the agent finishes processing (`agent_end`)
- **AND** no keyword was detected in the user prompt
- **THEN** the extension SHALL NOT send any follow-up message

#### Scenario: Follow-up delivery is logged

- **WHEN** the extension calls `pi.sendUserMessage` with the follow-up text
- **THEN** the extension SHALL log a `followup-sent` event to `~/.local/state/pi/advisor-hints.log`
- **AND** the log entry SHALL include the session identifier

#### Scenario: Follow-up text is configured

- **WHEN** the follow-up is sent
- **THEN** the message text SHALL be `"validate the work done so far with \`advisor\`"`

### Requirement: Keyword detection is logged

When a keyword is detected, the extension SHALL log the event for diagnostic purposes.

#### Scenario: Keyword match logged

- **WHEN** a keyword is detected in the user prompt
- **THEN** the extension SHALL log a `keyword-match` event to `~/.local/state/pi/advisor-hints.log`
- **AND** the log entry SHALL include the session identifier and the matched keyword
