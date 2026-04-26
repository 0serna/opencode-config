## Context

The manifest now links OpenCode entries granularly under `~/.config/opencode` instead of linking the entire `dotfiles/opencode` directory. That requires migrating an existing `~/.config/opencode` symlink into a real directory so child entries like `opencode.jsonc` and `commands` can be linked individually.

The current helper recursively prepares every ancestor of the target parent and removes any symlink it encounters. For a target such as `~/.config/opencode/opencode.jsonc`, that means an unrelated symlink at `~/.config` can be removed even though it is outside the managed OpenCode directory.

## Goals / Non-Goals

**Goals:**

- Preserve existing support for replacing a repo-backed immediate parent symlink during granular link migration.
- Prevent deletion or replacement of symlinked ancestors above the immediate parent directory being prepared.
- Fail safely rather than removing a symlinked immediate parent that does not represent a repo-managed migration.
- Cover the ancestor-symlink case with regression tests.

**Non-Goals:**

- Redesign the manifest format or add explicit ownership metadata.
- Infer common managed roots across the entire manifest.
- Preserve arbitrary existing files at the final target path; existing safe targets remain replaceable.

## Decisions

- Prepare ancestors with normal directory creation, and only inspect the immediate parent of the target path for symlink migration. This keeps the migration focused on the directory that must become real before the target symlink can be created.
- Replace an immediate parent symlink only when it resolves inside the repository. This preserves the intended migration from `~/.config/opencode -> <repo>/dotfiles/opencode` while avoiding deletion of user-managed symlinks that point elsewhere.
- Treat a non-repo immediate parent symlink as a linking error. Failing the install is safer than silently deleting an external config mount or shared directory.
- Keep the final target replacement behavior unchanged after parent preparation succeeds. The existing manifest contract already allows replacing the declared target path.

## Risks / Trade-offs

- Existing users with `~/.config/opencode` symlinked to a non-repo directory will see installation fail instead of auto-converting it. Mitigation: the failure preserves data and gives the user a chance to move or remove that directory intentionally.
- Checking whether a symlink resolves inside the repo relies on `realpath` semantics and the symlink target existing. Mitigation: broken or unresolvable parent symlinks should fail instead of being removed automatically.
- This does not solve broader ownership modeling for all possible nested dotfile trees. Mitigation: keep this fix narrow and revisit manifest ownership only if future migrations need it.
