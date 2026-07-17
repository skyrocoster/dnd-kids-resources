# Loom Storyline Refactor — From Flat DAG to Ordered Threads

> **Status:** Plan authored; nothing shipped. PA0 — Schema, seeds, and migration foundation is next up.

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

Each maps to one domain operation (endpoint in parentheses; finalized in PA1/PA2):

- **Create Thread** → create thread + Start + End (`POST /loom/threads`).
- **Add Story Beat between A and B** → insert `beat` membership at a gap (`POST /loom/threads/{id}/items`).
- **Record Session Node** → create `session`, optionally place on a thread at a gap (`POST /loom/nodes` +
  membership).
- **Fulfil Story Beat** → `beat→session` in place (`POST /loom/nodes/{id}/fulfil`).
- **Bank Beat** / **Restore Beat** → drop / add membership (`POST /loom/nodes/{id}/bank`, `.../place`).
- **Replace Beat** → bank-or-delete old + insert new at same position (client-composed).
- **Add Session to another Thread** → new membership + position (`POST /loom/threads/{id}/items`).
- **Remove item from Thread** → delete membership (`DELETE /loom/threads/{tid}/items/{nid}`).
- **Spawn Thread from Session** → create thread with `origin_node_id` (`POST /loom/threads` with `origin_node_id`).
- **Change Ending** → mutate `end` node (`PUT /loom/nodes/{id}`).
- **Reorder** → change a membership's position (`PATCH /loom/threads/{tid}/items/{nid}` `{position}`).
- **Delete historical event** / **Delete Thread** → node/thread delete with confirmation.
- **Undo** → client re-issues the inverse (no server log).

Domain verbs only in the UI (Fulfil, Bank, Spawn, Add to Thread, Change Ending) — never "edge", "node", "DAG".

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
| Data-model doc inventory drifts | Low | Checker fails | Regenerate the `GENERATED:DATA_MODEL` block in PA0 |

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

## Design system in force

No new visual language. Reuse `docs/DESIGN_SYSTEM.md` tokens and the Loom's existing thread-color token sets in
`frontend/src/theme.css`. Any lane/rail styling introduced in PB1–PB3 must consume existing tokens; no new hex.

---

## Delivery phases

Sequencing: **PA0 → PA1 → PA2** (backend + data) → **PB0 → PB1 → PB2** (frontend) → **PC0** (cleanup + full
sweep) → **PD0** (closeout). PB0 may start once PA1's endpoint shapes are frozen. Each stage is a single-context
task.

### Phase PA — Backend & data foundation

Delivers the new schema, the rewritten seed fixture, the migrator, and the full backend API for ordered Threads
with Start/End, beats, sessions, sharing, and spawning. **Depended on by:** all of Phase PB.

| Stage | Required strength | Summary | Deliverables |
|---|---|---|---|
| **PA0 — Schema, seeds, migration** | High | New DDL, provenance, drop edges; rewrite seed fixture; migrator; DATA_MODEL | Schema + seeds + `migrate_loom_v2.py` + regenerated inventory; suite compiles |
| **PA1 — Thread/order/node API** | High | Threads with auto Start/End, ordered membership, node CRUD, insert/reorder/remove; remove edge + bridge endpoints | Rewritten `loom.py` + schemas + tests; API_REFERENCE |
| **PA2 — Beat lifecycle + sharing + spawn** | High | Fulfil, bank, restore, add-to-thread, spawn-from-session | Endpoints + tests; API_REFERENCE |

### Phase PB — Frontend reframe

Delivers the ordered-thread UI, the domain command model, the Beat Bank, and removal of edge-drawing and the
bridge. **Depends on:** PA1 (types/endpoints frozen). 

| Stage | Required strength | Summary | Deliverables |
|---|---|---|---|
| **PB0 — Types + client + scaffolding** | Standard | New TS types, client methods, `it.skip` seams | Types/client compile; page unchanged |
| **PB1 — Ordered view + core commands** | High | Lane view from `position`; Create Thread / Add Beat / Record Session / Insert; remove connect + edge draw | New view + commands + tests |
| **PB2 — Beat lifecycle UI** | High | Beat Bank, Fulfil, Bank, Replace, Spawn, Change Ending; remove bridge dialog | Panels/dialogs + tests |

### Phase PC — Cleanup & full sweep

| Stage | Required strength | Summary | Deliverables |
|---|---|---|---|
| **PC0 — Remove obsolete modules + migration/integration tests** | High | Delete DAG modules/edge components; migration + invariant tests; API_REFERENCE reconcile | Dead code gone; green suite; docs current |

### Plan Closeout — Documentation update

| Stage | Required strength | Summary | Deliverables |
|---|---|---|---|
| **PD0 — Documentation update** | Standard | Reconcile + archive | References, routing, validation, archival complete |

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage ===== -->

#### PA0 — Schema, seeds, and migration foundation (next up)

- **Read first:** **`data/seeds/drafts/loom_v2/` — the pre-authored new-shape seed fixture and its
  `README.md` + `validate_loom_v2_seed.py` (promote these three JSON files rather than authoring seeds from
  scratch; run the validator first).** Then `scripts/init_database.py` (lines ~347–403, loom DDL + the
  inventory-print block ~412–419), `data/seeds/seed_loom_*.json` (all four current old-shape files),
  `scripts/seed_database.py` (the `--loom` path),
  `scripts/export_db_seeds.py` (loom export), `backend/tests/conftest.py::_seed_real_data`,
  `docs/DATA_MODEL.md` (Loom schema notes ~99–107 and the `GENERATED:DATA_MODEL` block ~129–452),
  `backend/app/schemas.py` (loom models ~429–533).
- **Build:** (1) Rewrite the loom DDL: `loom_nodes.kind CHECK IN ('start','end','beat','session')`, drop the
  `status` column and its compound CHECK, add `fulfilled_planned_title TEXT`, `fulfilled_at DATETIME`,
  `banked_from_thread_id INTEGER REFERENCES loom_threads(id) ON DELETE SET NULL`; add
  `loom_node_threads.position INTEGER NOT NULL`; add `loom_threads.origin_node_id INTEGER REFERENCES
  loom_nodes(id) ON DELETE SET NULL`; **drop `CREATE TABLE loom_edges`** and its two indexes; keep
  `idx_loom_node_threads_thread`, add `idx_loom_node_threads_position ON loom_node_threads(thread_id, position)`.
  Update the DB-name drop list (init_database ~35–38) and the inventory print. (2) Promote the pre-authored
  new-shape seed fixture from `data/seeds/drafts/loom_v2/` (validated by `validate_loom_v2_seed.py`) into
  `data/seeds/`, replacing `seed_loom_threads.json`, `seed_loom_nodes.json`, and `seed_loom_node_threads.json`;
  it already models Start/End + `position`, a shared session on two threads, a banked beat, fulfilment
  provenance, and a spawned thread (`origin_node_id`). Update the loom loaders in `seed_database.py` for the new
  columns. Remove `seed_loom_edges.json` (and its loader wiring in `seed_database.py` and `export_db_seeds.py`),
  then delete the `data/seeds/drafts/loom_v2/` staging folder. (3) Add
  `scripts/migrate_loom_v2.py` implementing the Migration-strategy algorithm: back up the DB, remap kinds,
  synthesize Start/End, linearize per-thread order from intra-thread edges (topo + `(x,y,id)` tie-break), bank
  abandoned/orphan anchors, drop cross-thread edges, and write `migration_report.json`; idempotent (detect
  already-migrated schema and no-op). (4) Update Pydantic loom models to the new fields (add `position`,
  `origin_node_id`, provenance; new `kind` Literal; drop `status`, `LoomEdge*`, `LoomBridge*`) — but keep the
  router importable; where the router still references removed symbols, leave a thin temporary shim that PA1
  replaces (note it in Discovery consolidation).
- **Inherits:** the existing tables and CASCADE semantics; `_node_thread_ids` batching; the export/seed wiring
  and `_seed_real_data` hook.
- **Expected touch set:** `scripts/init_database.py`, `data/seeds/seed_loom_threads.json`,
  `seed_loom_nodes.json`, `seed_loom_node_threads.json`, delete `seed_loom_edges.json`,
  `scripts/seed_database.py`, `scripts/export_db_seeds.py`, `scripts/migrate_loom_v2.py` (new),
  `backend/app/schemas.py`, `backend/tests/conftest.py`, `docs/DATA_MODEL.md`. Grep the tree for `loom_edges`,
  `seed_loom_edges`, and `status` (loom) to catch every consumer before editing.
- **Documentation impact:** `docs/DATA_MODEL.md` — rewrite the "Loom — Tapestry Schema Notes" section for the new
  kinds/position/origin/provenance and the removal of `loom_edges`; update the seed-file/table table (~37–40) to
  drop the edges row; regenerate the `GENERATED:DATA_MODEL` inventory block. (Area guide + API_REFERENCE are
  updated in PA1, which owns the API contract.)
- **Tests:** update `conftest.py` so integration seeding loads the new fixture; add a schema smoke test asserting
  the new columns/kinds and the absence of `loom_edges`; add `scripts`-level tests for `migrate_loom_v2.py`
  (chain thread → automatic order; branchy thread → reported; abandoned → banked). Run
  `.venv\Scripts\python.exe -m pytest backend/tests -k loom --no-cov` then the full gate
  `.venv\Scripts\python.exe -m pytest`.
- **Gate:** `init_database.py` + `seed_database.py --loom` build a valid new-shape DB; migrator converts a copy
  of the *old* fixture into the new shape with a report and no data loss; full backend suite green at ≥90%.
  Suite-sufficient (no browser).
- **Discovery consolidation:** record the final column list, the exact new-shape seed JSON, and the temporary
  schema shims into PA1's **Read first**/**Build**; update `docs/DATA_MODEL.md`; if the branchy-linearization
  heuristic needs tuning, note it in the Migration strategy section and PC0's tests.
- **Completion edit:** collapse PA0 to a Shipped row; Status line → "PA0 shipped; PA1 next"; move the PA1 heading
  to `(next up)` and update the area guide + manifest current-stage anchors.

#### PA1 — Thread/order/node API (planned)

- **Read first:** `backend/app/routers/loom.py` (all endpoints), `backend/app/schemas.py` (loom models as left by
  PA0), `backend/tests/routers/test_loom.py`, `docs/API_REFERENCE.md` (Loom Router ~187–263), and PA0's
  consolidated column/seed facts.
- **Build:** Rewrite `loom.py`. **Threads:** `POST /loom/threads` also creates one `start` (title = thread name
  or supplied premise) and one `end` node with membership positions 0 and 10; accept optional `origin_node_id`.
  `GET /loom/tapestry` returns `threads` (with `origin_node_id`), `nodes`, and per-thread ordered membership
  `[{node_id, position}]`; **no `edges`**. **Nodes:** create/update/delete for `beat`/`session`; enforce
  thread-exclusivity for `start`/`end`/`beat` (≤1 membership) and the one-start/one-end invariant (422 on
  violation). **Ordering endpoints:** `POST /loom/threads/{id}/items` (place a beat/session at a gap, renumber),
  `PATCH /loom/threads/{tid}/items/{nid}` `{position}` (reorder, clamp between Start and End),
  `DELETE /loom/threads/{tid}/items/{nid}` (remove membership, renumber). **Remove** `POST/DELETE /loom/edges`,
  `POST /loom/bridge`, `_would_cycle`, `_CYCLE_CHECK_SQL`, and (per Open Decision 2) keep or drop
  `PATCH .../position` — default keep. Replace `LoomTapestry`/schemas accordingly.
- **Inherits:** PA0's schema, seeds, provenance columns, and `_node_thread_ids` batching.
- **Expected touch set:** `backend/app/routers/loom.py`, `backend/app/schemas.py`,
  `backend/tests/routers/test_loom.py`, `docs/API_REFERENCE.md`. If the tapestry response shape changes any
  field name the frontend asserts, list `frontend/src/api/types.ts` and `client.ts` as read-only surveys for PB0
  (do not edit frontend here).
- **Documentation impact:** `docs/API_REFERENCE.md` — replace the entire Loom Router table (both the descriptive
  and the generated request/response tables) with the new endpoints; note edges/bridge removal.
- **Tests:** rewrite `test_loom.py`: create-thread-makes-start+end; insert-between renumbers; reorder clamps;
  remove-membership renumbers; one-start/one-end enforced; same-node-twice rejected (422); beat exclusivity
  enforced. Run `.venv\Scripts\python.exe -m pytest backend/tests/routers/test_loom.py --no-cov` then the full
  gate.
- **Gate:** every command in the Interaction model round-trips against a live seeded DB; full backend suite green
  at ≥90%. Suite-sufficient.
- **Discovery consolidation:** freeze the exact endpoint paths/verbs/response shapes into PB0's **Build** and the
  Interaction-model section; update `docs/API_REFERENCE.md`; note any invariant helper reused by PA2.
- **Completion edit:** collapse to a Shipped row; Status → "PA1 shipped; PA2 next"; advance the `(next up)`
  heading and the area-guide/manifest anchors.

#### PA2 — Beat lifecycle, sharing, and spawning (planned)

- **Read first:** `loom.py` and `schemas.py` as left by PA1, `test_loom.py`, the State-transitions table, and
  PA1's frozen endpoint list.
- **Build:** `POST /loom/nodes/{id}/fulfil` (beat→session in place: set `kind='session'`,
  `fulfilled_planned_title` = current title unless a new title is supplied, `fulfilled_at = now`; memberships
  untouched); `POST /loom/nodes/{id}/bank` (delete membership(s), set `banked_from_thread_id`);
  `POST /loom/nodes/{id}/place` (restore/add a banked or existing session to a thread at a gap — may be the same
  endpoint as `POST /loom/threads/{id}/items`); spawn is `POST /loom/threads` with `origin_node_id` (from PA1) —
  add validation that the origin is a `session`. Enforce transition preconditions (fulfil requires `kind='beat'`
  placed on the thread; add-to-thread requires `kind='session'`).
- **Inherits:** PA1's ordering/insert helpers and invariants; PA0's provenance columns.
- **Expected touch set:** `backend/app/routers/loom.py`, `backend/app/schemas.py`, `test_loom.py`,
  `docs/API_REFERENCE.md`.
- **Documentation impact:** `docs/API_REFERENCE.md` — add the fulfil/bank/place rows and the `origin_node_id`
  spawn note.
- **Tests:** fulfil preserves order + stamps provenance; fulfil→revert (client-style PUT) restores wording; bank
  then restore onto another thread; add shared session to a second thread with independent order; spawn sets
  origin and auto Start/End. Run the loom router tests then the full gate.
- **Gate:** the Example Target Scenario (Ice Queen: plan → session → spawn hat thread → fulfil or bypass) runs
  end-to-end via the API on a live DB; full backend suite green at ≥90%. Suite-sufficient.
- **Discovery consolidation:** record the final lifecycle endpoint shapes into PB2's **Build**; update
  `docs/API_REFERENCE.md`; move any deferred lifecycle nicety to Known debt.
- **Completion edit:** collapse to a Shipped row; Status → "Phase PA complete; PB0 next"; delete the Phase PA
  section per the phase-completion rule, promoting durable facts to top matter; advance anchors.

#### PB0 — Frontend types, client, and scaffolding (planned)

- **Read first:** `frontend/src/api/types.ts` (loom types ~484–558), `frontend/src/api/client.ts` (loom methods),
  the frozen PA1/PA2 endpoint list, `frontend/src/features/loom/` (all modules), and its `__tests__/`.
- **Build:** Replace loom TS types (`LoomNodeKind = 'start'|'end'|'beat'|'session'`; add `position`,
  `origin_node_id`, provenance; drop `LoomEdge*`, `LoomBridge*`, `LoomAnchorStatus`). Add client methods for the
  PA1/PA2 endpoints; remove edge/bridge client methods. Add `it.skip` seams (with real assertion bodies) for the
  ordered-view derivation and each command. Keep the app compiling: temporarily stub the derivation so
  `LoomPage` still renders (no behavior change visible yet).
- **Inherits:** PA1/PA2 endpoint contracts.
- **Expected touch set:** `frontend/src/api/types.ts`, `frontend/src/api/client.ts`,
  `frontend/src/features/loom/*` (type-level only), new `it.skip` tests under `__tests__/`.
- **Documentation impact:** `None: types/client scaffolding carries no user-visible or reference-doc contract
  change; API_REFERENCE was updated in PA1/PA2.`
- **Tests:** `cd frontend && npm run typecheck` and `npm run build` clean; `npm run test` green (skips inert).
- **Gate:** app builds and the Loom route renders unchanged; typecheck/build/lint clean. Suite-sufficient.
- **Discovery consolidation:** write the confirmed new type shapes and client signatures into PB1/PB2 **Build**;
  list every file importing removed symbols (`LoomEdge`, `Bridge`, `wouldCycle`, `anchor`, `status`) into PB1's
  **Expected touch set**.
- **Completion edit:** collapse to a Shipped row; Status → "PB0 shipped; PB1 next"; advance anchors.

#### PB1 — Ordered thread view and core commands (planned)

- **Read first:** `LoomPage.tsx`, `loomFlow.ts`, `loomGraph.ts`, `useLoomCanvasMutations.ts`, `LoomWeaverPanel.tsx`,
  the node components, and PB0's confirmed types/client + file list.
- **Build:** Replace the DAG derivation with per-thread ordered lanes computed from `position` (Start-left →
  End-right). Implement Create Thread, Add Story Beat between A and B, Record Session Node, Insert Session into a
  thread — all via the PA1 endpoints and the position/renumber model. **Remove** generic edge drawing:
  `onConnect`, `isValidConnection`, the `connect`/`isValidConnection`/`removeEdge` paths in
  `useLoomCanvasMutations.ts`, and edge rendering in `loomFlow.ts`. Per Open Decision 1, keep React Flow but lay
  out nodes from `position` (auto-layout), not persisted `x,y` + user edges.
- **Inherits:** PB0 types/client; PA1 ordering endpoints; existing node editor + thread manager + tokens.
- **Expected touch set:** `LoomPage.tsx`, `loomFlow.ts`, `useLoomCanvasMutations.ts`, `LoomNodeEditor.tsx`,
  `nodes/*`, plus the exact consumer list PB0 handed forward; tests under `__tests__/`.
- **Documentation impact:** `None: user-visible capability is documented in the area guide during PC0/PD0; no
  canonical reference contract changes in this stage.`
- **Tests:** unit-test the ordered-derivation module (Start/End pinning, current-position rule) and each command's
  request; render smoke tests for the lane view. `npm run test`, `npm run typecheck`, `npm run build`.
- **Gate:** live app — create a thread, add a beat between Start and End, record a session and insert it, confirm
  order persists across reload. **Browser pass required** per `CLAUDE.md` only if the user asks; otherwise
  suite + a manual note.
- **Discovery consolidation:** record the lane-layout approach and the current-position rule into PB2 and the
  Interaction-model section; list any remaining edge/DAG references for PC0 to delete.
- **Completion edit:** collapse to a Shipped row; Status → "PB1 shipped; PB2 next"; advance anchors.

#### PB2 — Beat lifecycle UI (planned)

- **Read first:** `LoomVaultPanel.tsx`, `LoomBridgeDialog.tsx`, `LoomWeaverPanel.tsx`, `LoomPage.tsx` as left by
  PB1, PA2 lifecycle endpoints, and PB1's handoff notes.
- **Build:** Convert the vault panel into the **Beat Bank** (beats with zero membership; Restore action). Add
  Fulfil Beat, Bank Beat, Replace Beat, Spawn Thread from Session, and Change Ending as domain commands wired to
  PA2 endpoints. **Remove** `LoomBridgeDialog.tsx` and the bridge mode in `LoomPage.tsx`, and the
  head/next-anchor/live-warp visuals.
- **Inherits:** PB1 view + commands; PA2 endpoints; existing dialogs (`ConfirmDialog`) and tokens.
- **Expected touch set:** `LoomVaultPanel.tsx`, `LoomWeaverPanel.tsx`, `LoomPage.tsx`, delete
  `LoomBridgeDialog.tsx` + its test; tests under `__tests__/`.
- **Documentation impact:** `None: covered by the area-guide capability update in PD0; no canonical reference
  contract changes here.`
- **Tests:** command tests for fulfil/bank/restore/replace/spawn/change-ending; Beat Bank render + restore.
  `npm run test`, `npm run typecheck`, `npm run build`.
- **Gate:** live app — fulfil a beat (becomes a session in place), bank + restore a beat, spawn a thread from a
  session, change an end; all persist. Browser pass only on request; otherwise suite + manual note.
- **Discovery consolidation:** note every deleted module/symbol for PC0's dead-code sweep; move deferred UI
  niceties to Known debt.
- **Completion edit:** collapse to a Shipped row; Status → "Phase PB complete; PC0 next"; delete the Phase PB
  section, promoting durable facts; advance anchors.

#### PC0 — Remove obsolete modules; migration and integration tests (planned)

- **Read first:** `loomGraph.ts`, `loomFlow.ts` and their tests, `docs/API_REFERENCE.md`, the area guide, and the
  accumulated PA/PB handoff notes.
- **Build:** Delete the now-dead DAG functions (`headsByThread`, `nearestFutureAnchors`, `buildAdjacency` if
  unused, `wouldCycle`, live-warp helpers) and any leftover edge components/types; remove `LoomEdge`-shaped
  fixtures. Add a migration integration test that loads a malformed/old-shape fixture and asserts the migrator's
  report + lossless conversion. Add invariant tests (no branch inside a thread; one Start/one End; shared-session
  independence). Reconcile `docs/API_REFERENCE.md` with the shipped endpoints.
- **Inherits:** everything from PA/PB; this stage only removes and verifies.
- **Expected touch set:** `frontend/src/features/loom/loomGraph.ts`, `loomFlow.ts`, `__tests__/*`,
  `backend/tests/` (migration + invariant tests), `docs/API_REFERENCE.md`.
- **Documentation impact:** `docs/API_REFERENCE.md` — final reconcile of the Loom Router tables.
- **Tests:** full backend gate `.venv\Scripts\python.exe -m pytest` (≥90%); `cd frontend && npm run test`,
  `npm run typecheck`, `npm run build`, `npm run lint`.
- **Gate:** no references to `loom_edges`/`anchor`/`bridge`/`wouldCycle` remain (grep clean); both suites green;
  migration test passes. Suite-sufficient.
- **Discovery consolidation:** ensure every durable fact is in DATA_MODEL/API_REFERENCE or top matter before
  closeout; list nothing left only in commits.
- **Completion edit:** collapse to a Shipped row; Status → "Phase PC complete; PD0 (closeout) next"; delete the
  Phase PC section; advance anchors.

#### PD0 — Documentation update (final stage of the plan)

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

**PA0 — Schema, seeds, and migration foundation** is next up and unblocked. It rewrites the loom DDL and seed
fixture, drops `loom_edges`, adds `scripts/migrate_loom_v2.py`, and updates `docs/DATA_MODEL.md`.
