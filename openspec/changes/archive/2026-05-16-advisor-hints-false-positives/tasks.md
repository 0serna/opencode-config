## 1. Constants and helpers

- [x] 1.1 Add `SIMPLE_COMMANDS` constant — a `Set<string>` with the blocklist of ~30 commands
- [x] 1.2 Implement `isSimpleCommand(command: string): boolean` — splits on real separators (`&&`, `||`, `;`, `|`, `|&`), extracts first token per segment, returns `true` only if every segment's first token is in `SIMPLE_COMMANDS`
- [x] 1.3 Verify the segment-splitting regex does NOT match single `&` (avoid splitting `2>&1` into phantom segments)

## 2. Integration into blockage tracking

- [x] 2.1 Add early return in `handleBashToolResult` — call `isSimpleCommand(raw)` before `normalizeCommand`; if true, skip `updateFailureState` entirely
- [x] 2.2 Verify that simple-command failures between complex failures do not reset the consecutive counter (e.g., `npm test` fails → `ls` fails → `npm test` fails should count as 2 consecutive `npm test` failures)

## 3. Verification

- [x] 3.1 Run `npm run check` to ensure no lint, type, or format errors
- [x] 3.2 Run `npm test` (Vitest suite) to confirm existing tests still pass
- [x] 3.3 Verify `grep pattern file 2>&1` is NOT split on `&` (no phantom segments)
- [x] 3.4 Verify `cd dir && npm test` is tracked because `npm` is non-blocklisted
- [x] 3.5 Verify `grep pattern file | wc -l` is tracked (documented pipeline-utility risk — `wc` not in blocklist)
