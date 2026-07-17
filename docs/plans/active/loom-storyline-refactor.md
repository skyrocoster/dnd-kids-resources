# Loom Storyline Refactor — From Flat DAG to Ordered Threads

> **Status:** Phase PC complete; PD0 (closeout) next.

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **PA0** | Schema rewrite (new kind CHECK, position, provenance, origin_node_id; dropped loom_edges), promoted v2 seed fixture (3 threads, 15 nodes, 15 memberships), idempotent migration script with backup+report, updated export/seed/conftest wiring. Suite compiles, migrator 13 tests pass. Gate ✅. |
| **PA1** | Rewrote `loom.py`/`schemas.py` for Thread CRUD with auto Start/End, beat/session node CRUD, and ordered-membership endpoints (`POST`/`PATCH`/`DELETE /loom/threads/{id}/items[/…]`); deleted edge/bridge endpoints and acyclicity code. Rewrote `test_loom.py` (35 tests) and the stale fixture-shape integration test; API_REFERENCE reconciled (descriptive + generated). Full backend suite green, 91% coverage. Gate ✅. |
| **PA2** | Added `POST /loom/nodes/{id}/fulfil` (beat→session in place, stamps provenance) and `POST /loom/nodes/{id}/bank` (unplace + `banked_from_thread_id`); restore reuses `POST /loom/threads/{id}/items` (clears banked provenance on insert). Added the `origin_node_id` `kind=='session'` spawn check PA1 deferred. Extended `PUT /loom/nodes/{id}` to allow the one documented fulfil-undo transition (`session`→`beat` when `fulfilled_planned_title` is set), clearing provenance. 13 new tests in `test_loom.py` (48 total); API_REFERENCE reconciled (descriptive + generated). Full backend suite green, 91% coverage. Gate ✅. |
| **PB0** | New loom TS types (`LoomNodeKind`, `LoomTapestryThread`, `LoomThreadItemCreate`, `LoomThreadItemPositionUpdate`, `LoomNodeFulfil`); removed `LoomEdge*`, `LoomBridge*`, `LoomAnchorStatus`. Client methods for PA1/PA2 endpoints added, edge/bridge methods removed. Rewrote `loomGraph.ts` (kind-based `isPast`/`isFuture`, `bankedBeats`, stub `threadOrdered`/`currentPosition`), `loomFlow.ts` (new `FlowNode`/`FlowNodeData` types), `LoomPage.tsx` (new node components, command bar, no edges), `LoomWeaverPanel.tsx`, `LoomNodeEditor.tsx`. Added `it.skip` seams. 85 files, 969 tests (12 skipped). Gate ✅. |
| **PB2** | Added Beat Bank restore controls and wired fulfil, bank, restore, replace-at-position, spawn-thread, change-ending, and fulfil-undo commands to the frozen API. Removed `LoomBridgeDialog.tsx`; lifecycle and Beat Bank tests pass. Frontend suite: 977 passed, 6 skipped; typecheck/build ✅. Browser gate remains deferred unless requested. |
| **PC0** | Removed dead DAG CSS (`loom-node--anchor`, `loom-node--update`, `data-status` variants, live-warp animation), deprecated `vaultNodes` alias and `buildNodeStatusUpdate` from `loomGraph.ts`, old `--md-loom-update` theme tokens. Replaced with `loom-node--start/end/beat/session` node styling and kind-keyed selection/legend tones. Added 5 invariant tests (one Start/one End per thread, beat exclusivity, shared-session edit/remove) and 2 malformed-fixture migration tests. Grep gate clean for `loom_edges`/`anchor`/`bridge`/`wouldCycle`. Frontend: 976 passed, 6 skipped; typecheck/build/lint ✅. Backend: 348 passed, 91% coverage ✅. |

- **Area guide:** [The Loom](../../areas/loom.md).

---

## What this plan is

The Loom today is a flat directed-acyclic **tapestry**: nodes (`anchor`/`update`) connected by user-drawn
`loom_edges`, with threads as a colored many-to-many overlay and narrative order inferred purely from edge
direction. This plan transforms it into a lightweight **storyline planner and session recorder**: each **Thread**
becomes one linear, explicitly-ordered path (`Start → … → End`), planned **Story Beats** are kept soft and
mutable, recorded **Session Nodes** are kept durable and shareable, and the generic node-and-edge graph is
retired. The guiding philosophy is: **future planning is flexible; historical play is durable.**

This is an incremental transformation of the existing FastAPI + SQLite + React/React-Flow codebase, not a
greenfield rewrite. It reuses the `loom_nodes`/`loom_node_threads`/`loom_threads` tables, the tapestry read
endpoint, the node editor, the thread manager, and the vault panel; it replaces the edge table, the bridge
splice, the acyclicity machinery, and the DAG-derivation modules.

---

## Confirmed current state (repository facts)

Verified from source, not assumed. These are the truths a fresh executor needs before touching code.

> **Historical baseline, not current shipped state.** This section documents the pre-refactor flat-DAG shape
> that motivated the target model below — PA0 and PA1 have since replaced all of it (new DDL, no `loom_edges`,
> ordered-Thread API). For what is actually live today, read PA2's **PA1 handoff facts** in its verbose block
> below, `docs/API_REFERENCE.md`, and `docs/DATA_MODEL.md`.

- **Backend:** `backend/app/routers/loom.py` (all endpoints), loom Pydantic models in `backend/app/schemas.py`
  (lines ~429–533: `LoomThread*`, `LoomNode*`, `LoomEdge*`, `LoomTapestry`, `LoomBridge*`, `LoomNodePosition`),
  DDL in `scripts/init_database.py` (lines ~347–403).
- **Schema today:**
  - `loom_threads(id, name UNIQUE, color DEFAULT 'thread-1', description, timestamps)` — name/color/description
    only. **No Start, no End, no order.** Color is a token key (`^thread-[1-6]$`, Pydantic-validated).
  - `loom_nodes(id, kind CHECK IN ('anchor','update'), title, body, status, session_tag, x, y, timestamps)`.
    Compound CHECK: `update` ⇒ `status IS NULL`; `anchor` ⇒ `status IN ('planned','reached','abandoned')` and
    `NOT NULL`.
  - `loom_node_threads(id, node_id, thread_id, UNIQUE(node_id,thread_id))` — many-to-many membership, **no
    order column**. The UNIQUE already forbids the same node twice on one thread.
  - `loom_edges(id, source_id, target_id, UNIQUE(source_id,target_id), CHECK(source≠target))` — user-drawn
    directed edges; acyclicity enforced server-side via a recursive-CTE reachability check
    (`_CYCLE_CHECK_SQL`, `_would_cycle`). Fan-in (merge) and fan-out (split) are allowed.
- **Ordering is edge-direction only.** `x,y` are persisted canvas coordinates (`PATCH /loom/nodes/{id}/position`)
  but are explicitly non-authoritative for narrative order. No node or membership carries an ordinal.
- **Past/future is a pure row function** (`loomGraph.ts::isPast/isFuture`): past = `update` or reached anchor;
  future = planned anchor; abandoned = neither. `headsByThread` and `nearestFutureAnchors` derive presentation
  state (thread heads, next planned anchor, "live warp" edges) client-side from the tapestry payload.
- **The bridge** (`POST /loom/bridge`, `LoomBridgeDialog.tsx`) is the only "insert between" op: it splices a new
  `update` node between a *past* source and a *planned* anchor, deleting the direct `source→anchor` edge if it
  existed. This is exactly the ordered-insert intent the target keeps — but implemented as a DAG splice.
- **The Idea Vault** (`loomGraph.ts::vaultNodes`, `LoomVaultPanel.tsx`) = degree-0 nodes (no edges either way),
  mixing orphan anchors and updates.
- **Frontend derivation modules:** `frontend/src/features/loom/loomGraph.ts` (adjacency, heads, nearest anchors,
  vault, cycle mirror `wouldCycle`, `buildNodeStatusUpdate`) and `loomFlow.ts` (maps tapestry → React-Flow
  nodes/edges, computes head/next-anchor/live-warp flags). `LoomPage.tsx` owns selection, bridge mode, drag,
  and generic connect via `useLoomCanvasMutations.ts` (`connect`, `isValidConnection`, `moveNode`, `removeEdge`).
- **Canvas:** `@xyflow/react` (React Flow). Node components `nodes/AnchorNode.tsx`, `nodes/UpdateNode.tsx`.
- **API contract** documented in `docs/API_REFERENCE.md` (Loom Router, lines ~187–263). Client methods in
  `frontend/src/api/client.ts`; TS types in `frontend/src/api/types.ts` (lines ~484–558).
- **Seeds** (`data/seeds/seed_loom_*.json`) are a **frozen demo/test fixture, not canonical campaign data** —
  loom data is runtime-authored and export-backed (`scripts/export_db_seeds.py`). The fixture is tiny: 2 threads,
  6 nodes (updates + one planned + one abandoned anchor), 5 edges, 8 memberships. It models a merge (nodes 1 and
  2 both edge into node 3). `--loom` flag loads it (`scripts/seed_database.py`); `conftest.py::_seed_real_data`
  always loads it for integration tests.
- **Tests:** `backend/tests/routers/test_loom.py` (452 lines); frontend `frontend/src/features/loom/__tests__/`
  (11 files, notably `loomGraph.test.ts` 276 lines, `loomFlow.test.ts`, `useLoomCanvasMutations.test.ts`,
  `LoomBridgeDialog.test.tsx`). Backend coverage gate is **90%** (`pytest.ini`, `--cov-fail-under=90`).
- **No collaboration/sync layer exists** — single-user local app, plain REST, no websockets, no auth. Concurrent-
  edit / offline-merge concerns (ReworkLoom §8) are therefore **out of scope**; state it and move on.

### Where the current mental model diverges from the target

| Current | Target |
|---|---|
| Thread = color overlay (name/color/desc) | Thread = linear ordered storyline with one Start + one active End |
| Order = edge direction on a flat DAG | Order = explicit per-membership `position`; edges retired |
| `anchor` (planned/reached/abandoned) + `update` | `start`, `end`, `beat` (planned, thread-exclusive), `session` (historical, shareable) |
| User draws generic edges; merges/splits allowed | No user edges; a thread never branches; shared history = shared membership |
| Vault = any degree-0 node | Beat Bank = beats with zero membership (provenance kept) |
| Bridge = DAG splice inserting an `update` | "Insert item between A and B" + "Fulfil beat" over ordered positions |
| Branch = fan-out edge | Branch = a **new Thread** spawned from a Session Node (`origin_node_id`) |

---

## Target domain model (recommended)

Evolve the existing three tables; **drop `loom_edges`.** No new visible entity needs its own table beyond what
is below.

**`loom_threads`** (adapt): keep `id, name, color, description, timestamps`; add
`origin_node_id INTEGER NULL REFERENCES loom_nodes(id) ON DELETE SET NULL` — the Session Node a spawned Thread
grew from (NULL for hand-created threads). Start premise and End resolution are **nodes** (below), not columns,
so a Start can coexist with a distinct historical origin without duplicating the event.

**`loom_nodes`** (adapt — the item-identity table): keep `id, title, body, session_tag, x, y, timestamps`.
- Replace `kind` CHECK with `kind IN ('start','end','beat','session')`.
- **Drop `status`** (planned/reached/abandoned). Lifecycle is now expressed by `kind` + placement + provenance,
  not a status column. "Banked" is derived (a `beat` with zero memberships), mirroring today's vault rule.
- Add fulfilment provenance (nullable, meaningful on a `session` that was a fulfilled beat):
  `fulfilled_planned_title TEXT NULL`, `fulfilled_at DATETIME NULL`.
- Add bank provenance (nullable, on a banked `beat`): `banked_from_thread_id INTEGER NULL REFERENCES
  loom_threads(id) ON DELETE SET NULL`.

**`loom_node_threads`** (adapt — membership **and** ordering): keep `id, node_id, thread_id,
UNIQUE(node_id,thread_id)`, both FKs `ON DELETE CASCADE`; add `position INTEGER NOT NULL`. A thread's ordered
sequence = its membership rows sorted by `position ASC`. The `start` node holds the minimum position, the `end`
node the maximum; beats and sessions fill the middle.

**Identity vs. membership (the crux of shared Session Nodes):** a `session` node has **one identity row** in
`loom_nodes` and **one membership row per Thread it belongs to**, each carrying its own `position`. This is how a
Session Node has different neighbours on different Threads with no duplication. `start`, `end`, and `beat` nodes
are **thread-exclusive**: at most one membership row (enforced in the API, see PA1).

Textual relationship diagram:

```text
loom_threads 1───* loom_node_threads *───1 loom_nodes
     │ origin_node_id (NULL|→ a 'session' node)         kind ∈ {start,end,beat,session}
     │                          position (per membership)
     └── exactly one 'start' member + one 'end' member per thread (API invariant)

Thread "Kill the Ice Queen":
  [start]  Kill the Ice Queen            position 0
  [session] Met the wizard               position 10   (also member of "Return the Wizard's Hat")
  [beat]    Get the Amulet of Fire       position 20
  [end]    Ice Queen Defeated            position 30

Thread "Return the Wizard's Hat":  origin_node_id → (session) Met the wizard
  [start]  Help the Wizard               position 0
  [end]    Wizard's Hat Returned         position 10
```

---

## Ordering model (recommended)

- **Representation:** integer `position` on `loom_node_threads`, unique-ish per thread but not DB-enforced-unique
  (renumbering makes uniqueness cheap to maintain in the API). Sort ascending to read a thread. Start pinned to
  the front, End pinned to the back.
- **Insert between A and B:** set the new row's `position` = B's position, then
  `UPDATE loom_node_threads SET position = position + 1 WHERE thread_id = ? AND position >= <B.position>`.
  Threads are tiny (single-user, a handful of items), so an O(n) renumber per structural write is trivial and
  avoids float-rank precision drift. **Chosen over fractional/rank floats** precisely because the scale doesn't
  justify them.
- **Reorder a beat / move a session within a thread:** delete-and-reinsert the position, renumber. A move may not
  cross the Start (front) or End (back) pins — the API clamps.
- **Insert a Session Node into a thread:** add a membership row at the chosen gap; renumber **that thread only**.
  Because ordering lives on the membership, editing order on Thread X never touches the same node's order on
  Thread Y.
- **Remove an item from a thread:** delete its membership row; renumber to keep positions contiguous. The node
  identity survives (it may be a member of other threads, or become banked).
- **Convert a beat → session (fulfilment):** in place — membership rows and positions are **untouched**; only
  `kind` (and provenance) change. Because a beat is thread-exclusive there is no multi-thread reinsert to do.
- **Canvas coordinates are never read for order.** `x,y` are retained only as optional presentation state for a
  possible free-canvas view; the authoritative order is `position`. (Dropping `x,y` entirely is deferred — see
  Known debt.)

---

## State transitions (allowed)

| Transition | User action | Data change | Validation | Shared-ref note |
|---|---|---|---|---|
| Beat → Session (fulfil) | "Fulfil beat" | `kind='session'`, set `fulfilled_planned_title`,`fulfilled_at`; title/body editable | node must be `kind='beat'` and placed on the thread | beat is thread-exclusive, so no other membership affected |
| Placed beat → Banked beat | "Bank beat" | delete membership row(s); set `banked_from_thread_id` | node `kind='beat'` | none (beat single-membership) |
| Banked beat → Placed beat | "Restore beat" onto a thread at a gap | insert membership row + position; clear/keep provenance | target thread exists; beat currently unplaced | reuse must not resurrect old edges — none exist to resurrect |
| Placed/banked beat → Deleted | "Delete beat" | delete node (cascades memberships) | node `kind='beat'` | none |
| Beat replaced | "Replace beat" | bank or delete old beat; insert new beat at same position | — | none |
| Session added to another Thread | "Add to thread" | insert membership row + position on the new thread | not already a member (UNIQUE); node `kind='session'` | identity unchanged; new independent ordering |
| Session removed from one Thread | "Remove from thread" | delete only that membership row | node remains a member elsewhere or becomes orphan | other threads untouched |
| Session edited | "Edit event" | update title/body/session_tag | node `kind='session'` | one identity ⇒ edit shows on every thread |
| Session → origin of new Thread | "Spawn thread" | create thread with `origin_node_id=session.id`, auto Start+End; optionally add the session as a member | session exists | no duplication of the event |
| End replaced/renamed | "Change ending" | mutate the `end` node's title/body in place | thread keeps exactly one `end` | history (sessions) untouched |
| Thread created | "Create thread" | create thread + one `start` + one `end` node, each with a membership row (pos 0 and 10) | name unique | — |
| Thread deleted | "Delete thread" | delete thread (cascades memberships + its start/end/beat nodes via a delete sweep); shared sessions survive; `origin_node_id` back-references set NULL | confirm when sessions are shared or it is another thread's origin | see PC0 deletion sweep |

**Undo** is a client-side re-issue of the inverse command (e.g. fulfil→revert by re-`PUT`ting `kind='beat'` and
restoring `fulfilled_planned_title`). No server-side undo log is built; the provenance columns make the common
undos (fulfil, bank) losslessly reversible within a session.

---

## Migration strategy

Existing data = flat DAG. The live database is runtime-authored (and likely near-empty pre-playtest); the only
committed data is the tiny demo fixture. Two artifacts: (1) a **hand-rewritten seed fixture** in the new shape
(authored in PA0 — it is tiny), and (2) **`scripts/migrate_loom_v2.py`**, an idempotent live-DB migrator that
backs up first and writes a `migration_report` (JSON) instead of silently dropping anything.

Per-thread algorithm (migrator and the conceptual model behind the seed rewrite):

1. **Kind remap** (automatic): `update → session`; `anchor` **reached** `→ session` with
   `fulfilled_planned_title = title`, `fulfilled_at = updated_at`; `anchor` **planned** `→ beat`.
2. **Abandoned anchors** (heuristic): `→ beat`, **banked** (drop memberships, set `banked_from_thread_id`) —
   abandoned means bypassed, not active. Flag in report.
3. **Synthesize Start/End** (user review): create a `start` node (`title = thread.name`) and an `end` node
   (`title = "Resolve: " + thread.name`, a placeholder the DM renames). The old model had no End concept, so the
   End wording always needs review.
4. **Derive `position`** from intra-thread edges: build the subgraph of `loom_edges` whose *both* endpoints are
   members of this thread; topologically sort. Simple chain ⇒ **automatic** contiguous positions. Fan-in/fan-out
   inside one thread ⇒ **heuristic** topo order, tie-broken by `(x, y, id)`, flagged for review (linearization is
   lossy). Start pinned before all, End after all.
5. **Cross-thread edges** (a merge/hand-off between members of *different* threads): not an intra-thread order.
   A former merge node simply becomes a `session` that is a member of both threads (membership already encodes
   this) — the edge is **dropped with a report**. If the edge looks like a hand-off into another thread's start
   region, offer it as that thread's `origin_node_id` (heuristic, review).
6. **Orphan nodes** (today's vault, no membership): `anchor → banked beat`; `update → orphan session` kept in an
   "unassigned" report bucket for the DM to place or delete (user review).
7. **Shared-beat conflict** (user review): a planned anchor that was a member of >1 thread cannot become a
   thread-exclusive beat on all of them. Default: keep it as a beat on the thread where it has the lowest
   position/most edges; drop other memberships (reported). The DM may instead reclassify it as a `session`.

Categories: **automatic** (kind remap, simple-chain order) · **heuristic** (abandoned→bank, branchy
linearization, cross-thread→origin) · **user review** (End synthesis, shared-beat conflict, orphan updates) ·
**never lost** (no node is deleted by migration; unmappable structure is recorded in `migration_report`, not
discarded). Operational path for a live DB: `export_db_seeds.py` → migrate → `init_database.py` (drops loom
tables) → `seed_database.py --loom`, or run the migrator directly against the live DB with its backup.

---

## Feature transformation map

| Existing feature | Verdict | Why |
|---|---|---|
| `loom_threads` (name/color/desc) | **Adapt** | Add `origin_node_id`; Start/End become member nodes |
| `anchor`/`update` kinds | **Replace** | → `start`/`end`/`beat`/`session` |
| `status` planned/reached/abandoned | **Replace** | Lifecycle now kind + placement + provenance |
| `loom_edges` + `POST/DELETE /loom/edges` | **Remove** | Order is `position`; no user edges |
| Acyclicity CTE (`_would_cycle`, `wouldCycle`) | **Remove** | A per-thread total order is inherently acyclic |
| `POST /loom/bridge` + `LoomBridgeDialog` | **Replace** | "Insert between" survives as ordered insert + "Fulfil beat"; DAG splice removed |
| Idea Vault (`vaultNodes`, `LoomVaultPanel`) | **Adapt** | → Beat Bank (beats with zero membership) |
| `headsByThread`/`nearestFutureAnchors`/live-warp | **Replace** | → ordered derivation (current position = last session before first unfulfilled beat) |
| `loomFlow.ts` React-Flow mapping | **Replace** | Lay out lanes from `position`, not persisted `x,y` + edges |
| Generic edge draw (`connect`/`isValidConnection`) | **Remove** | No user-drawn relationships |
| `PATCH /loom/nodes/{id}/position` | **Deprecate** | Order no longer from coordinates; retain only if an optional canvas view is kept |
| React Flow canvas, node components | **Adapt** | Primary view = ordered thread lanes; free canvas optional (Open Decision) |
| Thread manager, node editor, thread chips, legend | **Adapt** | Editor gains `beat`/`session`; membership becomes ordered |
| Tapestry read (`GET /loom/tapestry`) | **Adapt** | Return threads + ordered members (with position) + origin; no edges |

**Obsolete concepts to delete outright:** the `loom_edges` table and its endpoints; `anchor`/`update` and
`planned/reached/abandoned`; all acyclicity machinery; the bridge splice + `LoomBridgeResult.deleted_edge_id`;
head/next-anchor/live-warp DAG derivation; "the tapestry is a flat DAG / merges are fan-in / splits are fan-out"
framing (area-guide invariants); generic edge-draw UI; canvas-coordinate authority.

---

## Interaction / command model (functional, not visual)

Each maps to one domain operation. **PA1 shipped and froze** the Thread/node/ordering endpoints below (exact
request/response shapes in `docs/API_REFERENCE.md`'s Loom Router section); PA2 adds the lifecycle endpoints still
in parentheses as `(PA2)`.

- **Create Thread** → `POST /loom/threads` body `LoomThreadCreate{name, color, description?, origin_node_id?,
  start_title?, end_title?}` → `LoomThread` (201). Creates the thread plus one `start` node (position 0, title =
  `start_title` or `name`) and one `end` node (position 10, title = `end_title` or `"Resolve: " + name`).
- **Add Story Beat between A and B** / **Insert Session into a Thread** → create the node first via
  `POST /loom/nodes` (`kind` must be `'beat'` or `'session'`; `start`/`end` are 422), then
  `POST /loom/threads/{thread_id}/items` body `LoomThreadItemCreate{node_id, position}` → `LoomTapestryThread`
  (201, includes ordered `items: [{node_id, position}]`). `position` is a client-supplied ordinal hint, not a
  stored value — the server finds the insertion index in the thread's current order (clamped strictly between
  Start and End) and renumbers every membership to `0,10,20,…`. A `beat` already placed on any thread is
  rejected 422 (bank first, PA2); a duplicate `(node_id, thread_id)` is 422; an unknown thread/node is 404.
- **Record Session Node** → `POST /loom/nodes` body `LoomNodeCreate{kind:'session', title, body?, session_tag?,
  x?, y?}` → `LoomNode` (201, unplaced); optionally follow with the insert op above.
- **Fulfil Story Beat** → `POST /loom/nodes/{id}/fulfil` (PA2).
- **Bank Beat** / **Restore Beat** → `POST /loom/nodes/{id}/bank` / `.../place` (PA2).
- **Replace Beat** → bank-or-delete old + insert new at same position (client-composed, PA2 endpoints).
- **Add Session to another Thread** → same insert op as above (`POST /loom/threads/{id}/items`); a `session`'s
  memberships across threads are independent (own `position` per thread).
- **Remove item from Thread** → `DELETE /loom/threads/{tid}/items/{nid}` (204). Deletes only the membership row
  and renumbers the remaining items; the node identity survives (drops to unplaced/orphan). `start`/`end` are 422
  — remove the whole Thread instead.
- **Reorder** → `PATCH /loom/threads/{tid}/items/{nid}` body `LoomThreadItemPositionUpdate{position}` →
  `LoomTapestryThread` (200). Same clamped-insertion-index + full-renumber algorithm as insert, computed with the
  node's own current row excluded first. `start`/`end` are 422.
- **Spawn Thread from Session** → `POST /loom/threads` with `origin_node_id` set to an existing node id. PA1 only
  checks the node exists (422 if not); PA2 adds the `kind == 'session'` check.
- **Change Ending** / **edit any node's title/body/session_tag/x/y** → `PUT /loom/nodes/{id}` body
  `LoomNodeUpdate{kind, title, body?, session_tag?, x?, y?}` (`kind` must match the stored value — 422 otherwise).
- **Delete historical event** → `DELETE /loom/nodes/{id}` (204); rejected 422 for `start`/`end` nodes.
- **Delete Thread** → `DELETE /loom/threads/{id}` (204). Deletes the thread's exclusive `start`/`end`/`beat`
  nodes with it (a delete-sweep keyed on `kind IN ('start','end','beat')` for that thread's memberships); shared
  `session` nodes and their other memberships survive; any other thread's `origin_node_id` pointing at a node this
  deletes is nulled by the FK (`ON DELETE SET NULL`) automatically.
- **Undo** → client re-issues the inverse (no server log).

Domain verbs only in the UI (Fulfil, Bank, Spawn, Add to Thread, Change Ending) — never "edge", "node", "DAG".

Reusable backend helpers in `loom.py` that PA2 should call rather than reimplement: `_thread_ordered(cursor,
thread_id)` (ordered node-id list + position map for a thread), `_renumber_thread(cursor, thread_id,
ordered_node_ids)` (rewrites positions to `0,10,20,…`), `_clamped_index(existing_ids, positions_by_node,
requested_position)` (insertion index, never before Start/after End), and `_load_tapestry_thread(cursor,
thread_row)` (thread dict + its ordered `items`, used by the tapestry read and every items endpoint's response).

---

## Validation and edge cases (must be covered by tests)

- Fulfil a beat that sits between existing sessions — order preserved, no reflow.
- Bypass + bank a beat; reuse a banked beat on a *different* thread — no stale relationships.
- One session on several threads; edit it once — change reflects everywhere.
- Remove a shared session from one thread — remains on the others.
- Delete a shared session globally — confirmation; memberships cascade; report threads affected.
- Delete a session that is a thread's `origin_node_id` — `ON DELETE SET NULL`; confirmation warns.
- Change a thread's End — sessions intact.
- Delete a thread whose sessions matter elsewhere — sessions survive; only its start/end/exclusive beats go.
- Delete a thread that is another thread's origin — origin back-reference nulled, spawned thread survives.
- Attempt a second Start or second active End on a thread — rejected (422).
- Attempt to branch inside a thread — impossible by construction (no edges; a beat has one membership).
- Move a session/beat before the Start or after the End — clamped.
- Same session twice on one thread — rejected by `UNIQUE(node_id,thread_id)` (422).
- Fulfil then undo — provenance restores the beat wording.
- Load malformed/legacy graph data — migrator produces a report, loses nothing.
- Concurrent/offline edits — **N/A**, no sync layer exists.

---

## Open decisions

1. **Primary canvas: retain React Flow lanes vs. replace with an ordered list/rail.** *Recommended default:*
   **retain React Flow**, driven by `position`-derived auto-layout (Start-left → End-right lanes), removing
   edge-drawing and drag-to-author-order. Lowest churn; keeps the woven aesthetic from the Weaver's Workspace
   pass. Revisit only if lane auto-layout proves fiddly, in which case fall back to a per-thread ordered list.
2. **Keep `x,y` columns?** *Recommended default:* **keep for now** (avoids a lossy migration and preserves an
   optional free canvas), but never read them for order. Dropping them is deferred (Known debt).
3. **End revision history.** *Recommended default:* **mutate End in place**; defer an append-only
   `loom_end_history` table until a DM actually asks to see prior endings (Known debt).
4. **Real-World Session as an entity.** *Recommended default:* **keep the existing lightweight `session_tag`
   free-text field**; do not add a `real_world_sessions` table now. Revisit if grouping/browsing by meeting is
   requested (Known debt).
5. **Integer position vs. fractional rank.** Resolved: **integer + renumber** (see Ordering model).

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Coverage gate (90%) drops when large modules are deleted | Med | Blocks CI | Delete dead code and its tests together; add ordered-membership tests in the same stage |
| Migration mis-linearizes a branchy thread | Med | Wrong order | Heuristic + report + user review; seed fixture rewritten by hand and asserted |
| Frontend reframe is large (React Flow rewrite) | High | Long stage | Split PB1 (view+core commands) from PB2 (lifecycle UI); scaffold types/client in PB0 |
| Hidden consumers of edge/anchor contracts break | Med | Compile/test failures | PA1/PB1 grep whole tree for `loom_edges`, `anchor`, `status`, `Bridge`, `wouldCycle` before editing |
| Data-model doc inventory drifts | Low | Checker fails | PA0 updated DATA_MODEL; PA1 re-verifies after API rewrite |

---

## Reusable pieces (do not rebuild)

- `loom_nodes`, `loom_node_threads`, `loom_threads` tables and their CASCADE semantics — adapt, don't recreate.
- `GET /loom/tapestry` one-shot read shape and `_node_thread_ids` batching — adapt to add `position`.
- `LoomNodeEditor.tsx`, `LoomThreadManager.tsx`, `nodes/ThreadChips.tsx`, `LoomLegend.tsx`, thread-color tokens
  (`--md-loom-thread-N`) — reuse.
- `LoomVaultPanel.tsx` → Beat Bank panel (same "unplaced items" shape).
- `conftest.py::_seed_real_data` loads the fixture for integration tests — update the fixture, keep the wiring.
- Thread-color Pydantic pattern `^thread-[1-6]$` and token resolution — unchanged.

---

## Backend API — final shape (Phase PA complete)

`backend/app/routers/loom.py` and `backend/app/schemas.py` are the frozen backend contract for all of Phase PB;
full request/response shapes live in `docs/API_REFERENCE.md`'s Loom Router section.

- **Endpoints:** `GET /loom/tapestry`; `GET/POST /loom/threads`; `PUT/DELETE /loom/threads/{id}`;
  `POST /loom/nodes`; `PUT/DELETE /loom/nodes/{id}`; `PATCH /loom/nodes/{id}/position`;
  `POST /loom/nodes/{id}/fulfil`; `POST /loom/nodes/{id}/bank`; `POST /loom/threads/{id}/items`;
  `PATCH/DELETE /loom/threads/{id}/items/{node_id}`. No edges, no bridge, no acyclicity code anywhere.
- **Fulfil** (`POST /loom/nodes/{id}/fulfil`, body `LoomNodeFulfil{title?}`): 404 unknown node; 422 if
  `kind != 'beat'`; 422 if the beat has no membership row (must be placed first). Sets `kind='session'`,
  `fulfilled_planned_title` = the pre-fulfil title, `fulfilled_at = now`; `title` becomes `payload.title` when
  given, else stays unchanged. Membership/position rows are never touched.
- **Bank** (`POST /loom/nodes/{id}/bank`, no body): 404 unknown node; 422 if `kind != 'beat'`; 422 if the beat
  has no membership row. Deletes the membership row, sets `banked_from_thread_id` to the vacated thread, and
  renumbers that thread's remaining items.
- **Restore/place** is not a separate route — it is the existing `POST /loom/threads/{id}/items` insert. When
  the node being placed still carries `banked_from_thread_id`, that column is cleared as part of the same insert.
- **Spawn** (`POST /loom/threads` with `origin_node_id` set): 422 if the node doesn't exist; 422 if
  `kind != 'session'` (added in PA2 — PA1 only checked existence).
- **Fulfil-undo** is the one exception to "kind is immutable" on `PUT /loom/nodes/{id}`: a `session` → `beat`
  transition is accepted when the stored row still has `fulfilled_planned_title` set (i.e. it really was a
  fulfilled beat); the update clears `fulfilled_planned_title`/`fulfilled_at` and applies the submitted
  title/body/session_tag/x/y. Any other kind change is still 422 "Node kind is immutable". There is no separate
  "unfulfil" endpoint — the client re-issues `PUT` with `kind='beat'` and the beat's prior title.
- **Schemas:** `LoomNodeFulfil{title: Optional[str] = None}` is new in PA2. `LoomNode.fulfilled_planned_title`,
  `fulfilled_at`, `banked_from_thread_id` are now written by fulfil/bank/restore (previously always `None`
  through PA1).
- **Reusable helpers** in `loom.py` (call, don't reimplement): `_load_node`, `_thread_ordered`,
  `_renumber_thread`, `_clamped_index`, `_load_tapestry_thread`, `_fetch_thread_row`, `_node_thread_ids`.
- **Tests:** `backend/tests/routers/test_loom.py` has 48 tests (13 added in PA2, covering fulfil/bank/restore/
  spawn success + every 404/422 edge, plus the fulfil-undo path and the non-undo kind-immutability guard). Full
  backend suite green, 91% coverage.

---

## Design system in force

No new visual language. Reuse `docs/DESIGN_SYSTEM.md` tokens and the Loom's existing thread-color token sets in
`frontend/src/theme.css`. Any lane/rail styling introduced in PB1–PB3 must consume existing tokens; no new hex.

---

## Interaction model

PB1 ships the primary Loom canvas as React Flow lanes. Each thread is ordered left-to-right by membership
`position`; the renderer uses `x = position * 12` and `y = thread index * 220`, and creates only consecutive
position-derived edges using the thread color token. Persisted node `x,y` are fallback coordinates for unplaced
Beat Bank nodes and are not narrative order. Current position is the last item before the first unfulfilled beat,
or the final ordered item when none remain. PB2 must preserve independent membership order for shared sessions.

## Delivery phases

Sequencing: **~~Phase PA~~** (backend + data, complete) → **~~PB0~~** (types/client/scaffolding, complete) → **~~PB1 → PB2~~** (frontend, complete) → **~~PC0~~** (cleanup + full
sweep, complete) → **PD0** (closeout). PD0 is unblocked: PC0 removed all dead DAG code, added invariant and
migration tests, and verified the grep gate. Each stage is a single-context task.

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage ===== -->

### Plan Closeout — Documentation update

| Stage | Required strength | Summary | Deliverables |
|---|---|---|---|
| **PD0 — Documentation update** | Standard | Reconcile + archive | References, routing, validation, archival complete |

#### PD0 — Documentation update (final stage of the plan, next up)

- **Read first:** `CLAUDE.md`, `docs/README.md`, `docs/areas/loom.md`, this plan, `docs/PLAN_TEMPLATE.md`,
  `docs/TESTING.md`, `scripts/check_docs.py`, `docs/DATA_MODEL.md`, `docs/API_REFERENCE.md`, and relevant
  workflow/PR files.
- **Build:** Reconcile the plan's accumulated facts with shipped code; complete any outstanding canonical-
  reference edits; rewrite the Loom **area guide** (scope, source map, invariants — replace the flat-DAG
  invariants with the ordered-thread model, Start/End, beat/session lifecycle, and the Beat Bank); update the
  manifest routing; regenerate inventories if their sources changed; prepare the archive.
- **Inherits:** all prior-stage documentation edits and discovery consolidations.
- **Expected touch set:** this plan, `docs/areas/loom.md`, `docs/README.md`, `docs/DATA_MODEL.md`,
  `docs/API_REFERENCE.md`, and the archive location `docs/complete/loom-storyline-refactor.md`.
- **Documentation impact:** `docs/areas/loom.md`, `docs/README.md`, `docs/DATA_MODEL.md`, `docs/API_REFERENCE.md`
  — reconciled and archived.
- **Tests:** `.venv\Scripts\python.exe scripts/check_docs.py --check` and, when a base ref exists,
  `--check --base <base-ref>`; plus any changed validator tests.
- **Gate:** a fresh reader routes `CLAUDE.md → docs/README.md → areas/loom.md → plan` without rediscovering
  facts; documentation checks pass.
- **Discovery consolidation:** promote every remaining durable fact to a canonical reference or the area guide
  before archival; no discovery left only in a shipped-stage row or commit.
- **Completion edit:** mark the outcome complete, move this plan to `docs/complete/loom-storyline-refactor.md`,
  set the area guide's Active plan back to `None`, and update `docs/README.md` in the same change set.

---

## Known debt / deferred work (NOT yet built)

- Drop `loom_nodes.x,y` entirely (kept for an optional free-canvas view; never read for order).
- `PATCH /loom/nodes/{id}/position` retention decision (Open Decision 2) — remove if no canvas view ships.
- `loom_end_history` append-only table for prior endings (Open Decision 3).
- A `real_world_sessions` entity beyond the `session_tag` free-text field (Open Decision 4).
- Server-side undo log (client re-issue covers the common cases).
- Node links to NPCs/dungeons/encounters (already deferred by the area guide until after playtesting).

## Cross-references

- Area guide: [The Loom](../../areas/loom.md).
- References this plan writes into: [DATA_MODEL.md](../../DATA_MODEL.md), [API_REFERENCE.md](../../API_REFERENCE.md),
  and [TESTING.md](../../TESTING.md).
- Source prompt: `scratch/ReworkLoom.md` (user-owned; not part of the documentation contract).

## Next:

**PD0 — Documentation update** is next up. Phase PC removed all dead DAG code and added invariant/migration
verification; the frontend and backend suites are green.
