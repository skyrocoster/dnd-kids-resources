WORK ORDER 01 — Cloth, fell line, and warp structure
GOAL: the Loom grid has a clear material break: played session columns read as woven cloth, a fell edge separates them, and future beats sit on an open warp line.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Stage 2 already renders the session grid in `LoomSwimlanes.tsx` and `LoomLane.tsx`; the stitch overlay files are deleted.
- The current grid headers are session columns plus one `Warp` header; `LoomLane` renders played cells, quiet cells, outside-life cells, and a `.loom-grid-warp` area.
- The fixture has 8 played sessions; session 8 notes say the fell line sits after this pick.
- The frontend suite is currently green: 84 test files, 992 passed, 6 skipped.

START IN:
- frontend/src/features/loom/LoomSwimlanes.tsx
- frontend/src/features/loom/LoomLane.tsx
- frontend/src/features/loom/LoomCanvas.css
- frontend/src/features/loom/__tests__/LoomSwimlanes.test.tsx

DO:
- Add semantic class hooks/ARIA labels for cloth cells, the fell edge, and warp lanes without changing the API contract.
- Restyle only with existing tokens so session columns feel woven and abutting, the fell edge reads as brass, and warp beats sit on a tensioned open line.
- Add focused tests that prove the fell edge and warp region render once per lane/header as intended.

STOP WHEN: `npm run test -- LoomSwimlanes` passes from `frontend/`. Then stop — change nothing else.

STATUS: <-- DONE / FAILED - why
