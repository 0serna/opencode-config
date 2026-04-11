## Context

This repository already manages OpenCode configuration through a manifest-driven symlink installer, but global `skills.sh` content still lives under `~/.agents/skills` outside the repo. The desired workflow is for `skills.sh` to keep operating normally while any global skill add, remove, or update is immediately reflected in Git through a repo-backed `~/.agents` directory.

The existing installer already supports linking arbitrary repo directories into absolute system paths, so this change is primarily about repository layout, manifest entries, and migration of current skill content. The main constraint is ownership: once `~/.agents` is linked into the repo, that path becomes managed state and any tool writing there is effectively writing into the repository.

## Goals / Non-Goals

**Goals:**
- Make global agent skills reproducible on a new machine through the existing dotfiles workflow.
- Preserve the current `skills.sh` workflow so global skill changes continue to be made with the CLI.
- Establish `dotfiles/agents` as the repo-backed home for `~/.agents`.
- Keep the first version narrowly scoped to the `skills/` subtree.

**Non-Goals:**
- Track `skills.sh` lockfiles, metadata, or package provenance in this change.
- Add new installer features or change the symlink validation model.
- Automatically migrate every possible future `~/.agents/*` subtree.
- Introduce bidirectional sync logic beyond the shared symlinked filesystem path.

## Decisions

### 1. Link the `~/.agents` root, not only `~/.agents/skills`
The manifest will map `dotfiles/agents` to `~/.agents`.

Rationale: a single root mapping makes the repository the source of truth for the agent home directory and leaves room for future subdirectories such as `commands/` without changing the base structure again.

Alternatives considered:
- Link only `~/.agents/skills`. Rejected because it creates split ownership inside `~/.agents` and forces another structural change when a second subtree needs tracking.

### 2. Scope the initial managed content to `skills/`
The repository will add `dotfiles/agents/skills/` and migrate only the current global skill directories there.

Rationale: this solves the immediate reproducibility problem without forcing decisions about future `~/.agents` content.

Alternatives considered:
- Mirror every current or hypothetical `~/.agents` subtree immediately. Rejected because the user only needs `skills/` now and broader capture would add noise.

### 3. Treat the repository as the persisted backing store after migration
After linking, `skills.sh` will continue to manage global skills through `~/.agents/skills`, but the underlying files will live under `dotfiles/agents/skills` in the repo.

Rationale: this preserves the existing operational workflow while making file changes visible to Git without extra export or sync steps.

Alternatives considered:
- Keep `~/.agents/skills` outside the repo and add a separate sync process. Rejected because it duplicates state and breaks the immediate-feedback goal.

### 4. Reuse the existing generic dotfiles installer unchanged
The change will be implemented through new repo content and a new manifest entry rather than installer logic changes.

Rationale: the current manifest and linker already support linking a repo directory to `~/.agents` safely.

Alternatives considered:
- Add special handling for `skills.sh` paths in the installer. Rejected because there is no technical need and it would make the generic linker less generic.

## Risks / Trade-offs

- [Existing unmanaged files under `~/.agents` could be replaced] -> Migrate only after reviewing current contents and, if needed, backing them up before linking.
- [Tools may behave differently with a symlinked `~/.agents`] -> Verify the existing `skills.sh` commands still work against the linked path after migration.
- [Future `~/.agents/*` subtrees may start appearing in Git automatically] -> Accept this as the intended ownership model and refine ignores later only if new tool-generated noise appears.
- [Users may assume `skills.sh` owns storage outside the repo] -> Document clearly that the repo-backed symlink becomes the canonical global storage location.

## Migration Plan

1. Create `dotfiles/agents/skills/` in the repository.
2. Copy the current global skill directories from `~/.agents/skills/` into that repo path.
3. Add a manifest entry mapping `dotfiles/agents` to `~/.agents`.
4. Re-run the dotfiles linker so `~/.agents` points at the repo-backed directory.
5. Verify that global skill listing still works and that future `skills.sh` updates modify repo files.

Rollback: remove the `~/.agents` manifest entry, restore `~/.agents` from a backup if one was taken, and move the skills back out of the repo if the linked ownership model proves problematic.

## Open Questions

- None for implementation. A follow-up change can decide whether to track `skills.sh` lockfiles or other `~/.agents` subtrees.
