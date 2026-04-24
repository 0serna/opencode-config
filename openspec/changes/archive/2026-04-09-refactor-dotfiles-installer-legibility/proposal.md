## Why

The dotfiles installer logic is currently concentrated in one file, which makes path validation, manifest parsing, and symlink creation harder to scan. Splitting the code into smaller units and renaming the main entry point will improve readability without changing behavior.

## What Changes

- Split the installer logic into smaller modules by responsibility.
- Rename the main installer class and file to better reflect the dotfiles domain.
- Keep the public behavior, manifest format, and validation rules unchanged.
- Preserve the existing test coverage while updating names and imports as needed.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- None.

## Impact

- Affected code: `src/installer.ts` and `src/installer.test.ts`.
- No API, dependency, or runtime behavior changes.
- Documentation may need light wording updates if names change.
