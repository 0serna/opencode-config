## MODIFIED Requirements

### Requirement: Existing targets are replaced safely

The system SHALL replace existing files, directories, or symlinks at the target path and create missing parent directories, but only after the target has passed safety validation. When preparing parent directories, the system SHALL preserve unmanaged ancestor symlinks and SHALL only replace an immediate parent symlink when it resolves inside the repository.

#### Scenario: Replace an existing file at a safe target

- **WHEN** a safe target path already contains a regular file
- **THEN** the installer replaces it with the requested symlink

#### Scenario: Create missing parent directories for a safe target

- **WHEN** a safe target path has missing parent directories
- **THEN** the installer creates them before linking

#### Scenario: Preserve unmanaged ancestor symlink while linking safe target

- **WHEN** a safe target path is under a symlinked ancestor directory that is not the immediate parent
- **THEN** the installer preserves that ancestor symlink before linking

#### Scenario: Replace repo-backed immediate parent symlink before linking safe target

- **WHEN** the immediate parent of a safe target path is a symlink that resolves inside the repository
- **THEN** the installer replaces that parent with a real directory before linking
