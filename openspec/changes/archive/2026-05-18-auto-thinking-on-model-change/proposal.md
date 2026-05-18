## Why

When a user manually switches models via `/model` or Ctrl+P, the thinking level stays at whatever it was before. This means switching to a capable reasoning model doesn't automatically engage reasoning, requiring an extra manual step. The model-routing extension already handles thinking levels for slash commands, but there's no equivalent for ad-hoc model changes.

## What Changes

- Add a `model_select` event handler to the model-routing extension
- When the user manually changes the model (source `"set"` or `"cycle"`), automatically set thinking level to `"medium"` (clamped to whatever the model supports)
- Session restore (`source: "restore"`) is excluded — the existing default route already handles that
- Route-initiated model changes (`activateRoute` → `pi.setModel()`) are naturally excluded because routes call `pi.setThinkingLevel(route.thinkingLevel)` after our handler runs, overriding the auto-set value

## Capabilities

### New Capabilities

- `auto-thinking-on-model-change`: Automatically set thinking level to `"medium"` (or equivalent) when the user manually changes the active model

### Modified Capabilities

- `pi-model-routing`: The existing extension gains a new event handler; no existing routing behavior changes

## Impact

- Single file: `dotfiles/pi/agent/extensions/model-routing.ts`
- No new dependencies
- No external API changes
- No config surface needed — behavior is automatic
