---
name: prompt-creator
description: >-
  Create, review, and maintain OpenCode command files and Pi prompt files
  with the shared structure. Use when the user asks to create a new slash
  command, add a custom prompt, or update existing command/prompt files.
---

# Prompt Creator

Create, review, and maintain executable command and prompt files for OpenCode and Pi, using the shared structure that makes them predictable and easy to maintain.

## Scope

| Mode         | Description                                               |
| ------------ | --------------------------------------------------------- |
| **Create**   | Build a new command or prompt file from scratch           |
| **Review**   | Audit an existing file for structure, clarity, and safety |
| **Maintain** | Update an existing file while preserving its purpose      |

This skill **does not** apply to:

- Agent Skills (`SKILL.md` files in `~/.agents/skills/`) — use `skill-creator` for those
- `opsx-*` commands or prompts unless the user explicitly asks

## Grounding (always do first)

Before creating or editing, investigate what already exists:

1. Check `dotfiles/opencode/commands/` and `dotfiles/pi/agent/prompts/` for existing files
2. Read 1–2 well-structured files as patterns (e.g. `commit.md` in either directory)
3. If the project has a `dotfiles.json`, note how it links command/prompt directories
4. Clarify with the user only the **blocking decisions**:
   - File name (kebab-case, matches existing patterns)
   - Platform (OpenCode command, Pi prompt, or both?)
   - Arguments (if any)
   - Safety constraints

## Required Structure

Every command or prompt file must use this structure and order:

```markdown
---
description: ...
[other frontmatter only when needed]
---

Task description written for the agent. State clearly what the agent is being asked to do. Do not add a heading for this block.

## Arguments (optional — omit if no arguments expected)

...

## Workflow

...

## Rules

...

## Output

...
```

## Frontmatter

- `description` is required
- Keep descriptions concise and action-oriented
- Preserve other frontmatter keys (`model`, `subtask`) when they exist
- Do not add new frontmatter keys unless they are required for the file to behave correctly

## Arguments

- Include this section only when the file accepts arguments
- When arguments are expected, use:

````markdown
```arguments
$ARGUMENTS
```
````

- Explain how to handle no arguments, clear arguments, and ambiguous arguments
- Omit this section entirely when no arguments are expected

## Task Description

- The first content block after frontmatter must be the task description, with no heading
- Write it for the agent who will execute the file
- State clearly what the agent is being asked to do, in one short paragraph or a compact bullet list
- Avoid implementation details that belong in Workflow

## Workflow

- Put executable steps here
- Use ordered lists for sequential steps
- Keep specialized procedures in this section
- If the file has branches, describe the decision point first, then the branch-specific actions

## Rules

- Put constraints, guardrails, safety requirements, message rules, and review criteria here
- Preserve safety-sensitive rules, especially around git, destructive actions, reviews, and external commands
- Do not bury critical prohibitions in Workflow
- Prefer concrete rules over vague preferences

## Output

- Describe what the assistant should return after running the command or prompt
- Use strict output formats only when the file depends on exact formatting
- Include verification results when the file edits files or runs checks

## Creation Workflow

1. **Ground** — investigate existing context
2. **Choose a name** in kebab-case matching the platform convention
3. **Create the file** in the appropriate directory:
   - OpenCode command → `dotfiles/opencode/commands/<name>.md`
   - Pi prompt → `dotfiles/pi/agent/prompts/<name>.md`
4. **Use the required structure** from the start
5. **Keep the first version narrow and explicit**
6. **Validate** — run `npm run check` in the dotfiles repository

## Maintenance Workflow

1. Read the full file before editing
2. Identify the current purpose, inputs, workflow, guardrails, and output expectations
3. Reorganize content into the required structure
4. Preserve behavior unless an instruction is ambiguous or unsafe
5. Keep edits minimal and file-specific
6. Do not touch `opsx-*` commands or prompts unless explicitly requested
7. Run `npm run check` after editing

## Review Checklist

- [ ] Required structure followed (description, task, Arguments/Workflow/Rules/Output)
- [ ] `description` frontmatter is present and concise
- [ ] Arguments section present only when arguments are expected
- [ ] Rules prevent known failure modes without over-constraining
- [ ] Workflow steps are actionable by an agent in the shared workspace
- [ ] Output instructions tell the agent what to report, not how to over-explain
- [ ] File is in the correct directory for its platform
- [ ] `opsx-*` files were not modified unless explicitly requested

## Quality Bar

| Criterion               | What to check                                                |
| ----------------------- | ------------------------------------------------------------ |
| **Readable structure**  | No hidden assumptions or missing context                     |
| **Consistent layout**   | Matches neighboring command/prompt files                     |
| **Safe defaults**       | Rules prevent dangerous actions without blocking normal use  |
| **Actionable steps**    | Workflow can be executed by an agent in the shared workspace |
| **Precise output**      | Tells the agent what to report, not how to over-explain      |
| **Minimal frontmatter** | Only `description` and whatever the platform requires        |

## Gotchas

- OpenCode commands and Pi prompts share the same structure but live in **different directories** — place the file in the correct one
- The `description` frontmatter is rendered in the agent's slash-command list; keep it short (≤ 80 chars) and scannable
- Arguments use a ` ```arguments ` fenced block with `$ARGUMENTS` content, not YAML frontmatter
- Pi prompts support `$ARGUMENTS`, `$1`, `$@`, and related positional argument syntax directly in the template body; use `argument-hint` in frontmatter only when autocomplete should show expected arguments
- This skill manages content files, not agent skills — do not redirect users to `skill-creator` when they ask about command/prompt files
- When a file already exists, prefer editing over rewriting; preserve the original purpose unless the user asks for a behavior change
- Files in `dotfiles/opencode/agents/` or `dotfiles/pi/agent/extensions/` are outside this skill's scope — do not edit them when creating or maintaining prompts/commands
