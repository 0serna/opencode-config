## ADDED Requirements

### Requirement: Exact prompt routing

The system SHALL apply prompt routing when the first whitespace-delimited token in user input matches a configured slash prompt exactly, ignoring surrounding whitespace.

#### Scenario: Configured prompt matches exactly

- **WHEN** the user submits input that is the configured slash prompt with optional surrounding whitespace
- **THEN** the system applies that prompt's routing behavior before prompt-template expansion

#### Scenario: Prompt has additional arguments

- **WHEN** the user submits input whose first whitespace-delimited token is the configured slash prompt and whose remaining text contains arguments
- **THEN** the system applies that prompt's routing behavior before prompt-template expansion

#### Scenario: Prompt name is only a prefix

- **WHEN** the user submits a different slash command whose first whitespace-delimited token starts with the configured prompt name but is not exactly equal to it
- **THEN** the system does not apply that prompt's routing behavior

### Requirement: Temporary model and thinking routing

For a routed prompt, the system SHALL capture the current model and thinking level, attempt to activate the prompt's configured model, and apply the prompt's configured thinking level only if the configured model activates successfully.

#### Scenario: Routed model activates successfully

- **WHEN** a routed prompt is submitted and its configured model can be activated
- **THEN** the system uses the prompt's configured model and thinking level for that prompt execution

#### Scenario: Routed model cannot be activated

- **WHEN** a routed prompt is submitted and its configured model cannot be activated
- **THEN** the system leaves the current model and thinking level unchanged and continues processing the prompt

### Requirement: Routing failure notification

The system SHALL notify the user with a warning when a routed prompt's configured model cannot be activated.

#### Scenario: Model activation fails

- **WHEN** the system cannot activate the configured model for a routed prompt
- **THEN** the system shows a warning notification in the Pi UI

### Requirement: State restoration after routed prompt

After a routed prompt finishes, the system SHALL restore the model and thinking level that were active before routing began.

#### Scenario: Routed prompt completes

- **WHEN** a routed prompt reaches the end of its agent execution
- **THEN** the system restores the previously captured model and thinking level

#### Scenario: User state changes during routed prompt

- **WHEN** the active model or thinking level changes while a routed prompt is executing
- **THEN** the system still restores the model and thinking level captured before routing began
