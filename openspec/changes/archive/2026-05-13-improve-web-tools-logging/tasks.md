## 1. Log Infrastructure

- [x] 1.1 Move log file from `/tmp/pi-web-tools.log` to `~/.local/state/pi/web-tools.log` and add lazy directory creation via `mkdirSync(dir, { recursive: true })` inside the `log()` function
- [x] 1.2 Add size-control logic to `log()`: after each `appendFileSync`, check file size via `statSync`; if above ~160KB threshold, read file, count lines, and truncate to last 2000 lines

## 2. Exa Statuses Diagnostics

- [x] 2.1 Update `callExaContents()` to parse the `statuses` response array and log the specific error tag (e.g., `CRAWL_NOT_FOUND`, `CRAWL_TIMEOUT`) with HTTP status code when a fetch fails, replacing the generic "exa_contents insufficient" log message
- [x] 2.2 Update `parseExaResponse()` to return the `statuses` array alongside parsed data, or ensure `callExaContents()` has access to the raw response for statuses inspection

## 3. Exa Search Success Logs

- [x] 3.1 Add a success log entry in `executeWebSearch()` after a successful Exa Search response, logging the query string and result count (e.g., `exa_search success query="..." results=5`)
- [x] 3.2 Enhance the existing failure log in `executeWebSearch()` to include the HTTP status or error description when the Exa Search API fails

## 4. Exa Contents Success Logs

- [x] 4.1 Add a success log entry in `callExaContents()` or `executeWebFetch()` after a successful Exa Contents response, logging URL, status tag, and content length (e.g., `exa_contents success url="..." status=success len=4523`)

## 5. HTTP Fallback Outcome Logs

- [x] 5.1 Add a success log entry in `executeWebFetch()` when the HTTP fallback succeeds, logging the URL and byte count (e.g., `web_fetch http_success url="..." bytes=12543`)
- [x] 5.2 Ensure the existing failure log for HTTP fallback (`web_fetch fail`) is preserved and enhanced with the URL and error message format consistent with the new log style

## 6. Verification

- [x] 6.1 Run `npm test` to verify existing tests still pass
- [x] 6.2 Run `npm run check` to verify linting, formatting, and TypeScript compilation
- [x] 6.3 Verify log file is created at `~/.local/state/pi/web-tools.log` after invoking `web_fetch` or `web_search` in pi
