# Loom Swimlanes Redesign

> **Status:** Not started. LS0 (scaffolding) is next up. Delivery phase LS0–LS5, then Plan Closeout LS6.

- **Area guide:** [The Loom](../../areas/loom.md)

## What the feature is

The Loom page is being restructured from a free-form **React Flow** canvas into a deterministic
**timeline swimlane** view. The palette and node-card visuals stay; the page structure changes
entirely.

Each Thread becomes one **horizontal lane**; left→right is narrative order (the integer `position`
on `loom_node_threads`). A lane runs from a sticky **Start** cap, through its ordered
beats/sessions, to a sticky **End** cap. Within a lane, played nodes (sessions and fulfilled beats)
render solid and upcoming beats render **ghosted** — a **per-lane** played→planned boundary; there is
no global playhead. A **shared session** (a session node on more than one Thread) appears in each of
its lanes at that lane's own position and is joined by a cross-lane **stitch**; a **spawned Thread**
(created from a session) is joined to its origin session by a dotted **spawn link**. Selecting any
card opens a right **inspector rail** with that node's details and lifecycle actions; the **Beat Bank**
(unplaced beats) moves to a **bottom tray**.

The redesign also removes the current **focus-gating**: today reorder and restore only work once a
Thread is "focused." In swimlanes every Thread is always visible, so those actions become direct
(insert via a lane "+" gap, drag-reorder within a lane, restore via a Thread picker) and no
`focusedThreadId` state is needed.

### Why (problem → solution)

- **Problem:** the data is strictly linear-ordered per Thread, but it is drawn on a free-form canvas
  whose drag positions are already discarded — `buildFlowNodes` overrides persisted `x/y` with a
  derived lane layout (`position*12`, `lane*220`). The canvas fights the data, carries a heavy
  library plus two deprecated node components, and couples mutations to a separate focus state.
- **Solution:** a purpose-built swimlane renderer that makes order, progress, sharing, and spawning
  legible at a glance, and makes authoring direct. Backend and API are unchanged.

## Key facts / data facts

Facts an executor needs before touching code; assume no other repo knowledge.

- **One read populates everything:** `GET /api/loom/tapestry` → `{ threads: LoomTapestryThread[],
  nodes: LoomNode[] }`. `LoomTapestryThread` = the Thread row (`id, name, color, description,
  origin_node_id`) plus `items: {node_id, position}[]` (ascending). Node bodies/identity live only in
  the sibling `nodes[]`; the UI joins `items[].node_id → nodes[].id`. Fetched via `useLoomTapestry()`
  (`RemoteState`, `reload()`), refetch-everything-on-mutation. No React Query.
- **Node kinds** are `start | end | beat | session`. `start`/`end` are auto-managed by Thread
  create/delete and are position-locked (first/last); membership ops reject touching them. A `beat` is
  single-Thread; a `session` may belong to many Threads. Only `beat`/`session` are user-creatable.
- **Two independent positions per node:** canvas `x/y` (PATCH `/loom/nodes/{id}/position`) and ordered
  `position` within each Thread (junction table, managed by the items endpoints). **This redesign uses
  only `position`; `x/y` becomes vestigial** (see Known debt).
- **Provenance columns (nullable):** `fulfilled_planned_title` + `fulfilled_at` (a beat fulfilled into
  a session), `banked_from_thread_id` (a banked beat's source Thread). A Thread's `origin_node_id`
  points at the session that spawned it.
- **Beat lifecycle:** create → place (`POST /loom/threads/{id}/items`) → **fulfil**
  (`POST /loom/nodes/{id}/fulfil`, becomes a session in place) or **bank**
  (`POST /loom/nodes/{id}/bank`, unplaced, remembers source). Re-placing a banked beat clears its
  banked flag. Fulfil is undone by `PUT` the session back to `kind:'beat'`. Spawn = `POST
  /loom/threads` with `origin_node_id` set (no separate endpoint).
- **Thread color** is a token key `thread-1`…`thread-6` (Pydantic `^thread-[1-6]$`), rendered via
  `data-color="thread-N"` → `--md-loom-thread-N`. Node-card base fill is by **kind**
  (start/end = primary-container, beat = tertiary-container, session = secondary-container); thread
  identity rides the left **spine** and the **ThreadChips** dots.
- **Existing derivations already position-based and edge-free** (`loomGraph.ts`): `threadOrdered`,
  `currentPosition`, `threadHead`, `nextBeat`, `bankedBeats`. Reuse verbatim. `beatReorder.ts`'s
  `beatReorderTarget()` computes the reorder payload and already refuses to place a beat before a
  session.
- **Current layout DOM** (`LoomPage.tsx` render): `.loom-route` → `.loom-page-header` → `.loom-page`
  (flex row) of `.loom-canvas-column` (React Flow `.loom-canvas-area`) + `.loom-weaver-panel` (320px
  rail). Command bar = Record Session / Add Beat / Manage Threads.

## Design system in force

Redesign has heavy visual surface. Reuse `docs/DESIGN_SYSTEM.md` tokens only — no ad-hoc values.

- Thread palette `--md-loom-thread-1…6` (+ `-container`/`-on-*`), and `--md-loom-anchor`, verbatim.
- Node-card classes already exist and are kept: `.loom-node`, `.loom-node--{start,end,beat,session}`,
  `.loom-node-spine[data-color='thread-N']`, `.loom-node-badge--now/--next`, `.loom-thread-chips`.
- Surfaces from `--md-surface-*` tone steps (elevation is a tone step, not a shadow; shadows reserved
  for dialogs/floating). Rails on `--md-surface-1`, `--radius-lg`, `--md-outline-variant` borders.
- Spacing/type/radius/motion via `--space-*`, `--type-*`, `--radius-*`, `--motion-*`. Icons only via
  the `components/icons` barrel. A11y floor: visible focus rings, never color-alone (icon+text back
  every cue), ≥48px touch targets (documented exceptions for canvas glyphs).
- **Stale doc to correct:** `DESIGN_SYSTEM.md`'s Loom section references a `loom-update` token set and
  `anchor`/`update` node kinds that do **not** exist in code (only `--md-loom-anchor` +
  `--md-loom-thread-1…6` are real; kinds are start/end/beat/session). LS6 corrects this while
  rewriting the section for the swimlane renderer.

## Reusable pieces (do not rebuild)

- `useLoomTapestry()` read hook; every `api/client` loom mutation (`createLoomThread`,
  `insertLoomThreadItem`, `reorderLoomThreadItem`, `fulfilLoomNode`, `bankLoomNode`, `updateLoomNode`,
  `deleteLoomNode`, `createLoomNode`).
- `loomGraph.ts` (`threadOrdered`, `currentPosition`, `threadHead`, `nextBeat`, `bankedBeats`) and
  `beatReorder.ts` (`beatReorderTarget`).
- `nodes/ThreadChips.tsx`, `nodes/loomThreadsContext.ts` (thread lookup context for cards).
- Dialogs: `LoomNodeEditor`, `LoomThreadManager`, `LoomBeatReorderDialog` (kept as accessible reorder
  fallback), shared `Dialog`/`ConfirmDialog`, `PageHeader`, `Button`, `StatePanel`.
- The action block inside `LoomWeaverPanel` (Edit / Fulfil / Bank / Replace / Restore / Spawn / Change
  Ending / Undo Fulfil / Delete) — port into the inspector, dropping only the focus gating.

## Known debt / deferred (NOT built)

- **Backend `x/y` + `PATCH /loom/nodes/{id}/position` become vestigial** — the swimlane UI never reads
  or writes canvas coordinates. Leave columns and endpoint in place; a later backend-cleanup plan may
  remove them. The `x,y`-presentation-only invariant in `loom.md` stays true.
- **Global chronological alignment across lanes** is not attempted — Threads have no shared clock
  (only fulfilled sessions carry `fulfilled_at`), so lanes pack independently and stitches are drawn
  between measured card rects. A future enhancement could align by a synthetic timeline.
- Node ↔ NPC/dungeon/encounter links remain deferred (per area guide work queue).

---

## Design Phase LS — Timeline Swimlanes

Delivers the full swimlane redesign at functional parity with today's Loom, plus removal of
focus-gating and React Flow. **Depends on:** nothing external. **Depended on by:** nothing; this is a
self-contained area outcome.

| Stage | Required strength | Summary | Deliverables |
|-------|-------------------|---------|--------------|
| **LS0 — Scaffolding** | Light | New component/CSS/type stubs, `it.skip` seams, survey touch points; app renders unchanged. | Stubs compile; page unchanged; later stages carry confirmed findings. |
| **LS1 — Static swimlanes** | Standard | Render Threads as read-only ordered lanes; swap out React Flow. | `LoomSwimlanes`/`LoomLane`/`LoomNodeCard`; click-to-select; React Flow + deprecated nodes removed. |
| **LS2 — Connector overlay** | High | SVG overlay: in-lane arrows, shared-session stitches, dotted spawn links from measured rects. | `LoomStitchLayer`; recompute on scroll/resize. |
| **LS3 — Inspector rail + Beat Bank tray** | Standard | Focus-free selected-node inspector; Beat Bank in a bottom tray; restore via Thread picker. | Refactored `LoomWeaverPanel`; new `LoomBeatBankTray`. |
| **LS4 — Inline authoring** | Standard | "+" insertion gaps → insert-at-position; horizontal drag-reorder of beats; drag-from-tray restore. | Lane gap insert, drag reorder, tray restore; dialog kept as fallback. |
| **LS5 — Polish & cleanup** | Standard | Remove dead code, reapply woven texture, reduced-motion, responsive stack, a11y pass. | Clean tree; `<520px` stacking; a11y verified. |

**Sequencing:** LS0 → LS1 → LS2 → LS3 → LS4 → LS5, then Plan Closeout LS6. LS3 has no hard dependency
on LS2 and could run in parallel once LS1 lands, but keep serial unless parallelizing deliberately.

<!-- ===== VERBOSE BLOCKS — one per un-shipped stage, in order. ===== -->

#### LS0 — Scaffolding (next up)

> **Handoff facts** — none yet; this is the first stage. State confirmed at authoring: current render
> tree and all Key facts above are verified against `LoomPage.tsx`, `loomFlow.ts`, `loomGraph.ts`,
> `LoomWeaverPanel.tsx`, `LoomCanvas.css`, `backend/app/routers/loom.py`, and `schemas.py`. Existing
> loom tests: `frontend/src/features/loom/__tests__/` (11 files incl. `LoomPage.test.tsx`,
> `loomGraph.test.ts`, `beatReorder.test.ts`, and deprecated `AnchorNode`/`UpdateNode` tests).

- **Read first:** this plan; `frontend/src/features/loom/LoomPage.tsx`, `LoomCanvas.css`,
  `loomGraph.ts`, `nodes/ThreadChips.tsx`, `nodes/loomThreadsContext.ts`; `frontend/src/theme.css`
  (loom tokens); `docs/DESIGN_SYSTEM.md` Loom section.
- **Build:** add empty, inert stubs so later stages only fill them: `LoomSwimlanes.tsx`, `LoomLane.tsx`,
  `LoomNodeCard.tsx`, `LoomStitchLayer.tsx`, `LoomBeatBankTray.tsx` (each renders `null`/placeholder,
  no wiring). Add the swimlane CSS namespace block to `LoomCanvas.css` (`.loom-swimlanes`,
  `.loom-lane`, `.loom-lane-cap`, `.loom-lane-track`, `.loom-lane-gap`, `.loom-stitch-layer`,
  `.loom-beat-bank-tray`) as commented stubs. Add shared TS types for swimlane geometry (lane model:
  `{ thread, ordered: LoomNode[], currentNodeId, nextBeatId }`; card-rect model for the stitch layer).
  Add `it.skip` seams to `LoomPage.test.tsx` (or a new `LoomSwimlanes.test.tsx`) with **real assertion
  bodies** for: lanes render in `position` order, played vs planned styling, a shared session appears
  in two lanes, a spawn link renders, insert-via-gap, drag-reorder, restore. Do not change `LoomPage`
  rendering yet.
- **Inherits:** nothing.
- **Expected touch set:** `frontend/src/features/loom/` new files + `LoomCanvas.css`; one test file.
  No `LoomPage.tsx` behavior change.
- **Documentation impact:** this plan (register in area guide + manifest is done at creation). No
  canonical-reference change yet — `None: contracts unchanged until LS1 removes React Flow.`
- **Tests:** `cd frontend && npm run test -- loom` (stubs + skipped seams compile and are collected);
  `npm run build` clean.
- **Gate:** app builds and the Loom page renders **unchanged** (React Flow still in place); new stubs
  imported nowhere load-bearing. Suite sufficient; no browser pass required.
- **Discovery consolidation:** confirm final stub file names and CSS class names; write them into LS1's
  Handoff facts and Expected touch set. If the stitch-layer rect model differs from the sketch, update
  LS2's Build. Record confirmed `LoomWeaverPanel` action-block prop shape into LS3's Handoff facts.
- **Completion edit:** collapse LS0 to a Shipped row; set Status/Next to LS1; write LS1 Handoff facts.

#### LS1 — Static swimlanes (planned)

- **Read first:** LS0 stubs; `LoomPage.tsx`, `loomFlow.ts` (for the lane-derivation logic being
  replaced), `loomGraph.ts`, `LoomCanvas.css`, `nodes/{Start,End,Beat,Session}Node.tsx` (for card
  markup to port), `nodes/ThreadChips.tsx`.
- **Build:** implement `LoomSwimlanes` (a single horizontal-scroll container rendering one `LoomLane`
  per Thread) + `LoomLane` (sticky Start cap, `threadOrdered` row of `LoomNodeCard`s, sticky End cap)
  + `LoomNodeCard` (reuses `.loom-node*` classes; spine `data-color`, Now/Next via `currentPosition`/
  `threadHead`, chips, ghosted styling when `kind==='beat' && !fulfilled_at`). Replace the
  `.loom-canvas-area` React Flow subtree in `LoomPage.tsx` with `<LoomSwimlanes>`; keep click-to-select
  and `selectedNodeId`. Remove `@xyflow/react` usage: `useNodesState`, `ReactFlow`, `Background`,
  `Controls`, `rfInstance`, `handleNodeDragStop`, `handleNodeClick`/`handlePaneClick` reshaped,
  `defaultNewPosition`, `flowEdges`, and the `--xy-*` mapping + `.react-flow*` rules in CSS. Delete
  `nodes/{Start,End,Beat,Session,Anchor,Update}Node.tsx` and `nodes/CompassHandles.tsx`; retire
  `loomFlow.ts` edge/compass code (keep any still-needed pure helper, else delete). Drop the
  `@xyflow/react` dependency if nothing else imports it.
- **Inherits:** LS0 stubs, CSS namespace, types.
- **Expected touch set:** `LoomPage.tsx`, `LoomSwimlanes.tsx`, `LoomLane.tsx`, `LoomNodeCard.tsx`,
  `LoomCanvas.css`, `loomFlow.ts` (retire), the six deleted node files + `CompassHandles.tsx`,
  `package.json` (dep removal), and every test asserting the old rendered contract: `LoomPage.test.tsx`,
  `loomFlow.test.ts` (delete), `AnchorNode.test.tsx`/`UpdateNode.test.tsx` (delete). Grep for
  `@xyflow`, `react-flow`, `AnchorNode`, `UpdateNode`, `CompassHandles` before starting.
- **Documentation impact:** `docs/areas/loom.md` source map (frontend file list: React Flow gone,
  swimlane files added); `docs/DESIGN_SYSTEM.md` Loom section flagged for rewrite (final rewrite in
  LS6). Enable the LS0 `it.skip` render/order/played-planned seams.
- **Tests:** unit — lane ordering + played/planned derivation; integration — `LoomPage.test.tsx`
  renders lanes in order and marks Now/Next. `npm run test -- loom`; `npm run build`.
- **Gate:** live — start backend + frontend, seed `--loom`, open Loom: lanes render each Thread in
  `position` order with correct kind styling, ghosted upcoming beats, Now/Next badges; selection still
  drives the (old) rail. Browser/app pass required (visual surface).
- **Discovery consolidation:** record final `LoomNodeCard` props and the swimlane scroll/measure DOM
  structure into LS2 Handoff facts (the stitch layer measures these rects); note any retained
  `loomFlow` helper. Update LS3 if selection wiring changed.
- **Completion edit:** collapse LS1; Status/Next → LS2; write LS2 Handoff facts.

#### LS2 — Connector overlay (planned)

- **Read first:** LS1 output (`LoomSwimlanes`/`LoomLane`/`LoomNodeCard` DOM), `loomFlow.ts` history
  (old `buildFlowEdges`/`buildSpawnEdges` color/dash choices), `loomGraph.ts`.
- **Build:** `LoomStitchLayer` — an absolutely-positioned SVG over the scroll container. Measure card
  element rects (refs + `ResizeObserver` + scroll listener, coordinates relative to the scroll
  content). Draw: (a) in-lane chain arrows between adjacent cards (thread-colored, arrowhead = narrative
  direction) — or render these as CSS connectors in `LoomLane` if simpler and keep the SVG for
  cross-lane only; (b) **shared-session stitches** connecting a session's instances across its lanes;
  (c) dotted **spawn links** from `origin_node_id` session → spawned Thread's Start cap
  (`--md-outline`, dashed), matching the retired `buildSpawnEdges` styling. Recompute on layout/scroll;
  throttle with `requestAnimationFrame`.
- **Inherits:** LS1 lane DOM and card refs.
- **Expected touch set:** `LoomStitchLayer.tsx`, `LoomSwimlanes.tsx` (mount overlay + expose refs),
  `LoomLane.tsx`/`LoomNodeCard.tsx` (ref forwarding), `LoomCanvas.css` (stitch styles).
- **Documentation impact:** `None: renderer-internal; DESIGN_SYSTEM Loom rewrite consolidated in LS6.`
- **Tests:** enable the LS0 shared-session + spawn-link seams (assert a stitch/link element exists for
  a shared session and a spawned Thread at the page seam; geometry math via a small helper unit test if
  a pure path-computation function is extracted). `npm run test -- loom`; `npm run build`.
- **Gate:** live — a shared session visibly stitches its two lanes; a spawned Thread shows a dotted
  branch from its origin; connectors track scroll/resize without drift. Browser/app pass required.
- **Discovery consolidation:** if a pure geometry helper is extracted, record its signature in LS5
  cleanup notes; note performance choices (rAF throttle) in Key facts.
- **Completion edit:** collapse LS2; Status/Next → LS3; write LS3 Handoff facts.

#### LS3 — Inspector rail + Beat Bank tray (planned)

- **Read first:** `LoomWeaverPanel.tsx` (action block + threads/vault sections), `LoomVaultPanel.tsx`,
  `LoomLegend.tsx`, `LoomPage.tsx` handlers (`handleRestoreNode`, `handleReplaceNode`, etc.).
- **Build:** refactor `LoomWeaverPanel` into a focus-free selected-node **inspector** (details +
  existing action block, minus the `focusedThreadId` gating on Restore/Reorder). Extract the Beat Bank
  into `LoomBeatBankTray` mounted along the bottom of the swimlane area. Reimplement **restore** without
  focus: selecting a banked beat in the tray shows a "Restore to <Thread>" picker calling
  `insertLoomThreadItem(threadId, {node_id, position:10})`. Remove `focusedThreadId`,
  `onFocusThread`/`onClearThreadFocus`, and focus-dimming (`.loom-node-wrapper--dimmed`).
- **Inherits:** LS1 selection wiring; LS2 overlay (tray must not overlap connectors).
- **Expected touch set:** `LoomWeaverPanel.tsx`, `LoomBeatBankTray.tsx`, `LoomVaultPanel.tsx` (fold in
  or replace), `LoomPage.tsx` (drop focus state), `LoomCanvas.css` (rail + tray styles; remove dim
  rule), `LoomWeaverPanel.test.tsx`, `LoomVaultPanel.test.tsx`.
- **Documentation impact:** `docs/areas/loom.md` — remove focus-gating from the interaction description
  once it ships (the Reorder/Restore invariants that mention focus). Enable the restore seam.
- **Tests:** `LoomWeaverPanel.test.tsx` (inspector actions, no focus prop), a tray test (restore
  picker), `LoomPage.test.tsx` restore flow. `npm run test -- loom`; `npm run build`.
- **Gate:** live — select a card → inspector actions work; bank a beat → it appears in the tray →
  restore via picker places it, all without any "focus" step. Browser/app pass required.
- **Discovery consolidation:** record the final inspector prop shape and tray API into LS4 Handoff facts
  (LS4's gap-insert and drag-restore reuse them).
- **Completion edit:** collapse LS3; Status/Next → LS4; write LS4 Handoff facts.

#### LS4 — Inline authoring (planned)

- **Read first:** `LoomLane.tsx`, `beatReorder.ts` (`beatReorderTarget`), `LoomBeatReorderDialog.tsx`,
  `LoomNodeEditor.tsx`, `LoomPage.tsx` (`handleNodeSaved`, insert path), `LoomBeatBankTray` (LS3).
- **Build:** add clickable "+" **insertion gaps** between slots in each `LoomLane`; clicking opens
  `LoomNodeEditor` and on save inserts at that `{thread_id, position}` (replacing the old focus +
  viewport-center logic in `handleNodeSaved`). Add horizontal **drag-reorder** of planned-beat cards
  within a lane, computing the payload with `beatReorderTarget` and calling `reorderLoomThreadItem`;
  Start/End/sessions are not draggable. Support **drag a banked beat from the tray into a lane gap** to
  restore. Keep `LoomBeatReorderDialog` as an accessible keyboard fallback (reachable from the
  inspector).
- **Inherits:** LS3 inspector/tray; LS1 lane DOM.
- **Expected touch set:** `LoomLane.tsx`, `LoomNodeCard.tsx`, `LoomPage.tsx`, `LoomBeatBankTray.tsx`,
  `LoomCanvas.css`, `beatReorder.test.ts` (extend if payload logic touched), `LoomPage.test.tsx`.
- **Documentation impact:** `docs/areas/loom.md` — update the beat-order/reorder interaction note to
  describe inline drag + gap insert; confirm the `beatReorderTarget` invariant (no beat before a
  session) still holds.
- **Tests:** insert-at-gap flow, drag-reorder flow (assert `reorderLoomThreadItem` payload), tray→gap
  restore. `npm run test -- loom`; `npm run build`.
- **Gate:** live — insert a session into a mid-lane gap; drag a beat earlier/later; drag a banked beat
  into a lane; all persist and survive reload. Browser/app pass required.
- **Discovery consolidation:** note any dead handlers now removable (e.g. old center-viewport insert)
  into LS5.
- **Completion edit:** collapse LS4; Status/Next → LS5; write LS5 Handoff facts.

#### LS5 — Polish & cleanup (planned)

- **Read first:** the whole `frontend/src/features/loom/` tree post-LS4; `useLoomCanvasMutations.ts`,
  `loomFlow.ts` remnants; `LoomCanvas.css`.
- **Build:** remove all now-dead code — `useLoomCanvasMutations.moveNode` + `patchLoomNodePosition`
  usage, any leftover `loomFlow` edge/compass helpers, residual focus state/props, deprecated test
  scaffolding. Reapply the woven background texture (radial anchor glow + warp stripes + color wash)
  to the swimlane container. Add `prefers-reduced-motion` handling to stitches/transitions, `<520px`
  responsive stacking (lanes scroll; tray/inspector collapse), and a full a11y pass (focus rings,
  ≥48px targets, never color-alone — every kind cue has icon+text).
- **Inherits:** everything LS1–LS4.
- **Expected touch set:** `LoomCanvas.css`, `LoomPage.tsx`, `useLoomCanvasMutations.ts`,
  `loomFlow.ts`/`useLoomCanvasMutations.test.ts` (delete or trim), any remaining loom component.
- **Documentation impact:** `None: canonical-reference rewrite is the LS6 closeout job` (LS5 only
  removes dead code and polishes).
- **Tests:** full loom suite green; `npm run build`; coverage ≥85% for the area.
- **Gate:** live — full parity walk-through (see Verification) plus reduced-motion and narrow-viewport
  checks. Browser/app pass required.
- **Discovery consolidation:** promote durable swimlane facts (renderer structure, stitch approach,
  focus-gating removed) into this plan's Key facts / Reusable pieces for LS6 to move into references.
- **Completion edit:** collapse LS5; delete the LS phase section; Status/Next → LS6 Plan Closeout.

### Plan Closeout — Documentation Update

Sole final phase, after LS0–LS5 have shipped and the LS phase section is removed.

| Stage | Required strength | Summary | Deliverables |
|-------|-------------------|---------|--------------|
| **LS6 — Documentation update** | Standard | Reconcile plan context with shipped code; complete the doc workflow; archive. | References, routing, validation, and archival complete. |

#### LS6 — Documentation update (final stage of the plan)

- **Read first:** `CLAUDE.md`, `docs/README.md`, `docs/areas/loom.md`, this plan,
  `docs/PLAN_TEMPLATE.md`, `docs/TESTING.md`, `docs/DESIGN_SYSTEM.md`, `docs/API_REFERENCE.md`,
  `docs/DATA_MODEL.md`, `scripts/check_docs.py`, and PR-template/workflow files.
- **Build:** rewrite the `DESIGN_SYSTEM.md` Loom section for the swimlane renderer (drop the React Flow
  `--xy-*` theming description; document lanes, per-lane played/planned, stitches, spawn links,
  inspector, tray) and **correct the stale `loom-update`/`anchor`/`update` references**. Update
  `loom.md` source map, invariants (focus-gating removed; `x/y` vestigial noted), and Active-plan line.
  Confirm `API_REFERENCE.md`/`DATA_MODEL.md` need no change (backend unchanged) or record the specific
  reason. Update manifest routing.
- **Inherits:** all LS1–LS5 documentation-impact edits; this stage verifies and closes them.
- **Expected touch set:** this plan (→ archive), `docs/areas/loom.md`, `docs/README.md`,
  `docs/DESIGN_SYSTEM.md`, and any other reference confirmed to change.
- **Documentation impact:** `DESIGN_SYSTEM.md`, `areas/loom.md`, `README.md` (manifest). Reconcile and
  validate; `None` is invalid here.
- **Tests:** `.venv\Scripts\python.exe scripts/check_docs.py --check` (and `--base <base-ref>` when a
  valid base exists); any documentation-validator tests.
- **Gate:** a fresh reader routes `CLAUDE.md → README.md → areas/loom.md → (archived plan)` without
  rediscovering essential facts; docs checks pass.
- **Discovery consolidation:** promote remaining durable facts to `DESIGN_SYSTEM.md`/`loom.md`; nothing
  durable left only in a shipped-stage row or commit.
- **Completion edit:** mark the outcome complete, move this doc to `docs/complete/loom-swimlanes-redesign.md`,
  set `areas/loom.md` Active plan back to `None`, update `docs/README.md` in the same change set, and
  leave a redirect stub only for a known inbound link.

---

## Known debt / deferred work (NOT yet built)

- Backend `x/y` columns + `PATCH /loom/nodes/{id}/position` left vestigial; removal is a separate
  future backend-cleanup plan.
- No global chronological alignment across lanes (no shared clock in the data).
- Node ↔ NPC/dungeon/encounter links still deferred per the area guide work queue.

## Cross-references

`../../areas/loom.md`, `../../DESIGN_SYSTEM.md`, `../../API_REFERENCE.md`, `../../DATA_MODEL.md`,
`../../TESTING.md`, `../../PLAN_TEMPLATE.md`.

## Verification (whole feature, end-to-end)

Start backend + frontend, seed loom (`scripts/seed_database.py --loom`), open the Loom page and confirm:
lanes render each Thread in `position` order; played nodes solid, upcoming beats ghosted, Now/Next
badges correct; a shared session stitches its two lanes; a spawned Thread shows a dotted branch from
its origin; insert a session/beat via a "+" gap; drag-reorder a beat; fulfil / bank / restore (via
Thread picker) / replace a beat; spawn a Thread from a session; Thread CRUD via Manage Threads;
reduced-motion and `<520px` layouts hold. Then `cd frontend && npm run build` and `npm run test -- loom`
clean; `.venv\Scripts\python.exe -m pytest backend/tests/routers/test_loom.py` green;
`.venv\Scripts\python.exe scripts/check_docs.py --check` green.

## Next:

LS0 — Scaffolding (unblocked).
