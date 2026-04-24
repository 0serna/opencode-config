## ADDED Requirements

### Requirement: Repository manages the global agent home directory

The repository SHALL store managed global agent state under `dotfiles/agents` and link that directory to `~/.agents` through the root manifest.

#### Scenario: Install the repo-backed agent home directory

- **WHEN** the dotfiles installer processes the repository manifest
- **THEN** it creates a symlink from `~/.agents` to the managed `dotfiles/agents` directory

### Requirement: Global skills are restored from the managed agent directory

The repository SHALL include a `dotfiles/agents/skills` subtree containing the global skill definitions that should exist under `~/.agents/skills` after setup.

#### Scenario: Restore global skills on a new machine

- **WHEN** the user links dotfiles on a machine without an existing `~/.agents/skills` directory
- **THEN** the resulting `~/.agents/skills` path exposes the skill definitions stored under `dotfiles/agents/skills`

#### Scenario: Manage skills through the linked global path

- **WHEN** `skills.sh` adds or updates a global skill after `~/.agents` has been linked to the repository
- **THEN** the resulting file changes appear under `dotfiles/agents/skills` through the shared filesystem path
