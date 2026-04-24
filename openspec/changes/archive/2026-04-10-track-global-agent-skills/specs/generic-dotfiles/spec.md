## ADDED Requirements

### Requirement: Default manifest includes the managed agent home directory

The shipped root `dotfiles.json` manifest SHALL include an entry mapping `dotfiles/agents` to `~/.agents`.

#### Scenario: Read the default repository manifest

- **WHEN** the repository root `dotfiles.json` file is read
- **THEN** it contains an entry with `source` set to `dotfiles/agents` and `target` set to `~/.agents`
