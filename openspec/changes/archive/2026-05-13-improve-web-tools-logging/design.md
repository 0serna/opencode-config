## Context

The `web-tools.ts` extension (providing `web_search` and `web_fetch` tools) uses a simple `log()` function that appends to `/tmp/pi-web-tools.log`. The log is write-only — it captures failure events but not successes, making it impossible to measure the Exa API's actual success rate. The `/tmp` location is volatile (cleared on reboot). The Exa Contents API returns detailed per-URL error information in a `statuses` response field that is currently ignored, reducing diagnostic value when fetches fail.

The implementation is a single TypeScript file (`dotfiles/pi/agent/extensions/web-tools.ts`) using only Node.js built-in `fs` module for logging. No external logging library is used or planned.

## Goals / Non-Goals

**Goals:**

- Move log to a persistent XDG-compliant location (`~/.local/state/pi/web-tools.log`)
- Prevent unbounded log growth with a 2000-line cap (truncate oldest entries)
- Log successful Exa Search calls (query + result count)
- Log successful Exa Contents calls (URL + status + content length)
- Parse and log Exa `statuses` error tags for failed Contents calls (e.g., `CRAWL_NOT_FOUND`)
- Log HTTP fallback outcomes (success with byte count, or error)
- Use consistent extended plain-text format parseable by grep/tail/scripts
- Create log directory automatically on first write
- Existing tool parameters, return formats, and behavior remain unchanged

**Non-Goals:**

- Switch to a structured logging library (winston, pino, etc.)
- Add log rotation with multiple archive files
- Add remote log shipping or metrics
- Change the TUI render output (existing `(fallback)` indicator stays as-is)
- Optimize Exa livecrawl or add GitHub URL bypass (deferred for future data-driven decision)

## Decisions

### Decision 1: Log location — `~/.local/state/pi/`

| Alternative             | Chosen?   | Reason                                                                                                                                                                  |
| ----------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/tmp/pi-web-tools.log` | (current) | Lost on reboot, defeats diagnostic purpose                                                                                                                              |
| `~/.local/state/pi/`    | **✓**     | Follows XDG Base Directory spec (`$XDG_STATE_HOME` default). Semantically correct for application state (logs). Used by bash, vim, systemd --user for similar purposes. |
| `~/.pi/logs/`           | No        | Non-standard, though convenient. The XDG path is more discoverable and spec-compliant.                                                                                  |
| `~/.cache/pi/`          | No        | Cache implies recreatable data. Logs should persist.                                                                                                                    |

### Decision 2: Size control — line-count cap (2000 lines)

| Alternative                      | Chosen? | Reason                                                                                                                                      |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Line-count cap (2000)            | **✓**   | Simple, predictable, easy to reason about. ~2000 lines at ~100 bytes/line ≈ 200KB max. The `check-then-trim` approach is fast at this size. |
| Byte-size cap (e.g., 1MB)        | No      | Harder to predict line count. Truncation boundary might split a line.                                                                       |
| Log rotation (log, log.1, log.2) | No      | Adds complexity with multiple files. Overkill for a diagnostic log at ~200KB.                                                               |
| External logrotate               | No      | Requires system configuration, not portable.                                                                                                |
| No size control                  | No      | Unbounded growth on a persistent path would eventually fill disk.                                                                           |

**Implementation approach**: After each `appendFileSync`, check file size (via `statSync`). If size exceeds an estimated threshold (2000 × ~80 bytes ≈ 160KB), read the file, count lines, and if > 2000, truncate to last N lines. This avoids reading the file on every write when it's small. The `readFileSync` + `writeFileSync` operation on a ~200KB file is negligible.

### Decision 3: Log format — extended plain text

| Alternative         | Chosen? | Reason                                                                                                                                          |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Extended plain text | **✓**   | Backward-compatible with existing format. Greppable. Human-readable in `tail -f`. Simple to implement.                                          |
| JSON per line       | No      | More parseable but harder to read in real-time. Requires quoting. Better for programmatic consumption, but current use case is human-tail+grep. |

Format pattern:

```
<ISO_TIMESTAMP> <event_type> <key>="<value>" <key>=<number> ...
```

### Decision 4: Exa `statuses` handling

Currently: `parseExaResponse` checks `response.ok` (HTTP-level), then extracts `results[0].text`. The `statuses` array is ignored.

**New approach**: After parsing the response, inspect the `statuses` array for the requested URL. If `status === "error"`, log the specific `tag` and `httpStatusCode`. If the response has no results or short text, cross-reference with `statuses` to determine whether the cause was a crawl error vs. Exa simply extracting minimal content. This replaces the generic "insufficient" message with precise diagnostics.

### Decision 5: Directory creation — lazy on first write

The directory will be created only when the first log entry is written, using `mkdirSync(dir, { recursive: true })` inside the `log()` function's try-catch. This avoids requiring setup steps and keeps the implementation self-contained.

### Decision 6: Trim strategy — check-after-each-write with size heuristic

Rather than reading the file on every write, the implementation checks `statSync` file size first. Only when the file exceeds ~160KB (estimated max for 2000 lines) does it read, count lines, and potentially trim. This minimizes I/O for the common case (small log).

## Risks / Trade-offs

- **[Race condition on trim]**: If two tool calls write concurrently, both could trigger the trim check and read/write simultaneously. **Mitigation**: In practice, Node.js processes are single-threaded and pi processes one tool call at a time. Acceptable risk for a diagnostic log.
- **[Log loss on trim error]**: If the trim operation (read → write) fails midway, the log could be truncated to zero. **Mitigation**: The write is done in a try-catch that silently ignores errors, consistent with the existing logging approach. At worst, the log is cleared — no user-facing impact.
- **[Performance of stat on every write]**: `statSync` on every log call adds syscall overhead. **Mitigation**: ~200KB file stat is sub-millisecond. Log writes happen only on tool invocations (not in hot paths). Acceptable.
- **[XDG_STATE_HOME override]**: If `$XDG_STATE_HOME` is set, `~/.local/state/` would not be the correct path. **Mitigation**: The spec defines `~/.local/state/` as default. If the user overrides it, they'd expect tools to follow the env var. However, this extension uses the hardcoded path for simplicity. Acceptable trade-off for a diagnostic log.
