## Why

The installer currently replaces symlinked parent directories while preparing granular dotfile targets, but the recursive behavior can remove unrelated ancestor symlinks such as `~/.config`. Dotfile installation should preserve user-owned filesystem structure outside the specific target being managed.

## What Changes

- Constrain parent-directory symlink replacement so only the immediate parent needed for a link migration can be replaced.
- Preserve ancestor symlinks above the immediate target parent instead of deleting and recreating them.
- Add regression coverage for homes where an ancestor such as `~/.config` is itself a symlink.
- Keep support for migrating an existing repo-backed directory symlink, such as `~/.config/opencode`, into a real directory containing granular links.

## Capabilities

### New Capabilities

- `safe-parent-directory-migration`: Rules for preparing target parent directories without removing unmanaged ancestor symlinks.

### Modified Capabilities

- `generic-dotfiles`: Clarify safe replacement behavior for parent-directory symlink migration during manifest-driven linking.

## Impact

- Affects `src/linker.ts` parent directory preparation before symlink creation.
- Affects installer regression tests for existing symlinked directories.
- No manifest format changes, runtime dependency changes, or CLI contract changes.
