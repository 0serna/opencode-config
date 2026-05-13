## Why

The current `permissions.ts` extension only guards destructive git and gh CLI operations, leaving system-level dangerous commands (rm -rf, sudo, chmod 777, dd, mkfs, etc.) completely unblocked. Meanwhile, the official pi `permission-gate.ts` example covers system threats but lacks the session-approval UX, command-segment parsing, and shell-wrapper detection that make the current extension practical for daily use. Merging both threat models into a single well-architected extension eliminates a blind spot while adopting community-established patterns.

## What Changes

- **Add system-level dangerous command detection** to `permissions.ts`: `rm -rf`/`--recursive`, `sudo`, `chmod`/`chown 777`, `dd`, `mkfs.*`/`fdisk`/`parted`, `shutdown`/`reboot`/`poweroff`/`halt`, and `curl`/`wget` piped to a shell interpreter.
- **Add sudo-aware shell-wrapper unwrapping** so `sudo bash -c "git push --force"` is caught with the specific git reason rather than a generic sudo block.
- **Migrate git-root scope detection** from raw `spawnSync` to `pi.exec` for consistency with the pi runtime.
- **Replace ad-hoc JSON logging** (`/tmp/pi-permission-gate.log`) with the `web-tools.ts` logging pattern: `~/.local/state/pi/permissions.log` with auto-rotation at ~160 KB / 2000 lines.
- **Refactor `checkSegment` ordering** to `git → gh → wrapped (with privilege-stripping) → system` so that nested destructive commands yield the most specific possible block reason.
- **No timeout** on approval dialogs (user preference).

## Capabilities

### New Capabilities

- `system-command-detection`: Detect destructive system-level commands (rm -rf, sudo, chmod 777, dd, mkfs/fdisk/parted, shutdown/reboot, curl/wget pipe to shell) and prompt for confirmation before execution.
- `privilege-strip-unwrap`: Strip sudo/doas/pkexec prefixes from commands when detecting nested shell wrappers, so privilege-escalated wrapped commands still yield the most specific block reason.

### Modified Capabilities

- _(none — the existing permissions extension has no formal spec)_

## Impact

- **Single file changed**: `dotfiles/pi/agent/extensions/permissions.ts`
- **New dependency**: `pi.exec` API (already available via `@earendil-works/pi-coding-agent`)
- **Log file location changes**: from `/tmp/pi-permission-gate.log` to `~/.local/state/pi/permissions.log` — no breaking impact since the old log was ephemeral
- **No new npm dependencies**: all imports already available in the pi extension runtime
