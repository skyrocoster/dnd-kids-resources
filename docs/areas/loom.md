# The Loom Area Guide

> **Active plan:** [Loom Storyline Refactor](../plans/active/loom-storyline-refactor.md#pb2-beat-lifecycle-ui-next-up).

## Scope

Owns campaign story-thread tracking: loom threads, nodes (starts, ends, beats, sessions), ordered memberships, the tapestry canvas, and the Beat Bank. Edges and the Bridge workflow are retired by the active refactor. This guide does not own NPCs, dungeons, encounters, or any reference catalog.

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../DESIGN_SYSTEM.md`, and `../TESTING.md`, then the active plan's current stage.

## Source map

- Backend (shipped, Phase PA complete): `backend/app/routers/loom.py` (thread CRUD with auto Start/End, beat/session node CRUD, ordered-membership insert/reorder/remove, tapestry read, position PATCH, beat lifecycle — fulfil/bank/restore, spawn-from-session — no edges/bridge), loom Pydantic models in `backend/app/schemas.py`, tables in `scripts/init_database.py`. Migration script: `scripts/migrate_loom_v2.py` (idempotent, backs up + reports).
- Frontend: `frontend/src/features/loom/`, route `loom` in `frontend/src/router.tsx`, nav entry ("The Loom") in `frontend/src/layout/navSections.ts`.
- Seeds (shipped): `data/seeds/seed_loom_threads.json`, `seed_loom_nodes.json`, `seed_loom_node_threads.json` — v2 fixture (3 threads, 15 nodes, 15 memberships, shared session, banked beat, provenance); wiring in `scripts/seed_database.py` (opt-in `--loom` flag, never part of "load all") and `scripts/export_db_seeds.py`.
- Tests: `backend/tests/routers/test_loom.py` and colocated `frontend/src/features/loom/__tests__/`.

## Invariants

- The backend tapestry is fully refactored from a flat DAG into ordered linear Threads (Phase PA — PA0 DDL, PA1 API, PA2 beat lifecycle — complete): no `loom_edges`; a per-thread total order via `position` on `loom_node_threads`; `kind IN ('start','end','beat','session')`; provenance columns (`fulfilled_planned_title`, `fulfilled_at`, `banked_from_thread_id`); `origin_node_id` on threads (spawn requires the origin be `kind='session'`). `start`/`end` nodes are created only by `POST /loom/threads` and removed only by deleting the whole thread; a `beat` is thread-exclusive (one membership anywhere). Acyclicity machinery is gone — a per-thread total order is inherently acyclic, so there is nothing left to check. Beat lifecycle: `POST /loom/nodes/{id}/fulfil` converts a placed beat to a session in place; `POST /loom/nodes/{id}/bank` unplaces a beat into the Beat Bank; restoring a banked beat reuses `POST /loom/threads/{id}/items`; the one documented undo path (`PUT` a fulfilled session back to `kind='beat'`) is the sole exception to kind being otherwise immutable.
- The frontend still renders the pre-refactor flat-DAG model (`loomGraph.ts`/`loomFlow.ts`, `status`, edges) against the now-incompatible backend; it is inert/unbuilt against ordered-Thread data until PB0–PB2 land. Node past/future semantics are transitioning: the old `status` column is dropped server-side; lifecycle is now `kind` + placement + provenance. Presentation derivation (`headsByThread`, `nearestFutureAnchors`, live-warp) will be replaced by ordered derivation in PB1.
- Loom data is runtime-authored through the API/UI; the demo seeds are a frozen test/playtest fixture, not the canonical campaign. **Export before rebuild:** `scripts/init_database.py` drops loom tables, so freeze live campaign state via `scripts/export_db_seeds.py` first.
- Thread colors are token keys (`thread-1`…`thread-6`) resolved by `--md-loom-thread-N` token sets in `frontend/src/theme.css`; never store hex in the database or hand-pick component colors.

## Work queue

- **Active: the [Loom Storyline Refactor](../plans/active/loom-storyline-refactor.md#pb2-beat-lifecycle-ui-next-up) (PB2–PD0).** Phase PA and PB1 are shipped; PB2 owns beat lifecycle UI.
- The Loom Tapestry Tracker plan (LM0–LM8) and the Weaver's Workspace plan (LU0–LU5) are complete: the flat-DAG DM loop and the presentation pass are shipped and are what the storyline refactor transforms.
- Deferred until after playtesting: node links to NPCs/dungeons/encounters.
- Create a focused plan before changing any loom contract or cross-domain workflow beyond the active plan.

## Cross-references

[../complete/loom-tapestry-tracker.md](../complete/loom-tapestry-tracker.md), `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../DESIGN_SYSTEM.md`, and [reference-catalogs.md](reference-catalogs.md).
