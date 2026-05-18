## 1. Implement auto-thinking on model change

- [x] 1.1 Add `model_select` event handler to `model-routing.ts` that filters by `source: "set"` | `"cycle"` and calls `pi.setThinkingLevel("medium")`
- [x] 1.2 Verify the handler is placed after existing handlers in the extension code so route overrides still win (current ordering guarantees this)

## 2. Verify correctness

- [x] 2.1 Run `npm run check` to ensure no lint, type, or formatting issues
- [x] 2.2 Run `npm test` to confirm existing tests still pass
