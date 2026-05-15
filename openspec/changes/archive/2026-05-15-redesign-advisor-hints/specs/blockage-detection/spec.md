## ADDED Requirements

### Requirement: Detect consecutive same-command bash failures and send blockage steer

The extension SHALL track the normalized form of each bash command executed. When the same normalized command fails (non-zero exit code) two or more times consecutively, AND the blockage steer has not already been sent for this episode, the extension SHALL inject a steer message at the next `turn_end`.

Steer injection SHALL be one-shot per episode — once sent, no further blockage steers SHALL be injected until one of the following reset conditions occurs:

- The same command succeeds (exit code 0), resetting the consecutive failure counter
- The `advisor` tool is called, resetting all blockage state
- A new agent turn starts (`agent_start`), resetting all blockage state

The steer SHALL use `pi.sendMessage` with `customType: "advisor-blockage"` and `display: true` to make it visible in the session. The message SHALL be delivered as a `"steer"` (queued between turns, before the next LLM call).

Command normalization SHALL:

1. Extract the first segment before any pipe (`|`), chain (`&&`, `||`), or separator (`;`, `&`)
2. Remove path-like tokens (contain `/`), flags and their values (`--flag value` or `--flag=value`), short flags (`-abc`), shell redirects and operators (`2>&1`, `>`, `>>`, `<`, `&>`, `|&`), and dot-prefixed relative paths (`.`, `..`)
3. Compare the remaining tokens as a joined string

The steer message text SHALL be hardcoded and not include the specific command or error count.

#### Scenario: Steer injected at turn_end after 2 consecutive failures of the same command

- **WHEN** the agent executes a bash command that fails (non-zero exit code)
- **AND** the same normalized command had already failed once before (the immediately preceding bash call with the same normalized result)
- **AND** the agent completes its turn (`turn_end`)
- **AND** no blockage steer has been sent this episode
- **THEN** the extension SHALL inject a steer message via `pi.sendMessage` with `customType: "advisor-blockage"`
- **AND** the steer SHALL have `display: true`
- **AND** the steer SHALL be delivered with `deliverAs: "steer"`
- **AND** the steer message SHALL be `"It looks like you're having trouble. Use \`advisor\` for help."`

#### Scenario: No steer when command changes between failures

- **WHEN** the agent executes bash commands in sequence: `npm install` (fails), `npm test` (fails)
- **THEN** the consecutive failure counter SHALL be 1 for `npm test` (the previous command `npm install` is different)
- **AND** the extension SHALL NOT inject a blockage steer

#### Scenario: Successful command resets the counter

- **WHEN** the agent executes `npm install` (fails), `npm install` (succeeds)
- **THEN** the consecutive failure counter SHALL be reset to 0
- **AND** the extension SHALL NOT inject a blockage steer

#### Scenario: Only one steer per episode

- **WHEN** a blockage steer has already been sent this episode
- **AND** the same command subsequently fails 2 more times consecutively
- **THEN** the extension SHALL NOT inject another blockage steer

#### Scenario: Advisor tool resets blockage state

- **WHEN** the `advisor` tool is called
- **THEN** the consecutive failure counter SHALL be reset to 0
- **AND** the "steer already sent" flag SHALL be reset (steer may be sent again if failures re-accumulate)
- **AND** the extension SHALL log an `advisor` event to `~/.local/state/pi/advisor-hints.log`
- **AND** the log entry SHALL include the session identifier and whether a blockage steer had been sent prior to the advisor call

#### Scenario: New agent turn resets state

- **WHEN** a new agent turn starts (`agent_start`)
- **THEN** the consecutive failure counter SHALL be reset to 0
- **AND** the "steer already sent" flag SHALL be cleared

#### Scenario: Non-bash tools do not affect the counter

- **WHEN** a non-bash tool (e.g., `read`, `edit`, `write`, `web_search`) executes
- **THEN** the consecutive failure counter SHALL NOT change

#### Scenario: Steer delivery is logged

- **WHEN** the extension injects a blockage steer
- **THEN** the extension SHALL log a `blockage` event to `~/.local/state/pi/advisor-hints.log`
- **AND** the log entry SHALL include the session identifier, the normalized command, and the failure count

#### Scenario: Normalization handles common command variations

- **WHEN** the agent runs `npm install --force` followed by `npm install --legacy-peer-deps`
- **THEN** both SHALL normalize to `npm install`
- **AND** SHALL be treated as the same command for consecutive failure tracking

#### Scenario: Normalization handles redirects and pipes

- **WHEN** the agent runs `npm install 2>&1 | tail -20` followed by `npm install > /dev/null`
- **THEN** both SHALL normalize to `npm install`
- **AND** SHALL be treated as the same command

#### Scenario: Normalization handles compound commands

- **WHEN** the agent runs `cd /tmp && npm install`
- **THEN** the extension SHALL only consider the first segment (`cd /tmp`)
- **AND** SHALL normalize it to `cd`

### Requirement: Blockage steer uses a configured threshold

The consecutive failure threshold SHALL be defined as a module-level constant.

#### Scenario: Threshold is hardcoded

- **WHEN** the extension is loaded
- **THEN** the consecutive failure threshold SHALL default to 2
