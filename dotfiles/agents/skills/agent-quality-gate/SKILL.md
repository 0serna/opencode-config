---
name: agent-quality-gate
description: Set up or update the quality gate in package.json. Generates scripts/check.sh with agent-parseable output, configures format, auto-fix via lint-staged, pre-commit hooks, and test — while preserving existing tools and asking before modification.
---

Use this skill when the user asks to create, improve, or modify the project's quality gate. It updates `package.json` entries, generates `scripts/check.sh`, and ensures the full pipeline:

- **`check`** — agent-parseable fail-slow validation via `scripts/check.sh`
- **`format`** — code formatting via prettier
- **`prepare`** — git hooks via husky
- **Auto-fix on commit** — prettier + eslint --fix via lint-staged
- **`test`** — test script (when a test framework is installed or a test script already exists)

## Workflow

### 1. Inspect the repository

- Read `package.json` — check for `scripts.check`, `scripts.format`, `scripts.prepare`, `scripts.test`, `devDependencies`, `dependencies`, `lint-staged`, and `packageManager`
- Read `scripts/` or equivalent script directory
- Read `.husky/pre-commit` if it exists
- Read config files for detectable tools:
  - `eslint.config.*`, `tsconfig.json`, `.fallowrc.*`, `fallow.config.*`, `openspec.yaml`, `.openspec.yaml`
- Detect monorepo orchestrator configs: `nx.json`, `turbo.json`, `lerna.json`, or `workspaces` in `package.json`

### 2. Detect existing quality gate elements

Classify each element's state — **missing**, **matches standard**, or **differs**:

| Element           | Location                      | Standard                                                                                  |
| ----------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| `check` script    | `scripts.check`               | `bash <scripts-dir>/check.sh`                                                             |
| `format` script   | `scripts.format`              | `prettier --write .`                                                                      |
| `prepare` script  | `scripts.prepare`             | `husky`                                                                                   |
| `lint-staged`     | `lint-staged` in package.json | `"*"` → `prettier --write --ignore-unknown`; `*.{js,jsx,ts,tsx,mjs,cjs}` → `eslint --fix` |
| `pre-commit` hook | `.husky/pre-commit`           | `npx lint-staged && npm run check`                                                        |
| `test` script     | `scripts.test`                | — (user-defined, only if applicable)                                                      |

For each element:

- **Missing**: note as "to create"
- **Matches standard**: skip
- **Differs**: note as "to normalize — will ask"

Also scan the existing `check` script for default tools (see step 4).

### 3. Ask for confirmation

Present all intended changes together and ask once. Include deps to install, files to create, and configs to normalize.

If `test` is applicable (test framework installed or existing test script) but no `scripts.test` is defined, ask separately: _"Test framework detected but no test script. What command should it run?"_ If the user declines, skip it.

### 4. Handle default check tools

For each default tool (eslint, tsc, fallow, openspec):

- **If directly present** in the parsed check segments (its own command) → **adapt** it: add or adjust flags to produce agent-friendly output (see table below)
- **Covered by an opaque segment** (e.g., eslint inside `nx run-many -t lint`) → leave it; the opaque segment already covers it
- **Not in the check at all** but installed → **auto-configure** with the full command from the table
- **Not installed** → if the user agreed to install in step 3, treat as auto-configured; otherwise ask separately

| Tool       | Command                                                            | Notes                                                     |
| ---------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| `eslint`   | `run_tool eslint eslint . --format json`                           | Add `--format json` for parseable output                  |
| `tsc`      | `run_tool tsc tsc --noEmit`                                        | Text output is sufficiently parseable; no JSON flag       |
| `fallow`   | `run_tool fallow fallow --production-health --format json --quiet` | Always apply `--format json --quiet` for parseable output |
| `openspec` | `run_tool openspec openspec validate --all --json`                 | Always apply `--json` for parseable output                |

### 5. Determine the script path

Use the first existing scripts directory among: `scripts/`, `bin/`, `tools/`, `lib/`. If none exist, create `scripts/`. Always name the file `check.sh`.

### 6. Generate the quality gate

Create or update each element according to the decisions from steps 3–4.

**`package.json`** entries to add or update:

```json
"check": "bash <scripts-dir>/check.sh",
"format": "prettier --write .",
"prepare": "husky",
```

If a test script was agreed upon in step 3:

```json
"test": "<user-defined command>",
```

If lint-staged was agreed upon, add or update:

```json
"lint-staged": {
  "*": "prettier --write --ignore-unknown",
  "*.{js,jsx,ts,tsx,mjs,cjs}": [
    "eslint --fix"
  ]
}
```

**`.husky/pre-commit`** — create using the [template](assets/templates/pre-commit). Make it executable (`chmod +x`). If husky was freshly installed, run `npx husky init` first.

**`scripts/check.sh`** — use the [template](assets/templates/check.sh) to generate the file. Replace the example tool runs with the actual tools for this repo (default tools adapted as per step 4; non-default tools and opaque commands preserved verbatim). Substitute `<scripts-dir>` in the `package.json` entry with the path from step 5.

Variable naming: uppercase with underscore matching the tool name (e.g. `ESLINT_EXIT`, `TSC_EXIT`, `FALLOW_EXIT`, `OPENSPEC_EXIT`). For non-default tools, derive from the tool name (e.g. `LINT_STRICT_EXIT`, `VALIDATE_DOCS_EXIT`).

### 7. Verify

Run both:

- `npm run check`
- `bash <scripts-dir>/check.sh`

Confirm that all tools ran, exit code is 0 when all pass, only failing tools emit their block, and SUMMARY/DONE are always present.

Also run `npm run format` to confirm the format script works, and check that `.husky/pre-commit` exists and is executable.

## Rules

- **Ask before making changes**. Present all intended modifications and missing dependencies together in step 3 and ask once.
- **Prefer keeping test runners and formatters out of `check.sh`**. Formatting belongs in the `format` script and `lint-staged`; tests belong in the `test` script.
- **Only expand `npm run <name>` scripts one level deep**. Do not recursively resolve chains.
- **Preserve opaque commands verbatim**. If a check segment is not a recognizable default tool, preserve it wrapped in `run_tool` without modifying flags.
- **Do not change fail-fast semantics**. The generated script runs all tools regardless of exit code.
- **Do not add `set -e` to the script**. The fail-slow pattern depends on all tools running even after failures; `set -e` would abort execution on the first non-zero exit.
- **Keep script files executable**: `chmod +x <scripts-dir>/check.sh` and `chmod +x .husky/pre-commit`.
- **Use `bash` universally** in `package.json` scripts regardless of the detected package manager.

## Edge Cases

- **No test framework and no test script**: skip the `test` script entirely.
- **Multiple test frameworks present**: prefer the one with a config file (`vitest.config.*`, `jest.config.*`). If ambiguous, ask.
- **`npm-run-all` with glob patterns**: do not expand. Preserve as `run_tool npm-run-all npm-run-all --parallel lint:*`.
- **Pipes and redirections** in check: preserve the entire pipeline as a single opaque command in `run_tool`.
- **No scripts directory exists**: create `scripts/` and generate `scripts/check.sh`.
- **Previously generated script exists**: detect by `---CHECK:` pattern and ask before overwriting.
- **Orchestrator with embedded default tools** (e.g., `nx run-many -t lint typecheck`): do not adapt or auto-configure them separately.
- **`bash` is not available**: do not generate. The script depends on bash.
- **husky not initialized** (no `.husky/` directory): run `npx husky init` after installing.
- **lint-staged already exists with different globs**: present the difference in step 3 and ask whether to replace or keep.

## Output

Report:

- Where `scripts/check.sh` was created or updated
- Which `package.json` entries were created or modified (`check`, `format`, `prepare`, `test`, `lint-staged`)
- Whether `.husky/pre-commit` was created or modified
- How many tools were preserved from the original check
- How many default tools were adapted or auto-configured
- How many dependencies were installed
- Verification result
