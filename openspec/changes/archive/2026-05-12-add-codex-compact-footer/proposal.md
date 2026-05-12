## Why

Pi is already configured to default to OpenAI Codex, but the current footer only shows generic session metrics. A compact Codex quota indicator would make remaining usage visible at a glance without requiring commands, dashboards, or extra UI.

## What Changes

- Add a compact Pi footer status for Codex quota information.
- Show remaining five-hour usage, remaining seven-day usage, and remaining credits in a single compact footer string.
- Keep the indicator always visible rather than tying it to the active model provider.
- Omit dashboards, commands, warnings, and provider-agnostic quota features from this change.

## Capabilities

### New Capabilities

- `pi-codex-usage-footer`: Display compact Codex quota information in the Pi footer using remaining 5h, 7d, and credit values.

### Modified Capabilities

- None.

## Impact

- Affected code: `dotfiles/pi/agent/extensions/footer.ts` or a nearby Pi extension dedicated to footer status.
- External data: existing Codex authentication and quota endpoints already used by Pi-compatible tooling.
- UI impact: persistent footer space consumption for the compact Codex indicator.
