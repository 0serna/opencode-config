## 1. Parent Directory Preparation

- [x] 1.1 Refactor parent directory preparation so recursive ancestor creation does not remove symlinks above the immediate target parent.
- [x] 1.2 Add immediate-parent symlink handling that resolves the symlink target before deciding whether migration is allowed.
- [x] 1.3 Replace the immediate parent symlink only when it resolves inside the repository, then create the real parent directory.
- [x] 1.4 Fail installation without removal when the immediate parent symlink resolves outside the repository or cannot be resolved safely.

## 2. Regression Coverage

- [x] 2.1 Add a test proving a symlinked ancestor such as `~/.config` is preserved while linking a nested target.
- [x] 2.2 Add a test proving an existing repo-backed immediate parent symlink such as `~/.config/opencode` is still migrated to a real directory.
- [x] 2.3 Add a test proving an immediate parent symlink to an external directory causes installation to fail without deleting the symlink.

## 3. Verification

- [x] 3.1 Run the configured test suite and confirm all installer tests pass.
- [x] 3.2 Run configured lint, format, or build checks if present.
