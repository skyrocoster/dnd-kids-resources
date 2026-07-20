WORK ORDER 02 — Terse card markers
GOAL: Loom cards show compact kind, carry, note, and provenance markers without expanding into full-detail cards.
DEPENDS ON: 01

KNOWN STATE (already true — do NOT redo or re-derive):
- `LoomNodeCard.tsx` currently renders only the title, optional thread spine, and `Now`/`Next` badges.
- `LoomNode` already has `body`, `carried_count`, `fulfilled_planned_title`, `fulfilled_at`, and `banked_from_thread_id` fields in `frontend/src/api/types.ts`.
- Seed proof cases exist: node 22 has `carried_count: 1`, node 36 has `carried_count: 2`, node 13 has `carried_count: 3`, and node 5 has fulfilled provenance where played title differs from planned title.
- Full detail and actions stay in `LoomRail.tsx`; Stage 3 asks for terse card content, not body text expansion.

START IN:
- frontend/src/features/loom/LoomNodeCard.tsx
- frontend/src/features/loom/LoomCanvas.css
- frontend/src/features/loom/__tests__/LoomSwimlanes.test.tsx
- frontend/src/api/types.ts

DO:
- Add compact visual markers for node kind, carry count (`1x`, `2x`, `3x`), notes-present, and fulfilled provenance using existing token colors and non-hue-only glyph/text cues.
- Keep card content terse: title plus markers only; do not move inspector details into cards.
- Add tests that render cards with carry counts, notes, and fulfilled provenance markers.

STOP WHEN: `npm run test -- LoomSwimlanes` passes from `frontend/`. Then stop — change nothing else.

STATUS: <-- DONE / FAILED - why
