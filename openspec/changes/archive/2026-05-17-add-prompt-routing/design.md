## Context

Pi prompt templates expand into user input and execute with the active session model and thinking level. The existing `/commit` prompt is a prompt template, so adding `model` frontmatter would not provide reliable per-prompt routing. Pi extensions can observe raw input before prompt-template expansion, change the active model and thinking level, and observe `agent_end` after the prompt completes.

## Goals / Non-Goals

**Goals:**

- Add a generic prompt-routing extension that can route selected slash prompts by exact first-token match.
- Temporarily switch `/commit` to a configured model and thinking level before template expansion.
- Restore the previous model and thinking level after the full agent prompt completes.
- Warn the user if the routed model cannot be activated while still allowing the prompt to continue.

**Non-Goals:**

- Do not modify the `/commit` prompt template instructions.
- Do not add a user-facing configuration file or settings UI.
- Do not route prefix matches in the initial version.
- Do not cancel `/commit` when routing fails.

## Decisions

- Use a new `prompt-routing.ts` extension rather than changing the prompt template.
  - Rationale: prompt templates do not own model selection, while extensions can change model state before template expansion.
  - Alternative considered: add `model` frontmatter to `commit.md`; rejected because Pi does not document that as supported prompt-template behavior.

- Match the first whitespace-delimited token exactly against configured slash prompt names, with surrounding whitespace allowed and arguments permitted.
  - Rationale: first-token exact matching keeps one simple routing rule for prompts with or without arguments while preventing accidental routing of future commands such as `/commit-fix`.
  - Alternative considered: full-input exact matching; rejected because routed prompts such as `/opsx-archive <change>` need arguments.
  - Alternative considered: prefix matching; rejected because it is too broad for the first rule.

- Store routing rules as constants inside the extension.
  - Rationale: this keeps the initial implementation small while making future prompt additions straightforward.
  - Alternative considered: JSON settings; rejected as unnecessary until there are multiple routing rules or non-developer customization needs.

- Restore on `agent_end` using a snapshot captured before the temporary switch.
  - Rationale: `agent_end` fires once for the full user prompt, after any multi-turn tool flow completes.
  - Alternative considered: `turn_end`; rejected because a prompt can involve multiple turns.

- Change thinking level only after the routed model activates successfully.
  - Rationale: if routing falls back to the current model, the extension should not unexpectedly alter the user's current model behavior.
  - Alternative considered: always set thinking level; rejected because it can make fallback behavior slower or more expensive.

## Risks / Trade-offs

- Session interruption before `agent_end` can prevent restoration → Accept as a rare lifecycle failure; normal prompt completion restores state.
- Manual model changes during the routed prompt are overwritten by restoration → Accept because the routed prompt is defined as a closed temporary loan of model state.
- Hard-coded routing constants require editing the extension to customize → Accept for now to avoid premature configuration complexity.
