# Dungeon Feature - Map Lab Cutover Plan

Single reference for extending the already-routed Map Lab into the production dungeon experience.
This is an **additive cutover**, not a Map Lab rewrite: keep its canvas, editor, fixtures,
toolbars, inspectors, zoom/pan, and layout persistence intact, then add dungeon context and
room-reading/authoring capabilities around them. It follows
[`docs/PLAN_TEMPLATE.md`](PLAN_TEMPLATE.md): durable facts first, a collapsed shipped-stage table,
and detailed specifications only for the remaining work.

> **Status:** Original dungeon work, encounter/NPC support, and Map Lab phases A-M shipped. R0-R8
> shipped. R9 - Cutover design and reference pass is next.

---

## What The Feature Is

A dungeon opens the existing Map Lab viewer at `/dungeons/:dungeonId`; edit mode opens the existing
Map Lab editor at `/dungeons/:dungeonId/edit`. Those pages retain their shipped map behavior. The
cutover adds the dungeon's identity, room-reading content, and room-content authoring to those
surfaces so the DM can use the map and the established encounter/NPC tools together.

The browser, viewer, and editor use the extended Map Lab surface exclusively. Old test data and the
original Isly Castle prototype fixture do not survive as authored data.

---

## Current Implementation (Post-R6)

- `router.tsx` maps `/dungeons/:dungeonId` to `MapLabPage` and
  `/dungeons/:dungeonId/edit` to `MapLabEditorPage`.
- Both Map Lab pages parse `dungeonId` with `Number(useParams().dungeonId)` and validate it is a
  positive integer before making API calls. Invalid IDs render a recoverable error state without
  hitting any endpoint.
- `useMapLabLayout.ts` fetches `GET /dungeons/:id/layout`. A layout 404 now returns a normalized
  empty layout with one `z: 0` floor instead of `islyCastleLayout`; the empty layout is not
  autosaved until the first user edit. It exposes `loading` and `error`.
- A dungeon-level load seam fetches `getDungeon(dungeonId)` alongside the layout. A 404 from
  `GET /dungeons/:id` renders a missing-dungeon state that prevents layout editing for that route.
- `MapLabPage.tsx` consumes the dungeon context and respects the loading/error/missing states
  before rendering the map. It includes `RoomDetailsPanel` for room-reading with entries/NPCs.
- `MapLabEditorPage.tsx` consumes the same context. The editor now owns `dungeons.data` alongside
  `map_layout`, with dual save status and `RoomContentEditor` for room content editing.
- `useMapLabEditor.ts` loads both layout and data on mount, maintains `loadedDataRef` for reset,
  and bridges room lifecycle: `addRoom`/`deleteRoom` create/remove matching `DungeonRoom` records.
  `updateRoomTitle` syncs layout and data blobs; entry/NPC editing mutates local data state.
- `roomContentEditorReducer` handles `setRoomMeta` for layout-only fields (title cache, description, kind).
- `RoomContentEditor.tsx` renders in the inspector rail with title input, entry/NPC editing, and
  a "Create room data" fallback for layout-only rooms.
- `dungeons.data` is the typed non-spatial source through `dungeonModel.ts`: general info,
  rooms (`room_id`, `title`, `entries`, `npcs`), floors, doors, and stairs. Its selectors already
  group entries and resolve room/floor relationships.
- `getDungeon`, `updateDungeon`, `getDungeonLayout`, and `saveDungeonLayout` already exist. No
  backend endpoint, schema, or database migration is needed for this cutover.

### Non-Negotiable Preservation Rules

- Do not replace, fork, or reimplement `MapLabPage`, `MapLabEditorPage`, `MapCanvas`,
  `useMapLabLayout`, `useMapLabEditor`, `mapLabEditorReducer`, or the marker/fixture components.
  Extend their existing props, hooks, and composition only where the production additions require
  it.
- The shared shell is an outer wrapper and thin composition seam. It supplies dungeon identity,
  mode navigation, and shared page framing; it does not absorb map state, redraw the canvas, or
  duplicate viewer/editor controls.
- Preserve every shipped Map Lab interaction while adding production behavior: room footprint
  editing, doors, props, stairs, portals, fixture forms, ghost floor, fullscreen, zoom/pan,
  toolbar trays, marker badges, passage session controls, encounter markers, and layout autosave.
- Change prototype-only behavior narrowly. Replacing the Isly fallback/reset behavior must leave
  the successful saved-layout hydration and debounced layout save path intact.

---

## Key Data Facts

- **Persistence stays split.** `dungeons.data` owns dungeon title and all room-reading data:
  room title, entries, NPC IDs, general info, and any retained non-spatial metadata.
  `map_layout` owns floors, room geometry, doors, stairs, portals, props, and fixture flags.
- **Room identity contract:** a production Map Lab room's `room_id` is the shared identity of one
  layout room and one `dungeons.data.rooms` record. A title is stored and edited in
  `dungeons.data`; `map_layout.rooms[].title` is a render cache kept synchronized by the editor,
  not a second source of truth. `description` and `kind` remain layout-only map annotations.
- Adding a room in the production editor must create both records with the same next free ID.
  Deleting one must remove both records and any layout fixtures that cannot exist without its
  geometry. A layout room without content data is tolerated by the viewer as an empty room while
  legacy/test data is being discarded; the editor must repair it before its next save.
- Do not attempt to reconcile legacy `dungeons.data` doors/stairs/floors with Map Lab's spatial
  fixtures. The Map Lab geometry is authoritative for map navigation and fixture display. Existing
  old blobs may be discarded.
- A 404 from `GET /dungeons/:id/layout` means that an existing dungeon has no map yet, not that it
  should display Isly Castle. The production fallback is a clean, in-memory empty layout with one
  named starting floor, persisted on the first edit. A 404 from `GET /dungeons/:id` is a missing
  dungeon and must show an error/back-to-browser state.
- Load the dungeon record and layout together at the route boundary. A layout failure must not
  replace a valid dungeon record with fixture data, and a failed dungeon fetch must prevent layout
  editing for that route.
- Map Lab's passage session state is intentionally ephemeral. It resets on reload and remains out
  of both persistence blobs.
- No migration or backward-compatibility layer is required for prototype layouts, old navigation
  state, or fixture-only workflows. Remove `islyCastleLayout` from production fallback/reset paths;
  it may remain only in focused fixture/model tests until no test needs it.

---

## Design System In Force

Use the canonical tokens in `frontend/src/theme.css` and
[`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

- The shell must identify the dungeon by its real title and make **View** and **Edit map** clear,
  persistent, keyboard-accessible mode choices.
- Preserve Map Lab's established map, marker, toolbar-tray, floor-tab, inspector, zoom, and
  fullscreen patterns. Production work should integrate them rather than redesign them.
- The selected room's running content must be stable and readable at table speed; hover remains a
  lightweight map inspection affordance, not the sole way to read a room.
- Keep the map usable on narrow viewports by preserving a reachable selected-room surface and mode
  control rather than depending on a permanently wide three-column layout.

---

## Reusable Pieces (Do Not Rebuild)

- `frontend/src/api/client.ts`: `getDungeon`, `createDungeon`, `updateDungeon`, `getDungeonLayout`,
  and `saveDungeonLayout`.
- `frontend/src/features/dungeons/dungeonModel.ts`: parsing, room selectors, entry grouping,
  floor grouping, and threat hints.
- `frontend/src/features/dungeons/maplab/maplabModel.ts`: `MapLayout`, normalization, floor/room
  selectors, geometry helpers, fixture state, and marker layout.
- `frontend/src/features/dungeons/maplab/useMapLabLayout.ts` and `useMapLabEditor.ts`: the existing
  layout load and autosave seams to extend, not replace or parallel.
- `MapLabPage.tsx`, `MapLabEditorPage.tsx`, `MapCanvas.tsx`, `InspectorPanel.tsx`,
  `FixturePropertiesForm.tsx`, `ToolbarTray`, `DoorMarker.tsx`, `StairMarker.tsx`,
  `PortalMarker.tsx`, and `PropMarker.tsx`.
- `EncounterDock`, `NpcChip`, `NPCStatCard`, `useNpc`, `DiceText`, `FloatingWindow`, and
  `SplitPane` for retained room-reading behavior.

---

### Shipped Stages Table (The Collapsed Record)

| Stage | What shipped (<=2 sentences) |
|-------|-------------------------------|
| **1-11 - Original build** | Read-model/selectors, room-per-page shell, exit cards, breadcrumbs, floor rail, theme migration, and FeatureTile/door-stair grid. |
| **A - Encounter Runner (E1-E6)** | Encounter reducer/hook, runner board, and `FloatingWindow` dock from an encounter tile. |
| **B - NPC Dossier (N1-N6)** | NPC model helpers, `NPCStatCard`, `NpcChip`, and NPC dock support beside the encounter dock. |
| **C - Map Lab Foundation (M0-M4)** | Coordinate model, polyomino rooms, SVG map, walls/door glyphs, inspector, and session state. |
| **D - Authoring Tools (0-3)** | Map editor, room paint/create, door authoring, editor reducer/hook, and persisted `map_layout` GET/PUT. |
| **E - Unified Data + Zoom (0-3)** | Viewer layout loading, zoom/pan, and toolbar/inspector cleanup. |
| **F - Room Props (F0-F4)** | Props, rendering, editor placement, fixture properties, and a reserved loot hook. |
| **G - Ghost Objects (G-fix, G0-G2)** | Editor lower-floor ghost view and authored-z floor attribution fixes. |
| **H - Stair/Portal Authoring (H0-H4)** | Stair/portal authoring, pairing, viewer navigation, and shared stair markers. |
| **I - Stair/Portal Fixes (I0-I3)** | Direction fixes, grouped marker placement, and verified viewer/editor behavior. |
| **J - Map Lab Decluttering (J0-J3)** | Toolbar trays, passage-state chips, and passage-token cleanup. |
| **K0-K3** | Fullscreen editor, wheel zoom, multi-cell room footprints, and a design pass. |
| **L - Marker Badge System (L0-L4)** | Marker badge model, bounded badge layout, and door badge overlay pass. |
| **M0-M4** | Collapsed multi-status model, bounded on-square markers, door status badge, and accessibility polish. |
| **R0 - Plan reset** | Rewrote this plan around Map Lab cutover, split persistence, and disposable prototype data. |
| **R1 - Route cutover scaffold** | Production paths now mount Map Lab by route parameter; sandbox routes and the fixed dungeon-ID constant were removed. |
| **R2 - Production data loading** | Added validated dungeon route loading, distinct missing/error states, blank-layout 404 handling, and reset-to-last-loaded behavior instead of production fixture fallback. Gate ✅. |
| **R3 - Additive shared dungeon shell** | DungeonShell layout route with dungeon title, view/edit mode toggle, return-to-browser link, and hoisted DungeonRouteContext. Prototype titles removed from both pages. Gate ✅. |
| **R4 - Add viewer room-reading surface** | Added persistent active-room selection, a room-details sidebar with entries/NPCs/encounter launch, and viewer NPC dock wiring while preserving fixture inspection. Gate ✅. |
| **R5 - Add viewer navigation rail** | Added a floor-grouped viewer rail with room-selection syncing, threat hints, and responsive rail layouts while preserving map-based selection and floor switching. Gate ✅. |
| **R6 - Add editor data ownership** | Editor now owns `dungeons.data` alongside `map_layout`: shared room lifecycle, title sync, entry/NPC editing, `RoomContentEditor` component, and dual save status. Gate ✅. |
| **R7 - Browser and creation cutover** | The dungeon browser now creates title-only dungeons directly into Map Lab editing, routes Edit to the production editor, and removes legacy blob details/modal use. 7 browser-flow tests; typecheck/build clean. |
| **R8 - Retire old dungeon UI** | Removed the old room-per-page viewer, modal editor, room route, Isly Castle fixture, and their tests. Map Lab is the only live dungeon surface. Gate ✅. |

---

## Known Debt / Deferred Work (Not Yet Built)

- Loot-on-the-map ownership remains in [`docs/loot_plan.md`](loot_plan.md); this phase only preserves
  the shipped map-prop hook.
- Cross-reference hover pop-outs for monsters and encounters remain deferred.
- Persisting live passage session state is out of scope.

---

## Design Phase R - Map Lab Production Cutover

This phase makes Map Lab the only dungeon experience without rebuilding it. R9 verifies and polishes
the completed production cutover. **Depends on / Depended on by:** depends on Map Lab phases A-M and
R0-R8; unblocks future dungeon authoring.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **R9 - Cutover design and reference pass** | Sonnet | Verify the final surface, accessibility, persistence, and durable docs. | Polish/fixes, reference-doc updates where needed, full verification. |

**Sequencing:** R9 is the final stage of the Map Lab production cutover.

#### R9 — Cutover Design And Reference Pass (next up)

##### Build

Split into five subtasks. Each lists the exact file and what changes.

**R9a — `MapLabRouteState` accessibility (the shared error/loading wrapper)**

`MapLabRouteState.tsx` (14 lines) is used by `DungeonShell`, `MapLabPage`, and `MapLabEditorPage`
for every full-page loading, error, and missing state. Currently it renders a plain `<div>` with
`<h1>` and `<p>` — no ARIA semantics. Fix:

- Add an optional `variant` prop: `'loading' | 'error' | 'idle'` (default `'idle'`).
- When `variant === 'error'`: add `role="alert"` to the root `<div>`.
- When `variant === 'loading'`: add `role="status"` to the root `<div>`.
- When `variant === 'idle'`: no role (neutral heading, used for route-not-found).
- Props interface becomes `{ title: string; message: string; className?: string; variant?: 'loading' | 'error' | 'idle' }`.

**R9b — DungeonShell error-state recovery link**

`DungeonShell.tsx` lines 40–41: when `routeState` is non-null (invalid/missing/error), the entire
shell header (including the "Back to dungeons" link) is replaced by `MapLabRouteState`. The user
has no recovery path except the browser back button. Fix:

- Below the `MapLabRouteState` render (line 41), add a `<Link to="/dungeons">` styled with the
  existing `.dungeon-shell-back-link` class, reading "Back to dungeons".
- Pass `variant` to `MapLabRouteState`: use `'error'` for invalid/missing/error states.
- Also pass `variant="loading"` for the `loading` status case (if reached before context resolves).

**R9c — Viewer and editor loading/error ARIA**

`MapLabPage.tsx` line 290 (loading) and line 294 (layout error):
- Pass `variant="loading"` to `MapLabRouteState` on line 290.
- Pass `variant="error"` to `MapLabRouteState` on line 294.

`MapLabEditorPage.tsx` line 446 (loading) and line 450 (layout error):
- Pass `variant="loading"` to `MapLabRouteState` on line 446.
- Pass `variant="error"` to `MapLabRouteState` on line 450.

`MapLabPage.tsx` lines 636–641 (NpcDock loading/error):
- Wrap the loading `<p>` with a container that has `role="status"`.
- Wrap the error `<p>` with a container that has `role="alert"`.

**R9d — DungeonBrowserPage error announcement**

`DungeonBrowserPage.tsx` line 81: `{loadError && <p className="dungeon-browser-error">{loadError}</p>}`
- Add `role="alert"` to the error `<p>` so screen readers announce creation/load failures.

**R9e — Dead code and stale comment cleanup**

- `frontend/src/components/icons/index.ts` line 452: remove the `SpinnerIcon` export (unused
  `LoaderCircle` re-export from lucide-react). Verify no imports break.
- `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx` line 79: fix stale comment
  referencing `islyCastleData.ts` — update to reference `maplabData.ts`.
- `frontend/src/features/dungeons/maplab/maplabModel.ts` line 569: the "sandbox" word in the
  `PassageSessionState` docstring is descriptive (not a route reference) — leave as-is.

**R9f — Reference doc updates**

`ARCHITECTURE.md` lines 61–69 (feature directory example): replace stale tree with:

```
features/dungeons/
├── DungeonBrowserPage.tsx      # list / create / delete
├── dungeonModel.ts             # read-only content model (rooms, entries, NPCs)
└── maplab/
    ├── DungeonShell.tsx         # layout route with view/edit mode toggle
    ├── MapLabPage.tsx           # viewer (read + encounter/NPC use)
    ├── MapLabEditorPage.tsx     # editor (geometry + content authoring)
    ├── maplabModel.ts           # coordinate/geometry model (MapLayout)
    ├── maplabEditor.ts          # editor reducer (21 actions)
    ├── useMapLabLayout.ts       # viewer layout fetch
    ├── useMapLabEditor.ts       # editor hook (dual-save)
    ├── RoomDetailsPanel.tsx     # viewer room-reading sidebar
    ├── RoomContentEditor.tsx    # editor content inspector
    ├── InspectorPanel.tsx       # fixture inspector (viewer)
    ├── ViewerRoomRail.tsx       # floor-grouped room navigation
    ├── MapCanvas.tsx            # SVG canvas renderer
    └── ... (markers, badges, CSS, tests)
```

`DATA_MODEL.md`:
- Add `map_layout` row to the "Domains and Tables" table (line ~30):
  `| map_layout | map_layout | map_layout.json (seed: none — editor-generated) | /dungeons/{id}/layout (GET, PUT) |`
- Fix line 46 relationship text: replace "room layout, encounters, NPC placements" with
  "room-reading content (entries, NPCs, encounter refs, general info). Geometry lives in map_layout."
- Fix line 89 JSON-encoded column: replace "rooms, exits, encounters, NPCs, props" with
  "DungeonData shape: general_info, rooms (with entries, NPCs), floors, doors, stairs, corridors."
- Add `map_layout.data` row to the JSON-Encoded Columns table: "MapLayout blob: rooms (polyomino
  cells), doors, stairs, floors, props, portals, fixtures. Authoritative for map geometry."

`API_REFERENCE.md`: add a brief note under the Layouts Router section (line ~175) clarifying that
layout data and dungeon data are saved independently via separate endpoints and debounced separately
in the editor.

**R9g — Plan doc top matter rewrite**

After all above changes are committed and tests pass, rewrite the plan doc's status line and top
matter to reflect the steady-state production architecture. Collapse R2–R9 into the shipped table.
This is the final cleanup commit.

##### Inherits

- `DungeonShell` + `DungeonRouteContext` (R3): the shared shell layout, dungeon fetch, and
  `DungeonRouteStatus` type driving all loading/error/missing states. R9 extends `MapLabRouteState`
  usage within this shell, not the context itself.
- `MapLabRouteState.tsx`: the generic stateless wrapper used by all three surface components. R9
  adds ARIA roles via a new `variant` prop — no existing callers change shape.
- `MapLabPage` (R4–R5): viewer with room-reading surface, navigation rail, encounter/NPC docks.
  R9 adds `variant` props to its existing `MapLabRouteState` calls and wraps NPC dock states.
- `MapLabEditorPage` (R6): editor with dual-save, `RoomContentEditor`, placement modes. R9 adds
  `variant` props to its existing `MapLabRouteState` calls.
- `DungeonBrowserPage` (R7): browser page with create/delete flows. R9 adds `role="alert"` to
  its error banner.
- `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`: existing reference docs. R9 updates
  stale sections to match the shipped R0–R8 structure.
- Theme system (`theme.css` lines 321–324, 326–334): global focus ring, reduced-motion reset, and
  touch-target conventions — R9 does not modify these, but the new ARIA roles complement them.
- `DESIGN_SYSTEM.md` accessibility floor (lines 214–221): the ARIA roles added in R9a–R9d bring
  the error/loading states into compliance with the documented floor.

##### Tests

**New test file: `frontend/src/features/dungeons/maplab/__tests__/MapLabRouteState.test.tsx`**

1. Renders title and message as `<h1>` and `<p>`.
2. When `variant="error"`, root `<div>` has `role="alert"`.
3. When `variant="loading"`, root `<div>` has `role="status"`.
4. When `variant` omitted (default), root `<div>` has no role attribute.
5. Applies the `className` prop when provided.

**New test cases in `DungeonShell.test.tsx`**

6. When dungeon is missing, a "Back to dungeons" link is visible and navigates to `/dungeons`.
7. When dungeon ID is invalid, a "Back to dungeons" link is visible.
8. When dungeon fetch errors, a "Back to dungeons" link is visible.

**New test cases in `MapLabPage.test.tsx`**

9. Loading state: `MapLabRouteState` receives `variant="loading"`.
10. Layout error state: `MapLabRouteState` receives `variant="error"`.
11. NPC dock loading: a `role="status"` container wraps the loading text.

**New test cases in `MapLabEditorPage.test.tsx`**

12. Loading state: `MapLabRouteState` receives `variant="loading"`.
13. Layout error state: `MapLabRouteState` receives `variant="error"`.

**New test cases in `DungeonBrowserPage.test.tsx`**

14. When creation fails, the error `<p>` has `role="alert"`.

**Regression tests (must not break)**

15. All existing 210+ tests across 17 test files must continue to pass. The `variant` prop is
    optional with a default, so no existing `MapLabRouteState` usage breaks.
16. The removed `SpinnerIcon` export must not appear in any import statement — verify with a grep
    after removal.

##### 🚦 Gate

**Browser verification (user-performed per `CLAUDE.md`):**

1. Navigate to `/dungeons/nonexistent` — confirm "Dungeon missing" page shows with `role="alert"`
   (screen reader announces it) and a visible "Back to dungeons" link.
2. Navigate to `/dungeons/999999` — confirm "Dungeon unavailable" error shows with "Back to
   dungeons" link.
3. Navigate to `/dungeons/abc` — confirm "Invalid dungeon" shows with "Back to dungeons" link.
4. Navigate to `/dungeons/:id` (valid dungeon) — confirm viewer loads. While loading, confirm
   screen reader announces "Loading map" via `role="status"`.
5. Navigate to `/dungeons/:id/edit` — confirm editor loads. While loading, confirm `role="status"`
   announces loading.
6. Create a dungeon from `/dungeons` — confirm it opens at `/dungeons/:id/edit` with blank map.
7. Add rooms, fixtures, content; reload; confirm persistence.
8. Switch View/Edit — confirm same dungeon and floor/room context persist.
9. Open an encounter dock and an NPC dock — confirm both render with `role="dialog"` and
   accessible titles.

**Automated gate:**

- `cd frontend && npm run test` — all tests green (existing + new).
- `cd frontend && npm run typecheck` — clean.
- `cd frontend && npm run build` — clean production bundle.
- `pytest` from repo root — green (no backend changes in R9, but run to confirm nothing regressed).
- Grep for removed `SpinnerIcon`: `grep -r "SpinnerIcon" frontend/src/` returns zero hits.

---

## Verification

When the phase is complete:

- From `/dungeons`, create a dungeon and confirm it opens directly at `/dungeons/:id/edit` with a
  clean empty map rather than Isly Castle.
- Add rooms and their content, fixtures, and cross-floor links; reload and confirm `dungeons.data`
  content and `map_layout` geometry both persist with matching room IDs.
- Open `/dungeons/:id`, select rooms by map and rail, and confirm details, encounter launch, and
  NPC interactions work without an old room route.
- Switch View/Edit in both directions and confirm the same dungeon, and implemented floor/room
  context, remain active.
- Confirm a missing dungeon and a layout-less dungeon have distinct, recoverable states.
- Confirm no old modal editor, room-per-page route, or sandbox fixture fallback remains.
- Run `npm run test`, `npm run typecheck`, `npm run build`, and `pytest` when backend changes apply.

---

## Cross-References

- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
- [`docs/API_REFERENCE.md`](API_REFERENCE.md)
- [`docs/DATA_MODEL.md`](DATA_MODEL.md)
- [`docs/loot_plan.md`](loot_plan.md)

## Next

**Next:** `R9 - Cutover design and reference pass` is unblocked.
