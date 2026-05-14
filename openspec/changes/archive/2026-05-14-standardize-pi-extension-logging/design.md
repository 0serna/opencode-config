## Context

Four pi extensions in `dotfiles/pi/agent/extensions/` currently write diagnostic logs independently:

| Extension     | Log path                              | Format                 | Truncation         | Function     |
| ------------- | ------------------------------------- | ---------------------- | ------------------ | ------------ |
| advisor-hints | `~/.local/state/pi/advisor-hints.log` | JSON `event {...data}` | 2000 lines         | `logEvent()` |
| codex-quota   | `/tmp/pi-codex-quota.log`             | JSON `event {...data}` | None               | `logEvent()` |
| permissions   | `~/.local/state/pi/permissions.log`   | Plain `key=value`      | 160KB / 2000 lines | `log()`      |
| web-tools     | `~/.local/state/pi/web-tools.log`     | Plain `key=value`      | 160KB / 2000 lines | `log()`      |

Each duplicates the boilerplate: `appendFileSync`, directory creation, truncation logic, try/catch. There is no shared module.

Pi extensions run in a Node.js environment where extensions are loaded by the pi agent. Extensions can import from sibling paths via relative ES module imports. The extensions directory is linked to `~/.pi/agent/extensions/` via `dotfiles.json`.

## Goals / Non-Goals

**Goals:**

- Single shared logger at `extensions/shared/logger.ts` providing `log(source, event, data)`
- Consistent log location: `~/.local/state/pi/<source>.log`
- Consistent format: `ISO_TIMESTAMP SOURCE EVENT {...json}\n`
- Consistent truncation: 2000 lines, keep latest
- Consistent error handling: silent try/catch, never break the extension
- Migrate all 4 extensions to use the shared logger, removing their private implementations
- Move codex-quota from `/tmp/` to `~/.local/state/pi/`

**Non-Goals:**

- Log rotation (log file is single, truncated in-place)
- Log levels (info/warn/error — all events are flat, filtering done by event name)
- Redaction of sensitive fields (caller-responsible)
- Async logging (all writes are synchronous via `appendFileSync`)
- Structured logging beyond JSON (no schema registry, no typed events)

## Decisions

### D1: Shared utility vs copied pattern

**Decision**: Shared utility at `extensions/shared/logger.ts`.

**Rationale**: Eliminates 4 copies of nearly identical boilerplate. A single file is easier to audit, maintain, and update. Pi extensions support relative ES module imports, so sharing is trivial.

**Alternatives considered**:

- _Copied pattern_: Each extension keeps its own `log()` with identical structure. Less coupling but more duplication and risk of drift.
- _Pi SDK logging API_: Pi provides `ExtensionContext` but no built-in file logging — building on it would couple logging to extension lifecycle unnecessarily.

### D2: Log path convention

**Decision**: `~/.local/state/pi/<source>.log` — path derived from the `source` parameter passed to `log()`.

**Rationale**: Keeps all pi extension logs in one directory (already the de facto standard for 3 of 4). Deriving the filename from `source` avoids a separate configuration step while keeping each extension's log distinct.

### D3: Log format

**Decision**: `ISO_TIMESTAMP SOURCE EVENT {...json}\n`

Example:

```
2026-05-14T15:23:01.123Z advisor-hints hint {"sessionId":"abc123","toolCalls":12}
```

**Rationale**: ISO timestamps are sortable and timezone-agnostic. SOURCE identifies which extension wrote the line (useful if grepping across files or if someone cats multiple logs). EVENT is a short stable string. JSON data is machine-parseable and supports structured fields like nested objects, arrays, and booleans that `key=value` cannot express cleanly.

**Alternatives considered**:

- _Plain `key=value`_ (current in permissions/web-tools): More human-readable but harder to parse reliably — values with spaces or quotes break naive splitting. Cannot represent nested structures.
- _NDJSON_ (one JSON object per line with top-level keys): Equivalent to our format, ours just uses a fixed prefix for quick visual scanning.

### D4: Truncation strategy

**Decision**: Keep the most recent 2000 lines. Check line count on every write; if exceeded, rewrite the file with the last 2000 lines.

**Rationale**: 2000 lines is the most common limit across the current extensions. Line-based truncation (vs byte-based) is simpler and guarantees at least N entries survive. The file is small (a few hundred KB max), so a read-write cycle on every write past the limit is cheap.

**Alternatives considered**:

- _Byte-based_ (160KB as permissions does now): Protects against very long single lines, but at typical log line lengths (~150 bytes) the 2000-line limit is effectively tighter.
- _Append-only with external rotation_: Overengineered for diagnostic logs.

### D5: Directory creation timing

**Decision**: Create parent directory inside `log()` on every call (`mkdirSync({ recursive: true })`), not in a setup phase.

**Rationale**: Simple and robust — eliminates initialization ordering concerns. `mkdirSync` with `recursive: true` is a no-op if the directory already exists, so the cost is negligible.

### D6: Error handling

**Decision**: Silent try/catch — all logging errors are caught and ignored.

**Rationale**: Logging must never crash the extension or block the agent. This is the existing pattern in all 4 extensions and has been reliable.

This includes JSON serialization failures: if `JSON.stringify(data)` throws (e.g., circular reference, BigInt), the entry is written without the data portion (just `TIMESTAMP SOURCE EVENT\n`). The data is silently omitted rather than crashing the extension.

### D7: Caller-responsible for sensitive data

**Decision**: The shared logger serializes whatever data it receives. Each extension is responsible for not passing sensitive fields (tokens, passwords, secrets) to `log()`.

**Rationale**: Automatic redaction would need a blocklist of field names that may not match actual usage or could produce false negatives. The extensions already control what they log — they just need to continue exercising that judgment. `codex-quota` already avoids logging the full access token (it logs the source key name, not the token value).

## Risks / Trade-offs

| Risk                                                                                                                                       | Mitigation                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Breaking log format for `permissions.log` and `web-tools.log` may affect ad-hoc scripts grepping these files                               | Acceptable — no known scripts depend on these files. Grepping for event names still works since events become the JSON `event` field.        |
| `codex-quota` moves from ephemeral `/tmp/` to persistent `~/.local/state/pi/`, exposing debug data across reboots                          | Caller-responsible discipline already keeps tokens out of logs. Existing logs in `~/.local/state/pi/` from other extensions already persist. |
| If `shared/logger.ts` throws during `import`, all 4 extensions fail to load                                                                | Minimize import-time side effects — the module exports a function, it does nothing at import time.                                           |
| Concurrency: pi extensions are single-threaded (Node.js event loop), but `appendFileSync` + `readFileSync` + `writeFileSync` is not atomic | Acceptable. At most one log line could be lost during truncation. This matches current behavior.                                             |

## Migration Plan

1. Create `extensions/shared/logger.ts` with the standard `log()` function
2. Migrate each extension one by one (order doesn't matter since they're independent):
   - **advisor-hints**: Replace `logEvent()` calls with `log('advisor-hints', event, data)`. Reuse the same `LOG_FILE` value via the shared path convention (no change needed since it already uses `~/.local/state/pi/`).
   - **codex-quota**: Replace `logEvent()` calls with `log('codex-quota', event, data)`. Remove the `LOG_FILE` constant and `/tmp` path.
   - **permissions**: Replace `log()` calls with `log('permissions', event, data)`. Convert `key="value"` string messages into structured `{key, value}` JSON objects.
   - **web-tools**: Replace `log()` calls with `log('web-tools', event, data)`. Convert plain-text messages into structured JSON. Update spec-required behavior to match the shared logger format.
3. Verify each migrated extension loads correctly by running `npm run check` or launching pi and triggering each extension's events
4. Delete the old per-extension truncation, mkdir, and format logic
