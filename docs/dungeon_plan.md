# Dungeon Feature — State of Play & Design Foundation

Single reference for the dungeon room-navigation feature and its follow-on design phases. Written to the
[`docs/PLAN_TEMPLATE.md`](PLAN_TEMPLATE.md) convention: durable reference up top, one collapsed
**Shipped stages** table for history, verbose spec only for the *active/next* stage. Detail on *how* a
shipped stage was built lives in its git commit, not here.

> **Status:** Original build (Stages 1–11) + Design Phases A–L shipped. **M0 — Bounded Marker Status scaffolding** is next.

---

## What the feature is

A **room-per-page experience** for running games live at the table: enter a dungeon, land on a room, read
its full detail, and move to connected rooms through **prominent door/stair choice-cards**, with a
**breadcrumb trail** and a **floor-grouped room-index rail** for orientation. From a room, a DM can launch
a **live encounter runner** (HP steppers, turn order) or open an **NPC dossier** in a floating dock without
leaving the page.

**Layout:** collapsible room-index/mini-map **rail** on the left, full **room page** on the right,
**breadcrumb bar** on top. Exits are the signature affordance — gold **choice cards** (`Great Oak Door →
Portal Room`); hidden doors are shown to the DM, marked with a DC. Encounter and NPC docks are movable
`FloatingWindow`s that layer on top, independent of each other.

A separate **Map Lab** (`/dungeons/map-lab` viewer, `/dungeons/map-lab/edit` editor) is the spatial
authoring surface: an SVG grid where rooms are painted, and doors/stairs/portals/props placed and edited.

---

## Key data facts (assume no other repo knowledge)

**Dungeon data is an opaque JSON blob.** Backend (`schemas.py` `Dungeon.data: Dict[str, Any]`) and frontend
(`types.ts` `Dungeon.data: Record<string, unknown>`) both treat it untyped. The typed read-model lives
entirely in the frontend (`dungeonModel.ts`). Map Lab layouts persist separately in the additive
`map_layout` table (`dungeon_id` PK, `data` TEXT) — also an opaque blob, no schema validation.

**The real shape** (from `data/seeds/seed_dungeons.json`; two dungeons: id 4 "Isly Castle" — 48 rooms
across 2 floors joined by a stair; id 5 "Greenhouse" — one trivial floor):
```jsonc
data = {
  general_info: { title, size, walls, floor, temperature, illumination },   // mostly null
  rooms:  [ { room_id: 3, title: "Portal Room", entries: [Entry…], npcs?: [4] } ],
  doors:  [ { door_id, entry_type:"door", title, content, leads_to:[2,1],
             is_hidden, hidden_dc, door_mechanics, trap_ids:[] } ],
  floors: [ { floor_id, title:"Ground Floor", room_ids:[1,2,…],
             floor_above, floor_below, map_image? } ],
  stairs: [ { stair_id, title:"Stone Stairs",
             leads_to_rooms:[32,33], leads_to_floors:[1,2] } ],
  corridors: [], map_image: null, map_image_length: 0
}
// Entry (inside a room): { entry_type: "feature"|"trap"|"encounter"|…, title, content,
//   is_hidden, hidden_dc, container, container_mechanics, count, monster_id,
//   encounter_id?, trap_ids:[], treasure_contents:[] }
```

- **Connectivity = an undirected edge list.** A door's `leads_to` (and a stair's `leads_to_rooms`) is a
  2-element `[roomA, roomB]` of `room_id`s; a room's exits = edges whose pair contains the current
  `room_id`, the *other* id being the destination. Data is human-authored and messy — a pair can repeat a
  room (`[9,9]`), be a scalar in older records, and ids skip numbers. Selectors tolerate all of this.
- **Floors are authoritative for grouping.** `floors[i].room_ids` lists exactly which rooms sit on that
  floor; degrade to one implicit "Rooms" group when `floors` is absent (the Greenhouse case).
- **Room NPCs = `room.npcs: number[]`** — NPC wiring hangs off the room-level array, not an entry slot.
- **Encounter creatures are a denormalized, id-less array**: `creatures[]` = `{ monster_id, original_name,
  name, hp_current, hp_max, ac, status, conditions[] }`. Order *is* turn order and round-trips as-is. The
  runner assigns a synthetic `clientId` on load, strips it on save. Monster `hp` is an object
  `{average, formula, minimum, maximum}`; quick-add derives `hp_current = hp_max = hp.average`.
- **NPC record fields are messy dicts** (`stats`/`saving_throws`/`skills`/`appearance`:
  `Record<string, unknown>`; `senses`: array of `{type, range}`). Real seed uses full-word ability keys
  (`strength`, not `str`) — helpers tolerate both. Any field can be absent.

---

## Design system in force

Consume the canonical design tokens from `frontend/src/theme.css` (`--md-*`, `--type-*`, `--variant-*`) —
never the `--md-sys-color-*` namespace. See [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) for the full color
token table, type scale, icon policy, component anatomy, and accessibility floor.

**Feature-specific assignments:** primary/violet = spells, secondary/gold = weapons + exit choice-cards,
tertiary/teal = monsters + healthy HP, error/red = errors/traps/critical HP, npc/rose = NPCs. In Map Lab,
an on-square marker's icon/type owns its color; passage status must not recolor its icon or outline. A
single on-canvas status disc may overlap its own marker icon, but must remain inside the owning cell and
never overlap another marker's disc. One active status uses its specific icon; two or more use a semantically
named local alias of Lucide `Layers` to mean **multiple statuses**. Hidden retains its dashed outline as a
non-color visibility cue. Doors remain architecturally distinct: their leaf/swing/icon stays `--md-door`,
and their single collapsed status disc remains attached to the door segment. Map Lab passage and door marker
contracts are documented in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md); gold/`--md-secondary` is exclusively
the exit-choice-card color. Canvas SVG glyphs are the documented exception to the 48px touch-target floor
(they follow a marker-radius convention).

---

## Component anatomy (structural ideas — do not rebuild these shapes)

- **FeatureTile** (`DungeonViewPage.tsx`) — every room entry: type-icon badge → header (title + count +
  hidden-DC badge + reserved `.feature-tile-actions` slot) → body (`DiceText`) → meta rows. The encounter
  entry's action slot hosts **"Run encounter"**.
- **Door/stair choice-card grid** — responsive 2-column grid of tall cards (icon → name → `→ destination`
  → meta footer → reserved `.exit-card-actions` bar). Stairs render identically to doors.
- **CombatantCard** (`features/encounters/`) — HP meter (teal→gold→red by tier, `SkullIcon` at 0) +
  6-button stepper rail + drag handle with ▲/▼ accessible fallback + status chips.
- **NPCStatCard** (`features/npcs/`) — monogram + name + identity line + composed appearance sentence +
  conditional AC/HP/Speed strip + six-ability block + saving-throws/skills/senses/languages, each shown only
  when present. `compact` prop for dock use; consumes `data-variant="npc"`.
- **FloatingWindow** (`components/`) — generic draggable/touch dock: grip header, minimize, close,
  `sessionStorage`-persisted position. Used verbatim by both encounter and NPC docks; multiple open at once.
- **InspectorPanel + `Inspectable`** (`maplab/`) — generic hover/focus details panel driven by
  `inspectableDescriptor(target)`, resolving room / door / stair / portal / prop / item to one
  `{title, typeLabel, icon, token, lines, chips}` shape. Hosts Map Lab's session controls.
- **ToolbarTray** (`maplab/`, Phase J1) — independently collapsible toolbar group (label + chevron +
  `data-collapsed`, per-`groupKey` `localStorage`); reused by the editor's Create/Session/View/Status groups
  and the viewer's Session group.
- **Reserved action slots** (`.feature-tile-actions`, `.exit-card-actions`) exist so a future per-room
  editing phase can drop controls in without a re-layout.

---

## Reusable pieces (do not rebuild)

- `frontend/src/api/client.ts`: `getDungeon`/`listDungeons`, `getEncounter`/`updateEncounter`/
  `listEncounters`/`createEncounter`/`deleteEncounter`, `getNPC`/`listNPCs`, `listMonsters`,
  `getDungeonLayout`/`putDungeonLayout`.
- `frontend/src/components/`: `Card`, `SplitPane`, `SearchList`, `DiceText`, `ConfirmDialog`,
  `FloatingWindow`, `components/icons/` (the Lucide alias set).
- `frontend/src/features/dungeons/dungeonModel.ts`: typed read-model + all selectors. **Extend this rather
  than adding a parallel model.**
- `frontend/src/features/encounters/`: `encounterRunner.ts` (pure reducer), `useEncounterRunner.ts`,
  `CombatantCard`, `AddMonsterPanel`, `EncounterRunnerBoard`.
- `frontend/src/features/npcs/`: `npcModel.ts`, `useNpc.ts`, `NPCStatCard`, `NpcChip`.
- `frontend/src/features/dungeons/maplab/`: `maplabModel.ts` (geometry core + presentation + `Inspectable`
  + session layer — the full selector surface, see the coordinate-model reference below), `maplabEditor.ts`
  (pure reducer), `useMapLabEditor.ts`/`useMapLabLayout.ts`, `useMapCanvasZoom.ts`, `MapCanvas.tsx`,
  `MapLabPage.tsx` + `.css`, `MapLabEditorPage.tsx`, `InspectorPanel.tsx`, `FixturePropertiesForm.tsx`,
  `fixtureTypes.ts`, `markerBadges.ts`, `BadgeRing.tsx`, `DoorMarker.tsx`, `PropMarker.tsx`,
  `StairMarker.tsx`, `PortalMarker.tsx`, `GhostFloorLayer.tsx`, `maplabData.ts` (fixture). `markerBadges.ts`
  is the sole status-display derivation seam; `BadgeRing.tsx` is the shared on-square SVG status-disc
  renderer; `DoorBadgeLayer` owns the separate door overlay.
- `frontend/src/theme.css`: the real design tokens. **Dev servers:** `scripts/start_server.ps1` (backend
  :8000 + Vite :5173), `scripts/stop_server.ps1`. **Tests:** `npm run test` (frontend); `pytest` from repo
  root (backend). **Typecheck:** `npm run typecheck` (`tsc -b`) — *not* `tsc --noEmit`, which checks nothing
  here (root `tsconfig.json` has `"files": []`).

---

## Shipped stages (collapsed history)

Each phase's per-stage authoring detail is in its git commits. This table is the durable summary.

| Phase | What shipped |
|-------|--------------|
| **1–11 — Original build** | Read-model + selectors (`dungeonModel.ts`), room-per-page routes/shell, rich room detail (entries/treasure/cross-refs/hidden DC), exit choice-cards, breadcrumbs + floor-grouped rail with `sessionStorage` trail. Migrated onto real theme tokens (root cause of "flat text on nothing"), local Lucide icons replacing emoji, FeatureTile + door/stair choice-card grid. |
| **A — Encounter Runner (E1–E6)** | Headless `encounterRunner` reducer (HP clamp, duplicate, add-from-monster, reorder, `nextTurn` with round-wrap) + `useEncounterRunner` (optimistic, ~600ms debounced autosave); `CombatantCard`/`AddMonsterPanel`/`EncounterRunnerBoard`, standalone `/encounters/:id/run`, and a `FloatingWindow` dock from the room's encounter tile. Added nullable `active_index` to the `encounter` table to persist the turn pointer; fixed `parseDungeonData` dropping numeric-string ids. |
| **B — NPC Dossier (N1–N6)** | Fifth MD3 content role `--md-npc` (rose, harmonized toward primary); `npcModel.ts` ability-key-tolerant helpers; `NPCStatCard` + rebuilt NPC browser detail; `useNpc(id)` hook + `NpcChip` (roster-backed name resolution) + an NPC `FloatingWindow` dock coexisting with the encounter dock. |
| **C — Map Lab Foundation (M0–M4)** | Isolated Map Lab sandbox proving a programmatic coordinate model on real Isly Castle ids (full schema + selectors in the reference section below): geometry core, polyomino L/T rooms, single-floor SVG render + z-axis floors/stairs, perimeter walls, architectural door leaf+swing glyphs, generic `Inspectable`/`inspectableDescriptor` inspector, and a live session-state layer (`effectivePassageState`). |
| **D — Authoring Tools (0–3)** | Turned Map Lab into an editor at `/dungeons/map-lab/edit`: paint-to-create rooms (walls auto-derive, never stored), place doors on wall segments, edit any fixture via a schema-driven `FixturePropertiesForm` (`FieldSpec`/`FIXTURE_TYPES`). Mutable state = pure `mapLabEditorReducer` + `useMapLabEditor` (404→fixture fallback, debounced autosave); persists to the additive **`map_layout` table** via `GET`/`PUT /dungeons/{id}/layout`. |
| **E — Unified data + zoom (0–3)** | Viewer reads the same persisted `map_layout` as the editor (`useMapLabLayout`); real canvas zoom/pan (`useMapCanvasZoom` + `MapCanvas`, map *grows* on zoom inside an `overflow:auto` viewport, Ctrl/⌘-wheel + drag-pan); toolbar/inspector design pass (`.maplab-pill-button`, grouped toolbar, unified nav rail, always-mounted inspector rail). Exposed + fixed the false-green typecheck (`tsc -b`, not `--noEmit`). |
| **F — Room Props (F0–F4)** | Generic on-square/on-wall `MapProp` system reusing `PassageFlags` wholesale: shared `PropMarker` (kind icon + state token + hidden-dashed outline + badge), editor placement mode, generic properties form, reserved-but-inert **loot hook** row. Frontend-only; round-trips in the `map_layout` blob. Renamed the reserved `MapItem` slot to `MapProp` to avoid colliding with the coming loot **items** system. |
| **G — Ghost Objects (G-fix + G0–G2)** | Editor "Ghost lower floor" toggle overlaying the nearest lower floor as dimmed, read-only, `aria-hidden` ghosts for cross-floor alignment. G1 found and fixed a real floor-attribution bug — doors/props leaked across floors sharing `[x,y]`; fixed by stamping an authored `z` on `addDoor`/`addProp` and filtering by it (`normalizeLayout` backfills legacy data). |
| **H — Stair/Portal Authoring (H0–H4)** | Editor stair authoring (on-canvas placement/selection with `DestinationPickerField` and co-located up/down landings) + two-way **portal doors** (`MapPortal`, paired auto-create/re-link, `PortalMarker`); viewer renders/navigates both stairs and portals (hover/focus inspector, click jumps `activeZ`), with a same-stage destination-picker rework (floor + room select, replacing an unusably-small click-a-cell mini floor-plan) and an orphan-pairing fix. **H4 design pass:** extracted a shared `StairMarker` (matching `PortalMarker`/`PropMarker`) to fix a real inconsistency — inline stair markers were missing the state badge and dashed-hidden outline the other two markers had — and consolidated the marker-radius magic numbers into named `maplabModel.ts` constants (`MARKER_RADIUS_FRACTION`, `WALL_PROP_RADIUS_FRACTION`/`WALL_PROP_ICON_SCALE`). Portal/stair/prop confirmed visually distinct via icon glyph alone (no new hue/shape needed); 5-way placement-mode toolbar exclusion and canvas-glyph touch targets confirmed with no edge cases. |
| **I — Stair/Portal Fixes (I0–I3)** | Fixed the live destination-picker (a missing `flex-direction:column` collapsed its SVG to 2×2px); **redesigned stair destinations as up/down checkboxes** (`setStairDirection`; one record renders on both floors, so no reciprocal object — I2 multi-destination folded in); replaced `stairMarkerOffset` with a shared `gridMarkerOffset`/`markersAtCell` 2-column grid for any co-located marker type, with a 4-per-cell cap. All live-verified 2026-07-13. |
| **J — Map Lab Decluttering (J0–J3)** | Independently collapsible toolbar trays (`ToolbarTray` + `useToolbarTrayCollapse`, per-group `localStorage`); passage-state **icon+text chips** (`passageStateChips`) replacing the "State"/"Also" text rows in the inspector; passage colors repointed onto banked `--md-passage-locked`/`--md-passage-hidden` tokens, decollided from exit-card gold and from each other. |
| **K0 — Map Lab Editor QOL scaffolding** | Added compile-only shells for editor fullscreen/wheel-zoom and rectangular room-footprint work: `useMapCanvasZoom({ wheelZoomMode })`, `MapCanvas` fullscreen/pan-hint props, inert editor fullscreen/footprint state, `setRoomFootprint` reducer/hook plumbing, placeholder CSS selectors, and skipped K1/K2 tests. |
| **K1 — Fullscreen canvas + wheel zoom default** | Editor now uses in-app fullscreen canvas mode (`data-fullscreen` overlay, Escape exit, helper copy) and plain-wheel cursor-centered zoom by default while retaining drag-pan/scrollbar pan. `useMapCanvasZoom` keeps modifier-only behavior for viewer consumers, extends non-pan hit targets to current markers/placement overlays, and K1 tests cover wheel semantics, fullscreen toggle/Escape, and preserved pan behavior. |
| **K2 — Multi-cell room footprint selection** | Editor room painting now supports atomic rectangular footprints via drag or two-click corner selection, with local preview/cancel state, blocked overlap errors, commit-only autosave, and retained owned-cell single-cell cleanup. `setRoomFootprint` is the reducer validation seam for same-floor overlap/connectivity, and K2 tests cover reducer geometry plus page commit/cancel/no-save/error paths. |
| **K3 — Design pass** | Refined the combined QOL workflow with persistent footprint guidance, keyboard-operable paint cells, modal fullscreen semantics/focus, non-hue-only footprint/error states, and narrow-layout rails/controls. Full frontend test, typecheck, and production build gates pass; live verification remains a manual gate. |
| **L — Marker Badge System (L0–L4)** | Added a programmatic `markerBadges` model with radial rings for props, stairs, and portals, plus a fixed `--md-door` leaf with status badges that follow its current segment in a trailing overlay. The final design pass corrected status-disc icon contrast and door-glyph clearance; neutral state-colored marker rings remain intentional, distinct from the fixed architectural door treatment. |

---

## Map Lab coordinate model (durable reference — the deferred production fold-in needs this)

Map Lab proves a coordinate model using **real Isly Castle ids**. **Isolation (hard rule):** everything
lives in `frontend/src/features/dungeons/maplab/` + `map_layout` (the one persistence seam Phase D opened);
`seed_dungeons.json`, the rest of `backend/`, `dungeonModel.ts`, `dungeonForm.ts`, `DungeonEditor.tsx`, and
the live dungeon pages stay **untouched**.

**The coordinate model.** Integer **cell grid**, `x`=column(right), `y`=row(down) — matches SVG axes.
Per-floor plane; all planes share one origin so a room directly above sits at the same `[x,y]`. Floor
identity via a `z` integer. Rooms are **polyominoes** (origin + relative cells); doors are a **named wall
segment** of a cell; stairs/portals cross `z`.

```ts
MapRoom      = { room_id, z, origin:[x,y], cells:[[dx,dy]…], title?, description?, kind? }  // polyomino
PassageFlags = { hidden, locked, trapped, breakDc?, pickDc?, hiddenDc?, note? }  // independent booleans
MapDoor      = PassageFlags & { door_id, cell:[x,y], side:'N|S|E|W', z?, title? } // named wall segment
MapStair     = PassageFlags & { stair_id, from:{z,cell}, to:{z,cell}, title? }    // crosses z on shared x/y
MapPortal    = PassageFlags & { portal_id, cell, z, to:{z,cell}, title? }         // on-square, paired two-way
MapProp      = PassageFlags & { prop_id, kind, cell, side?, z?, title?, loot? }   // static furniture
MapItem      = { item_id, cell, title }               // typed, empty, UNRENDERED forward-compat slot
MapLayout    = { meta:{cellSizeFt, padding}, rooms, doors, stairs, portals, props, floors, items }
// runtime overlay:
PassageSessionState = { isOpen, isLocked, trapDisarmed }   // authored flags + this = effective state
```

**Reusable selectors (do not rebuild):** `absoluteCells`, `layoutBounds`, `paddedBounds`, `neighborCell`,
`oppositeSide`, `doorWallSegment`, `roomOfCell`, `roomWallSegments`, `nonDoorWallSegments`, `findDoorAtEdge`,
`sharedWallSegments`, `doorSwingGeometry`; `floorsInLayout`, `roomsOnZ`, `stairEndpointsForZ`,
`stairCellForZ`, `otherFloorZ`, `stairDirection`, `ghostFloorZ`, `doorsOnFloor`/`propsOnFloor`;
`markersAtCell`, `gridMarkerOffset` (with `GROUPED_MARKER_RADIUS_FRACTION`, `MAX_MARKERS_PER_CELL`);
`passagePresentation`, `PASSAGE_STATE_TOKENS`, `passageStateChips`, `secondaryPassageStates`,
`doorPresentation`, `stairPresentation`, `effectivePassageState`, `defaultPassageSession`, `normalizeLayout`;
`markerBadges`, `linearBadgeLayout`, `BadgeRing`, `DoorMarker`;
`Inspectable` + `inspectableDescriptor`.

**Verified anchors (real seed ids/titles/connectivity):**
- Room 17 "Combat Training Hall" ↔ Room 23 "Armoury" via **door 32 "Heavy Stone Door"**
  (`leads_to:[23,17]`, `door_mechanics:"DC23 to break; DC18 to pick lock"` → `locked, breakDc:23, pickDc:18`).
- Room 32 "Back Stairwell" (floor 1) ↔ Room 33 "First Floor Landing" (floor 2) via **stair 2 "Stone
  Stairs"** (`leads_to_rooms:[32,33]`, `leads_to_floors:[1,2]`).

### "Reduce the messy" — clean schema vs. production seed (input to the deferred production fold-in)

| Messy (production seed) | Clean (Map Lab) |
|---|---|
| `door_mechanics: "DC23 to break; DC18 to pick lock"` — one free-text field mixing two DCs | `breakDc`, `pickDc` as separate typed numbers |
| Door "hidden-ness" is prose-only — `content:"Hidden"` while `is_hidden:false` | `hidden: boolean` is the single source of truth |
| State scattered across fields, no lock/trap flags | Independent booleans (locked *and* trapped at once) with defined display precedence |
| `leads_to` loosely typed — repeats (`[9,9]`), bare scalars, id gaps, 16 orphan rooms | Connectivity from authored `cell`/`side`, not a lossy edge list |
| Layout implicit in a per-floor base64 `map_image` — no coordinates | Explicit `origin`/`cells`/`z` + `meta.cellSizeFt` — machine-usable geometry |
| No item placement — contents live inside prose | `MapProp`/`MapItem` reserve a spatial slot |

### Production-home decision (queued, no code — 🚦 user-acceptance gate)

Assess the matured schema against known real-data hazards: non-rectangular footprints, multi-door pairs
(rooms 7↔10), z-stacking, the 16 orphan rooms, prose-only "hidden" doors, scalar-vs-pair `leads_to`, id gaps.
Deliverable: a **permanent-home recommendation** — additive `layout` block on the dungeon `data` blob keyed
by id, vs. embedding coordinate/state fields on existing room/door objects — with a `dungeonModel.ts`
`RoomNode.position` / `getRoomGraph` migration sketch. A full `frontend-design` pass is a prerequisite
before any production fold-in.

---

## Design Phase M — Bounded Marker Status

Replace Map Lab's radial, per-flag badge rings with one status disc per fixture, while preserving every
underlying independent passage flag in the inspector and accessible label. On-square fixtures remain
individually visible in the existing 2x2 co-location grid; their status discs must be geometrically bounded
to their own cell so they neither bleed into an adjacent square nor clash with another fixture's disc. The
phase also removes the implied status hierarchy created by recoloring on-square markers: type identity owns
marker color, and a collapsed status icon communicates state. Doors retain their fixed architectural glyph
and their separate wall/leaf-relative status-disc treatment. **Depends on:** Phase L's shared badge model,
`markersAtCell`/`gridMarkerOffset` grouping, and current shared marker components. **Depended on by:** no
production fold-in work; this remains isolated to `frontend/src/features/dungeons/maplab/` and must not
modify `map_layout` data, seed data, backend code, or live dungeon pages.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **M0 — Scaffolding** | Haiku | Establish compile-only display contracts and skipped tests without changing rendered behavior. | New collapsed-status type/layout stubs; `it.skip` coverage; app unchanged. |
| **M1 — Collapsed Status Model** | Sonnet | Make one pure model decide zero, one, or multiple-status display while retaining full state detail. | `markerBadges.ts` model/tests; `MultipleStatusesIcon` alias of `Layers`. |
| **M2 — Bounded On-Square Markers** | Sonnet | Render one contained disc per prop/stair/portal and make marker color express identity, not status. | Shared renderer, three marker components, CSS, render/geometry tests. |
| **M3 — Door Status Collapse** | Sonnet | Apply the same collapsed-status rule to the distinct architectural door overlay. | `DoorBadgeLayer`, door tests, viewer/editor integration. |
| **M4 — Design Pass** | Sonnet | Validate visual hierarchy, collision safety, keyboard/a11y behavior, and responsive zoom states. | Focused corrections and regression coverage. |

**Sequencing:** M0 (Haiku, first) → M1 → M2 → M3 → M4. M2 and M3 both consume M1 but must land in this
order so the design pass can verify on-square and door behavior together. Do not merge stages, and do not
replace the existing `markersAtCell` 2x2 placement model or its four-marker cap.

#### M0 — Scaffolding (next up)

- **Build:** In `frontend/src/features/dungeons/maplab/markerBadges.ts`, introduce compile-only exports for
  the new collapsed on-canvas status descriptor and cell-bounded on-square placement contract. The descriptor
  must distinguish no active display, one active badge, and the `multiple-statuses` badge; it must preserve
  the full `MarkerBadge[]` list for labels/inspector consumers rather than changing `passageStateChips` or
  passage data. Add a non-rendering stub/prop seam in `BadgeRing.tsx` only if needed by M2, without changing
  current radial output. Add skipped, named tests beside `markerBadges.test.ts`, `PropMarker.test.tsx`,
  `StairPortalMarker.test.tsx`, and `DoorMarker.test.tsx` for M1–M3 expectations. No CSS or visible marker
  changes; do not delete `radialBadgeLayout` yet.
- **Inherits:** Phase L's `MarkerBadge`, `markerBadges`, `BadgeRing`, `linearBadgeLayout`, and test fixtures.
  `markersAtCell` and `gridMarkerOffset` remain the only co-location geometry source.
- **Tests:** New tests are explicitly `it.skip` and state the intended contracts: multiple flags collapse to
  `multiple-statuses`; one flag keeps its own icon; a bounded badge stays inside its cell; grouped fixtures'
  discs do not intersect; doors still use segment-relative placement. Existing frontend tests remain green.
- **🚦 Gate:** Run `npm run test`, `npm run typecheck`, and `npm run build`. Start the app only to confirm
  `/dungeons/map-lab` and `/dungeons/map-lab/edit` render unchanged with no console errors; per repository
  policy, the user performs the manual browser confirmation and no browser automation is used.

#### M1 — Collapsed Status Model (planned)

- **Build:** Implement the pure display selector in `markerBadges.ts`. It consumes the existing ordered badge
  list (trapped, locked, hidden, then loot/trap-disarmed where applicable) and returns: `null` for no badges;
  the sole existing badge for one; or one synthetic `multiple-statuses` descriptor for two or more. The
  synthetic descriptor uses a new `MultipleStatusesIcon` export from
  `frontend/src/components/icons/index.ts` that aliases Lucide `Layers` (do not reuse the semantically
  unrelated `PropWindowIcon` alias), an existing neutral semantic token with a valid `--md-on-*` foreground,
  and label `Multiple statuses`. Keep `markerBadges()` as the complete-detail source until all callers
  migrate. Do not assign priority to one status when several exist, and do not change inspector chips,
  session-state semantics, or persistence.
- **Inherits:** M0's types and test names; `passageStateChips` supplies stable full-state ordering and
  `effectivePassageState` resolves live lock/disarm state before badge derivation.
- **Tests:** Unskip/add unit tests for zero, each single status, loot-only, trap-disarmed-only, and every
  representative multi-state combination. Assert the display selector emits exactly one disc descriptor for
  two-or-more flags, uses Layers for that descriptor, while `markerBadges()` and accessible-label inputs still
  retain all individual labels in stable order. Assert token/foreground pairs resolve to real theme tokens.
- **🚦 Gate:** `npm run test`, `npm run typecheck`, and `npm run build` pass. Manual verification requested
  from the user: the current maps still render unchanged because M1 is model-only.

#### M2 — Bounded On-Square Markers (planned)

- **Build:** Replace radial rendering in `BadgeRing.tsx` with one shared status-disc renderer consuming M1's
  collapsed descriptor. Replace `radialBadgeLayout` with a pure bounded placement helper that receives the
  marker center/radius, cell bounds, and grouped offset/size as needed, and returns one disc center whose
  full radius is within `[cell.x, cell.x + cellSize] × [cell.y, cell.y + cellSize]`. The disc may overlap the
  fixture icon. For a co-located 2x2 group, placement must use each fixture's existing `gridMarkerOffset`
  sub-slot or an equivalent deterministic reservation so discs cannot intersect each other; it must work for
  same-type fixtures as well as mixed stairs, portals, and props. Migrate `PropMarker.tsx`, `StairMarker.tsx`,
  and `PortalMarker.tsx` to render that one disc. Remove status-derived stroke/icon tokens: props use their
  kind/identity token (retain encounter's tertiary treatment), stairs and portals use stable identity styling
  chosen from existing tokens, while selection/focus remains primary. Hidden remains dashed. Keep full labels
  based on all individual badges, not the collapsed disc label. Delete the old radial geometry only after no
  caller remains.
- **Inherits:** M1's collapsed selector, the existing neutral marker fill, `MARKER_RADIUS_FRACTION`,
  `GROUPED_MARKER_RADIUS_FRACTION`, `markersAtCell`, and `gridMarkerOffset`. `passagePresentation` may still
  provide hidden state/session semantics, but its status token must not drive on-square marker identity color.
  Wall-attached props are not part of the cell-interior layout: preserve their current wall marker behavior
  unless M4 identifies a concrete collision bug.
- **Tests:** Replace radial-layout assertions with bounded-placement tests for standalone and grouped markers
  at the four supported positions. Assert each badge disc remains within its owning cell, pairwise disc bounds
  do not overlap for 2, 3, and 4 co-located fixtures, and layout is deterministic by type/id ordering. Update
  prop/stair/portal render tests: one status renders its icon; multiple statuses render Layers once; no status
  renders no disc; status changes do not change the identity stroke/icon token; hidden remains dashed; ARIA
  labels still enumerate every active status. Test both viewer and editor composition paths where practical.
- **🚦 Gate:** `npm run test`, `npm run typecheck`, and `npm run build` pass. Manual user verification on both
  `/dungeons/map-lab` and `/dungeons/map-lab/edit`: create/inspect one each of locked, trapped, hidden, and
  multi-state prop/stair/portal; then co-locate 2, 3, and 4 mixed and same-type markers. At default, zoomed-in,
  and zoomed-out views, discs remain in their cells, do not clash, and marker type remains legible without
  relying on status color.

#### M3 — Door Status Collapse (planned)

- **Build:** Keep `DoorMarker.tsx`'s fixed `--md-door` leaf, swing, icon, hidden dash, open/closed geometry,
  and trailing `DoorBadgeLayer` intact. Migrate only badge derivation from the full list to M1's single
  collapsed descriptor, so a door has zero or one status disc. Continue placing that disc with
  `linearBadgeLayout` against the current leaf when open and owning wall segment when closed; preserve the
  inward/open-leaf normal logic and page-level overlay ordering. The disc must remain clear of the door's
  central icon and associated leaf/swing; do not make doors use on-square bounds or marker identity tokens.
- **Inherits:** M1's selector and M2's single-disc rendering conventions; existing `DOOR_BADGE_RADIUS`,
  `DOOR_BADGE_CLEARANCE`, `doorSwingGeometry`, and `CARDINAL_DELTAS` remain the geometry contract.
- **Tests:** Update `DoorMarker.test.tsx` for one badge maximum, specific icon for one active status, Layers
  for multiple statuses, full individual status labels in the interactive door label, and unchanged fixed
  `--md-door` glyph styling. Retain tests for closed/open badge positions, orientation on all four sides,
  badge-layer z-order, hidden dash, session lock changes, and no overlap with the central icon.
- **🚦 Gate:** `npm run test`, `npm run typecheck`, and `npm run build` pass. Manual user verification on both
  Map Lab routes: toggle door open/locked/trapped/hidden session states and confirm exactly one readable disc
  follows the correct leaf/segment without covering the door glyph or leaking across the exterior wall.

#### M4 — Design Pass (planned)

- **Build:** Perform a focused `frontend-design` review of M1–M3 without inventing new hues, shapes, or a
  second co-location system. Correct any discovered geometry, SVG stacking, contrast, hover/focus, keyboard,
  narrow-layout, or zoom defects. Confirm the Layers disc is recognizable as “multiple statuses” through its
  inspector/ARIA wording, not color alone. Keep scope to Map Lab badge/status presentation; no persistence,
  authoring workflow, inspector-chip, room layout, or production fold-in changes unless a direct regression
  from M1–M3 requires one.
- **Inherits:** Complete M0–M3 implementation, existing `Inspectable`/`InspectorPanel` full-state chips,
  grouped-marker cap, shared viewer/editor marker components, and current theme tokens.
- **Tests:** Add regressions for every defect fixed. Run the full frontend suite; run backend tests only if a
  backend file changes, which this phase should not require. Confirm no skipped M0 tests remain. Typecheck and
  production build are required.
- **🚦 Gate:** `npm run test`, `npm run typecheck`, and `npm run build` are clean. Manual user verification
  covers keyboard focus and activation, hover inspector state detail, session changes, all four co-location
  counts, default/fullscreen editor, narrow viewport, and multiple zoom levels on viewer and editor. Confirm
  no badge crosses a cell boundary, no badge overlaps another fixture's badge, no emoji/undefined tokens/
  console errors appear, and doors remain visually distinct.

---

## Known debt / deferred work (NOT yet built)

- **Editor round-trip fix.** `dungeonForm.ts`/`DungeonEditor.tsx` are still **lossy**: on save they force
  every entry to `entry_type:"feature"` and drop room `npcs[]`, `entry.monster_id`, `encounter_id`,
  `trap_ids`, `treasure_contents`, `hidden_dc`, `container*`, and floors/stairs. Rework `dungeonForm` to
  round-trip the full shape and make `dungeonModel.ts` the shared source for editor + viewer before per-room
  editing ships. Per-room Edit affordances then hang off the reserved action slots.
- **Map Lab production fold-in** — generalize the editor beyond the hard-wired Isly Castle id
  (`MAP_LAB_DUNGEON_ID = 4`); fold the `map_layout` store back into the live `dungeonModel.ts`/dungeon pages.
  Gated on the production-home decision above.
- **Loot system.** The catalog + bundles shipped (`docs/loot_plan.md`, L0–L5). Wiring a bundle onto the
  map's reserved slots (`MapProp.loot`, the F4 inert "Contents" row, DP1's banked `--md-loot` token) is
  now planned as **loot_plan.md Design Phase M — Loot on the Map** (frontend-only, round-trips in
  `map_layout`); see that doc, not this one, for the staged spec.
- **Cross-reference hover pop-outs** for monster/encounter chips (the NPC case is solved by the N6 dock).
- **Deferred Map Lab extensions:** viewport re-centering on stair/portal jump (`panTo`, not just `setActiveZ`);
  ghosting stairs/portals or ghosting *all* floors below / the floor above; cascading delete/orphan-cleanup
  for stairs/portals/props when their owning room is deleted (pre-existing gap); a session/runtime layer for
  props (disarm/reveal toggles like doors have).
- **`DESIGN_SYSTEM.md` addenda shipped in DP4:** the toolbar-tray pattern (from J1) and passage-color tokens
  (from J3) are now documented in `docs/DESIGN_SYSTEM.md`; this file's "Design system in force" section
  was trimmed to a short pointer with feature-specific detail retained here.
- **Numeric spacing scale** — current state is ad-hoc rem per component; documented as-is, not introduced.
- **Stair/portal destination picker is room-granularity, not exact-cell.** `DestinationPickerField`
  (`FixturePropertiesForm.tsx`) replaced the earlier click-a-cell mini floor-plan (too small to use
  reliably) with a floor select + room select; picking a room drops the marker on a random free
  square inside it. A future stage should let the DM drag the placed stair/portal/prop marker to an
  exact cell on the main canvas and persist that position, rather than re-rolling via the picker.

---

## Verification (how to confirm the shipped feature end-to-end)

Run `scripts/start_server.ps1`. **Dungeon nav:** drive `/dungeons/4` (Isly Castle) — land on entry room;
content renders as icon-badged tiles; follow door **and** stair cards across both floors; rail floor-grouping
and breadcrumbs update; refresh mid-dungeon confirms trail persistence. **Encounter runner:** from a room's
encounter FeatureTile, **Run encounter** opens the `FloatingWindow` dock; standalone `/encounters/:id/run`
works identically; refresh confirms debounced auto-save. **NPC dossier:** `/npcs` shows the redesigned card;
a room's NPC chip resolves to a real name and opens the same dossier in a dock, coexisting with an open
encounter dock. **Map Lab:** `/dungeons/map-lab` renders rooms/doors/stairs with leaf+swing + directional
icons, hover/focus opens the inspector (icon+text chips, session toggles); `/dungeons/map-lab/edit` paints
rooms and places doors/stairs/portals/props with collapsible toolbar trays. Confirm throughout: no emoji, no
undefined-token flatness, no console errors. `npm run test` and `pytest` green; `npm run typecheck` clean.
Production untouched: `git status` shows no change to `seed_dungeons.json`, `backend/` (beyond the `map_layout`
table + layout router), or the live dungeon model/pages.

---

## Next

**Active:** Design Phase M — Bounded Marker Status. **Next:** M0 scaffolding (Haiku); it is unblocked.

Also queued (not blocking M): the Map Lab production-home recommendation before any production fold-in;
and the loot-on-the-map wiring that fills the reserved `MapProp.loot` slot, staged in `docs/loot_plan.md`
(Design Phase M) — owned by the loot plan, not this one.
