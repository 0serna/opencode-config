## 1. Migrate the managed agent directory

- [x] 1.1 Create `dotfiles/agents/skills/` and copy the current global skill directories from `~/.agents/skills/` into the repository.
- [x] 1.2 Add a `dotfiles.json` manifest entry mapping `dotfiles/agents` to `~/.agents`.

## 2. Document the repo-backed workflow

- [x] 2.1 Update repository documentation to explain that `~/.agents` is now repo-backed and that `skills.sh` global operations will write into tracked files.
- [x] 2.2 Document the migration expectation for existing `~/.agents` content and the initial scope of the managed `skills/` subtree.

## 3. Verify the linked global skills flow

- [x] 3.1 Re-run the dotfiles linker and confirm that `~/.agents` points to the repository-managed `dotfiles/agents` directory.
- [x] 3.2 Verify that global skills remain visible through `npx skills list -g --json` and that the reported paths resolve through the linked `~/.agents/skills` tree.
