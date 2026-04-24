## Context

The current installer implementation combines manifest loading, entry validation, path resolution, and symlink replacement in a single file. The code already behaves correctly, but the file is dense enough that small changes require scanning multiple unrelated concerns at once.

## Goals / Non-Goals

**Goals:**

- Improve readability by separating responsibilities.
- Rename the main installer type to better match the dotfiles domain.
- Keep the manifest format, validation rules, and runtime behavior unchanged.

**Non-Goals:**

- No new features or validation rules.
- No changes to the dotfiles manifest schema.
- No packaging, dependency, or runtime changes.

## Decisions

- Keep a single public entry point for installation.
  - Rationale: the CLI and tests benefit from a simple surface area, while the internals can still be decomposed.
  - Alternatives considered: exposing multiple helpers publicly, which would create more API surface without adding value.

- Extract small internal helpers by responsibility.
  - Rationale: manifest parsing, path resolution, and linking are distinct concerns and read better when isolated.
  - Alternatives considered: leaving everything in one class with more private methods, which would still keep the file dense.

- Rename the installer to reflect the domain.
  - Rationale: `DotfilesInstaller` communicates the purpose immediately and reduces generic naming.
  - Alternatives considered: keeping `ConfigInstaller`, which is broader and less precise.

- Keep tests aligned with the new names while preserving the same scenarios.
  - Rationale: the current tests already describe the intended behavior; only the wiring should change.
  - Alternatives considered: rewriting test coverage, which is unnecessary for a pure refactor.

## Risks / Trade-offs

- [Risk] Renaming imports or file paths could introduce broken references. → Mitigation: update the test and CLI entrypoint together, then run the existing suite.
- [Risk] Splitting logic may accidentally alter error text or flow. → Mitigation: preserve the current control flow and reuse the same validation steps.
- [Risk] More files can feel heavier for a small codebase. → Mitigation: keep the split minimal and only separate clearly distinct responsibilities.
