## Context

Pi already has a custom footer extension that reports session context usage, cache reuse, cwd, branch, and model metadata. The proposed change adds a second persistent footer concern: Codex quota headroom. The user explicitly wants a compact, always-visible indicator and does not want command-based or dashboard-based quota inspection.

The main constraints are: keep the footer short, rely on existing Codex authentication, and treat credits as an integer count rather than a currency balance. Because the footer is always visible, the design must prefer omission or compact fallback behavior when some Codex fields are unavailable.

## Goals / Non-Goals

**Goals:**

- Show remaining Codex quota information in one compact footer string.
- Include remaining five-hour usage, remaining seven-day usage, and remaining credits.
- Keep the indicator visible regardless of the active model provider.
- Fit naturally into the existing footer/status model used by Pi extensions.

**Non-Goals:**

- Multi-provider quota support.
- Interactive commands, dashboards, or warning notifications.
- Rich subscription diagnostics such as spend caps or plan metadata.
- A configurable footer format in this change.

## Decisions

### Use a compact fixed text contract

The footer will present Codex data in the compact form discussed during exploration: `5h <remaining>% · 7d <remaining>% · cr <remaining>`.

Why: the user selected a compact version and approved this exact style. A fixed contract avoids over-design and keeps the scope narrow.

Alternative considered: more explicit labels such as `5h left 38% · 7d left 61% · credits 142`. Rejected because it consumes more footer width without adding essential meaning for the intended user.

### Treat Codex data as an always-visible footer concern

The Codex indicator will be conceptually separate from active-model context metrics. It remains visible even when the current model is not Codex.

Why: the user explicitly chose always-visible behavior. This makes the footer a standing Codex usage panel rather than a provider-contextual status chip.

Alternative considered: only show the indicator while a Codex model is active. Rejected because it conflicts with the stated preference.

### Model credits as integer remaining balance

Credits are treated as a remaining integer balance and displayed as such.

Why: the user clarified that credits are not a monetary amount. The UI should not imply currency formatting or decimal precision.

Alternative considered: inherit a currency-style formatter from pi-quotas. Rejected because it misrepresents the data.

### Prefer graceful degradation over verbose errors in the footer

If one quota component is missing, the footer should still be able to show the remaining available components in compact form. If Codex quota data is unavailable altogether, the footer may omit the Codex indicator or use a short unavailable fallback.

Why: a persistent footer should avoid noisy failure text and preserve readability.

Alternative considered: always show a full error marker in place of missing values. Rejected because it harms compactness.

## Risks / Trade-offs

- **Footer width pressure** → The always-visible Codex indicator competes with cwd, branch, context, cache, and model metadata. Compact labels and omission of unavailable subfields mitigate this.
- **Ambiguity of “remaining” percentages** → Codex source data may be oriented around used percentages or percent-left fields. The display contract must consistently normalize to remaining values.
- **Optional credit availability** → Credits may not always be present. The design accepts partial rendering instead of forcing placeholder noise.
- **External API shape drift** → Codex quota endpoints could change. Limiting scope to three fields reduces parsing surface but does not eliminate this dependency.
