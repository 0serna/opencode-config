## 1. Strip old mechanisms

- [x] 1.1 Remove the `PASSIVE_GUIDELINE` constant and its injection in `before_agent_start`
- [x] 1.2 Remove the `TOOL_CALL_THRESHOLD` constant, `COUNTED_TOOLS` set, `buildTurnHintText()` function, and `ordinalSuffix()` helper
- [x] 1.3 Remove the `injectTurnHint()` function and the `turn_end` tool-call threshold check
- [x] 1.4 Remove all `ctx.ui.notify` calls throughout the extension
- [x] 1.5 Remove the old state variables (`toolCalls`, `nextHintAt`, `advisorCalledThisTurn`, `hintsSinceAdvisor`)
- [x] 1.6 Remove the `turn_start` handler that reset `advisorCalledThisTurn`

## 2. Implement blockage detection

- [x] 2.1 Add module-level constants: `BASH_WINDOW_SIZE = 5`, `BASH_ERROR_THRESHOLD = 3`
- [x] 2.2 Add state variables: `bashExitCodes: number[]` (sliding window), `blockageSteerSent: boolean`
- [x] 2.3 In `agent_start`, clear `bashExitCodes` and reset `blockageSteerSent`
- [x] 2.4 In `tool_result`, if tool is `bash` and `event.toolName === "bash"`, push `event.details.exitCode` (or `event.isError`) onto the window; trim to last `BASH_WINDOW_SIZE` entries
- [x] 2.5 In `tool_result`, if tool is `advisor`, clear `bashExitCodes` and reset `blockageSteerSent`
- [x] 2.6 In `turn_end`, if at least `BASH_ERROR_THRESHOLD` entries in `bashExitCodes` are non-zero AND `!blockageSteerSent`, send steer via `pi.sendMessage({ customType: "advisor-blockage", content, display: true }, { deliverAs: "steer" })` and set `blockageSteerSent = true`
- [x] 2.7 Log `blockage` event on steer delivery (include session id and error count)

## 3. Implement keyword follow-up

- [x] 3.1 Add module-level constants: `KEYWORDS = ["opsx-propose", "opsx-apply"]`, `FOLLOWUP_MESSAGE = "validate the work done so far with `advisor`"`
- [x] 3.2 Add state variable: `keywordDetected: boolean`
- [x] 3.3 In `input` event, if `event.source !== "extension"`, check if any keyword is a substring of `event.text`; if so set `keywordDetected = true`
- [x] 3.4 In `agent_end`, if `keywordDetected`, call `pi.sendUserMessage(FOLLOWUP_MESSAGE)`
- [x] 3.5 Reset `keywordDetected = false` at the start of each `input` event and after sending in `agent_end`
- [x] 3.6 Log `keyword-match` event when a keyword is detected (include session id and matched keyword)

## 4. Clean up and verify

- [x] 4.1 Remove the `advisorCalledThisTurn` / `turn_start` logic (no longer needed — blockage detection doesn't suppress on advisor; it resets on advisor via tool_result instead)
- [x] 4.2 Verify the extension compiles and loads without errors
- [x] 4.3 Run the existing test suite (`npm test`) to confirm nothing else broke
