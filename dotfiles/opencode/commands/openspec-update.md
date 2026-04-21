---
description: Update OpenSpec to the latest version
---

## Task

1. Run `npm install -g @fission-ai/openspec@latest` from the repo root.
2. Run `openspec init --tools opencode` from the repo root.
3. The command will create a `.opencode` directory with updated commands and skills.
4. Copy or replace all files from `.opencode/commands/` into `dotfiles/opencode/commands/`. Create the target directory if it doesn't exist.
5. Copy or replace all skill directories from `.opencode/skills/` into `dotfiles/agents/skills/`. Create the target directory if it doesn't exist.
6. Verify the copy by listing both source and target directories — file counts should match.
7. Delete the `.opencode` directory created at the repo root when finished.
