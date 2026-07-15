# Dungeon Feature - Map Lab Cutover Plan

Single reference for extending the already-routed Map Lab into the production dungeon experience.
This is an **additive cutover**, not a Map Lab rewrite: keep its canvas, editor, fixtures,
toolbars, inspectors, zoom/pan, and layout persistence intact, then add dungeon context and
room-reading/authoring capabilities around them. It follows
[`docs/PLAN_TEMPLATE.md`](PLAN_TEMPLATE.md): durable facts first, a collapsed shipped-stage table,
and detailed specifications only for the remaining work.

> **Status:** Original dungeon work, encounter/NPC support, and Map Lab phases A-M shipped. R0-R6
> shipped. R7 - Browser and creation cutover is next.

---

## What The Feature Is

A dungeon opens the existing Map Lab viewer at `/dungeons/:dungeonId`; edit mode opens the existing
Map Lab editor at `/dungeons/:dungeonId/edit`. Those pages retain their shipped map behavior. The
cutover adds the dungeon's identity, room-reading content, and room-content authoring to those
surfaces so the DM can use the map and the established encounter/NPC tools together.

The old room-per-page viewer and modal blob editor are temporary parallel implementations. The
cutover ends when the browser, viewer, and editor use the extended Map Lab surface exclusively; old
test data and the original Isly Castle prototype fixture need not survive as authored data.

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

---

## Known Debt / Deferred Work (Not Yet Built)

- Loot-on-the-map ownership remains in [`docs/loot_plan.md`](loot_plan.md); this phase only preserves
  the shipped map-prop hook.
- Cross-reference hover pop-outs for monsters and encounters remain deferred.
- Persisting live passage session state is out of scope.

---

## Design Phase R - Map Lab Production Cutover

This phase extends the already-live route scaffold into the only dungeon experience without
rebuilding Map Lab. It first gives the existing pages valid production loading, then layers shell,
reading, navigation, and data authoring capabilities onto their current composition before deleting
the old UI. **Depends on / Depended on by:** depends on Map Lab phases A-M and R0-R1; unblocks all
future dungeon authoring.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **R3 - Additive shared dungeon shell** | Sonnet | Wrap, rather than rebuild, both existing Map Lab pages with real dungeon identity and mode controls. | Thin shared shell, title, browser return, view/edit navigation, responsive framing. |
| **R4 - Add viewer room-reading surface** | Sonnet | Layer persistent room selection and `dungeons.data` details beside the existing map inspector. | Active-room model, details panel, entry/NPC/encounter parity, map/data mismatch tolerance. |
| **R5 - Add viewer navigation rail** | Sonnet | Add fast structured navigation alongside the existing spatial selection. | Floor-grouped rail, floor/selection synchronization, compact layout decision. |
| **R7 - Browser and creation cutover** | Sonnet | Send every dungeon action through the production surfaces. | Browser edit routing, create-then-edit flow, modal-editor removal from browser. |
| **R8 - Retire old dungeon UI** | Sonnet | Delete the old viewer, modal editor, room route, and obsolete tests/styles. | One live dungeon surface, route and dead-code cleanup. |
| **R9 - Cutover design and reference pass** | Sonnet | Verify the final surface, accessibility, persistence, and durable docs. | Polish/fixes, reference-doc updates where needed, full verification. |

**Sequencing:** `R2 -> R3 -> R4 -> R5 -> R6 -> R7 -> R8 -> R9`. R4 and R5 may share layout
work after R3, but R4's active-room contract lands first. R6 must precede R7-R8 because the old
modal cannot be removed until production editing persists complete room data.

#### R7 - Browser And Creation Cutover (Planned)

- **Build:** change browser **Edit** to `/dungeons/:id/edit`. Replace the modal **New Dungeon**
  path with the smallest create-then-navigate flow: create a title-only dungeon with clean
  `dungeons.data`, then navigate directly to its production editor; retain list/select/delete
  behavior. Update browser detail counts so they do not imply old blob geometry is authoritative.
- **Inherits:** R6's standalone production editor (`useMapLabEditor` with dual save, `RoomContentEditor`,
  `roomContentEditorReducer` with `setRoomMeta`, shared room lifecycle) and existing create/delete
  API calls (`client.ts`).
- **Tests:** edit route, create request and redirect, cancellation/error behavior, and browse/select/delete
  regression tests.
- **Gate:** every browser entry action reaches a production route, and a newly created dungeon opens
  with no Isly Castle content or old modal editor.

#### R8 - Retire Old Dungeon UI (Planned)

- **Build:** delete `DungeonViewPage.tsx`, `DungeonViewPage.css`, `DungeonEditor.tsx`,
  `DungeonEditor.css`, the `dungeons/:dungeonId/rooms/:roomId` route, and their dedicated tests.
  Remove `dungeonForm.ts` only after confirming no surviving production code uses it. Remove
  prototype-only fixture fallback/reset code and any imports, CSS, or route assumptions made dead
  by R2-R7.
- **Inherits:** R4-R7 must be complete; this is deliberate removal, not a coexistence stage.
- **Tests:** remove obsolete suites, update route/browser tests, run a repository search proving no
  live imports or routes reference retired surfaces, and retain Map Lab regression coverage.
- **Gate:** Map Lab view and edit routes are the sole live dungeon surfaces.

#### R9 - Cutover Design And Reference Pass (Planned)

- **Build:** perform the final production design pass across shell, map, rail, details panel,
  editor, empty/error states, and responsive behavior. Resolve accessibility and focus defects,
  remove dead styling, and update `ARCHITECTURE.md`, `API_REFERENCE.md`, and `DATA_MODEL.md` only
  if the shipped structure differs from their current claims. Rewrite this plan's top matter to the
  steady-state architecture and collapse R2-R9 as they ship.
- **Inherits:** complete R2-R8 surface; this is not a place to add new dungeon capabilities.
- **Tests:** focused UI regressions and accessible-name/focus assertions, then `npm run test`,
  `npm run typecheck`, `npm run build`, and `pytest` if backend/reference structure changed.
- **Gate:** new dungeon creation, layout/content authoring, reload, viewer navigation, encounter/NPC
  use, and mode switching work coherently through the one production surface. Manual browser checks
  are user-performed per `CLAUDE.md`.

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

**Next:** `R7 - Browser and creation cutover` is unblocked.
