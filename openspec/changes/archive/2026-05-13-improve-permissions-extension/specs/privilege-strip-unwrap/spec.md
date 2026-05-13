## ADDED Requirements

### Requirement: Strip privilege-escalation prefixes in shell-wrapper detection

The `extractShellWrappedCommand` function MUST strip `sudo`, `doas`, and `pkexec` prefixes (and any trailing whitespace) from the segment string before attempting to match the shell-wrapper regex pattern. This unwrapping MUST NOT affect other detection paths: the global `STRIP_RE` and `isSensitiveSystemSegment` MUST still see the unmodified segment with the privilege keyword intact.

The privilege-stripping regex `PRIVILEGE_RE` MUST be scoped to `extractShellWrappedCommand` alone.

#### Scenario: sudo bash -c extracts inner command

- **WHEN** the agent executes `sudo bash -c "git push --force origin main"`
- **THEN** `extractShellWrappedCommand` SHALL strip `sudo ` from the start, detect the `bash -c` wrapper, and extract `git push --force origin main` for recursive sensitivity checking

#### Scenario: Nested git push after sudo unwrap yields git-specific reason

- **WHEN** the agent executes `sudo bash -c "git push --force origin main"`
- **THEN** the extension SHALL block with the git-specific reason about force-push, not "sudo escalates privileges"

#### Scenario: Bare sudo still caught by system rules

- **WHEN** the agent executes `sudo rm -rf /tmp`
- **THEN** the extension SHALL block; the `isSensitiveSystemSegment` MUST see the unmodified string containing `sudo` (which has NOT been stripped by `PRIVILEGE_RE` since `extractShellWrappedCommand` is only invoked by `checkWrappedSegment`)

#### Scenario: Privilege stripping does not interfere with non-wrapped commands

- **WHEN** the agent executes `sudo apt update`
- **THEN** the extension SHALL block with the `sudo` pattern reason, because the command does NOT match a shell-wrapper pattern after privilege stripping (there is no `bash -c`), so the system check catches the bare `sudo`
