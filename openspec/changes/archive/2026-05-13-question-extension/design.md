## Context

The dotfiles repo has 6 existing pi extensions under `dotfiles/pi/agent/extensions/`. The `question.ts` example from pi's SDK shows the pattern for interactive tools using `ctx.ui.custom()`, but lacks support for agent recommendations, automatic "other" fallback, and optional comments.

This extension is a single-file tool, self-contained with no external dependencies beyond pi's SDK packages.

## Goals / Non-Goals

**Goals:**

- A single-file `question.ts` extension under `dotfiles/pi/agent/extensions/`
- Tool name: `question`, registered via `pi.registerTool()`
- Agent specifies options and must mark one as recommended (by label)
- Extension auto-appends "Other" at the end
- Keyboard: Enter confirms, Space selects + comment, Escape cancels
- "Other" opens text input where user types their answer
- Custom `renderCall` and `renderResult` for TUI display

**Non-Goals:**

- Multi-question / questionnaire mode (that's what `@rwese/pi-question` handles)
- Multi-select (checkbox) mode
- Persistence or session state
- Hot-reload or dynamic behavior beyond load time
- i18n or configurable "Other" label

## Decisions

### Pattern: ctx.ui.custom() for full UI control

The `question.ts` example uses `ctx.ui.custom()` which replaces the editor with a custom component. We follow the same pattern. This gives full control over keyboard handling, rendering, and focus management.

**Alternatives considered:**

- `ctx.ui.select()` — simpler but cannot show custom rendering (recommended badge, inline comment field, "Other" with editor). Too limited for our requirements.

### Recommended option by label (string)

The agent supplies `recommended` as a string matching an option's `label`. If it doesn't match any option, it's silently ignored.

**Rationale:** Simpler for the LLM than index-based (fragile to reordering) or key-based (verbose). The LLM can copy-paste the exact label text.

### Interaction: Enter = confirm, Space = comment

Two distinct actions on the same options list:

- **Enter**: "I choose this, done." Fast path for simple selections.
- **Space**: "I choose this and want to add a note." Opens inline comment field.

**Rationale:** Mirror common UI patterns (Enter for primary action, Space for secondary). Prevents accidental comment-opening while keeping it accessible.

### "Other" = text input (not a comment on "Other")

When the user selects "Other", the text they type IS their answer. There is no separate comment for "Other" because the content they provide IS the custom answer.

### Two-state UI component

The component has two states:

1. **List state**: Shows options with keyboard navigation. Enter/Space/Escape handled.
2. **Input state**: Shows a text editor (for "Other") or a comment field (Space on normal option). Enter confirms, Escape returns to list.

This maps cleanly to the pattern in `question.ts` which uses an `editMode` boolean to toggle between option list and editor.

### Custom rendering (renderCall / renderResult)

- `renderCall`: Shows `question <question text>` in muted/toolTitle colors.
- `renderResult`: Shows `✓ <answer>` in success/accent colors. For custom answers, shows `✓ (wrote) <answer>`. For cancelled, shows warning-colored "Cancelled".

## Risks / Trade-offs

- **[Conflict with @rwese/pi-question]** If `@rwese/pi-question` is installed in the future, both would register a tool named `question`. Pi handles this with suffixes (`question:1`, `question:2`).
  → **Mitigation**: Acceptable. Both tools serve different purposes (single vs multi-question), and the LLM will see both descriptions and choose appropriately.

- **[Single file size]** The extension will be ~300-500 lines.
  → **Mitigation**: This is consistent with existing extensions (`web-tools.ts` is 587 lines, `codex-quota.ts` is 495 lines).

- **[No tests]** The dotfiles repo's test suite (`vitest`) doesn't cover pi extensions.
  → **Mitigation**: The extension follows a proven pattern (identical to the SDK's `question.ts` example). Manual testing via `/reload` and calling the tool is the acceptance path.

- **[Esc in input returns to list, not cancels]** This is a design choice that differs from `question.ts` where Esc in the editor returns to options, and Esc in options cancels entirely.
  → **Mitigation**: Intentional. Users may want to change their mind about commenting without losing their option selection. Full cancel is always available from the list.
