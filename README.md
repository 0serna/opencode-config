# Dotfiles

Generic dotfiles repository for agents and tools. The `dotfiles.json` manifest links repo files into system locations.

## Commands

```
npm run link        # Link dotfiles
npm run check       # Lint and format check
npm run format      # Format code
npm run typecheck   # Type checking
npm test            # Test suite
```

## Structure

```
./
├── dotfiles.json               # Manifest
├── dotfiles/
│   ├── agents/                 # Repo-backed ~/.agents tree
│   │   └── skills/             # Global skills managed by skills.sh
│   └── opencode/               # OpenCode config, commands, rules, skills
├── src/
│   └── dotfiles-installer.ts   # Linker script
└── ...
```

`~/.agents` is linked to `dotfiles/agents`, so global `skills.sh` operations update tracked files in this repository. For now, only `skills/` is managed under that tree.
