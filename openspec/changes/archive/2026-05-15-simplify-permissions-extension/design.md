## Context

The permissions extension (`dotfiles/pi/agent/extensions/permissions.ts`) intercepts tool calls and checks commands against sensitive patterns before execution. The current implementation uses three specialized detection subsystems (git rules with flag+command pairs, gh patterns, system patterns) supported by a custom command parser (segment splitter, quoted-string scanner, wrapper stripper, path-aware rm analysis). This has grown to ~370 lines.

The extension works and has been reliable, but the complexity is disproportionate to the actual requirement: match a command against a list of regexes and prompt the user. Every pattern addition or modification requires understanding the segment parser, wrapper stripping, and category-specific matching logic.

The change replaces the detection infrastructure with a flat array of regexes plus a simple preprocessing step (strip quoted strings) that eliminates most false positives without needing a full parser.

## Goals / Non-Goals

**Goals:**

- Reduce the detection layer from ~250 lines to ~50 lines
- Make patterns easy to add, remove, or modify — just edit a regex array
- Eliminate the custom command segment parser, wrapper stripper, and path-aware rm logic
- Maintain all existing protections except intentionally narrowed rm -rf scope
- Keep the interactive TUI prompt and session approvals unchanged

**Non-Goals:**

- No changes to the TUI dialog, extension lifecycle, logging, or approval-scope derivation
- No new capabilities — this is purely a simplification of existing detection
- No behavioral changes beyond those explicitly discussed (rm -rf root-only, `bash -c` always flagged)

## Decisions

### D1: Flat regex array instead of structured rule sets

**Decision**: Replace `SENSITIVE_GIT_RULES`, `SENSITIVE_GH_PATTERNS`, and `SENSITIVE_SYSTEM_PATTERNS` with a single `SENSITIVE_PATTERNS: RegExp[]`.

**Rationale**: The current git rules use a [flag-regex | null, command-regex] pair structure because the original design wanted to separate "which command" from "which flag". In practice, this adds complexity without value: flat regexes like `/\bgit\s+push\b.*--force\b/i` are equally expressive and more readable. A single flat list eliminates the ordering dependencies between categories and removes the need for the prioritized `checkSegment` dispatch.

**Alternatives considered**:

- Keep categories but flatten each to a `RegExp[]` (e.g., `GIT_PATTERNS`, `GH_PATTERNS`, `SYSTEM_PATTERNS`). Rejected because it still requires category-level dispatch logic with no benefit — there's no scenario where a pattern's category matters for matching.

### D2: Quote+comment stripping instead of segment parser + wrapper stripper

**Decision**: Remove `splitCommandSegments`, `stripLeadingWrappers`, `extractShellWrappedCommand`, and all supporting functions. Replace with a single `preprocess()` call that strips single-quoted and double-quoted strings before regex matching.

**Rationale**: The segment parser existed to handle compound commands (`&&`, `||`, `;`), but in practice regexes applied to the full command string match correctly regardless of delimiters (e.g., `rm -rf /` matches whether it's `rm -rf /` or `cd /tmp && rm -rf /`). The wrapper stripper handled `env KEY=val cmd`, `command cmd`, `nice cmd`, etc. — but regex matching naturally handles these because `git push` appears in the string even when wrapped. The only real benefit of the parser was preventing false positives from echoed/spoken text (`echo "git push"`), which is cheaper achieved by stripping quoted content.

Stripping quoted strings is a 2-line regex replacement instead of a 70-line parser, and handles the echo/commit-message false positive cases completely.

**Trade-off**: `bash -c "rm -rf /"` loses the inner command after quote stripping, but this is handled by D3.

**Alternatives considered**:

- Keep segment splitting but simplify it. Rejected — the benefit (marginally better precision for compound commands) doesn't justify keeping even a simplified segment parser.
- Only strip specific patterns (echo/printf prefixes) instead of all quotes. Rejected — it's less reliable and more complex than universal quote stripping.

### D3: Shell -c always sensitive instead of inner-command inspection

**Decision**: Remove `extractShellWrappedCommand` and `PRIVILEGE_RE`. Add `/\b(?:bash|sh|zsh|fish)\s+-c\s+/i` to the sensitive patterns array. Any `bash -c`, `sh -c`, `zsh -c`, or `fish -c` invocation triggers a permission prompt regardless of the inner command.

**Rationale**: With quote stripping, the inner command inside `bash -c "..."` is removed and can't be inspected. Instead of trying to reconstruct wrapper-detection logic, we treat any shell `-c` invocation as inherently sensitive — it executes arbitrary code, which is a reasonable thing to prompt for.

**Trade-off**: `bash -c "echo hello"` now prompts (low false-positive cost — rare in agent usage). Previous behavior could distinguish dangerous from harmless inner commands.

### D4: rm -rf root-only instead of path-aware detection

**Decision**: Replace `isRmRecursiveForce` + `parseRmTargets` + `isRmTargetSensitive` with a single regex that matches `rm` with both `-r`/`-f` flags targeting `/` (root) specifically.

**Rationale**: Path-aware rm detection required 40+ lines across three functions to parse flags, extract targets, and check against a sensitive-path regex. The narrowed scope (only `/`) captures the truly catastrophic case while being expressible as a single regex. Paths like `.`, `..`, `*`, `/var`, and `.git` targets are no longer flagged; the user considered this acceptable during design review.

**Regex design**: The pattern handles combined flags (`-rf`, `-fr`, `-rfv`), separate flags (`-r -f`, `--recursive --force`), end-of-options separator (`--`), and ensures the target is exactly `/` (not `/var` or `/path/to/`).

### D5: TUI and session approvals remain unchanged

**Decision**: The interactive TUI prompt (3 options, arrow navigation), `sessionApprovals` Set, `getApprovalScope` (git repo root), `buildCmdInfo`, and `log` calls are all preserved as-is.

**Rationale**: These are not part of the complexity problem. The TUI is ~80 lines that work correctly and provide good UX. Session approvals are core functionality. Changing them would add risk without benefit.

## Risks / Trade-offs

| Risk                                                                                                                    | Mitigation                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Broader `bash -c` matching**: `bash -c "echo hi"` now prompts, which might annoy users during development             | Extremely rare in practice — agents don't commonly run `bash -c "echo hi"`. Accepted trade-off.                                                                                                                             |
| **Quoted path loss**: `rm -rf "/"` (with literal quotes) escapes preprocessing safeguard                                | Extremely uncommon syntax. The common form `rm -rf /` (no quotes) is properly detected. Accepted trade-off.                                                                                                                 |
| **Pattern ordering ambiguity**: With a flat array, which pattern's "reason" is presented when multiple match?           | The extension uses `findSensitiveMatch` which returns the first match. With a flat array, patterns should be ordered most-specific-first. The `preprocess` function ensures false positives from echoed text are minimized. |
| **Regression in compound command detection**: `cmd1; rm -rf /; cmd2` might behave differently without segment splitting | The regex matches against the full string — `rm -rf /` is found regardless of surrounding commands. No regression.                                                                                                          |
