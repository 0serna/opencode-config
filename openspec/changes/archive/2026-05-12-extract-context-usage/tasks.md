## 1. Create context-usage extension

- [x] 1.1 Create `dotfiles/pi/agent/extensions/context-usage.ts` with extension factory function
- [x] 1.2 Move helper functions from `footer.ts`: `formatK()`, `formatPercent()`, `CONTEXT_USAGE_WARNING_TOKENS` constant, types `ContextUsage` and `CacheUsageEntry`
- [x] 1.3 Reimplement `formatContextUsage()`, `styleContextUsage()`, and `formatCacheHit()` in the new extension, using `ctx.ui.theme` for styling instead of a `theme` parameter — refactor to eliminate any need for `fallow-ignore` comments
- [x] 1.4 Implement `session_start` handler: compute context usage and cache hit, publish via `ctx.ui.setStatus("context-usage", ...)`
- [x] 1.5 Implement `turn_end` handler: recompute and republish status
- [x] 1.6 Implement `model_select` handler: recompute context usage and republish (context window may change even without new messages)

## 2. Simplify footer.ts

- [x] 2.1 Remove `formatK()`, `formatPercent()`, `CONTEXT_USAGE_WARNING_TOKENS`, types `ContextUsage` and `CacheUsageEntry` from `footer.ts`
- [x] 2.2 Remove `formatContextUsage()`, `styleContextUsage()`, `formatCacheHit()` functions
- [x] 2.3 Remove context usage and cache hit computations from the render method — no more `ctx.getContextUsage()`, `ctx.sessionManager.getBranch()` traversal
- [x] 2.4 Remove unused imports (`truncateToWidth` stays, but verify which imports are no longer needed)
- [x] 2.5 Remove the three `fallow-ignore-next-line complexity` comments from `footer.ts` — each must be verifiably unnecessary after the above simplifications

## 3. Add model_select listener to footer.ts

- [x] 3.1 Register `pi.on("model_select", ...)` that calls `tui.requestRender()` to ensure footer re-renders when model changes

## 4. Verify

- [x] 4.1 Run `npm run check` to verify formatting, type correctness, and that fallow health is clean on `footer.ts` and `context-usage.ts`
- [x] 4.2 Verify `rg "fallow-ignore" dotfiles/pi/agent/extensions/footer.ts dotfiles/pi/agent/extensions/context-usage.ts` returns no matches
- [ ] 4.3 Manually verify the extension loads without errors and footer displays correctly with context/cache as an extension status
