## 1. Prompt Routing Extension

- [x] 1.1 Create `dotfiles/pi/agent/extensions/prompt-routing.ts` with routing-rule constants for exact slash prompt names.
- [x] 1.2 Add an input handler that matches only `/commit` with optional surrounding whitespace and ignores arguments or prefix matches.
- [x] 1.3 Capture the current model and thinking level before attempting routing.
- [x] 1.4 Find and activate the configured routed model, then set the configured thinking level only after model activation succeeds.
- [x] 1.5 Show a Pi UI warning and continue without changing thinking level when the configured model cannot be activated.
- [x] 1.6 Restore the captured model and thinking level on `agent_end` for the routed prompt.

## 2. Verification

- [x] 2.1 Add or update tests for exact matching, non-matching arguments/prefixes, routing success, routing failure, and restoration behavior where extension testing support exists.
- [x] 2.2 Run the repository check command and fix any reported lint, type, format, OpenSpec, or test issues.
