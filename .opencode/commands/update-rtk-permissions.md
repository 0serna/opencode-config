---
description: Sync OpenCode bash permissions with RTK command rewrites
---

Synchronize `permission.bash` in `dotfiles/opencode/opencode.jsonc` with the commands currently rewritten by RTK. So OpenCode permission keys match the rewritten command names.

## Workflow

1. Verify that `rtk` is available in `PATH`:
   - Run `which rtk`.
   - Stop if `rtk` is not found.
2. Read `dotfiles/opencode/opencode.jsonc` and inspect only `permission.bash`.
3. For each `permission.bash` entry, decide whether it is eligible:
   - Process only string permission values: `"allow"`, `"ask"`, or `"deny"`.
   - Ignore non-string or complex permission values, such as objects, arrays, or nested configuration.
   - Ignore special/global patterns: `"*"`, `"* --help"`, and `"* --version"`.
4. For each eligible key that already starts with `rtk `:
   - Remove the leading `rtk ` to get the command probe.
   - Run `rtk rewrite "<command probe>"` and capture stdout.
   - If stdout rewrites to `rtk ...`, keep the key unchanged.
   - If stdout is empty, fails, or does not rewrite to `rtk ...`, plan to remove the `rtk ` prefix from the key.
5. For each eligible key that does not start with `rtk `:
   - If the key contains `*`, use the fixed command prefix before the first `*`, trimming trailing whitespace.
   - If the key does not contain `*`, use the full key as the command probe.
   - Examples:
     - `"git status *"` probes `"git status"`.
     - `"gh pr view *"` probes `"gh pr view"`.
     - `"gh api * POST *"` probes `"gh api"`.
     - `"curl * POST *"` probes `"curl"`.
     - `"npm * -g *"` probes `"npm"`.
   - Run `rtk rewrite "<command probe>"` and capture stdout.
   - If stdout rewrites to `rtk ...`, plan to add the `rtk ` prefix to the original key.
   - If stdout is empty, fails, or does not rewrite to `rtk ...`, leave the key unchanged and record it as no confirmed rewrite.
6. Before editing, build a change table from `old key -> new key`:
   - If the new key does not exist, replace the old key in place.
   - If the new key already exists with the same permission value, remove only the old duplicate line.
   - If the new key already exists with a different permission value, do not modify either key and report a conflict.
7. Apply only the planned key changes:
   - Replace the exact line containing `"<key>": "<value>"`.
   - Preserve inline comments, ordering, surrounding structure, and all entries outside `permission.bash`.
   - Do not add new permission entries.
8. Verify the result:
   - Do not use `JSON.parse` directly because the file is JSONC and may contain comments or trailing commas.
   - Use `prettier --check dotfiles/opencode/opencode.jsonc` or the repository's configured check command when available.

## Rules

- Use `rtk rewrite` only as a probe; never execute the target command itself.
- Do not wrap helper tools with `rtk`; use tools such as `npx`, `npm`, `prettier`, or `node` directly if needed.
- Modify only keys inside `permission.bash`.
- Preserve comments, ordering, indentation, and the existing JSONC structure.
- If `rtk rewrite` fails for any key, record the error and skip that key.
- Do not infer rewrite behavior from a less-specific command when a more-specific fixed prefix exists; for example, probe `git status` for `git status *`, not `git`.
- Do not stage, stash, commit, or revert unrelated changes.

## Output

Return a concise structured summary:

```text
RTK Permission Sync

Updated: 5
  - git status *: allow -> rtk git status *: allow
  - gh pr view *: allow -> rtk gh pr view *: allow
  - gh pr diff *: allow -> rtk gh pr diff *: allow
  - gh api * POST *: ask -> rtk gh api * POST *: ask
  - git log *: allow -> rtk git log *: allow

Reverted: 1
  - rtk unknown-cmd *: ask -> unknown-cmd *: ask

Ignored: 2
  - * (global rule)
  - custom-tool * (conflict: rtk custom-tool * already exists with a different value)

```

If there are no permission changes, return:

```text
No permission changes. The configuration is already synchronized.
```
