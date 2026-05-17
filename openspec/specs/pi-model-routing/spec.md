# pi-model-routing Specification

## Purpose

Configure Pi's active model automatically for session defaults and selected slash-prompt workflows.

## Requirements

### Requirement: Default session model routing

The system SHALL attempt to activate the configured default model and thinking level when a Pi session starts for startup, new, resume, or fork reasons.

#### Scenario: Startup session begins

- **WHEN** Pi emits `session_start` with reason `startup`
- **THEN** the system attempts to activate the configured default model and thinking level

#### Scenario: New session begins

- **WHEN** Pi emits `session_start` with reason `new`
- **THEN** the system attempts to activate the configured default model and thinking level

#### Scenario: Existing session resumes

- **WHEN** Pi emits `session_start` with reason `resume`
- **THEN** the system attempts to activate the configured default model and thinking level

#### Scenario: Forked session begins

- **WHEN** Pi emits `session_start` with reason `fork`
- **THEN** the system attempts to activate the configured default model and thinking level

#### Scenario: Extension runtime reloads

- **WHEN** Pi emits `session_start` with reason `reload`
- **THEN** the system does not apply the default model route

### Requirement: Default model routing failure notification

The system SHALL notify the user with a warning when the configured default model cannot be activated.

#### Scenario: Default model activation fails

- **WHEN** the system cannot activate the configured default model
- **THEN** the system leaves the current model and thinking level unchanged
- **AND** the system shows a warning notification in the Pi UI

### Requirement: Exact slash-command model routing

The system SHALL apply temporary model routing when the first whitespace-delimited token in user input matches a configured slash command exactly, ignoring surrounding whitespace.

#### Scenario: Configured slash command matches exactly

- **WHEN** the user submits input that is the configured slash command with optional surrounding whitespace
- **THEN** the system applies that command's routing behavior before prompt-template expansion

#### Scenario: Slash command has additional arguments

- **WHEN** the user submits input whose first whitespace-delimited token is the configured slash command and whose remaining text contains arguments
- **THEN** the system applies that command's routing behavior before prompt-template expansion

#### Scenario: Slash command name is only a prefix

- **WHEN** the user submits a different slash command whose first whitespace-delimited token starts with the configured command name but is not exactly equal to it
- **THEN** the system does not apply routing behavior

#### Scenario: Extension-injected input matches a route

- **WHEN** an extension-injected input starts with a configured slash command
- **THEN** the system does not apply temporary model routing

### Requirement: Temporary model and thinking routing

For a routed slash command, the system SHALL capture the current model and thinking level, attempt to activate the command's configured model, and apply the command's configured thinking level only if the configured model activates successfully.

#### Scenario: Routed model activates successfully

- **WHEN** a routed slash command is submitted and its configured model can be activated
- **THEN** the system uses the command's configured model and thinking level for that prompt execution

#### Scenario: Routed model cannot be activated

- **WHEN** a routed slash command is submitted and its configured model cannot be activated
- **THEN** the system leaves the current model and thinking level unchanged and continues processing the prompt

### Requirement: Temporary routing failure notification

The system SHALL notify the user with a warning when a routed slash command's configured model cannot be activated.

#### Scenario: Routed model activation fails

- **WHEN** the system cannot activate the configured model for a routed slash command
- **THEN** the system shows a warning notification in the Pi UI

### Requirement: State restoration after temporary route

After a temporarily routed slash command finishes, the system SHALL restore the model and thinking level that were active before routing began.

#### Scenario: Routed slash command completes

- **WHEN** a routed slash command reaches the end of its agent execution
- **THEN** the system restores the previously captured model and thinking level

#### Scenario: User state changes during routed slash command

- **WHEN** the active model or thinking level changes while a routed slash command is executing
- **THEN** the system still restores the model and thinking level captured before routing began
