## Why

The permissions extension (`dotfiles/pi/agent/extensions/permissions.ts`) has grown to ~370 lines with a custom command parser, segment splitter, wrapper stripper, path-aware rm logic, and three categorized rule sets with structured flag+command pairs. This complexity increases maintenance burden and makes it harder to add or modify patterns. The core need — matching commands against a list of regexes and prompting for confirmation — can be achieved with a fraction of the code.

## What Changes

- **Simplify detection logic**: Replace the structured rule sets (`SENSITIVE_GIT_RULES` with flag+command pairs, separated git/gh/system categories) with a single flat array of `RegExp` patterns
- **Replace command parser**: Remove the custom segment splitter, quoted-string scanner, and wrapper-stripping functions. Add a simple preprocessing step that strips quoted content (single/double quotes) and comments before regex matching to prevent false positives from `echo`, commit messages, etc.
- **Narrow rm -rf scope**: Drop path-aware rm detection (which checked for `.`, `..`, `*`, `/`, and `.git` targets). Only flag `rm -rf` when the target is exactly `/` (root).
- **Always flag `bash -c`**: Instead of extracting and inspecting the inner command inside `bash -c "..."`, flag any `bash -c`, `sh -c`, `zsh -c`, or `fish -c` invocation as sensitive
- **Keep unchanged**: TUI prompt (3 options, arrow navigation), session approvals, logging, approval scope derivation (`git rev-parse --show-toplevel`), extension entry point structure
- **Remove**: `SENSITIVE_GIT_RULES`, `SENSITIVE_GH_PATTERNS`, `SENSITIVE_SYSTEM_PATTERNS`, `isRmRecursiveForce`, `parseRmTargets`, `isRmTargetSensitive`, `splitCommandSegments`, `readQuoted`, `scanQuotedString`, `commandDelimiterLength`, `stripLeadingWrappers`, `extractShellWrappedCommand`, `STRIP_RE`, `PRIVILEGE_RE`, `checkGhMethod`, `checkGhApi`, `isSensitiveGitSegment`, `isSensitiveGhSegment`, `isSensitiveSystemSegment`, `checkWrappedOrSystem`, `checkSegment`, `findSensitiveMatch`, `SENSITIVE_RM_PATH_RE`
- **Replace detection with**: A flat `SENSITIVE_PATTERNS: RegExp[]` array + a simple `isSensitive(command)` function that preprocesses (strip quotes, strip comments) then iterates the array

## Capabilities

### Modified Capabilities

- `system-command-detection`: Detection mechanism changes from structured categories + segment parser + wrapper stripper to a flat regex list with quote/comment preprocessing. rm -rf scope narrows from path-aware detection (`.`, `..`, `*`, `/`, `.git`) to only root (`/`). The "order patterns specific-to-general" and "insert system check as last in checkSegment" requirements are no longer applicable since there is a single flat pattern list.
- `privilege-strip-unwrap`: This capability ('strip sudo/doas/pkexec before detecting bash -c wrappers, then inspect inner command') is replaced. Instead of unwrapping and recursively inspecting the inner command, any `bash -c` / `sh -c` / `zsh -c` / `fish -c` invocation is flagged directly as sensitive. The `PRIVILEGE_RE` and `extractShellWrappedCommand` functions are removed.

### New Capabilities

None.

## Impact

- **Single file affected**: `dotfiles/pi/agent/extensions/permissions.ts` (~370 lines → ~100 lines)
- **Behavioral differences**:
  - `rm -rf .`, `rm -rf ..`, `rm -rf *`, `rm -rf /var` no longer trigger prompts (only `rm -rf /`)
  - `echo "git push"` no longer triggers a false positive (quote stripping)
  - `bash -c "echo hello"` now triggers a prompt (was previously inspecting inner command)
  - `sudo bash -c "git push --force"` triggers a single `bash -c` prompt instead of nested unwrapping
  - `git commit -m "sudo rm -rf /"` no longer triggers a false positive (quote stripping)
- **Dependencies unchanged**: Still uses `@earendil-works/pi-coding-agent` (ExtensionAPI, isToolCallEventType) and `@earendil-works/pi-tui` (Key, matchesKey, truncateToWidth, wrapTextWithAnsi)
- **Tests**: Existing tests may need updates for changed rm -rf scenarios and removed functions
