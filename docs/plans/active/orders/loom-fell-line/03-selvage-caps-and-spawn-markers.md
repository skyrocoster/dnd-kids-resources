WORK ORDER 03 — Selvage caps and spawn markers
GOAL: thread starts/ends read as selvage caps and spawned threads show their origin marker without reintroducing shared-session links.
DEPENDS ON: 02

KNOWN STATE (already true — do NOT redo or re-derive):
- `LoomLane.tsx` already computes ordered thread nodes and renders `start`/`end` nodes inside real session cells when they have a `session_id`.
- Start/end cards currently use the same `LoomNodeCard` component with only kind-based classes; `.loom-node--end` is merely dashed.
- `LoomTapestryThread` includes `origin_node_id`; seed threads 3 and 4 are spawned from nodes 10 and 20 respectively.
- The retired stitch layer must stay gone; spawn markers are labels/markers only, not drawn cross-thread connectors.

START IN:
- frontend/src/features/loom/LoomLane.tsx
- frontend/src/features/loom/LoomNodeCard.tsx
- frontend/src/features/loom/LoomCanvas.css
- frontend/src/features/loom/__tests__/LoomSwimlanes.test.tsx

DO:
- Style start/end cards as selvage caps that bind into cloth on the played side and do not look like queued warp beats.
- Surface `origin_node_id` as a compact spawn marker on spawned thread labels or first cap, with accessible text.
- Add tests for spawned thread markers and for an end cap such as Lost Puppy's session-5 ending rendering as bound cloth.

STOP WHEN: `npm run test -- LoomSwimlanes` passes from `frontend/`. Then stop — change nothing else.

STATUS: <-- DONE / FAILED - why
