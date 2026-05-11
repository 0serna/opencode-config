---
name: command-authoring
description: Create, review, and maintain command files using the shared command structure. Use when adding or updating custom slash commands.
---

# Command/Prompt Authoring

Use this skill when creating, reviewing, or updating OpenCode command files and Pi prompt files.

The goal is consistency: every local command or prompt should be easy to scan, predictable to maintain, and explicit about inputs, behavior, constraints, and expected output.

## Scope

- Apply these guidelines to non-`opsx-*` command and prompt files in the current project.
- Discover the relevant command or prompt directory from existing files, configuration, or user instructions before creating new files.
- Do not apply these guidelines to `opsx-*` commands or prompts unless the user explicitly asks.
- Preserve a file's purpose unless the user asks for a behavior change.
- Improve ambiguous instructions when doing so makes the file safer or easier to execute.

## Required Structure

Every non-`opsx-*` command or prompt should use this structure and order:

```markdown
---
description: ...
[other frontmatter only when needed]
---

Task description written for the agent. State clearly what the agent is being asked to do. Do not add a heading for this block.

## Arguments (optional - omit if no arguments expected)

...

## Workflow

...

## Rules

...

## Output

...
```

## Frontmatter

- `description` is required.
- Keep descriptions concise and action-oriented.
- Preserve other frontmatter keys, such as `model` or `subtask`, when they are already needed.
- Do not add new frontmatter keys unless they are required for the file to behave correctly.

## Arguments

- Include this section only when the file accepts arguments.
- When arguments are expected, use:

````markdown
```arguments
$ARGUMENTS
```
````

- Explain how to handle no arguments, clear arguments, and ambiguous arguments when relevant.
- Omit this section entirely when no arguments are expected; do not write "No arguments expected." or any placeholder text.

## Task Description

- The first content block after frontmatter must be the task description, with no heading.
- Write it for the agent who will execute the file.
- State clearly what the agent is being asked to do, in one short paragraph or a compact bullet list.
- Keep it focused on the file's purpose.
- Avoid implementation details that belong in `Workflow`.

## Workflow

- Put executable steps here.
- Use ordered lists for sequential steps.
- Keep specialized procedures in this section instead of creating custom top-level sections.
- If the file has branches, describe the decision point first, then the branch-specific actions.

## Rules

- Put constraints, guardrails, safety requirements, message rules, and review criteria here.
- Preserve safety-sensitive rules, especially around git, destructive actions, reviews, and external commands.
- Do not bury critical prohibitions in `Workflow` if they are better expressed as rules.
- Prefer concrete rules over vague preferences.

## Output

- Describe what the assistant should return after running the command or prompt.
- Output can be flexible per file; do not force a single global response format.
- Use strict output formats only when the file depends on exact formatting.
- Include verification results when the command or prompt edits files or runs checks.

## Maintenance Workflow

When updating existing command or prompt files:

1. Read the full file before editing.
2. Identify the current purpose, inputs, workflow, guardrails, and output expectations.
3. Reorganize content into the required structure.
4. Preserve behavior unless an instruction is ambiguous or unsafe.
5. Keep edits minimal and file-specific.
6. Do not touch `opsx-*` commands or prompts unless explicitly requested.
7. Run the project's configured checks after editing when available.

## Creation Workflow

When creating a new command or prompt:

1. Clarify the file name, purpose, expected arguments, and safety constraints if they are not obvious.
2. Create the file in the project's relevant command or prompt directory using the existing filename pattern for that platform.
3. Use the required structure from the start.
4. Keep the first version narrow and explicit.
5. Add only the rules needed to make the file safe and repeatable.
6. Run the project's configured checks after editing when available.

## Quality Bar

- The file should be readable top to bottom without hidden assumptions.
- The structure should be consistent with neighboring command or prompt files.
- Rules should prevent known failure modes without over-constraining normal use.
- Workflow steps should be actionable by an assistant in the shared workspace.
- Output instructions should tell the assistant what to report, not how to over-explain.
