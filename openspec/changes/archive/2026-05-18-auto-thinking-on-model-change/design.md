## Context

The model-routing extension (`dotfiles/pi/agent/extensions/model-routing.ts`) currently handles two scenarios:

1. **Session start**: Activates a default model + thinking level
2. **Slash commands**: Temporarily routes to a configured model + thinking level when input starts with a recognized command like `/review` or `/simplify`

It does NOT handle the gap: when a user manually changes the model via `/model` or Ctrl+P, no thinking level adjustment happens automatically. The user must manually set thinking level after each model switch.

The Pi extension API provides a `model_select` event with the following properties:

- `event.model` — the newly selected model
- `event.previousModel` — the previous model (undefined on first selection)
- `event.source` — `"set"` (via `/model`), `"cycle"` (via Ctrl+P), or `"restore"` (session restore, never emitted in practice)

Internally, `pi.setModel()` and `cycleModel()` both call `setThinkingLevel()` to preserve the current level before emitting `model_select`. This means our handler runs after the preservation but before any route-level override.

## Goals / Non-Goals

**Goals:**

- When the user manually changes the model (`source: "set"` or `"cycle"`), automatically set thinking level to `"medium"` (clamped to what the model supports)
- Preserve existing routing behavior — slash commands must still override this auto-set value

**Non-Goals:**

- No config surface — the behavior is automatic and not user-configurable
- No changes to the existing slash command routing logic
- No changes to session start behavior (DEFAULT_ROUTE already handles this)
- No UI indicators or notifications for the auto-set action

## Decisions

### Decision: Use `model_select` event rather than patching `setModel` / `cycleModel`

This is the only extension hook available for detecting model changes. Patching pi's internal methods is not possible from an extension.

**Alternatives considered:**

- Intercept at the `input` level and detect `/model` commands — fragile, doesn't cover Ctrl+P cycling
- Listen to `thinking_level_select` — notification-only, can't react
- Use `model_select` — correct by design ✓

### Decision: Set `"medium"` and let `clampThinkingLevel` handle equivalence

The pi-ai library's `clampThinkingLevel()` function maps the requested level to the closest supported level for the given model:

- Models with `reasoning: true` support `["off", "minimal", "low", "medium", "high"]` → `"medium"` works directly
- Models with `reasoning: false` support `["off"]` → clamps to `"off"` (reasoning disabled, correct behavior)

**Alternatives considered:**

- Query `getSupportedThinkingLevels()` and pick the middle value — unnecessary, `clampThinkingLevel` already provides correct behavior
- Allow configuring the target level via settings — scope creep, not requested

### Decision: No special coordination with route system needed

The route activation sequence is:

```
activateRoute(route)
  → pi.setModel(route.model)        // emits model_select → our handler sets "medium"
  → pi.setThinkingLevel(routeLevel)  // overrides to route's configured level
```

Since `pi.setThinkingLevel()` is called AFTER `model_select` completes, routes naturally win. No flag, mutex, or guard needed.

**Risk identified:** If in the future `setModel()` stops calling `setThinkingLevel()` after the event, routes would lose their override. This is a future-compatibility risk but acceptable — the current pi source confirms the ordering.

### Decision: No behavior for `source: "restore"`

The `"restore"` source is defined in the type system but never emitted in practice. Session restore sets the model via agent state directly, without going through `setModel()`. The existing `session_start` handler with DEFAULT_ROUTE already handles this case. Our handler returns early for `"restore"` to be future-proof.

## Risks / Trade-offs

- **[Risk] Route override ordering depends on pi internals** → The current ordering (model_select emits before route's setThinkingLevel) is baked into pi's `setModel()` and `cycleModel()` implementation. If that changes, routes could lose their override. Mitigation: minimal — this would be a breaking change in pi itself.
- **[Trade-off] No user control** → The auto-set is always "medium". Users who want a different default for manual model changes have no knob. Acceptable for now — no one asked for it.
- **[Edge case] Manual model change mid-route** → If the user manually changes model while a slash command route is active, our handler sets thinking to "medium". On `agent_end`, the route's restore logic snaps back to the pre-route state. This is the same behavior as existing model changes during routes.
