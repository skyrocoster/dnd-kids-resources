# The Loom Area Guide

> **Active plan:** [Loom Campaign Progress UI](../plans/active/loom-campaign-progress-ui.md) — Stages 1-2 shipped; Stage 3 is next.

## Scope

Owns campaign story-thread tracking: loom threads, nodes (starts, ends, beats, sessions), ordered memberships, the tapestry canvas, and the Beat Bank. Edges and the Bridge workflow are retired. This guide does not own NPCs, dungeons, encounters, or any reference catalog.

## Domain vocabulary

**The Loom**:
The campaign narrative tracker: a tapestry of ordered story threads and nodes.
_Avoid_: campaign_tracker, story_manager

**Tapestry**:
The complete snapshot of all threads and nodes in the Loom, delivered as a single read.
_Avoid_: snapshot, full_state

**Thread**:
One linear story arc with a start, ordered beats/sessions, and an end. Has a name, color, and optional origin.
_Avoid_: storyline, arc, plot_line

**Beat**:
A planned story beat: a future event that has not yet happened in-game. Thread-exclusive.
_Avoid_: event, planned_session, milestone

**Session**:
A record of a played game session. Can belong to many threads independently through per-thread session nodes in the same session column.
_Avoid_: play_session, game_session

**Session Tag**:
An optional label on a session node, such as date or session number.

**Fulfilled (Beat)**:
A beat that has been converted into a session, recording the original planned title and fulfillment time.
_Avoid_: completed_beat, realized_beat

**Banked (Beat)**:
A beat removed from a thread and placed in the vault/unplaced pool.
_Avoid_: archived_beat, orphaned_beat

**Bank / Vault**:
The pool of unplaced banked beats with zero thread membership.
_Avoid_: backlog, holding area

**Node**:
A point in a thread: one of start, end, beat, or session. Has title, body, canvas coordinates, and thread memberships.
_Avoid_: point, marker

**Thread Item**:
A membership row linking a node to a thread with an integer position for ordering.
_Avoid_: membership, link

**Position**:
Integer ordering of a node within a thread, ascending. The sole source of narrative order.
_Avoid_: order, index, sort_key

**Grid (Session grid)**:
Visual layout model: session columns across, thread rows down, with pinned labels and cell states (real/quiet/outside-life). Replaces the retired swimlane renderer.
_Avoid_: swimlane, lane, row

**Current Position**:
The node just before the first unfulfilled beat in a thread: the "you are here" marker.
_Avoid_: cursor, playback_head

**Thread Head**:
The latest realized node in a thread, meaning the last session or start before the first beat.
_Avoid_: latest_node, tip

**Next Beat**:
The first unfulfilled beat in a thread's ordered sequence.
_Avoid_: upcoming_beat, pending_beat

**Live Threads**:
Threads that still have unfulfilled beats remaining.
_Avoid_: active_threads, open_threads

**Stitch Layer (retired)**:
The former visual overlay connecting shared-session nodes across lanes. Retired with the session grid.
_Avoid_: connection_layer, edge_overlay

## Read first

`../ARCHITECTURE.md`, `../API_REFERENCE.md`, `../DATA_MODEL.md`, `../DESIGN_SYSTEM.md`, and `../TESTING.md`, then any active plan's current stage.

## Source map

- Backend: `backend/app/routers/loom.py` (thread CRUD with auto Start/End, node CRUD with direct `thread_id`/`session_id`/`position` placement, session CRUD, tapestry read returning sessions+threads+nodes, beat lifecycle — fulfil/bank/restore, move, spawn-from-session — no edges/bridge/join-table), loom Pydantic models in `backend/app/schemas.py`, tables in `scripts/init_database.py`. Migration script: `scripts/migrate_loom_v2.py` (idempotent, backs up + reports).
- Frontend: `frontend/src/features/loom/` (session-grid renderer: `LoomSwimlanes.tsx`, `LoomLane.tsx`, `LoomNodeCard.tsx`; unified right rail: `LoomRail.tsx` composing inspector, thread list, and beat bank; `LoomBeatBankTray.tsx` for banked beats; `LoomSessionLogDialog.tsx` for guided per-thread session logging; `LoomNodeEditor.tsx` for node creation/edit; `LoomPage.tsx` orchestrates page-level state; inline reorder via `beatReorder.ts`), route `loom` in `frontend/src/router.tsx`, nav entry ("The Loom") in `frontend/src/layout/navSections.ts`. Retired files deleted: `LoomStitchLayer.tsx`, `stitchGeometry.ts`, `useCardRects.ts`, `swimlaneTypes.ts`, `ThreadChips.tsx`, `loomThreadsContext.ts`.
- Seeds: `data/seeds/seed_loom_threads.json`, `seed_loom_nodes.json`, `seed_loom_sessions.json` — Stage 1 fixture (6 threads, 45 nodes, 8 sessions, 3 banked beats with NULL `thread_id`); wiring in `scripts/seed_database.py` (opt-in `--loom` flag, never part of "load all") and `scripts/export_db_seeds.py`.
- Tests: `backend/tests/routers/test_loom.py` (63 tests against current contract) and colocated `frontend/src/features/loom/__tests__/`.

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Loom board | `/loom` | both | DM |
| Session log dialog | modal over the board | play | DM |
| Node editor | modal over the board | prep | DM |
| Inspector rail | within the board | both | DM |

The board is the clearest case of a surface whose mode changes with the moment. Logging a session happens at the table (play); reshaping threads and beats happens between games (prep). Where the two conflict, the board itself follows play rules and the editing dialogs follow prep rules.

## Invariants

- **Ordered linear Threads:** each Thread is one linear, explicitly-ordered path (Start → beats/sessions → End). Order is the integer `position` on `loom_nodes`, sorted ascending within a thread. A card belongs to exactly one thread via its `thread_id` column; a NULL `thread_id` means the beat is banked (unplaced). There is no edge table and no acyclicity concern — a per-thread total order is inherently acyclic.
- **Node kinds:** `loom_nodes.kind IN ('start', 'end', 'beat', 'session')`. `start`/`end` are thread-exclusive and created/removed only by the thread lifecycle (`POST`/`DELETE /loom/threads`). A `beat` or `session` belongs to exactly one thread at a time (`thread_id`); a `session`-kind node is either attached to a thread or has `session_id` set to the column it appears in. The one-card-per-thread-per-session uniqueness rule is enforced by a database index (`UNIQUE(thread_id, session_id)`).
- **Provenance columns (all nullable):** `fulfilled_planned_title`/`fulfilled_at` on `loom_nodes` record a beat-turned-session's original planned wording and when it was fulfilled; `banked_from_thread_id` records which thread a banked beat was removed from.
- **Beat lifecycle:** `POST /loom/nodes/{id}/fulfil` converts a placed beat to a session in place (stamps provenance, assigns `session_id`). `POST /loom/nodes/{id}/bank` unplaces a beat (clears `thread_id`, records `banked_from_thread_id`). Restoring a banked beat is `POST /loom/threads/{thread_id}/items` with the node's body, which clears `banked_from_thread_id`. The one documented undo path (`PUT` a fulfilled session back to `kind='beat'`) is the sole exception to kind being otherwise immutable.
- **Session logging:** `POST /loom/sessions/log` creates one ordered session column and applies explicit per-thread outcomes in one transaction. Happened/fulfilled turns the next beat into a session node in that column, not-reached/carried increments `carried_count`, banked unplaces the next beat, and quiet records no node change.
- **Move:** `POST /loom/threads/{thread_id}/items/{node_id}/move` atomically relocates a placed node to another thread at a position. A node can only belong to one thread at a time, so shared sessions and the `mode: "also_add"` branch are retired. `start`/`end` nodes can never move (422).
- **Beat authoring (focus-free):** inline drag-reorder and clickable gap-insert replace the old focus-gated modal. Every Thread is always visible; there is no focus state. Drag a planned-beat card to a lane gap (between any two body nodes) to reorder; click a "+" gap to open the node editor and insert at that position; drag a banked beat from the tray into a gap to restore, or activate its card by click, tap, or Enter/Space to enter a placement mode that highlights every valid gap for a non-drag restore (Escape cancels without moving it; with no Threads, activation shows a `Manage Threads` guard instead). The `beatReorderTarget` helper computes the reorder payload (follower's position or `MAX_SAFE_INTEGER` sentinel) and its client-side list prevents placing a beat before a session. The `LoomBeatReorderDialog` is retained as an accessible keyboard fallback (reachable from the inspector).
- **Free drag placement (cross-lane):** both beats and sessions are draggable, not just beats. Dropping on another lane calls the move endpoint. Start/End never accept a drop (no gap renders inside their selvage caps). The drop target is the whole card-group (the gap plus the card that follows it, via `CardGroup` in `LoomLane.tsx`), not just the narrow gap sliver — dropping directly on a card works the same as dropping on its adjacent gap.
- **Thread spawn:** `POST /loom/threads` with `origin_node_id` set to an existing `session` node creates a new thread that references the origin without duplicating the event. `ON DELETE SET NULL` on the FK means deleting the origin session un-links without cascading.
- **Thread deletion:** deletes the thread's exclusive `start`/`end`/`beat` nodes via an application-level sweep. Nodes with a matching `thread_id` are deleted; `banked_from_thread_id` references are set NULL by the FK.
- **Token-key colors:** `loom_threads.color` stores a token key (`thread-1`…`thread-6`), validated by Pydantic pattern `^thread-[1-6]$`. Actual colors are generated MD3 token sets in `frontend/src/theme.css`.
- **Loom data is runtime-authored** through the API/UI; the demo seeds are a frozen test/playtest fixture, not the canonical campaign. **Export before rebuild:** `scripts/init_database.py` drops loom tables, so freeze live campaign state via `scripts/export_db_seeds.py` first.

## Work queue

- Deferred until after playtesting: node links to NPCs/dungeons/encounters.
- [Loom Campaign Progress UI](../plans/active/loom-campaign-progress-ui.md) owns the current board and inspector presentation patch; it does not change Loom behaviour or contracts.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../DESIGN_SYSTEM.md`, and [reference-catalogs.md](reference-catalogs.md).
