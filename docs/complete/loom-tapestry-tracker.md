# The Loom — Tapestry Story-Thread Tracker

> **Status:** LM0–LM8 complete.

- **Area guide:** [The Loom](../areas/loom.md).

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
- **Bridge and anchor-lifecycle interaction contract (confirmed, LM6):** `LoomPage.tsx` selection state gained a source/target picker layered on top of LM5's `selectedNodeId`/`selectedEdgeId`: selecting a past node that is also a head (`isPast(node) && flowNode.data.isHead`) shows a "Bridge to Anchor…" action in the node inspector; clicking it sets `bridgeSource` and enters a picking mode where the *next* canvas node click is intercepted — a click on an `isFuture` node opens `LoomBridgeDialog` (title/body/session_tag form calling `createLoomBridge` then `reload()`), a click on anything else surfaces "Select a planned anchor node to complete the bridge." in the existing error banner; a "Cancel" affordance and pane-click both clear `bridgeSource`. Selecting a planned anchor (`kind === 'anchor' && status === 'planned'`) shows "Mark Reached"/"Mark Abandoned" inspector actions gated only on that predicate (head status is irrelevant here); each opens a `ConfirmDialog` and, on confirm, calls `PUT /loom/nodes/{id}` — since that endpoint is a full replace, the payload is built by `loomGraph.ts`'s `buildNodeStatusUpdate(node, status)` (resubmits every existing field unchanged except `status`) rather than assembled inline, so it has direct unit coverage without exercising React Flow. The blank-tapestry empty state triggers on `nodes.length === 0 && threads.length === 0` and renders `StatePanel` with a "Create your first thread" action opening `LoomThreadManager`. **jsdom testing constraint (confirmed the hard way):** clicking a React Flow node under jsdom throws inside `d3-drag`'s `nodrag.js` (`Cannot read properties of null (reading 'document')`) even for a plain click, not just a drag gesture — so canvas-node-click-driven flows (bridge target selection, status-action gating) are covered by extracting their payload logic into pure functions (`loomGraph.ts`) and testing the dialogs (`LoomBridgeDialog`) in isolation instead of through `LoomPage` + simulated node clicks; `docs/TESTING.md`'s jsdom boundary note already covered drag/connect but not clicks, so this is a plan-level (not doc-canonical) discovery.
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
- **`frontend/src/features/loom/loomGraph.ts`** (LM3, pure, no React/React Flow import): `isPast(node)`, `isFuture(node)`, `buildAdjacency(edges): Map<number, number[]>` (source id → target ids), `headsByThread(tapestry): Map<number, Set<number>>` (thread id → head node ids), `nearestFutureAnchors(headId, tapestry, adjacency?): number[]`, `vaultNodes(tapestry): LoomNode[]`, `edgeThreads(edge, tapestry): number[]`, `wouldCycle(edges, sourceId, targetId): boolean`, `buildNodeStatusUpdate(node, status): LoomNodeInput` (LM6, full-replace payload builder for the anchor status PUT). All take/return plain `LoomNode`/`LoomEdge`/`LoomTapestry` from `api/types.ts`.
- **`frontend/src/features/loom/loomFlow.ts`** (LM3, pure): `buildFlowNodes(tapestry): FlowNode[]` and `buildFlowEdges(tapestry): FlowEdge[]`. `FlowNode = {id: string, type: 'anchor'|'update', position: {x,y}, data: {node: LoomNode, isHead: boolean, isNextAnchor: boolean}}`; `FlowEdge = {id: string, source: string, target: string, data: {threadIds: number[]}}`. Ids are `String(node.id)`/`String(edge.id)` (React Flow expects string ids).
- **`frontend/src/features/loom/LoomPage.tsx`** (LM4): React Flow composition with `<ReactFlow>`, `<Background>`, `<Controls>`, custom `nodeTypes = { anchor: AnchorNode, update: UpdateNode }`, and `LoomThreadsContext.Provider` for thread-color resolution in child nodes. Imports `@xyflow/react/dist/style.css` and `LoomCanvas.css`. **Node state is React-Flow-owned via `useNodesState` + `onNodesChange` (LM5 drag fix):** the page does *not* rebuild the `nodes` array from `buildFlowNodes` on every render (that stripped RF's `measured`/`dragging` internals mid-drag and flashed/reflowed the canvas). Instead a `useEffect` on `[flowNodes, selectedNodeId]` reconciles server-derived `data` and `selected` into the RF-owned nodes, preserving each existing node's live position and RF internals; new nodes take their fresh server position. `onNodeDragStop` persists the final coordinate via `useLoomCanvasMutations.moveNode`. **LM6 additions:** `bridgeSource`/`bridgeTarget` state for the anchor-and-bridge picker, `pendingStatusChange` state for the reached/abandoned confirm flow, and the blank-tapestry `StatePanel` early return — see the interaction contract in `Key facts` above for the exact gating and click-interception rules.
- **`frontend/src/features/loom/LoomBridgeDialog.tsx`** (LM6): `Dialog` form (title/body/session_tag, mirrors `LoomNodeEditor`'s form styling) taking `source`/`anchor: LoomNode` props; calls `createLoomBridge` on submit and reports the `LoomBridgeResult` via `onBridged`. No React Flow dependency — testable in isolation (see the jsdom constraint in `Key facts`).
- **`frontend/src/features/loom/LoomCanvas.css`** (LM4): Twenty `--xy-*` CSS variables mapped to MD3 tokens (scoped under `.loom-canvas-area .react-flow`); node status treatments via `data-status`/`data-head` attributes; thread chip strip; vault panel styles. Attribution restyled but never removed.
- **`frontend/src/features/loom/useLoomTapestry.ts`** (LM4): Read-path fetch hook returning `RemoteState<LoomTapestry>` + `reload` callback.
- **`frontend/src/features/loom/nodes/AnchorNode.tsx`**, **`UpdateNode.tsx`**, **`ThreadChips.tsx`**, **`loomThreadsContext.ts`** (LM4): Memoized custom React Flow node components; thread data rides via context since React Flow only forwards `data` to node types. Thread chips are `aria-hidden="true"` (never the sole thread cue). `ThreadChips`/`LoomPage`'s edge-color resolver both read the color token as `` `var(--md-loom-${thread.color})` `` (fixed in LM5 — the token prefix is `--md-loom-thread-N`, not `--md-thread-N`).
- **`frontend/src/features/loom/LoomVaultPanel.tsx`** (LM4): Collapsible side panel listing vault nodes (degree 0); `onSelectNode` callback pans viewport via `rfInstance.setCenter()`.
- **`frontend/src/features/loom/useLoomCanvasMutations.ts`** (LM5, pure API/error plumbing, no React Flow import): `useLoomCanvasMutations(tapestry, reload)` returns `{ error, dismissError, reportError, isValidConnection(sourceId, targetId), connect(sourceId, targetId), moveNode(nodeId, x, y), removeEdge(edgeId): Promise<void> }`. `isValidConnection` wraps `wouldCycle`; `connect`/`moveNode`/`removeEdge` call the LM2/LM3 client methods and `reload()` on success, routing any thrown `ApiError`'s message (409 "already connected", 422 cycle/self-loop, etc.) into `error` for the banner. Deliberately separate from `useLoomTapestry` and from page-level selection state so mutation logic is unit-testable via `renderHook` without driving React Flow drag/connect gestures in jsdom (disallowed — see `docs/TESTING.md`).
- **`frontend/src/features/loom/LoomErrorBanner.tsx`** (LM5): Feature-local dismissible banner (`--md-error`/`--md-error-container` tokens, `role="alert"`); the only error-surfacing UI for canvas-level mutations (connect, drag persist, edge/node delete) — there is no global toast system.
- **`frontend/src/features/loom/LoomNodeEditor.tsx`** (LM5): Create/edit `Dialog` for a single node. Props: `node?: LoomNode` (edit mode; kind becomes a disabled/locked field — the backend rejects kind changes with 422 "Node kind is immutable"), `initialKind?: LoomNodeKind` (create-mode default, e.g. from a "New Anchor" toolbar button), `threads: LoomThread[]`, `defaultPosition: {x,y}` (used only on create — edits always resubmit the node's existing stored `x`/`y` unchanged, since `PUT /loom/nodes/{id}` has no partial-update semantics and would otherwise reset position to 0,0), `onClose`, `onSaved(node)`. Dialog title is `Add New ${kindLabel}` / `Edit ${kindLabel}: ${title}` per VW4. Status select renders only when `kind === 'anchor'`; submitted `status` is forced `null` for updates (backend coherence rule).
- **`frontend/src/features/loom/LoomThreadManager.tsx`** (LM5): `Dialog` listing threads with inline Edit-in-place (name, `ColorPicker` of the six `--md-loom-thread-N` swatches, description) and `TrashIcon` delete routed through a nested `ConfirmDialog` (confirmed-safe pattern, precedented by `MonsterEditor`). "+ New Thread" toggles the same form in create mode. Props: `threads`, `onClose`, `onChanged` (called after any successful create/update/delete to trigger the caller's tapestry `reload()`).
- Backend: `backend/app/db.py` helpers (`get_db`, `dict_from_row`, `parse_json_list`), the `quests.py`/`layouts.py` router idioms, and `backend/tests/conftest.py`'s real-schema fixtures.

---

## Known debt / deferred work (NOT yet built)

- **No entity links from nodes to NPCs/dungeons/encounters in v1** — user decision: playtest the core loop first. Retrofit is a junction table + editor multi-select in a future plan.
- No server-side heads/next-anchor endpoint (derived client-side from the tapestry payload); add `GET /api/loom/threads/{id}/heads` only when a non-browser consumer appears.
- No canvas auto-layout (positions are fully manual) and no canvas undo.
- No session-number ordering column; `session_tag` is display-only text.
- No multi-campaign support — one tapestry per database, consistent with the rest of the app.

---

## Shipped stages

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| LM0 | Four loom tables + indexes added to canonical schema (`scripts/init_database.py`), four demo-tapestry seed files authored, `docs/DATA_MODEL.md` updated with loom subsection and regenerated schema inventory. Tables build via conftest; seeds validate; full pytest green at 91.27% coverage. |
| LM1 | `backend/app/routers/loom.py` router (thread/node/edge CRUD, `GET /api/loom/tapestry`, reachability-CTE cycle guard) plus `LoomThread`/`LoomNode`/`LoomEdge`/`LoomTapestry` schemas in `backend/app/schemas.py`, registered in `main.py`. No deviation from the planned endpoint contract; full pytest green at 90.99% coverage; manual tapestry curl against a freshly initialized dev DB returned valid JSON. |
| LM2 | `POST /api/loom/bridge` and `PATCH /api/loom/nodes/{id}/position` plus `LoomBridgeCreate`/`LoomBridgeResult`/`LoomNodePosition` schemas; four `populate_loom_*` seed loaders behind an opt-in `--loom` CLI flag (never part of "load all") wired into `seed_database.py`, `export_db_seeds.py`, and `conftest.py::_seed_real_data`; a dedicated `/api/loom/tapestry` integration smoke test (it returns a dict, not a list, so it couldn't join the existing generic collection-list tests). No deviation from the planned response contract; full pytest green at 91.07% coverage; live-verified bridge + position PATCH against the seeded demo tapestry. |
| LM3 | Loom types + `patch<T>` client methods added to `frontend/src/api/{types,client}.ts`; pure `frontend/src/features/loom/loomGraph.ts` (graph semantics) and `loomFlow.ts` (React-Flow-shaped mappers, no `@xyflow/react` dependency). No deviation from the planned export surface (see `Reusable pieces`); 19 new Vitest unit tests green (full suite 955 passed/6 skipped), lint and `tsc -b` clean. |
| LM4 | `@xyflow/react` ^12.11.2 installed; eight loom token sets (`loom-anchor`, `loom-update`, `loom-thread-1`…`loom-thread-6`) minted and wired in `theme.css`; themed read-only canvas at `/loom` with `LoomPage`, `LoomCanvas.css` (20 `--xy-*` vars re-themed), `useLoomTapestry`, `AnchorNode`/`UpdateNode`/`ThreadChips`/`LoomVaultPanel` components, and jsdom stubs. `docs/DESIGN_SYSTEM.md` token inventory regenerated + narrative section added; `docs/TESTING.md` React Flow jsdom boundary documented; `docs/ARCHITECTURE.md` dependency noted. 966 frontend tests + 91% backend coverage, lint/typecheck clean. |
| LM5 | `LoomNodeEditor.tsx` (create/edit dialog), `LoomThreadManager.tsx` (thread CRUD with the six-swatch color picker), `LoomErrorBanner.tsx`, and `useLoomCanvasMutations.ts` (edge connect/cycle-reject, drag-position persist, edge delete) added to `frontend/src/features/loom/`; `LoomPage.tsx` wired with a toolbar, string-id `selectedNodeId`/`selectedEdgeId` selection state, and a `.loom-inspector` bar for Edit/Delete. Fixed a pre-existing LM4 bug in `ThreadChips.tsx`/`LoomPage.tsx`'s edge-color resolver (`var(--md-${color})` was missing the `loom-` token-name segment, so chips/edges silently fell back to the unstyled default). No deviation from the planned mutation contract; 17 new Vitest tests (`useLoomCanvasMutations`, `LoomNodeEditor`, `LoomThreadManager` unit coverage, plus two `LoomPage` toolbar-integration tests) — full suite 983 passed/6 skipped; lint and `tsc -b` clean; `npm run build` clean. |
| LM6 | `LoomBridgeDialog.tsx` (bridge form) plus `LoomPage.tsx` additions: `bridgeSource`/`bridgeTarget` picker state (node-click interception during picking, banner + Cancel), `pendingStatusChange` confirm flow for Mark Reached/Mark Abandoned (full-replace PUT via new `loomGraph.ts` helper `buildNodeStatusUpdate`), and a blank-tapestry `StatePanel` empty state. Discovered mid-stage that clicking a React Flow node under jsdom throws inside `d3-drag` even for a plain click (not just drag/connect); resolved by testing the bridge/status payload logic through pure functions and the isolated `LoomBridgeDialog` component rather than simulated `LoomPage` node clicks — `docs/TESTING.md`'s jsdom boundary note already covered drag/connect but not clicks, so this is a plan-level (not doc-canonical) discovery captured in `Key facts`. 6 new Vitest tests (`LoomBridgeDialog` payload/error cases, `loomGraph` post-bridge/status-update regressions, empty-state render) — full suite 989 passed/6 skipped; lint and `tsc -b` clean; `npm run build` clean. **Live browser gate not run this session** (no explicit browser-automation request) — the full DM loop (bridge splice, mark-reached head advance, empty-state on a fresh DB) still needs manual verification before this stage is considered fully closed. |
| LM7 | Removed the quests domain end-to-end: deleted `backend/app/routers/quests.py`, `frontend/src/features/quests/` (8 files), `data/seeds/seed_quests.json`, and all references in schemas, scripts, tests, nav, routing, API client/types, and docs. `docs/areas/reference-catalogs.md` scope reduced to weapons/items/players/NPCs; `docs/areas/loom.md` active-plan anchor cleared. Full pytest green (≥90% coverage); full frontend `npm run test && npm run lint && npm run typecheck && npm run build` green; `python scripts/check_docs.py --check` clean. |
| LM8 | Documentation update: reconciled plan context with shipped code, added hand-written Loom Router section to `docs/API_REFERENCE.md`, refreshed generated inventories, updated `docs/README.md` routing and `docs/areas/loom.md` (active plan set to None, work queue updated, cross-references updated to archive). `python scripts/check_docs.py --check` clean. |

---

## Verification (whole feature, once complete)

Seed the demo tapestry (`python scripts/seed_database.py --loom --force`), open `/loom`, and confirm the assertable truths from `Key facts`: node 3 wears "Now" for both threads, anchors 4 and 6 wear "Next", node 7 sits in the Idea Vault. Bridge an update between node 3 and anchor 4 and confirm the splice (3→new→4, direct edge gone); mark anchor 4 reached and confirm heads advance. Reload to confirm drag positions persist. Backend: `pytest` from the repo root (≥90% coverage). Frontend: `npm run test && npm run lint && npm run typecheck && npm run build`. Docs: `python scripts/check_docs.py --check` (and `--check --base main` before completion).

---

## Cross-references

- [../areas/loom.md](../areas/loom.md) — durable routing and invariants for this domain.
- [../DATA_MODEL.md](../DATA_MODEL.md), [../API_REFERENCE.md](../API_REFERENCE.md), [../ARCHITECTURE.md](../ARCHITECTURE.md) — canonical contracts this plan writes into.
- [../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) — tokens, editor contract, accessibility floor.
- [../TESTING.md](../TESTING.md) — commands, coverage gate, and (from LM4) the React Flow jsdom boundary.
- [../areas/reference-catalogs.md](../areas/reference-catalogs.md) — owns weapons, items outside loot bundles, players, and NPCs.
