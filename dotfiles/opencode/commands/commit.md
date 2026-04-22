---
description: Generate commit for staged changes
model: opencode-go/minimax-m2.7
subtask: true
---

## Task

Create a concise, factual commit message from staged changes and run the commit.

## Steps

1. Run `git diff --cached`. If empty, print `No staged changes to commit` and stop.
2. Generate a message using only facts visible in the diff.
3. Run `git commit` with the generated message.

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
- On failure, do not retry, amend, or run corrective commands unless the user asks.

## Message rules

- Format: `[type][scope]: [description]` + optional body
- Types: `feat|fix|refactor|docs|style|test|ci|build|chore|perf`
- Scope is optional; if present, use modules or domains clearly defined in the project
- Body is optional; if present, add one blank line after subject
- Subject is imperative, no trailing period/whitespace, <= 50 chars
- Lowercase type and English only
