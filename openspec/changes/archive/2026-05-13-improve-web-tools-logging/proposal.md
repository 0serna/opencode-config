## Why

The web-tools extension (`web_search`, `web_fetch`) logs failures to `/tmp/pi-web-tools.log`, but lacks success logs and structured error diagnostics. The `/tmp` location is volatile (lost on reboot), and without success logs there is no way to measure the Exa API's actual success rate. Additionally, the Exa Contents API returns detailed error information in a `statuses` field that the code does not read, losing diagnostic value. This change adds persistent logging with size management, success/error diagnostics via the `statuses` field, and HTTP fallback outcome tracking.

## What Changes

1. **Persistent log location**: Move log file from `/tmp/pi-web-tools.log` to `~/.local/state/pi/web-tools.log`
2. **Log size control**: Cap the log at 2000 lines, truncating oldest entries when exceeded
3. **Exa Search success logs**: Log successful searches with query and result count
4. **Exa Contents success logs**: Log successful fetches with URL, status, and text length
5. **Exa `statuses` check**: Parse the `statuses` response field to log specific error tags (e.g., `CRAWL_NOT_FOUND`, `CRAWL_TIMEOUT`) instead of the generic "insufficient" message
6. **HTTP fallback success logs**: Log when the HTTP fallback succeeds (URL, byte count)
7. **Format**: Extended plain-text format with fields appended to existing timestamped lines

## Capabilities

### New Capabilities

- `web-tools-logging`: Log infrastructure for the web-tools extension — persistent file location, line-count-based size control, and structured log format for success and failure events across both `web_search` and `web_fetch` tools

### Modified Capabilities

- `web-fetch`: Error handling requirement is extended to check the Exa `statuses` response field, providing more accurate error diagnostics (specific crawl error tags vs generic failure)
- `web-search`: Error handling requirement is extended to log Exa search failures with API-level status information

## Impact

- **File**: `dotfiles/pi/agent/extensions/web-tools.ts` — the `log()` function and `callExaContents()`, `callExaSearch()`, `tryFetchContent()`, and `executeWebFetch()` functions
- **No API changes**: Tool parameters and return formats remain unchanged
- **No dependency changes**: Relies only on existing Node.js `fs` module (`appendFileSync`, `statSync`, `readFileSync`, `writeFileSync`)
- **New directory**: `~/.local/state/pi/` will be created on first log write if it does not exist
