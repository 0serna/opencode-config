## Why

The footer extension (`footer.ts`) currently embeds context-usage computation and cache-hit calculation directly in its render method, mixing two concerns: (1) computing derived session data and (2) rendering the footer layout. Meanwhile, `codex-quota.ts` demonstrates a cleaner pattern — standalone extensions publish status via `ctx.ui.setStatus()`, and the footer collects all statuses via `footerData.getExtensionStatuses()`. Extracting context/cache logic into its own extension improves consistency, reduces footer complexity, and makes each extension independently testable and maintainable.

## What Changes

- Extract context-usage and cache-hit computation from `dotfiles/pi/agent/extensions/footer.ts` into a new standalone extension `dotfiles/pi/agent/extensions/context-usage.ts`
- The new extension follows the same pattern as `codex-quota.ts`: maintains internal state, computes values on relevant lifecycle events, and publishes a styled status string via `ctx.ui.setStatus("context-usage", ...)`
- Simplify `footer.ts` to only handle footer layout (cwd, branch, model, thinking) and collect extension statuses — removing all context/cache formatting logic
- Add `model_select` listener in `footer.ts` to trigger re-render when the model changes (context window may differ)
- Eliminate all `fallow-ignore` comments in `footer.ts` and ensure the new `context-usage.ts` has zero fallow violations — fallow health must be green on all touched files

## Capabilities

### New Capabilities

None — this is an internal refactoring. The external behavior (what values appear in the footer and how they're formatted) does not change. The existing `pi-footer-token-metrics` spec continues to describe the displayed values correctly.

### Modified Capabilities

None — no spec-level requirements change. Context usage and cache percentage display requirements remain identical; only the implementation mechanism changes.

## Impact

- `dotfiles/pi/agent/extensions/footer.ts` — simplified, context/cache helpers removed
- `dotfiles/pi/agent/extensions/context-usage.ts` — new file created
- No external API changes, no dependency changes, no breaking changes

### Fallow Cleanup

- `footer.ts` currently has 3 `fallow-ignore-next-line complexity` comments that must be removed by simplifying or extracting the flagged functions
- The new `context-usage.ts` must be written so that no `fallow-ignore` comments are needed
- Functions moving from `footer.ts` to `context-usage.ts` must be refactored during the move to eliminate the complexity that required suppression
