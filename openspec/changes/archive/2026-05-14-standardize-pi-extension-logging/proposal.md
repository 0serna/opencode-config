## Why

Four pi extensions (`advisor-hints`, `codex-quota`, `permissions`, `web-tools`) each implement their own logging logic independently, leading to inconsistencies in log location, format, truncation, and API. This makes log analysis harder, risks unbounded file growth (codex-quota has no truncation), and duplicates code. A shared logger utility eliminates duplication and enforces a consistent standard.

## What Changes

- Create `extensions/shared/logger.ts` — a single importable utility providing `log(source, event, data)` with uniform format, path, truncation, and error handling
- Migrate `advisor-hints`, `codex-quota`, `permissions`, and `web-tools` to use the shared logger, removing their private logging implementations
- Move `codex-quota` log path from `/tmp/pi-codex-quota.log` to `~/.local/state/pi/codex-quota.log`
- Change `permissions` and `web-tools` log format from `key=value` plain text to structured JSON, aligning with `advisor-hints` and `codex-quota`
- **BREAKING**: Log format changes for `permissions.log` and `web-tools.log` — existing parsers or grep patterns on these files will break

## Capabilities

### New Capabilities

- `shared-logger`: Contract, API, and behavior of the shared logger utility used by all extensions

### Modified Capabilities

- `web-tools-logging`: Requirements change from inline `key=value` plain-text logging to consuming the shared logger with JSON-structured format

## Impact

- **Files changed**:
  - `dotfiles/pi/agent/extensions/shared/logger.ts` (new)
  - `dotfiles/pi/agent/extensions/advisor-hints.ts` (refactor log calls)
  - `dotfiles/pi/agent/extensions/codex-quota.ts` (refactor log calls, remove `/tmp` path)
  - `dotfiles/pi/agent/extensions/permissions.ts` (refactor log calls, change format)
  - `dotfiles/pi/agent/extensions/web-tools.ts` (refactor log calls, change format)
- **Log location change**: `/tmp/pi-codex-quota.log` → `~/.local/state/pi/codex-quota.log`
- **Log format change**: `permissions.log` and `web-tools.log` switch from `key=value` to JSON
- **New dependency**: `shared/logger.ts` imported by 4 extensions
