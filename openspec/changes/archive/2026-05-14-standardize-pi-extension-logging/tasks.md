## 1. Shared Logger Utility

- [x] 1.1 Create `dotfiles/pi/agent/extensions/shared/` directory
- [x] 1.2 Implement `logger.ts` with `log(source, event, data?)` function writing to `~/.local/state/pi/<source>.log`
- [x] 1.3 Implement line format: `ISO_TIMESTAMP SOURCE EVENT {...json}\n`
- [x] 1.4 Implement truncation: keep last 2000 lines via read-slice-write
- [x] 1.5 Implement lazy directory creation (`mkdirSync({ recursive: true })`)
- [x] 1.6 Implement silent try/catch for all filesystem operations
- [x] 1.7 Handle JSON serialization errors: if `JSON.stringify(data)` throws, omit data and still write the timestamp/source/event line
- [x] 1.8 Ensure module has no side effects at import time

## 2. Migrate advisor-hints

- [x] 2.1 Replace `logEvent()` calls with `import { log } from './shared/logger.js'` and `log('advisor-hints', event, data)`
- [x] 2.2 Remove private `LOG_FILE`, `MAX_LOG_LINES`, `logEvent()` function, and `mkdirSync` from setup

## 3. Migrate codex-quota

- [x] 3.1 Replace `logEvent()` calls with `log('codex-quota', event, data)`
- [x] 3.2 Remove `LOG_FILE` constant pointing to `/tmp/pi-codex-quota.log`
- [x] 3.3 Remove private `logEvent()` function and all truncation/mkdir logic

## 4. Migrate permissions

- [x] 4.1 Replace each `log()` call with `log('permissions', event, {...})` using a structured event name (e.g., `prompt_shown`, `user_choice`, `session_approval_stored`)
- [x] 4.2 Convert `key="value"` text format into JSON object fields
- [x] 4.3 Remove private `LOG_FILE`, `MAX_LOG_BYTES`, `MAX_LOG_LINES`, `log()` function, and directory creation logic

## 5. Migrate web-tools

- [x] 5.1 Replace each `log()` call with `log('web-tools', event, {...})` using structured event names (e.g., `exa_search`, `exa_contents`, `web_fetch_http`, `web_fetch_error`)
- [x] 5.2 Convert plain-text messages into JSON object fields
- [x] 5.3 Remove private `LOG_FILE`, truncation constants, `log()` function, and directory creation logic
- [x] 5.4 Verify the format aligns with the updated `web-tools-logging` spec (JSON data instead of `key=value`)

## 6. Verification

- [x] 6.1 Run `npm run check` to verify TypeScript compilation and linting across all changed files
- [x] 6.2 Launch pi and trigger each extension's events to confirm logs are written with correct format and path
- [x] 6.3 Verify truncation works by exceeding 2000 lines in one log file
- [x] 6.4 Verify codex-quota log now appears at `~/.local/state/pi/codex-quota.log` (not `/tmp/`)
