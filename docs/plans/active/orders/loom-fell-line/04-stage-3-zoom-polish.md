WORK ORDER 04 — Stage 3 zoom polish
GOAL: the Stage 3 Loom grid remains legible and non-overlapping at 80% through 150% browser zoom while preserving existing accessibility and token contracts.
DEPENDS ON: 03

KNOWN STATE (already true — do NOT redo or re-derive):
- The Stage 3 implementation is contained in the Loom grid/card surface: `LoomSwimlanes.tsx`, `LoomLane.tsx`, `LoomNodeCard.tsx`, and `LoomCanvas.css`.
- Existing design rules require theme tokens from `frontend/src/theme.css`, visible focus rings, no hue-only meaning, and touch targets of at least 48px where feasible.
- `npm run typecheck` is the real frontend type gate; `tsc --noEmit` checks nothing in this repo.
- The frontend suite baseline before Stage 3 was 84 files, 992 passed, 6 skipped.

START IN:
- frontend/src/features/loom/LoomCanvas.css
- frontend/src/features/loom/LoomSwimlanes.tsx
- frontend/src/features/loom/LoomLane.tsx
- frontend/src/features/loom/LoomNodeCard.tsx

DO:
- Tighten fixed dimensions, wrapping, min-widths, and overflow behavior so thread labels, headers, markers, and cards do not overlap at zoom extremes.
- Keep all colors on existing tokens, including `--md-loom-thread-1` through `--md-loom-thread-6`; do not add a new token set.
- Run the targeted Loom tests first, then the frontend type gate after any CSS/markup adjustments.

STOP WHEN: `npm run typecheck` passes from `frontend/`. Then stop — change nothing else.

STATUS: <-- DONE / FAILED - why
