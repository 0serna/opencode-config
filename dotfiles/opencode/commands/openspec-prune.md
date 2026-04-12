---
description: Prune stale OpenSpec changes left behind by reverted artifacts
---

## Task

1. Run `openspec list --json`.
2. For each active change under `openspec/changes/<name>`, inspect the directory recursively.
3. Treat a change as stale only when it contains no files at all, or only nested directories that are themselves empty.
4. If a change contains any file, do not delete it automatically.
5. If a change is empty except for empty subdirectories such as `specs/`, remove `openspec/changes/<name>`.
6. Run `openspec list --json` again.
7. Summarize which stale changes were removed and which active changes remain.

## Guardrails

- Only delete changes that are clearly stale directories.
- If a change looks partial instead of stale, stop and ask the user before removing it.
- Never touch `openspec/changes/archive`.
- Prefer the smallest cleanup needed to make `openspec list` accurate again.
