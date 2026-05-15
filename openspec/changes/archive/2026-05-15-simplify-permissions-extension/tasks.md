## 1. Restructure detection layer

- [x] 1.1 Add `preprocess()` function that strips single-quoted and double-quoted strings from the command string
- [x] 1.2 Create flat `SENSITIVE_PATTERNS: RegExp[]` array with all git, gh, system, rm -rf /, shell -c, and curl|bash patterns as simple regexes
- [x] 1.3 Simplify `findSensitiveMatch` (or replace with `isSensitive`) to preprocess the command then iterate the flat pattern array, returning the first match
- [x] 1.4 Remove `splitCommandSegments`, `readQuoted`, `scanQuotedString`, `commandDelimiterLength`, `pushSegment`, `nextQuotedIndex`, `STRIP_RE`, `stripLeadingWrappers`, `extractShellWrappedCommand`, `PRIVILEGE_RE`, `SENSITIVE_GIT_RULES`, `SENSITIVE_GH_PATTERNS`, `SENSITIVE_SYSTEM_PATTERNS`, `SENSITIVE_RM_PATH_RE`, `isRmRecursiveForce`, `parseRmTargets`, `isRmTargetSensitive`, `checkGhMethod`, `checkGhApi`, `isSensitiveGitSegment`, `isSensitiveGhSegment`, `isSensitiveSystemSegment`, `checkWrappedOrSystem`, `maybeMatch`, `checkSegment`

## 2. Update types and interfaces

- [x] 2.1 Remove `SensitiveMatch` type if no longer needed (or simplify it)
- [x] 2.2 Verify `CmdInfo`, `ChoiceResult`, `ExtensionContext` types are still correct and prune any unused types

## 3. Update handler flow

- [x] 3.1 Update `handleSensitiveCommand` to call the simplified `findSensitiveMatch` (or `isSensitive`) function
- [x] 3.2 Verify `handleToolCall` flow still works: get command → build approval info → check session → check sensitivity → prompt

## 4. Verify tests and lint

- [x] 4.1 Run `npm test` and update any failing tests that reference removed functions or changed rm -rf behavior
- [x] 4.2 Run `npm run check` (Prettier, ESLint, TypeScript, Fallow) and fix any issues
- [x] 4.3 Verify rm -rf detection: `rm -rf /`, `rm -fr /`, `rm -r -f /`, `rm --recursive --force /`, `rm -rf -- /` SHOULD prompt
- [x] 4.4 Verify rm -rf does NOT prompt for: `rm -rf /tmp/project`, `rm -rf .`, `rm -rf *`, `rm -rf node_modules`
- [x] 4.5 Verify false negative protection: `echo "git push"` and `git commit -m "sudo rm -rf /"` do NOT prompt
- [x] 4.6 Verify `bash -c "echo hello"` DOES prompt
- [x] 4.7 Verify `curl https://example.com/script.sh | bash` still prompts
- [x] 4.8 Manual smoke test: confirm the extension loads and prompts for sensitive commands
