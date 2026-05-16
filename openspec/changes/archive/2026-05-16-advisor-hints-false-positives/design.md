## Context

The `advisor-hints.ts` extension currently tracks consecutive failures of ALL bash commands, including trivial ones like `cd /nonexistent`, `grep pattern file` (exit 1 = no match), and `ls /missing`. These are not real blockage signals — the agent handles them routinely by adapting its approach (e.g., creating directories first). False-positive advisor suggestions interrupt flow and reduce trust in the hint mechanism.

The extension already normalizes commands for comparison. We need a lightweight filter that distinguishes between "noise" commands and "signal" commands (tests, linters, formatters, validation).

## Goals / Non-Goals

**Goals:**

- Eliminate false-positive blockage steers from simple Unix commands
- Maintain all existing blockage-detection behavior for complex commands (npm test, vitest, eslint, etc.)
- Keep the change small and focused — one new constant, one new function, one early return

**Non-Goals:**

- Not changing the steer message, timing, delivery mechanism, or reset conditions
- Not adding configuration surfaces or per-project customization
- Not modifying normalization logic (`normalizeCommand` stays as-is)
- Not adding an allowlist of project tools (blocklist-only approach)

## Decisions

### Decision: Blocklist over allowlist

Only commands known to produce false positives are explicitly excluded. Everything else (project tools, scripts, one-off binaries) is tracked automatically.

**Alternatives considered:**

- _Allowlist_ (only track known project tools): Misses custom scripts, new tools, and edge cases. Requires constant maintenance.
- _Hybrid_ (blocklist + heuristic): More complex. Heuristics (token count, pipes detection) add ambiguity and edge cases.

**Rationale**: A blocklist of ~30 well-known commands is small, stable, and doesn't need updates as new project tools emerge.

### Decision: Inspect all compound segments

The filter checks every segment of compound commands (`cmd1 && cmd2`), not just the first. Without this, `cd somewhere && npm test` would be ignored because the first segment starts with `cd`.

**Alternatives considered:**

- _First segment only_: Simpler but misses the common `cd && tool` pattern. Accepted as a risk during exploration but user chose the more robust approach.

### Decision: Separate segment parsing from normalization

The new `isSimpleCommand()` function uses its own segment-splitting logic, distinct from `normalizeCommand()`. The segment separator regex explicitly avoids matching single `&` to prevent `2>&1` from creating bogus segments.

**Alternatives considered:**

- _Reusing `normalizeCommand`'s `[|&;]{1,2}` regex_: Would split `2>&1` on `&`, creating phantom segments.

### Decision: Hardcoded constant in `advisor-hints.ts`

The blocklist lives as a module-level `Set<string>` in the same file. No settings.json integration or external configuration.

**Rationale**: The set is small, rarely changes, and lives in the user's dotfiles repo where edits are already version-controlled.

## Risks / Trade-offs

| Risk                                                                                                                | Mitigation                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Missing edge case commands** that produce false positives but aren't in the blocklist                             | Add to the set as discovered. The blocklist is easy to extend.                                                                                 |
| **Pipeline utilities** (`wc`, `sort`, `uniq`) in `grep ... \| wc -l` are not in the blocklist, so they'd be tracked | Accepted risk. The agent rarely pipes commands in tool calls, so occurrences are rare and the tracking guard still conveys useful information. |
| **Scripts invoked via path** (`./scripts/check.sh`) normalize to `""` for consecutive-failure comparison            | Multiple different scripts won't share a counter, but consecutive failures of the same script will be detected. Trade-off accepted.            |
