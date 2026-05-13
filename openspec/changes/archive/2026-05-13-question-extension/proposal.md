## Why

The `question.ts` example in pi's SDK shows how to build an interactive tool, but doesn't cover several practical requirements: agent-recommended options, automatic "other" fallback, and optional user comments. Creating a dedicated `question` tool in the dotfiles extensions fills this gap with a focused, opinionated implementation.

## What Changes

- Create `dotfiles/pi/agent/extensions/question.ts` — a tool the LLM can call to ask the user a question with options
- The tool registers via `pi.registerTool()` with name `question`
- Agent specifies options and must mark one as recommended (by label)
- Extension automatically appends an "Other" option at the end (agent should not include it)
- **Enter** on any option confirms immediately
- **Space** on an option selects it and opens a comment field
- **Enter/Space** on "Other" opens a text field where the user types their own answer
- Result returns the answer, optional comment, and metadata

## Capabilities

### New Capabilities

- `question-tool`: Interactive tool that lets the LLM present questions with customizable options, agent recommendations, free-form "other" input, and optional user comments.

### Modified Capabilities

_(None — this is a new capability with no existing spec changes.)_

## Impact

- New file: `dotfiles/pi/agent/extensions/question.ts`
- No breaking changes to existing extensions
- Links into pi's standard extension discovery path (`~/.pi/agent/extensions/`)
