# Dungeon Feature — Map Lab Cutover Plan

Single reference for replacing the old dungeon room-per-page experience with the Map Lab production
version. Written to the [`docs/PLAN_TEMPLATE.md`](PLAN_TEMPLATE.md) convention: durable reference up
top, one collapsed **Shipped stages** table for history, and verbose spec only for the active/next
cutover phase.

> **Status:** Original dungeon build, encounter/NPC support, and Map Lab design phases A-M shipped. R0–R1 shipped; R2–R11 planned next.

---

## What the feature is

The dungeon feature is becoming a **Map Lab-first dungeon experience**. A dungeon should open on a
spatial map at `/dungeons/:dungeonId`, and the DM should be able to switch between **view mode** and
**edit mode** with a clear button that preserves dungeon context.

The old room-per-page viewer and the old dungeon blob editor are being fully removed. We are not
preserving prior authored test data in either format; the only requirement is that the new production
shape persists correctly for all new work going forward.

---

## Key data facts (assume no other repo knowledge)

- **Persistence decision for cutover:** keep the split model.
- `dungeons.data` remains the source of truth for dungeon title, room narrative content, room NPC ids,
  room entries, and other non-spatial dungeon content.
- `map_layout` remains the source of truth for map geometry, floors, doors/stairs/portals/props, and
  edit-mode spatial state.
- **No migration work is required.** Existing authored data in the old dungeon viewer/editor and the
  current Map Lab sandbox can be discarded because it was test data.
- **No backward-compatibility layer is required** for legacy drafts, fixture-only workflows, or old
  room-per-page navigation state.
- The current frontend is still split:
- `frontend/src/features/dungeons/DungeonViewPage.tsx` owns `/dungeons/:dungeonId` and
  `/dungeons/:dungeonId/rooms/:roomId`.
- `frontend/src/features/dungeons/maplab/MapLabPage.tsx` and `MapLabEditorPage.tsx` still live at the
  sandbox routes `/dungeons/map-lab` and `/dungeons/map-lab/edit`.
- The current Map Lab pages are still hard-wired to `MAP_LAB_DUNGEON_ID = 4` in
  `frontend/src/api/client.ts`.
- Current backend seams already exist and are sufficient for the cutover:
- `/api/dungeons/:id` for the dungeon record.
- `/api/dungeons/:id/layout` for the persisted Map Lab layout blob.

---

## Design system in force

Consume the canonical design tokens from `frontend/src/theme.css` (`--md-*`, `--type-*`, `--variant-*`)
and follow [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

Feature-specific cutover rules:
- The new shared dungeon shell must make the **view/edit mode switch** obvious, stable, and accessible.
- View mode and edit mode should feel like two tools inside one dungeon surface, not two unrelated pages.
- If an old affordance is reintroduced only for parity, prefer the smallest correct version that fits the
  Map Lab shell rather than reproducing the old layout exactly.

---

## Reusable pieces (do not rebuild)

- `frontend/src/api/client.ts`: `getDungeon`, `listDungeons`, `getDungeonLayout`, `saveDungeonLayout`.
- `frontend/src/features/dungeons/dungeonModel.ts`: typed read-model and room-content selectors.
- `frontend/src/features/dungeons/maplab/useMapLabLayout.ts`: layout loading seam to extend for
  route-param dungeons.
- `frontend/src/features/dungeons/maplab/useMapLabEditor.ts`: layout editing and persistence seam.
- `frontend/src/features/dungeons/maplab/MapLabPage.tsx`, `MapLabEditorPage.tsx`, `MapCanvas.tsx`,
  `InspectorPanel.tsx`, `FixturePropertiesForm.tsx`, `maplabModel.ts`.
- `frontend/src/features/encounters/EncounterDock.tsx` for encounter launch/dock reuse.
- `frontend/src/features/npcs/NpcChip.tsx`, `NPCStatCard.tsx`, `useNpc.ts` for NPC parity where kept.
- `frontend/src/components/FloatingWindow.tsx`, `SplitPane.tsx`, `Card.tsx`, `SearchList.tsx`,
  `DiceText.tsx`.

---

### Shipped stages table (the collapsed record)

| Stage | What shipped (≤2 sentences) |
|-------|-----------------------------|
| **1–11 — Original build** | Read-model + selectors, room-per-page shell, exit choice-cards, breadcrumbs + floor-grouped rail, theme token migration, FeatureTile + door/stair grid. |
| **A — Encounter Runner (E1–E6)** | `encounterRunner` reducer + `useEncounterRunner`; `CombatantCard`/`AddMonsterPanel`/`EncounterRunnerBoard`; `FloatingWindow` dock from encounter tile. |
| **B — NPC Dossier (N1–N6)** | NPC model helpers, `NPCStatCard`, `NpcChip`, and NPC dock support coexisting with encounter dock. |
| **C — Map Lab Foundation (M0–M4)** | Coordinate model, polyomino rooms, SVG render, walls/door glyphs, inspector, and session-state layer. |
| **D — Authoring Tools (0–3)** | Editor at `/dungeons/map-lab/edit`, room paint/create, door placement/editing, reducer/hook, and `map_layout` GET/PUT. |
| **E — Unified data + zoom (0–3)** | Viewer reads `map_layout`; zoom/pan, toolbar/inspector cleanup, and typecheck fixes. |
| **F — Room Props (F0–F4)** | `MapProp` system, prop rendering, editor placement mode, fixture properties form, reserved loot hook. |
| **G — Ghost Objects (G-fix + G0–G2)** | Editor ghost lower-floor view plus authored-`z` floor attribution fixes. |
| **H — Stair/Portal Authoring (H0–H4)** | Stair authoring, portal pairing, viewer render/navigation, shared stair marker extraction. |
| **I — Stair/Portal Fixes (I0–I3)** | Stair-direction fixes, grouped marker placement, and live-verified viewer/editor behavior. |
| **J — Map Lab Decluttering (J0–J3)** | Toolbar trays, passage-state chips, and passage token cleanup. |
| **K0–K3** | Fullscreen editor, wheel zoom, multi-cell room footprint, and the follow-up design pass. |
| **L — Marker Badge System (L0–L4)** | Marker badge model, bounded badge layout, and door badge overlay design pass. |
| **M0–M4** | Collapsed multi-status model, bounded on-square markers, single door-status badge, and final accessibility naming polish. |
| **R0 — Plan reset** | Rewrote `docs/dungeon_plan.md` as the Map Lab cutover plan; recorded split-model decision (`dungeons.data` + `map_layout`) and disposable-test-data scope. |
| **R1 — Route cutover scaffold** | Map Lab moved onto real dungeon routes (`/dungeons/:dungeonId` + `/dungeons/:dungeonId/edit`); sandbox entry points (`/dungeons/map-lab` + `/dungeons/map-lab/edit`) removed; `MAP_LAB_DUNGEON_ID` constant deleted; 108 tests, typecheck/build clean. |

---

## Known debt / deferred work (NOT yet built)

- **Map Lab production cutover** itself: parameterized routing, shared shell, browser rewiring, old UI
  deletion, and the persistent view/edit mode switch.
- **Editor room-data ownership is incomplete.** The Map Lab editor still does not own all room-level data
  the new viewer will need; that becomes required during this cutover.
- **Loot-on-the-map** remains owned by `docs/loot_plan.md`; do not fold it into this cutover.
- **Cross-reference hover pop-outs** for monster/encounter chips remain deferred.
- **Optional old affordance carryovers** such as breadcrumb history should only return if clearly useful in
  the Map Lab shell; they are not required simply because the old viewer had them.

---

## Design Phase R — Map Lab Production Cutover

This phase replaces the old dungeon viewer/editor with a Map Lab-based production surface and deletes the
old version. **Depends on / Depended on by:** depends on shipped Map Lab phases A-M; unblocks future
dungeon work by making Map Lab the only live dungeon surface.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **R0 — Plan reset** | Sonnet | Rewrite the dungeon plan around the cutover and record the persistence decision. | Clean plan doc, split-model decision, disposable-test-data scope locked. |
| **R1 — Route cutover scaffold** | Sonnet | Move Map Lab onto real dungeon routes and remove hard-wired sandbox entry points. | `/dungeons/:dungeonId` and `/dungeons/:dungeonId/edit` routes wired; fixed-id page entry removed. |
| **R2 — Dungeon-param loading** | Sonnet | Load dungeon record + layout by route param and define new-dungeon empty-layout behavior. | Param-based viewer/editor loading, clean no-layout bootstrap, tests updated. |
| **R3 — Shared dungeon shell** | Sonnet | Build one shell shared by view and edit surfaces, including the mode switch button. | Shared title/header/floor/status shell, mode button, context-preserving switch behavior. |
| **R4 — Browser entry rewiring** | Sonnet | Point dungeon browser actions at the new production routes and stop launching old surfaces. | Browser `Enter`/`Edit` cut over, old browser assumptions removed. |
| **R5 — Viewer room selection model** | Sonnet | Add stable active-room behavior inside the Map Lab viewer. | Active-room state, sensible default selection, room-driven details panel. |
| **R6 — Viewer room-details panel** | Sonnet | Rebuild room content rendering inside the new Map Lab shell using `dungeons.data`. | Grouped entries, treasure, encounter action, NPC chips/dock parity. |
| **R7 — Viewer navigation rail** | Sonnet | Restore floor-grouped room navigation in a Map Lab-compatible shell. | Floor-grouped room rail, active-room sync, collapse choice finalized. |
| **R8 — Editor room-data ownership** | Sonnet | Make edit mode own every room field the new viewer needs to persist. | Room metadata editing, required room-content persistence, clean round-trip. |
| **R9 — Old UI removal** | Sonnet | Delete the old dungeon viewer/editor and sandbox-only Map Lab routes. | `DungeonViewPage` and `DungeonEditor` removed, route/tests cleanup done. |
| **R10 — Reference-doc cleanup** | Sonnet | Update durable docs to match the new production architecture. | `ARCHITECTURE.md`/`API_REFERENCE.md`/`DATA_MODEL.md` updated only where structure changed. |
| **R11 — Cutover design pass** | Sonnet | Final polish, accessibility review, and persistence verification on the new single surface. | Shell polish, mode-switch clarity, persistence/reload verification, dead-code cleanup. |

**Sequencing:** `R0` → `R1` → `R2` → `R3` → `R4` → `R5` → `R6` → `R7` → `R8` → `R9` → `R10` → `R11`.
`R5` and `R6` should stay sequential because the details panel depends on the active-room model; `R6` and
`R7` can overlap slightly in implementation once the shared shell exists, but should still land as distinct
stages.

#### R2 — Dungeon-param loading (planned)

- **Build:** make `MapLabPage.tsx`, `MapLabEditorPage.tsx`, `useMapLabLayout.ts`, and any supporting hooks
  load by `dungeonId` route param. Load the dungeon record and layout record together; remove fixed-id
  assumptions. Define what happens when a dungeon has no `map_layout` row yet: bootstrap a clean, persistable
  empty/new layout rather than falling back to Isly Castle fixture data.
- **Inherits:** `getDungeon`, `getDungeonLayout`, and `saveDungeonLayout` already exist; `normalizeLayout`
  remains the layout canonicalization seam.
- **Tests:** viewer/editor tests for param-based loading, non-404 layout load, 404 no-layout bootstrap, and
  rejection of Isly-only fallback behavior for arbitrary dungeons.
- **🚦 Gate:** two different dungeon ids can be loaded without any hard-wired Isly Castle dependency, and a
  newly bootstrapped dungeon persists its first saved layout after reload.

#### R3 — Shared dungeon shell (planned)

- **Build:** extract or create a shared shell component used by both Map Lab view and edit pages. The shell
  should own the dungeon title/header, floor controls placement, shared status area, and the **view/edit
  mode switch button**. The switch must preserve the current `dungeonId` and as much local context as is
  reasonable, especially active floor and selected room when those are already established.
- **Inherits:** existing `MapCanvas`, toolbar patterns, and floor-tab patterns should be reused rather than
  rebuilt.
- **Tests:** shell render tests, mode-button routing tests, context preservation tests for floor/room state
  where implemented.
- **🚦 Gate:** from either surface, the DM can press one clear button to switch modes and remain inside the
  same dungeon rather than being thrown back to a browser list or sandbox route.

#### R4 — Browser entry rewiring (planned)

- **Build:** update `DungeonBrowserPage.tsx` so `Enter` opens the new Map Lab viewer route and `Edit` opens
  the new Map Lab editor route. Remove browser behavior that exists only to launch `DungeonViewPage` or the
  modal `DungeonEditor` once the cutover routes are in place.
- **Inherits:** the dungeon browser remains the primary list/select surface; this stage only changes where
  its actions land.
- **Tests:** browser action tests asserting the new routes, and regression coverage for browse/select/delete
  that should remain intact.
- **🚦 Gate:** a DM can enter or edit any dungeon from the browser and always land on the new Map Lab-based
  production surfaces.

#### R5 — Viewer room selection model (planned)

- **Build:** add a stable active-room model inside the Map Lab viewer so room selection is explicit, not only
  hover-based inspector state. Selecting a room from the map should drive the right-side details surface and
  survive ordinary UI interactions; first load should pick a sensible room when none is selected.
- **Inherits:** `MapLabPage.tsx` already has floor state and selectable room graphics; this stage promotes
  room selection to a viewer-level content model.
- **Tests:** room click/keyboard selection tests, default-selection tests, and room/floor sync tests.
- **🚦 Gate:** the viewer feels like a usable dungeon-reading surface rather than only a geometry inspector.

#### R6 — Viewer room-details panel (planned)

- **Build:** render room content from `dungeons.data` inside the new viewer shell. Reuse `dungeonModel.ts`
  selectors and old `DungeonViewPage` content patterns where useful, but fit them into the Map Lab shell.
  Include grouped entries, treasure content, encounter launch affordance, and room-level NPC chips with dock
  support.
- **Inherits:** `parseDungeonData`, room selectors, `DiceText`, `EncounterDock`, `NpcChip`, `useNpc`, and
  `NPCStatCard` are the reuse seams.
- **Tests:** room-details render tests, grouped entry coverage, encounter action coverage, NPC chip/dock
  coverage, and missing-data tolerance tests.
- **🚦 Gate:** selecting a room on the new map gives the DM the practical room-reading information they need
  without opening the old room-per-page UI.

#### R7 — Viewer navigation rail (planned)

- **Build:** add a floor-grouped room navigation rail to the Map Lab viewer shell. Keep it synchronized with
  active floor and selected room; decide whether the collapse/reopen affordance still improves the new shell
  or should be dropped.
- **Inherits:** old rail grouping logic from `dungeonModel.ts` and `DungeonViewPage.tsx` should be reused,
  not re-derived.
- **Tests:** grouped rail render tests, room-selection sync tests, floor-switch sync tests, and collapse tests
  if the rail remains collapsible.
- **🚦 Gate:** the viewer supports both spatial clicking and structured room-list navigation for faster table
  use.

#### R8 — Editor room-data ownership (planned)

- **Build:** make the new edit mode own every room field the new viewer requires. At minimum this includes
  room title plus the room-level narrative/display fields used by the new details panel, and any retained
  room NPC linkage. The new authoring path must persist these fields cleanly without depending on the old
  `DungeonEditor` modal.
- **Inherits:** `useMapLabEditor.ts`, reducer patterns, and existing fixture forms can be extended, but do
  not build a second parallel editor.
- **Tests:** room metadata editing tests, save/reload round-trip tests spanning `dungeons.data` and
  `map_layout`, and regression tests for existing layout editing behavior.
- **🚦 Gate:** a dungeon created and edited entirely through the new surface can be reloaded and still render
  correctly in the new viewer without the old editor existing.

#### R9 — Old UI removal (planned)

- **Build:** delete `DungeonViewPage.tsx`, its CSS/tests, and the old room-per-page routes. Delete
  `DungeonEditor.tsx` and its browser/modal wiring once `R8` has landed. Remove sandbox-only Map Lab route
  names and any no-longer-used helpers that only served the retired surfaces.
- **Inherits:** earlier cutover stages must already make the new routes and editor production-ready; this is
  deliberate deletion, not a mixed-mode coexistence stage.
- **Tests:** remove obsolete tests, update surviving suites, and ensure no route references remain to deleted
  pages.
- **🚦 Gate:** there is only one live dungeon surface left in the app, and it is Map Lab-based.

#### R10 — Reference-doc cleanup (planned)

- **Build:** update `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`, and `docs/DATA_MODEL.md` only where the
  cutover changes durable structure. Update this plan doc's top matter to describe the new steady-state
  production reality once the old surfaces are gone.
- **Inherits:** code deletion and route cutover from earlier stages provide the final architecture facts.
- **Tests:** no new code tests; doc consistency review only.
- **🚦 Gate:** a future executor can read the reference docs without being misled by the removed room-per-page
  architecture.

#### R11 — Cutover design pass (planned)

- **Build:** final polish on the shared shell, mode-switch clarity, empty/new-dungeon states, responsive
  behavior, and accessibility. Remove dead code or styling leftovers missed during deletion and verify that
  persistence/reload behavior is stable for newly authored dungeons.
- **Inherits:** all functional cutover stages must already be complete; this is the zero-bug, coherence, and
  usability pass.
- **Tests:** focused UI regression tests, a11y-oriented assertions where appropriate, plus `npm run test`,
  `npm run typecheck`, `npm run build`, and `pytest` if any backend structure changed.
- **🚦 Gate:** the new single-surface dungeon experience is coherent, persistent, and ready to own all future
  dungeon work.

---

## Verification (how to confirm the shipped feature end-to-end)

When the cutover phase is complete:
- Open `/dungeons`, choose a dungeon, and confirm `Enter` opens `/dungeons/:dungeonId` and `Edit` opens
  `/dungeons/:dungeonId/edit`.
- In view mode, confirm the dungeon map loads for the selected dungeon, a room can be selected, room details
  render from `dungeons.data`, and encounter/NPC affordances still work.
- Use the **view/edit mode switch button** in both directions and confirm the dungeon context is preserved.
- In edit mode, create or modify room/map data, reload, and confirm both `dungeons.data`-backed content and
  `map_layout`-backed geometry persist correctly.
- Confirm the old room-per-page routes and the old dungeon modal editor no longer exist.
- Run `npm run test`, `npm run typecheck`, `npm run build`, and `pytest` if backend/reference changes were
  part of the shipped stage.

---

## Next

**Next:** `R2 — Dungeon-param loading` — load dungeon record + layout by route param and define new-dungeon empty-layout bootstrap.
