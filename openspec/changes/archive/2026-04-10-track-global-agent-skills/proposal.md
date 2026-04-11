## Why

Global skills installed through `skills.sh` currently live outside this repository, so they are not captured by the existing dotfiles workflow. Bringing that state under the repo makes global agent skills reproducible on a new machine and keeps `skills.sh` changes visible to Git immediately.

## What Changes

- Add a repo-backed `dotfiles/agents/skills/` tree for globally managed agent skills.
- Link `dotfiles/agents` to `~/.agents` through the root `dotfiles.json` manifest.
- Migrate the current global skill content into the managed `dotfiles/agents/skills/` layout.
- Update documentation to explain that `skills.sh` will write into the repo-backed `~/.agents/skills` tree.

## Capabilities

### New Capabilities
- `agent-home-directory`: manage the global `~/.agents` directory from this repository, starting with `skills/` as the initial tracked subtree.

### Modified Capabilities
- `generic-dotfiles`: the shipped dotfiles set will now include a manifest entry for `~/.agents` in addition to the existing OpenCode configuration.

## Impact

- `dotfiles.json`
- `dotfiles/agents/skills/**`
- Documentation for setup and expected `skills.sh` workflow
- Existing machine state under `~/.agents/skills`
