## 1. Update hint text constants

- [x] 1.1 Replace `PASSIVE_GUIDELINE` constant with new text covering difficulty escalation and pre-response validation importance
- [x] 1.2 Remove `HINT_TEXT_FIRST` constant (the old conditional-first-hint text)
- [x] 1.3 Replace `buildTurnHintText` function to produce 3 escalating levels instead of the current conditional text:
  - Level 1 (hintsSinceAdvisor === 1): gentle reminder to consider advisor before responding
  - Level 2 (hintsSinceAdvisor === 2): reinforced statement that work should be validated
  - Level 3+ (hintsSinceAdvisor >= 3): firm mandatory language with `MANDATORY` tag

## 2. Remove triggerTurn from hint delivery

- [x] 2.1 Remove `triggerTurn: true` from the `pi.sendMessage` call in `injectTurnHint`, so hints are delivered without forcing an extra model turn

## 3. Change UI notification severity

- [x] 3.1 Change `ctx.ui.notify` severity from conditional (`info` for first hint, `warning` for subsequent) to always `warning`

## 4. Verify the implementation

- [x] 4.1 Run `npm run check` to verify lint, format, and type checks pass
- [x] 4.2 Record a session capture and verify: passive guideline appears in system prompt, active hints fire at correct thresholds, hints use 3-level escalation, no triggerTurn, notification always shows warning
