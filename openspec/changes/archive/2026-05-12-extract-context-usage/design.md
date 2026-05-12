## Context

The footer extension at `dotfiles/pi/agent/extensions/footer.ts` currently:

- Sets up a custom footer via `ctx.ui.setFooter()`
- Computes context usage via `ctx.getContextUsage()` — inline in the render method
- Computes cache hit ratio by traversing `ctx.sessionManager.getBranch()` — inline in the render method
- Formats cwd, git branch, model ID, and thinking level
- Collects extension statuses via `footerData.getExtensionStatuses()`
- Renders everything into a single footer line
- Contains 3 `fallow-ignore-next-line complexity` comments that suppress health analysis warnings

The `codex-quota.ts` extension demonstrates a cleaner pattern: standalone extensions compute and publish status via `ctx.ui.setStatus(key, styledString)`, and the footer collects all statuses via `getExtensionStatuses()`.

This design extracts context/cache logic from `footer.ts` into a new `context-usage.ts` extension following the same pattern.

## Goals / Non-Goals

**Goals:**

- Extract all context-usage and cache-hit computation from `footer.ts` into a standalone extension
- New extension follows the same `setStatus` pattern as `codex-quota.ts`
- `footer.ts` delegates context/cache display to the extension status system
- Footer listens for `model_select` to trigger re-render when context window changes

**Non-Goals:**

- No changes to the `pi-footer-token-metrics` spec requirements
- No changes to how cwd, branch, model, or thinking level are displayed
- No changes to how Codex quota is displayed
- No new dependencies or APIs
- No breaking changes

## Decisions

### Decision: Single combined status key for context and cache

The extension publishes both context usage and cache hit as one status string under key `"context-usage"`, formatted as `"12.3k/128k cache 45%"`.

**Rationale:** Both values are derived from the same session data and change at the same rate (on `turn_end`). A single key is simpler and follows the `codex-quota.ts` precedent (which publishes `"5h 80% · 7d 60%"` as one string).

**Alternatives considered:**

- Two separate status keys (`"context"` + `"cache"`) — more granular but unnecessary coupling of two tightly related values

### Decision: Compute on events, not on every footer render

The extension computes values in `session_start`, `turn_end`, and `model_select` event handlers and caches them in the status store.

**Rationale:** The session data only changes during these events. Computing on every render (current approach) is wasteful — the render function re-evaluates even when nothing has changed.

**Risk:** If pi introduces session mutations outside these events in the future, the status could become stale. Acceptable for now.

### Decision: Footer listens for `model_select` to trigger re-render

The footer registers `pi.on("model_select", () => tui.requestRender())` alongside the existing `footerData.onBranchChange(() => tui.requestRender())`.

**Rationale:** Without this, the context window value in the status would remain stale after a model change until the next turn. The cost is minimal — one event listener.

### Decision: Helper functions move to the new extension

`formatK()`, `formatPercent()`, and the `CONTEXT_USAGE_WARNING_TOKENS` constant move from `footer.ts` to `context-usage.ts`.

**Rationale:** After extraction, `footer.ts` no longer formats context/cache values, so it doesn't need these helpers. The new extension is their only consumer.

**Alternatives considered:**

- Duplicate in both files — unnecessary
- Shared `utils.ts` — over-engineering for two small functions

### Decision: No new `fallow-ignore` comments, existing ones removed

All three `fallow-ignore-next-line complexity` comments in `footer.ts` must be removed. The functions they suppress (`formatContextUsage`, `formatCacheHit`, the render method) must be refactored during the extraction to eliminate the underlying complexity — not just relocated with the suppression.

**Strategy per function:**

| Function             | Current issue                                                | Refactor approach                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formatContextUsage` | Optional chaining + ternary flagged as complex               | Simplify to early-return guard + one branch — the function is already simple, only needs restructuring to avoid fallow triggering                                             |
| `formatCacheHit`     | Loop with complex `if` condition + `continue`                | Extract the assistant-usage filter to a helper function, keep the loop simple                                                                                                 |
| `render` (in footer) | Multiple branches (try-catch, null checks, section building) | Simplified after extraction — no more context/cache computation, fewer variables, flatter logic. The try-catch wrapper is the main complexity, acceptable for a render method |

**Rationale:** `fallow-ignore` comments are technical debt that mask real complexity. The extraction is the right moment to clean them up since the affected functions are being relocated and can be rewritten cleanly.

### Decision: No spec-level changes

The `pi-footer-token-metrics` spec requirements remain unchanged. The same values are displayed in the same format; only the implementation mechanism changes.

**Rationale:** Specs describe externally observable behavior, not implementation. The behavior (context usage and cache percentage display) is identical.

## Risks / Trade-offs

| Risk                                                                           | Mitigation                                                                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Context/cache status position in footer changes (moves after model+thinking)   | Accepted — the new order is cleaner (native sections first, extension statuses after)                                           |
| Status could become stale if session mutates outside `turn_end`/`model_select` | Low probability given current pi architecture; easy to add event handlers later                                                 |
| Refactoring `formatCacheHit` to remove complexity could introduce logic errors | Mitigated by keeping the same algorithm — only restructuring for cyclomatic/cognitive simplicity, not changing what it computes |
| `/reload` must pick up both files independently                                | Already handled — pi auto-discovers all files in the extensions directory                                                       |
