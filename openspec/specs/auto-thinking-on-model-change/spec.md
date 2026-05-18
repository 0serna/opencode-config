# auto-thinking-on-model-change Specification

## Purpose

TBD - created by archiving change auto-thinking-on-model-change. Update Purpose after archive.

## Requirements

### Requirement: Auto-set thinking level on manual model change

When the user manually changes the active model, the system SHALL automatically set the thinking level to "medium" (or the closest level the model supports).

#### Scenario: User sets model via /model command

- **WHEN** the user submits `/model <provider>/<id>` and the model activates successfully
- **THEN** the system sets the thinking level to `"medium"`, clamped to the closest level the model supports

#### Scenario: User cycles model via Ctrl+P

- **WHEN** the user cycles to the next or previous model and the model activates successfully
- **THEN** the system sets the thinking level to `"medium"`, clamped to the closest level the model supports

#### Scenario: Model supports "medium" thinking level

- **WHEN** the newly selected model supports the `"medium"` thinking level
- **THEN** the thinking level is set to `"medium"`

#### Scenario: Model does not support "medium" thinking level

- **WHEN** the newly selected model does not support the `"medium"` thinking level
- **THEN** the thinking level is set to the closest supported level below `"medium"`, or `"off"` if the model does not support any reasoning level

#### Scenario: Model does not support reasoning

- **WHEN** the newly selected model has `reasoning: false`
- **THEN** the thinking level is set to `"off"`

### Requirement: No auto-set during session restore

The system SHALL NOT auto-set the thinking level when the model changes during session restore.

#### Scenario: Model restored from session

- **WHEN** a session is restored and the model is loaded from session state
- **THEN** the system does not modify the thinking level (existing session start routing applies instead)

### Requirement: Slash command routes override auto-set thinking level

When a recognized slash command route is active, the route's configured thinking level SHALL take precedence over the auto-set "medium" level.

#### Scenario: Slash command route activates after manual model change

- **WHEN** the user submits a slash command that triggers a model route after a manual model change
- **THEN** the system uses the route's configured thinking level, not the auto-set level

#### Scenario: User manually changes model during slash command route

- **WHEN** the user manually changes the model while a slash command route is active
- **THEN** the system sets the thinking level to `"medium"` for the new model
- **AND** the route's previous model and thinking level are still restored when the route completes
