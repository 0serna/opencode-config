## 1. Codex quota data flow

- [x] 1.1 Identify the Codex auth source and quota endpoint path to reuse for the footer indicator.
- [x] 1.2 Add or adapt Codex quota parsing so the footer can read remaining 5h, remaining 7d, and integer remaining credits.
- [x] 1.3 Define fallback behavior for partial or unavailable Codex quota data so unavailable segments are omitted cleanly.

## 2. Footer integration

- [x] 2.1 Integrate the compact Codex status into the Pi footer extension or a dedicated footer-status extension.
- [x] 2.2 Render the compact footer string using the approved format `5h <remaining>% · 7d <remaining>% · cr <remaining>` when all values are available.
- [x] 2.3 Ensure the Codex quota status remains visible regardless of the active model provider.

## 3. Verification

- [x] 3.1 Verify the footer behavior for complete data, partial data, and unavailable Codex data.
- [x] 3.2 Run the repository check command and confirm the affected Pi dotfiles remain valid.
