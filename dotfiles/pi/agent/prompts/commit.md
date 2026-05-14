---
description: Generate commit for staged changes
---

Create a concise, factual commit message from the staged changes and run the commit once, reporting either the final committed message or the factual failure cause.

## Workflow

1. Run `git diff --cached --stat && git log -10 --oneline` to see the changed files summary and recent commit style.
2. Decide which files are relevant to inspect (use your judgment — skip lockfiles, builds, generated files, binaries, or anything that doesn't help the commit message). For each selected file, read its diff with `git diff --cached -- <path>`. Read only what you need to understand the changes.
3. Generate a message using only facts visible in the diff, then run `git commit -m "[generated message]" && git log -1` to commit and confirm in one command.

## Rules

- Do not use the `advisor` tool for this task; inspect the staged diff, choose the commit message, and run the commit independently.
- If there are no staged changes (`git diff --cached` is empty), print `No staged changes to commit` and stop.
- On failure, do not retry or amend unless the user asks.
- Format commit messages as `[type]([scope]): [description]` plus an optional body.
- Use one of these types: `feat|fix|refactor|docs|style|test|ci|build|chore|perf`.
- Scope is optional; if present, use modules or domains clearly defined in the project.
- Body is optional; if present, add one blank line after the subject and use bullet points.
- Subject is imperative, has no trailing period or whitespace, and is no more than 50 characters.
- Use lowercase type and English only.

## Output

- On success, print:

  ```text
  Commit successful
  `[final committed message]`
  ```

- On failure, print:

  ```text
  Commit failed
  [brief factual cause from the error output]
  ```
