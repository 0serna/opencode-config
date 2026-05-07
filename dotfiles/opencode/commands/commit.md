---
description: Generate commit for staged changes
---

## Arguments

No arguments expected.

## Task

Create a concise, factual commit message from staged changes and run the commit.

## Workflow

1. Save the staged diff to a temporary file: `TEMP_FILE=$(mktemp /tmp/diff.XXXXXX) && git diff --cached > $TEMP_FILE && echo "TEMP_FILE=$TEMP_FILE"`.
2. If the temporary file is empty, print `No staged changes to commit`, and stop.
3. Read the temporary file to inspect the diff. If the diff is large, read it in batches.
4. Generate a message using only facts visible in the temporary file.
5. Run `git commit` with the generated message.

## Rules

- On failure, do not retry, amend, or run corrective commands unless the user asks.
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
