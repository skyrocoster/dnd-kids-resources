# The Loom Area Guide

> **Active plan:** [Weaver's Workspace (UI/UX pass)](../plans/active/loom-weavers-workspace.md#lu4-motion-first-run-a11y-live-gate-next-up) — LU4 next.

## Scope

Owns campaign story-thread tracking: loom threads, nodes (anchors and updates), edges, the tapestry canvas, and the Anchor-and-Bridge workflow. This guide does not own NPCs, dungeons, encounters, or any reference catalog.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../DESIGN_SYSTEM.md`, and `../TESTING.md`, then the active plan's current stage.

## Source map

- Backend (shipped): `backend/app/routers/loom.py` (CRUD, tapestry read, bridge, position PATCH), loom Pydantic models in `backend/app/schemas.py`, tables in `scripts/init_database.py`.
- Frontend: `frontend/src/features/loom/`, route `loom` in `frontend/src/router.tsx`, nav entry ("The Loom") in `frontend/src/layout/navSections.ts`.
- Seeds (shipped): `data/seeds/seed_loom_threads.json`, `seed_loom_nodes.json`, `seed_loom_node_threads.json`, `seed_loom_edges.json` — a small frozen demo tapestry; wiring in `scripts/seed_database.py` (opt-in `--loom` flag, never part of "load all") and `scripts/export_db_seeds.py`.
- Tests: `backend/tests/routers/test_loom.py` and colocated `frontend/src/features/loom/__tests__/`.

## Invariants

- The tapestry is one flat directed acyclic graph. Threads are a persisted grouping/coloring overlay (many-to-many node membership), never a nesting structure. Merges are fan-in, splits are fan-out on the flat edge table.
- Acyclicity is the single structural invariant and is enforced server-side on every edge insert and bridge (422 on violation). Forward-only narrative time is edge direction alone; nodes carry no ordering column.
- Node past/future semantics are a pure row function: past = `kind='update'` or a reached anchor; future = a planned anchor; abandoned anchors are neither. Heads and nearest future anchors are derived presentation state computed client-side from the tapestry payload.
- Loom data is runtime-authored through the API/UI; the demo seeds are a frozen test/playtest fixture, not the canonical campaign. **Export before rebuild:** `scripts/init_database.py` drops loom tables, so freeze live campaign state via `scripts/export_db_seeds.py` first. This export support is a deliberate divergence from the dungeons domain.
- Thread colors are token keys (`thread-1`…`thread-6`) resolved by `--md-loom-thread-N` token sets in `frontend/src/theme.css`; never store hex in the database or hand-pick component colors.

## Work queue

- The Loom Tapestry Tracker plan (LM0–LM8) is complete. The full DM loop (bridge, mark-reached, node CRUD, thread management) is shipped. The live browser gate (full DM loop on the demo tapestry) is still outstanding — manual verification needed.
- Deferred until after playtesting: node links to NPCs/dungeons/encounters, a server-side heads endpoint, canvas auto-layout, and canvas undo.
- Create a focused plan before changing any loom contract or cross-domain workflow.

## Cross-references

[../complete/loom-tapestry-tracker.md](../complete/loom-tapestry-tracker.md), `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../DESIGN_SYSTEM.md`, and [reference-catalogs.md](reference-catalogs.md).
