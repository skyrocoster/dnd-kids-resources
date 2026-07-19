# The Loom Area Guide

> **Active plan:** [Freeform Tapestry](../plans/active/loom-freeform-tapestry.md) — hand-arrangeable nodes, zoom-safe canvas, unified rail, thread selection, glanceable interlacements.

## Scope

Owns campaign story-thread tracking: loom threads, nodes (starts, ends, beats, sessions), ordered memberships, the tapestry canvas, and the Beat Bank. Edges and the Bridge workflow are retired. This guide does not own NPCs, dungeons, encounters, or any reference catalog.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../DESIGN_SYSTEM.md`, and `../TESTING.md`, then any active plan's current stage.

## Source map

- Backend: `backend/app/routers/loom.py` (thread CRUD with auto Start/End, beat/session node CRUD, ordered-membership insert/reorder/remove, tapestry read, position PATCH, beat lifecycle — fulfil/bank/restore, spawn-from-session — no edges/bridge), loom Pydantic models in `backend/app/schemas.py`, tables in `scripts/init_database.py`. Migration script: `scripts/migrate_loom_v2.py` (idempotent, backs up + reports).
- Frontend: `frontend/src/features/loom/` (static swimlane renderer: `LoomSwimlanes.tsx`, `LoomLane.tsx`, `LoomNodeCard.tsx`; SVG stitch/spawn-link overlay in `LoomStitchLayer.tsx` + `stitchGeometry.ts` + `useCardRects.ts`; inspector panel in `LoomWeaverPanel.tsx` + `LoomLegend.tsx`; `LoomBeatBankTray.tsx` for banked beats; inline reorder via `beatReorder.ts` with `LoomBeatReorderDialog.tsx` as keyboard fallback), route `loom` in `frontend/src/router.tsx`, nav entry ("The Loom") in `frontend/src/layout/navSections.ts`.
- Seeds: `data/seeds/seed_loom_threads.json`, `seed_loom_nodes.json`, `seed_loom_node_threads.json` — v2 fixture (3 threads, 15 nodes, 15 memberships, shared session, banked beat, provenance); wiring in `scripts/seed_database.py` (opt-in `--loom` flag, never part of "load all") and `scripts/export_db_seeds.py`.
- Tests: `backend/tests/routers/test_loom.py` and colocated `frontend/src/features/loom/__tests__/`.

## Invariants

- **Ordered linear Threads:** each Thread is one linear, explicitly-ordered path (Start → beats/sessions → End). Order is the integer `position` on `loom_node_threads`, sorted ascending. Canvas `x,y` are vestigial (the swimlane UI never reads or writes them; backend columns kept for backward compatibility) and never used for narrative order. There is no edge table and no acyclicity concern — a per-thread total order is inherently acyclic.
- **Node kinds:** `loom_nodes.kind IN ('start', 'end', 'beat', 'session')`. `start`/`end` are thread-exclusive and created/removed only by the thread lifecycle (`POST`/`DELETE /loom/threads`). A `beat` is thread-exclusive (at most one membership row anywhere, enforced by API). A `session` may belong to many threads independently, each with its own `position`.
- **Provenance columns (all nullable):** `fulfilled_planned_title`/`fulfilled_at` on `loom_nodes` record a beat-turned-session's original planned wording and when it was fulfilled; `banked_from_thread_id` records which thread a banked beat was removed from.
- **Beat lifecycle:** `POST /loom/nodes/{id}/fulfil` converts a placed beat to a session in place (stamps provenance, memberships untouched). `POST /loom/nodes/{id}/bank` unplaces a beat and records bank provenance. Restoring a banked beat reuses `POST /loom/threads/{id}/items`. The one documented undo path (`PUT` a fulfilled session back to `kind='beat'`) is the sole exception to kind being otherwise immutable.
- **Beat authoring (focus-free):** inline drag-reorder and clickable gap-insert replace the old focus-gated modal. Every Thread is always visible; there is no focus state. Drag a planned-beat card to a lane gap (between any two body nodes) to reorder; click a "+" gap to open the node editor and insert at that position; drag a banked beat from the tray into a gap to restore. The `beatReorderTarget` helper computes the reorder payload (follower's position or `MAX_SAFE_INTEGER` sentinel) and its client-side list prevents placing a beat before a session. The `LoomBeatReorderDialog` is retained as an accessible keyboard fallback (reachable from the inspector).
- **Free drag placement (cross-lane):** both beats and sessions are draggable, not just beats. Dropping on another lane calls the Stage 1 move endpoint: a beat or a sole-membership session moves unconditionally; a session shared across multiple threads prompts Move-vs-Also-add before calling it with the chosen `mode`. Start/End never accept a drop (no gap renders inside their selvage caps). The drop target is the whole card-group (the gap plus the card that follows it, via `CardGroup` in `LoomLane.tsx`), not just the narrow gap sliver — dropping directly on a card works the same as dropping on its adjacent gap.
- **Thread spawn:** `POST /loom/threads` with `origin_node_id` set to an existing `session` node creates a new thread that references the origin without duplicating the event. `ON DELETE SET NULL` on the FK means deleting the origin session un-links without cascading.
- **Thread deletion:** deletes the thread's exclusive `start`/`end`/`beat` nodes via an application-level sweep; shared `session` nodes survive on any other thread they belong to.
- **Token-key colors:** `loom_threads.color` stores a token key (`thread-1`…`thread-6`), validated by Pydantic pattern `^thread-[1-6]$`. Actual colors are generated MD3 token sets in `frontend/src/theme.css`.
- **Loom data is runtime-authored** through the API/UI; the demo seeds are a frozen test/playtest fixture, not the canonical campaign. **Export before rebuild:** `scripts/init_database.py` drops loom tables, so freeze live campaign state via `scripts/export_db_seeds.py` first.

## Work queue

- Deferred until after playtesting: node links to NPCs/dungeons/encounters.
- Create a focused plan before changing any loom contract or cross-domain workflow.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../DESIGN_SYSTEM.md`, and [reference-catalogs.md](reference-catalogs.md).
