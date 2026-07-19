# Loom Swimlanes Redesign

> **Status:** LS0–LS5 shipped. LS6 (Plan Closeout — Documentation Update) is next up.

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
  (flex row) of `.loom-canvas-column` with `.loom-canvas-area.loom-swimlanes` + `.loom-weaver-panel`
  (320px rail). Each lane is an `article.loom-lane` with `.loom-lane-header`, `.loom-lane-row`, sticky
  `.loom-lane-cap--start` / `.loom-lane-cap--end`, and `.loom-lane-track`. Command bar = Record Session /
  Add Beat / Manage Threads.

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
- `LoomSwimlanes.tsx`, `LoomLane.tsx`, `LoomNodeCard.tsx` (static lane renderer; card props are
  `{ node, isNow, isNext, threadColor, selected?, onClick? }`). `LoomSwimlanes` owns the scroll container
  and receives `threads`, `nodes`, `selectedNodeId`, and `onSelectNode`.
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
| **LS0 — Scaffolding** ✅ | Light | New component/CSS/type stubs, `it.skip` seams, survey touch points; app renders unchanged. | Stubs compile; page unchanged; later stages carry confirmed findings. |
| **LS1 — Static swimlanes** ✅ | Standard | Render Threads as read-only ordered lanes; swap out React Flow. | `LoomSwimlanes`/`LoomLane`/`LoomNodeCard`; click-to-select; React Flow + deprecated nodes removed. |
| **LS2 — Connector overlay** ✅ | High | SVG overlay: in-lane arrows, shared-session stitches, dotted spawn links from measured rects. | `LoomStitchLayer`; recompute on scroll/resize. |
| **LS3 — Inspector rail + Beat Bank tray** | Standard | Focus-free selected-node inspector; Beat Bank in a bottom tray; restore via Thread picker. | Refactored `LoomWeaverPanel`; new `LoomBeatBankTray`. |
| **LS4 — Inline authoring** | Standard | "+" insertion gaps → insert-at-position; horizontal drag-reorder of beats; drag-from-tray restore. | Lane gap insert, drag reorder, tray restore; dialog kept as fallback. |
| **LS5 — Polish & cleanup** | Standard | Remove dead code, reapply woven texture, reduced-motion, responsive stack, a11y pass. | Clean tree; `<520px` stacking; a11y verified. |

**Sequencing:** LS0 → LS1 → LS2 → LS3 → LS4 → LS5, then Plan Closeout LS6. LS4 has no hard dependency
on LS3 and could run in parallel once LS2 lands, but keep serial unless parallelizing deliberately.

#### LS0 — Scaffolding ✅ shipped

Stub files confirmed: `LoomSwimlanes.tsx`, `LoomLane.tsx`, `LoomNodeCard.tsx`, `LoomStitchLayer.tsx`, `LoomBeatBankTray.tsx` (all render `null`). CSS namespace stubs in `LoomCanvas.css`: `.loom-swimlanes`, `.loom-lane`, `.loom-lane-cap`, `.loom-lane-track`, `.loom-lane-gap`, `.loom-stitch-layer`, `.loom-beat-bank-tray`. Shared types in `swimlaneTypes.ts`: `SwimlaneModel` and `CardRect`. `LoomPage.tsx` unchanged. Tests: 11 passed, 1 skipped (new file with 7 `it.skip` seams), build clean. Handoff facts written into LS1, LS2, LS3.

#### LS1 — Static swimlanes ✅ shipped

Static swimlanes replaced React Flow: `LoomSwimlanes` renders `.loom-canvas-area.loom-swimlanes`, `LoomLane` renders ordered `article.loom-lane` rows, and `LoomNodeCard` keeps `.loom-node*` visuals with `isNow`/`isNext`/ghosted/selected states. Deprecated React Flow nodes, `loomFlow.ts`, old tests, and the `@xyflow/react` dependency are removed; `npm run test -- loom` passed with 51 tests and 5 skips.

#### LS2 — Connector overlay ✅ shipped

Absolutely-positioned SVG overlay (`LoomStitchLayer`) renders cross-lane shared-session stitches and dotted spawn links. `useCardRects` hook measures card elements via ref callbacks + `ResizeObserver` + scroll listener; `stitchGeometry.ts` pure helper computes cubic-bezier stitch paths and routed spawn-link paths. `LoomNodeCard` forwards refs via `forwardRef` + `onRegisterRect` callback. 60 tests passing, build clean; LS0 skipped seams enabled.

#### LS3 — Inspector rail + Beat Bank tray ✅ shipped

Refactored `LoomWeaverPanel` into a focus-free selected-node inspector: removed `focusedThreadId`, `onFocusThread`, `onClearThreadFocus`, the Threads list section, and the vault section. Beat Bank extracted into `LoomBeatBankTray` mounted below the swimlanes; tray shows banked beats with inline thread picker for restore (no focus needed). Removed focus-dimming (`.loom-node-wrapper--dimmed`), vault panel styles, and all `focusedThreadId` wiring from `LoomPage`. 68 tests passing, build clean.

#### LS4 — Inline authoring ✅ shipped

Clickable "+" insertion gaps render between body nodes in each lane track; clicking a gap opens the `LoomNodeEditor` and on save inserts the new node at that `{thread_id, position}` via `insertLoomThreadItem`. Planned-beat cards are draggable (sessions/Start/End are not); dropping a beat on a gap calls `beatReorderTarget` then `reorderLoomThreadItem` to compute and persist the reorder. Banked-beat tray entries are draggable; dropping one on a lane gap restores it to that thread at that position. `LoomBeatReorderDialog` kept as keyboard fallback. 73 tests passing, build clean.

#### LS5 — Polish & cleanup ✅ shipped

Dead code removed (`useLoomCanvasMutations.ts`, `LoomVaultPanel.tsx` + test); unused `threads` prop dropped from `LoomNodeEditor`. Woven background texture (anchor glow + warp stripes + color wash) verified present on swimlane container. `prefers-reduced-motion` disables transitions; `<520px` responsive stacking (page stacks vertically, tray collapses, lanes scroll). A11y pass: `:focus-visible` rings on node cards, tray toggle, tray entries; all kind cues carry icon+text (legend). 68 loom tests pass, build clean.

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

LS6 — Plan Closeout (Documentation Update). All delivery phases LS0–LS5 shipped.
