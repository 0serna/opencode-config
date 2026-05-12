## ADDED Requirements

### Requirement: Pi footer displays compact Codex quota headroom

The Pi footer SHALL display Codex quota headroom in a compact status string that includes remaining five-hour quota, remaining seven-day quota, and remaining credits when those values are available.

#### Scenario: All Codex quota values are available

- **WHEN** the system has current Codex quota data for remaining five-hour quota, remaining seven-day quota, and remaining credits
- **THEN** the footer displays all three values in one compact Codex status string
- **AND** the string labels the quota windows as `5h` and `7d`
- **AND** the string labels credits as `cr`

#### Scenario: Credits are unavailable

- **WHEN** the system has current Codex quota data for remaining five-hour quota and remaining seven-day quota but no current remaining credits value
- **THEN** the footer still displays a compact Codex status string
- **AND** the string omits the credits segment rather than displaying a monetary placeholder or invented zero value

#### Scenario: One quota window is unavailable

- **WHEN** the system has current Codex quota data for only one of the quota windows or credits
- **THEN** the footer displays the currently available Codex values in compact form
- **AND** the string omits unavailable segments rather than expanding into verbose error text

### Requirement: Codex quota footer uses remaining values

The Pi footer SHALL represent Codex quota windows as remaining headroom rather than used consumption, and SHALL represent credits as a remaining integer balance.

#### Scenario: Source data is expressed as percent used

- **WHEN** the source quota data for a Codex window is expressed as used percentage rather than remaining percentage
- **THEN** the footer converts that value to remaining headroom before display

#### Scenario: Credits are available as a balance

- **WHEN** the system has a current remaining credits value for Codex
- **THEN** the footer displays that value as a remaining integer balance
- **AND** the footer does not format the value as currency

### Requirement: Codex quota footer remains visible independently of active provider

The Pi footer SHALL continue to display the Codex quota status independently of which model provider is currently active.

#### Scenario: Active model is Codex

- **WHEN** the active model provider is Codex
- **THEN** the footer displays the compact Codex quota status alongside the rest of the footer information

#### Scenario: Active model is not Codex

- **WHEN** the active model provider is not Codex
- **THEN** the footer still displays the compact Codex quota status alongside the rest of the footer information
