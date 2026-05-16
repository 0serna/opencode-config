## Why

The `advisor-hints` extension's blockage-detection capability tracks all failing bash commands to detect when the agent is stuck. Simple commands like `cd`, `grep`, `ls`, and `cat` frequently fail for benign reasons (directory not found, no match, file missing), producing false-positive advisor suggestions. These are not real blockage signals — the agent handles them routinely.

## What Changes

- Add a filter in `advisor-hints.ts` that skips consecutive-failure tracking for commands whose first token is a known "simple" Unix utility
- The filter inspects every segment of compound commands (`cmd1 && cmd2`), not just the first
- Define a blocklist of ~30 commands (navigation, listing, reading, search, file operations, shell state, booleans) that are excluded from failure tracking
- No changes to the steer mechanism, keyword detection, or reset logic

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `blockage-detection`: Add requirement that the extension SHALL skip failure tracking for commands whose first token is a known simple command. The blocklist SHALL be defined as a module-level constant.

## Impact

- **Affected file**: `dotfiles/pi/agent/extensions/advisor-hints.ts`
- **Public API**: None — the extension's external behavior is unchanged (steer message, timing, reset conditions all remain identical)
- **Logging**: Simple commands will no longer produce `blockage` log events
