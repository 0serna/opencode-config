## 1. Add SENSITIVE_SYSTEM_PATTERNS array and detection function

- [x] 1.1 Define `SENSITIVE_SYSTEM_PATTERNS` as `{ test: RegExp; reason: string }[]` with patterns ordered specific→general: `rm -rf`/`--recursive`, `dd`, `mkfs.*`/`fdisk`/`parted`, `shutdown`/`reboot`/`poweroff`/`halt`, `chmod`/`chown 777`, `curl`/`wget` pipe to shell, and `sudo`
- [x] 1.2 Implement `isSensitiveSystemSegment(segment: string): string | null` that calls `stripLeadingWrappers` and returns the first matching reason from `SENSITIVE_SYSTEM_PATTERNS`
- [x] 1.3 Add the system check as the last branch in `checkSegment` after the wrapped check
- [x] 1.4 Verify detection scenarios from specs: each system pattern correctly matches its target commands

## 2. Add privilege-stripping unwrap in extractShellWrappedCommand

- [x] 2.1 Define `PRIVILEGE_RE = /^(?:sudo|doas|pkexec)\s+/i` scoped inside `extractShellWrappedCommand`
- [x] 2.2 After `stripLeadingWrappers`, add a `while` loop that strips `PRIVILEGE_RE` matches before the shell-wrapper regex
- [x] 2.3 Confirm `sudo bash -c "git push --force"` unwraps to inner git command (system rules still see raw `sudo`)

## 3. Migrate scope detection to pi.exec

- [x] 3.1 Verify `pi.exec` signature from local `@earendil-works/pi-coding-agent` packages — confirm whether options accept `cwd` or if `cd` prefix is needed
- [x] 3.2 Change `getApprovalScope(cwd)` to `getApprovalScope(cwd, pi)` and make it async using `pi.exec`
- [x] 3.3 Cascade async through `buildCmdInfo(command, cwd, pi)` and `handleToolCall`
- [x] 3.4 Pass `pi` from the default export to these functions (parameter pattern, not closure)

## 4. Replace logging with web-tools.ts pattern

- [x] 4.1 Change `LOG_FILE` constant from `/tmp/pi-permission-gate.log` to `~/.local/state/pi/permissions.log`
- [x] 4.2 Replace `logEvent` with the `web-tools.ts` pattern: `mkdirSync` + `appendFileSync` + ISO timestamp + string message + rotation at ~160 KB / 2000 lines
- [x] 4.3 Update all `logEvent(...)` call sites to use the new `log(msg)` function with string arguments

## 5. Verify and test

- [x] 5.1 Run `npm run check` to verify TypeScript compilation and linting
- [x] 5.2 Run `npm run link` to ensure the updated extension is linked correctly
- [x] 5.3 Load the extension with `pi -e dotfiles/pi/agent/extensions/permissions.ts` and verify startup with no errors
- [x] 5.4 Run a system-safe command (`ls`, `echo`) and confirm no prompt
- [x] 5.5 Run a system-dangerous command (`sudo echo test`) and confirm the approval dialog appears with the correct reason
