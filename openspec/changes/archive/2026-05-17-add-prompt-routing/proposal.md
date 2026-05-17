## Why

Pi prompt templates run with the session's active model, so `/commit` cannot currently use a fast, dedicated model configuration while preserving the user's prior session state. A prompt-routing extension can make selected prompts temporarily use a fixed model and thinking level, then restore the previous model and reasoning when the prompt completes.

## What Changes

- Add a Pi extension for prompt routing policies keyed by exact slash prompt names matched as the first input token.
- Route configured prompts through `opencode-go/deepseek-v4-flash` with thinking level `high` for the duration of each prompt.
- Restore the previously active model and thinking level after the routed prompt finishes.
- Show a warning notification and continue with the current model if the configured routed model cannot be activated.

## Capabilities

### New Capabilities

- `pi-prompt-routing`: Defines automatic temporary model and thinking-level routing for selected Pi slash prompts.

### Modified Capabilities

## Impact

- Affects Pi dotfiles under `dotfiles/pi/agent/extensions`.
- Does not change the existing `/commit` prompt template content.
- No new runtime dependencies are expected.
