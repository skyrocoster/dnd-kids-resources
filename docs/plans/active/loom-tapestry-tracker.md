# The Loom — Tapestry Story-Thread Tracker

> **Status:** LM0–LM4 shipped. LM5 — Canvas mutations is next.

- **Area guide:** [The Loom](../../areas/loom.md).

---

## What the feature is

The Loom treats the campaign as a **tapestry** of evolving story threads rendered on a node-graph canvas. Each thread is a chain of nodes: **Anchors** are future events or milestones planned by the DM (waiting to be triggered), and **Updates** are post-session narrative notes recording what actually happened. Directional edges carry forward-only narrative time. Threads **merge** (two chains converge into one shared node) and **split** (one node branches into multiple directions); each thread has an identifiable **Head** (its current, latest past node) and **nearest Future Anchors** (the next planned milestones reachable forward from a head). The signature workflow is **Anchor and Bridge**: after a session the DM spawns a new Update node and wires it *between* the current head and a pre-planned Anchor. Unwired nodes form the **Idea Vault**.

The Loom is a continuity and narrative-evolution tracker, not a live-session stenography tool. It replaces the quests domain: quests are a flat CRUD catalog with no story state, and nothing else in the codebase consumes quest data, so the final delivery phase removes them outright once the Loom is live.

---

## Key facts / data facts

### Graph semantics (authoritative for every stage)

- The tapestry is **one flat DAG**. Threads are a persisted grouping/coloring overlay with many-to-many node membership (`loom_node_threads`), never nesting. Merge = in-degree ≥ 2; split = out-degree ≥ 2; both fall out of the flat `loom_edges` table.
- `past(n)` := `kind='update'` OR (`kind='anchor'` AND `status='reached'`). `future(n)` := `kind='anchor'` AND `status='planned'`. Abandoned anchors are neither: excluded from head computation, they terminate forward walks silently, and render dimmed.
- `heads(T)` := `{ n ∈ T : past(n) AND no edge (n→m) exists with past(m) AND m ∈ T }` — a **set**, not a scalar (an in-thread split legitimately yields two heads). The `m ∈ T` restriction makes merges behave: after threads A and B merge into shared node M, M is the single head of both, while a hand-off edge to another thread's node leaves this thread's head in place.
- `nearestFutureAnchors(h)` := BFS forward from head `h`; report a node and stop expanding that branch when `future(n)`; stop silently at an abandoned anchor; otherwise keep walking. Result: the first planned anchor on each forward branch.
- `vault(G)` := nodes with degree 0 (no edges in either direction), regardless of thread membership.
- **Anchor lifecycle** is `planned → reached | abandoned`. A reached anchor joins the past chain (it keeps `kind='anchor'` for provenance/rendering; triggering it is a one-field PUT). Updates always have `status = NULL` — past-ness is a pure row function.
- **Acyclicity is the only structural invariant and is enforced server-side** (422) on `POST /api/loom/edges` and inside `POST /api/loom/bridge`. Edge `source→target` is illegal iff `target` can already reach `source`:

```sql
WITH RECURSIVE reachable(id) AS (
    SELECT ?                       -- target_id
    UNION                          -- UNION (not ALL) dedupes and guarantees termination
    SELECT e.target_id FROM loom_edges e JOIN reachable r ON e.source_id = r.id
)
SELECT 1 FROM reachable WHERE id = ? LIMIT 1;   -- source_id; any row means reject with 422
```

- **Computation split:** the backend enforces acyclicity and payload coherence; heads, nearest anchors, vault, and edge coloring are derived presentation state computed in the pure frontend module `frontend/src/features/loom/loomGraph.ts` from the one-shot `GET /api/loom/tapestry` payload. No server-side head query exists in v1 (the bridge endpoint takes explicit ids and validates them with row checks, not traversal). The frontend duplicates a cheap `wouldCycle` DFS for instant `isValidConnection` canvas feedback; the server check is authoritative.
- Forward-only time is **edge direction alone** in v1. `session_tag` is optional display-only metadata; a sortable session integer is a backward-compatible later addition (Known debt).

### Demo tapestry (seed fixture; assertable truths)

2 threads, 7 nodes, 5 edges exercising every construct. Threads: id 1 **"The Lost Puppy"** (`thread-3`, migrating the sole existing quest's flavor), id 2 **"Goblin Trouble"** (`thread-1`). Nodes: 1 update "Puppy goes missing in the village" [1]; 2 update "Goblins spotted stealing chickens" [2]; 3 update "Tracks lead to the goblin cave" [1,2] (**merge node, current head of both threads**); 4 anchor planned "Confront the goblin chief" [1,2]; 5 anchor planned "Puppy reunion festival" [1]; 6 anchor planned "Secret tunnel discovered" [2]; 7 update "Mysterious hooded stranger" [] (**vault** — no edges, no membership). Edges: 1→3, 2→3 (merge), 3→4, 3→6 (split), 4→5 (anchor chain). Assertable truths: `heads` = {3} for both threads; `nearestFutureAnchors(3)` = {4, 6}; `vault` = {7}.

### Backend conventions (surveyed 2026-07-17)

- One router file per domain in `backend/app/routers/`, `APIRouter(prefix="/api", tags=["loom"])`, raw SQL via `with get_db() as conn:` from `backend/app/db.py` (row factory + `PRAGMA foreign_keys = ON`); no ORM, no Depends-based DB injection. Idiom sources: `backend/app/routers/quests.py` (CRUD + JSON columns) and `layouts.py` (transactional writes).
- Register in `backend/app/main.py`: add `loom` to the `from .routers import (...)` block (lines 8–21, after `layouts`) and add exactly `app.include_router(loom.router)` to the include list (lines 43–54) — `scripts/check_docs.py` regexes this exact form to regenerate `docs/ARCHITECTURE.md`.
- Pydantic models live in `backend/app/schemas.py`; append loom models after `QuestUpdate` (~line 449).
- Schema is canonical in `scripts/init_database.py`; backend tests build the real schema by importing it (`backend/tests/conftest.py::_create_real_schema`) — never hand-copy DDL into fixtures. Changing `scripts/init_database.py` requires `docs/DATA_MODEL.md` in the same change set (checker-enforced).
- `pytest` from the repo root; coverage gate `--cov=backend/app --cov-fail-under=90` — every loom error branch needs a direct test or the whole suite fails. Integration tests (`@pytest.mark.integration`) seed from frozen `data/seeds/*.json` via `scripts/seed_database.py`.
- **Bridge and position-PATCH contract (confirmed, LM2):** `POST /api/loom/bridge` → 201 `{node: LoomNode, created_edges: LoomEdge[2] (source→N, N→anchor), deleted_edge_id: int | null}`; 404 if `source_id`/`anchor_id` don't reference existing nodes, 422 for the three semantic guards (source not past, anchor not a planned anchor, would-cycle). `PATCH /api/loom/nodes/{id}/position` body `{x, y}` → 200 returns the **full** `LoomNode` (not a partial), 404 if missing. Verified live against the seeded demo tapestry: bridging node 3 → anchor 4 produced midpoint `(300, 75)`, thread union `[1, 2]`, and deleted the direct 3→4 edge.
- **Loom seed loading is opt-in, not part of "load all":** `scripts/seed_database.py --loom [--force]` is required to load the four demo-tapestry seed files; a bare `scripts/seed_database.py` (no flags) never loads or clears loom data as a side effect of "load all" (though `--force` alone still clears loom tables along with everything else, matching the dungeons precedent). `backend/tests/conftest.py::_seed_real_data` always loads the loom fixture. `scripts/export_db_seeds.py` (no `--tables` filter) now includes the four loom tables by default.

### Frontend conventions (surveyed 2026-07-17)

- React **19.2.7** + Vite + TS. `@xyflow/react` must be ≥ 12.4 for React 19; pin `^12.8`. This is the project's first graph library and fifth runtime dependency.
- API client is a plain fetch wrapper (`frontend/src/api/client.ts`) with `get/post/put/del` helpers (~lines 58–63) and per-domain named exports; types in `frontend/src/api/types.ts`. The Loom adds the codebase's first `patch` helper.
- Routes are flat children of `AppShell` in `frontend/src/router.tsx`; nav entries come solely from `frontend/src/layout/navSections.ts` (drives rail, drawer, and HomePage chapter tabs). Icons are imported only through the `frontend/src/components/icons/index.ts` barrel.
- Vitest + Testing Library + jsdom, colocated `__tests__/`. Commands: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` — typecheck is `tsc -b` (`tsc --noEmit` checks nothing here). There is no frontend coverage gate.
- **React Flow under jsdom** needs `ResizeObserver`, `DOMMatrixReadOnly`, and element offset dimensions that jsdom lacks — stub them in `frontend/src/test/setup.ts`. Concentrate coverage in the pure modules; never attempt drag/connect interaction tests in jsdom (live browser gates cover them).
- The app has **no global toast system** — surface canvas mutation errors in a feature-local dismissible banner using `--md-error` tokens; do not build a global one.
- React Flow's license requires visible attribution without a paid subscription: restyle `.react-flow__attribution`, never remove it.

---

## Design system in force

`docs/DESIGN_SYSTEM.md` is canonical. The Loom extends it with **generated** MD3 token sets only — never hand-picked hex (per the distinct-entities rule, each loom concept gets its own harmonized identity):

- Generate each set with `node scripts/generate-md3-tokens.mjs --seed <hex> --role <name>` (run from the repo root; needs `frontend/node_modules`; prints a paste-ready 4-token block for `frontend/src/theme.css`, after the `--md-npc` block):
  - `--seed e8b33d --role loom-anchor` (warm beacon gold — planned milestones)
  - `--seed 8fb3d9 --role loom-update` (cool slate blue — recorded past)
  - Thread accents `loom-thread-1`…`loom-thread-6` with hue-spread seeds `e05d5d`, `e09a3d`, `7bc47b`, `4fb8c9`, `7d8fe0`, `c97bd0`.
- Thread `color` is stored as a token key (`thread-1`…`thread-6`), validated by Pydantic pattern `^thread-[1-6]$` — not a DB CHECK, so the palette can grow without a schema change.
- Re-theme React Flow via its own CSS variables mapped to MD3 tokens in `LoomCanvas.css` (e.g. `--xy-background-color: var(--md-surface)`, `--xy-edge-stroke: var(--md-outline)`); import `@xyflow/react/dist/style.css` once in `LoomPage.tsx`. Confirmed contract (LM4): 20 `--xy-*` variables re-themed — background, pattern dots, edges, handles, selection, controls, and attribution all resolve to MD3 tokens.
- Multi-thread nodes wear a **thread-chip strip** (one 8×8px colored dot per membership); edges take the single thread accent in `threads(source) ∩ threads(target)`, else neutral `--md-outline`. Chip strip is `aria-hidden="true"` — never the sole thread cue. Standard approach kept (no fallback needed at zoom-out).
- Honor the existing floors: foundation spacing/radius/motion/z tokens, 48px touch targets for ordinary controls, visible focus, no hue-alone cues. Changing `frontend/src/theme.css` requires `docs/DESIGN_SYSTEM.md` in the same change set (checker-enforced); adding a dependency to `frontend/package.json` requires `docs/TESTING.md` likewise.

---

## Reusable pieces (do not rebuild)

- `frontend/src/components/Dialog.tsx` (full modal accessibility contract: focus trap, Escape/backdrop, `pending`, `className?` width override), `ConfirmDialog.tsx`, `StatePanel.tsx`, `Button`/`IconButton`, `SelectField`/`TextField`/`MultiSelectField` in `components/form/` — all loom dialogs and panels compose these.
- `frontend/src/layout/navSections.ts` — extend once for the new route; never duplicate the nav list.
- `scripts/generate-md3-tokens.mjs` — the only way to mint loom colors.
- Map Lab's layering (`frontend/src/features/dungeons/maplab/`): pure model module → reducer-style hook → page component. The Loom follows the same layering (`loomGraph.ts` → `useLoomTapestry.ts` → `LoomPage.tsx`); React Flow replaces only Map Lab's hand-rolled canvas/zoom layer, so do not replicate `MapCanvas`/`useMapCanvasZoom`.
- **`frontend/src/features/loom/loomGraph.ts`** (LM3, pure, no React/React Flow import): `isPast(node)`, `isFuture(node)`, `buildAdjacency(edges): Map<number, number[]>` (source id → target ids), `headsByThread(tapestry): Map<number, Set<number>>` (thread id → head node ids), `nearestFutureAnchors(headId, tapestry, adjacency?): number[]`, `vaultNodes(tapestry): LoomNode[]`, `edgeThreads(edge, tapestry): number[]`, `wouldCycle(edges, sourceId, targetId): boolean`. All take/return plain `LoomNode`/`LoomEdge`/`LoomTapestry` from `api/types.ts`.
- **`frontend/src/features/loom/loomFlow.ts`** (LM3, pure): `buildFlowNodes(tapestry): FlowNode[]` and `buildFlowEdges(tapestry): FlowEdge[]`. `FlowNode = {id: string, type: 'anchor'|'update', position: {x,y}, data: {node: LoomNode, isHead: boolean, isNextAnchor: boolean}}`; `FlowEdge = {id: string, source: string, target: string, data: {threadIds: number[]}}`. Ids are `String(node.id)`/`String(edge.id)` (React Flow expects string ids).
- **`frontend/src/features/loom/LoomPage.tsx`** (LM4): React Flow composition with `<ReactFlow>`, `<Background>`, `<Controls>`, custom `nodeTypes = { anchor: AnchorNode, update: UpdateNode }`, and `LoomThreadsContext.Provider` for thread-color resolution in child nodes. Imports `@xyflow/react/dist/style.css` and `LoomCanvas.css`.
- **`frontend/src/features/loom/LoomCanvas.css`** (LM4): Twenty `--xy-*` CSS variables mapped to MD3 tokens (scoped under `.loom-canvas-area .react-flow`); node status treatments via `data-status`/`data-head` attributes; thread chip strip; vault panel styles. Attribution restyled but never removed.
- **`frontend/src/features/loom/useLoomTapestry.ts`** (LM4): Read-path fetch hook returning `RemoteState<LoomTapestry>` + `reload` callback. No mutation plumbing yet (LM5).
- **`frontend/src/features/loom/nodes/AnchorNode.tsx`**, **`UpdateNode.tsx`**, **`ThreadChips.tsx`**, **`loomThreadsContext.ts`** (LM4): Memoized custom React Flow node components; thread data rides via context since React Flow only forwards `data` to node types. Thread chips are `aria-hidden="true"` (never the sole thread cue).
- **`frontend/src/features/loom/LoomVaultPanel.tsx`** (LM4): Collapsible side panel listing vault nodes (degree 0); `onSelectNode` callback pans viewport via `rfInstance.setCenter()`.
- Backend: `backend/app/db.py` helpers (`get_db`, `dict_from_row`, `parse_json_list`), the `quests.py`/`layouts.py` router idioms, and `backend/tests/conftest.py`'s real-schema fixtures.

---

## Known debt / deferred work (NOT yet built)

- **No entity links from nodes to NPCs/dungeons/encounters in v1** — user decision: playtest the core loop first. Retrofit is a junction table + editor multi-select in a future plan.
- No server-side heads/next-anchor endpoint (derived client-side from the tapestry payload); add `GET /api/loom/threads/{id}/heads` only when a non-browser consumer appears.
- No canvas auto-layout (positions are fully manual) and no canvas undo.
- No session-number ordering column; `session_tag` is display-only text.
- No multi-campaign support — one tapestry per database, consistent with the rest of the app.

---

## Delivery Phase C — Frontend tapestry

Build the data layer, the pure graph model, and the React Flow canvas: read-only first, then mutations, then the bridge/anchor workflow.
**Depends on:** LM2 committed (shipped — its bridge endpoint is first consumed in LM6). **Depended on by:** Phase D.

| Stage | Required strength | Summary | Deliverables |
|-------|-------|---------|--------------|
| LM3 — Frontend data layer and graph model | Standard | API types/client methods and the pure `loomGraph.ts`/`loomFlow.ts` modules. No UI. | Exhaustive unit coverage of the graph semantics. |
| LM4 — React Flow canvas, read-only and themed | High | Install React Flow, mint loom tokens, render the tapestry with badges/chips/vault panel. | Themed canvas at `/loom`; live browser gate. |
| **LM5 — Canvas mutations** (next up) | Standard | Node/thread CRUD dialogs, edge connect with cycle rejection surfaced, drag persistence. | Full editing loop on canvas. |
| **LM6 — Bridge workflow and anchor lifecycle** | Standard | Selection-driven bridge flow, mark reached/abandoned, head/next recompute, empty state. | The complete DM loop, live-verified. |

**Sequencing:** LM3 → LM4 → LM5 → LM6.

#### LM5 — Canvas mutations (next up)

- **Read first:** LM4's page/hook code; `frontend/src/components/Dialog.tsx`, `ConfirmDialog.tsx`, `components/form/`; this plan's `Key facts` (API surface, no-toast rule); `docs/DESIGN_SYSTEM.md`'s standard editor contract (VW4 section).
- **Build:** Node create/edit dialog on the shared `Dialog` (title, body, kind chosen at create only, status select for anchors, session_tag, thread multi-select) and delete via `ConfirmDialog` with pending state. Thread manager panel: create/rename/recolor/delete with the six `--md-loom-thread-N` swatches as the color-key picker. `onConnect` → `createLoomEdge` with 409 ("already connected") and 422 (cycle/self-loop) surfaced in a feature-local dismissible error banner (`--md-error` tokens); wire React Flow's `isValidConnection` to `wouldCycle` for instant feedback (server remains authoritative). Edge select + delete. `onNodeDragStop` → `patchLoomNodePosition` (one PATCH per drag; no debounce machinery).
- **Inherits:** LM4 canvas and hook; LM3 client methods and `wouldCycle`.
- **Expected touch set:** `frontend/src/features/loom/` (editor/panel/banner components + CSS + `__tests__/`); this plan.
- **Documentation impact:** None: feature-local UI composed from shared contracts already documented; no shared-component, token, or API contract changes (LM4 already recorded the loom surface in ARCHITECTURE/DESIGN_SYSTEM).
- **Tests:** Dialog/form unit tests (create/edit payloads, anchor-status rules, thread multi-select); thread-manager tests; hook mutation tests with a mocked client (success; 409 copy; 422 cycle copy); drag-stop persistence call. Full `npm run test && npm run lint && npm run typecheck && npm run build`.
- **Gate:** Live browser pass — create a thread, create update and anchor nodes, wire a merge and a split, attempt a cycle and see the rejection surfaced, delete an edge, reload and confirm positions persisted.
- **Discovery consolidation:** Promote confirmed editor/panel component contracts to `Reusable pieces`; revise LM6's Build with the actual selection-state shape used by the canvas.
- **Completion edit:** Collapse LM5; rewrite the Status line; mark LM6 `(next up)`; re-point the manifest and area-guide anchors.

#### LM6 — Bridge workflow and anchor lifecycle (planned)

- **Read first:** LM5's selection/inspector code; this plan's `Key facts` (bridge semantics and response shape); `frontend/src/components/StatePanel.tsx`.
- **Build:** Selection-driven bridge flow: select a head node, then a planned anchor (order enforced) → "Bridge" action in the inspector → title/body/session_tag form → `createLoomBridge` → refetch tapestry. Anchor inspector actions "Mark reached" / "Mark abandoned" (PUT status) with confirmation. Derived flags recompute after every mutation so Now/Next badges advance visibly. Blank-tapestry empty state via `StatePanel` naming the next action ("Create your first thread"). `session_tag` display on node cards.
- **Inherits:** LM5 mutation plumbing and inspector; LM3 selectors; LM2 bridge endpoint.
- **Expected touch set:** `frontend/src/features/loom/` (inspector/bridge components + `__tests__/`); this plan.
- **Documentation impact:** None: feature-internal workflow over endpoints already recorded in `docs/API_REFERENCE.md`; the closeout stage reconciles user-visible capability docs.
- **Tests:** Bridge form tests (payload, splice handling/refetch); status-action tests; `loomGraph` regression asserting post-bridge derived state (new update becomes the head between old head and anchor) and post-reached state (anchor becomes head). Full `npm run test && npm run lint && npm run typecheck && npm run build`.
- **Gate:** Live browser pass of the full DM loop on the demo tapestry: bridge an update between node 3 and anchor 4 (direct edge replaced by 3→N→4), mark anchor 4 reached, watch heads advance; verify the blank-tapestry empty state on an empty database.
- **Discovery consolidation:** Promote the final interaction contract to `Key facts`; move anything deliberately not built to `Known debt / deferred work`.
- **Completion edit:** Collapse LM6; rewrite the Status line; mark LM7 `(next up)`; re-point the manifest and area-guide anchors; delete Phase C and promote its durable facts to top matter.

---

## Delivery Phase D — Quests removal

With the Loom live, remove the quests domain end-to-end. Nothing outside `features/quests/` consumes quest data, so the blast radius is exactly the surveyed list below.
**Depends on:** LM6 shipped and the Loom verified live. **Depended on by:** Plan Closeout.

| Stage | Required strength | Summary | Deliverables |
|-------|-------|---------|--------------|
| **LM7 — Remove the quests domain** | Standard | Delete the quests table, router, schemas, seed, UI, tests, and docs rows. | All suites green with quests gone. |

**Sequencing:** LM7 alone.

#### LM7 — Remove the quests domain (planned)

- **Read first:** This stage's touch list (surveyed 2026-07-17 — line numbers are drift-prone; verify with a quick grep before editing); `docs/areas/reference-catalogs.md`; `backend/tests/conftest.py`.
- **Build:** Delete `backend/app/routers/quests.py`, `frontend/src/features/quests/` (whole directory), and `data/seeds/seed_quests.json`. Edit out every quests reference: `backend/app/main.py` (import + `app.include_router(quests.router)`); `backend/app/schemas.py` `Quest`/`QuestCreate`/`QuestUpdate` (~lines 426–450); `scripts/init_database.py` quests CREATE TABLE (~lines 242–257), drop-list entry (line 40), and summary print; `scripts/seed_database.py` `populate_quests` (~368–415), `--quests` flag (~955), dispatch (~1010–1011), clear list (~914); `scripts/export_db_seeds.py` quests entries (~36–38, 132); `frontend/src/router.tsx` (import ~line 12, route ~line 37); `frontend/src/layout/navSections.ts` (~line 43, plus the now-unused `ScrollIcon` import); `frontend/src/api/client.ts` (quest methods ~128–133); `frontend/src/api/types.ts` (Quest types ~449–461). Tests: remove quest cases from `backend/tests/routers/test_resources.py` (~124–176) and `test_crud_completeness.py` (~134–158); remove `/api/quests` from `backend/tests/test_integration_real_data.py` collection lists (~40, 57); remove `populate_quests` from `backend/tests/conftest.py` (~line 79); remove quest fixtures/cases from `frontend/src/components/__tests__/BrowserLayout.vw0.test.tsx` (~107–124, 415–441); update the nav assertion in `frontend/src/layout/__tests__/AppShell.test.tsx` (~line 58). Update `docs/areas/reference-catalogs.md` scope and source map to drop quests.
- **Inherits:** The Loom as the live replacement (LM0–LM6); the "Lost Puppy" flavor already migrated into the demo tapestry.
- **Expected touch set:** Exactly the files above plus `docs/API_REFERENCE.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, `docs/areas/reference-catalogs.md`, and this plan.
- **Documentation impact:** Regenerate `docs/API_REFERENCE.md`, `docs/DATA_MODEL.md`, and `docs/ARCHITECTURE.md` (`python scripts/check_docs.py --write-generated`) and remove any hand-written quests narrative from them; update `docs/areas/reference-catalogs.md` (scope, source map, read-trigger phrasing no longer names quests).
- **Tests:** Full `pytest` (coverage gate re-passes with the quests code gone) and full `npm run test && npm run lint && npm run typecheck && npm run build`; `python scripts/check_docs.py --check` and `--check --base main`.
- **Gate:** Live browser pass — no Quests nav entry, `/quests` no longer routes, The Loom present and functional; `grep -ri quest backend frontend scripts data docs/areas` returns nothing unexpected (update the historical "Quest log" comment in `frontend/src/components/icons/index.ts` if `BookMarkedIcon`/`ScrollIcon` remain used elsewhere, or remove the unused exports).
- **Discovery consolidation:** `docs/areas/reference-catalogs.md` reflects the reduced scope; add a `Known debt` note here if any quest concept intentionally survives (none expected).
- **Completion edit:** Collapse LM7; rewrite the Status line; delete Phase D; retitle LM8's heading from "(final stage of the plan)" to "(next up)" so the checker's current-stage detection targets it; re-point the manifest and area-guide anchors to LM8.

---

## Plan Closeout — Documentation Update

| Stage | Required strength | Summary | Deliverables |
|-------|-------------------|---------|--------------|
| **LM8 — Documentation update** | Standard | Reconcile accumulated plan context and complete the documentation workflow. | Canonical references, routing, validation, and archival complete. |

#### LM8 — Documentation update (final stage of the plan)

- **Read first:** `CLAUDE.md`, `docs/README.md`, `docs/areas/loom.md`, this plan, `docs/PLAN_TEMPLATE.md`, `docs/TESTING.md`, `scripts/check_docs.py`, every reference named by prior stages, and relevant workflow/PR files.
- **Build:** Reconcile the plan's accumulated Key facts, reusable pieces, debt, shipped rows, and future-stage handoffs with the code that shipped. Complete every outstanding named canonical-reference update; refresh generated inventories (`python scripts/check_docs.py --write-generated`) for `docs/API_REFERENCE.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, and `docs/DESIGN_SYSTEM.md`; finalize `docs/TESTING.md`'s React Flow note; update `docs/README.md` routing (Task Router + inventory rows) and `docs/areas/loom.md`; prepare the plan archive.
- **Inherits:** All prior-stage documentation-impact edits and discovery consolidations; this stage verifies and closes them rather than deferring implementation-stage documentation.
- **Expected touch set:** This plan; `docs/areas/loom.md`; `docs/README.md`; `docs/API_REFERENCE.md`; `docs/DATA_MODEL.md`; `docs/ARCHITECTURE.md`; `docs/DESIGN_SYSTEM.md`; `docs/TESTING.md`; the archive location `docs/complete/loom-tapestry-tracker.md`.
- **Documentation impact:** `docs/README.md`, `docs/areas/loom.md`, `docs/API_REFERENCE.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/TESTING.md`, and this plan.
- **Tests:** `python scripts/check_docs.py --check`; `python scripts/check_docs.py --check --base <base-ref>` when a valid base ref is available; any documentation-validator tests changed by this outcome.
- **Gate:** A fresh reader can route from `CLAUDE.md` through `docs/README.md`, the area guide, and the retained plan context without rediscovering essential facts. Documentation checks and applicable tests pass.
- **Discovery consolidation:** Promote remaining durable facts to the appropriate canonical reference or retained plan top matter before archival; no unprocessed discovery remains only in a shipped-stage block or commit.
- **Completion edit:** Collapse this stage, mark the outcome complete, reduce the doc to top matter + Shipped table + Verification, archive it to `docs/complete/loom-tapestry-tracker.md`, set `docs/areas/loom.md` to `> **Active plan:** None.`, update `docs/README.md`, and create a redirect only for a known inbound link.

---

## Shipped stages

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| LM0 | Four loom tables + indexes added to canonical schema (`scripts/init_database.py`), four demo-tapestry seed files authored, `docs/DATA_MODEL.md` updated with loom subsection and regenerated schema inventory. Tables build via conftest; seeds validate; full pytest green at 91.27% coverage. |
| LM1 | `backend/app/routers/loom.py` router (thread/node/edge CRUD, `GET /api/loom/tapestry`, reachability-CTE cycle guard) plus `LoomThread`/`LoomNode`/`LoomEdge`/`LoomTapestry` schemas in `backend/app/schemas.py`, registered in `main.py`. No deviation from the planned endpoint contract; full pytest green at 90.99% coverage; manual tapestry curl against a freshly initialized dev DB returned valid JSON. |
| LM2 | `POST /api/loom/bridge` and `PATCH /api/loom/nodes/{id}/position` plus `LoomBridgeCreate`/`LoomBridgeResult`/`LoomNodePosition` schemas; four `populate_loom_*` seed loaders behind an opt-in `--loom` CLI flag (never part of "load all") wired into `seed_database.py`, `export_db_seeds.py`, and `conftest.py::_seed_real_data`; a dedicated `/api/loom/tapestry` integration smoke test (it returns a dict, not a list, so it couldn't join the existing generic collection-list tests). No deviation from the planned response contract; full pytest green at 91.07% coverage; live-verified bridge + position PATCH against the seeded demo tapestry. |
| LM3 | Loom types + `patch<T>` client methods added to `frontend/src/api/{types,client}.ts`; pure `frontend/src/features/loom/loomGraph.ts` (graph semantics) and `loomFlow.ts` (React-Flow-shaped mappers, no `@xyflow/react` dependency). No deviation from the planned export surface (see `Reusable pieces`); 19 new Vitest unit tests green (full suite 955 passed/6 skipped), lint and `tsc -b` clean. |
| LM4 | `@xyflow/react` ^12.11.2 installed; eight loom token sets (`loom-anchor`, `loom-update`, `loom-thread-1`…`loom-thread-6`) minted and wired in `theme.css`; themed read-only canvas at `/loom` with `LoomPage`, `LoomCanvas.css` (20 `--xy-*` vars re-themed), `useLoomTapestry`, `AnchorNode`/`UpdateNode`/`ThreadChips`/`LoomVaultPanel` components, and jsdom stubs. `docs/DESIGN_SYSTEM.md` token inventory regenerated + narrative section added; `docs/TESTING.md` React Flow jsdom boundary documented; `docs/ARCHITECTURE.md` dependency noted. 966 frontend tests + 91% backend coverage, lint/typecheck clean. |

---

## Verification (whole feature, once complete)

Seed the demo tapestry (`python scripts/seed_database.py --loom --force`), open `/loom`, and confirm the assertable truths from `Key facts`: node 3 wears "Now" for both threads, anchors 4 and 6 wear "Next", node 7 sits in the Idea Vault. Bridge an update between node 3 and anchor 4 and confirm the splice (3→new→4, direct edge gone); mark anchor 4 reached and confirm heads advance. Reload to confirm drag positions persist. Backend: `pytest` from the repo root (≥90% coverage). Frontend: `npm run test && npm run lint && npm run typecheck && npm run build`. Docs: `python scripts/check_docs.py --check` (and `--check --base main` before completion).

---

## Cross-references

- [../../areas/loom.md](../../areas/loom.md) — durable routing and invariants for this domain.
- [../../DATA_MODEL.md](../../DATA_MODEL.md), [../../API_REFERENCE.md](../../API_REFERENCE.md), [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — canonical contracts this plan writes into.
- [../../DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) — tokens, editor contract, accessibility floor.
- [../../TESTING.md](../../TESTING.md) — commands, coverage gate, and (from LM4) the React Flow jsdom boundary.
- [../../areas/reference-catalogs.md](../../areas/reference-catalogs.md) — owns quests until LM7 removes them.
- [visual-consistency.md](visual-consistency.md) — sibling active plan; its VT4 final design pass may land while this plan runs, so rebase loom UI stages onto any shared-component contract changes it records.

---

## Next:

**LM5 — Canvas mutations** is next. It is unblocked: LM4 shipped the themed React Flow canvas, hook, and node components that LM5 extends with CRUD dialogs, edge connect, and drag persistence.
