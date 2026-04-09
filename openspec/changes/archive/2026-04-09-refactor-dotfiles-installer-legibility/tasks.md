## 1. Split installer responsibilities

- [x] 1.1 Extract manifest loading and entry validation into a dedicated module.
- [x] 1.2 Extract source and target path resolution into a dedicated module.
- [x] 1.3 Extract symlink replacement/linking into a dedicated module.

## 2. Rename the public entry point

- [x] 2.1 Rename `ConfigInstaller` to `DotfilesInstaller`.
- [x] 2.2 Rename the main installer file and update imports/CLI wiring.

## 3. Update tests and verify behavior

- [x] 3.1 Update tests to use the new names and module layout.
- [x] 3.2 Run the existing test and typecheck/check suite to confirm behavior is unchanged.
