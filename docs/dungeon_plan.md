# Dungeon Feature — State of Play & Design Foundation

This document is the single reference for the dungeon room-navigation feature and its follow-on design
phases. Original build (Stages 1–11), Design Phase A (Encounter Runner, E1–E6), Design Phase B (NPC
Dossier, N1–N6), Design Phase C (Map Lab, Foundation + M0–M4), and Design Phase D (Map Lab Authoring
Tools, Stage 0–3) are **all complete and shipped**. This
doc records what exists, the design system in force, and the facts a new executor needs, so the next
phase can build on it without re-deriving anything. New design phases get appended under **"Next:
front-end design planning"** at the bottom.

> **Status:** Original build + Phases A/B/C/D **all shipped.** Design Phase D ("Map Lab Authoring
> Tools") turned the read-only Map Lab into an editor at `/dungeons/map-lab/edit`, backed by the
> additive `map_layout` table (the Phase-C FINAL-STAGE production-home decision, now implemented); all
> gates live-verified through 2026-07-12. **Design Phase E (Map Lab: unified viewer/editor data, canvas
> zoom, and layout redesign): Stage 0 mechanical scaffolding COMPLETE (2026-07-12, commit 1e674ac).** 
> Stages E1–E3 fill-ins queued (Sonnet, one at a time). No backend change was needed for any dungeon/encounter/NPC/Map-Lab 
> work except Stage E2's one additive `active_index` column and Phase D's one additive `map_layout` table 
> — the rest of the feature set is frontend against `getDungeon(id)`, `getEncounter`/`updateEncounter`, and
> `getNPC`/`listNPCs`.

---

## What the feature is

A **room-per-page experience** for running games live at the table: enter a dungeon, land on a room,
read its full detail, and move to connected rooms through **prominent door/stair choice-cards**, with a
**breadcrumb trail** and a **floor-grouped room-index rail** for orientation. From a room, a DM can
launch a **live encounter runner** (HP steppers, turn order) or open an **NPC dossier** in a floating
dock without leaving the page.

**Layout:** collapsible room-index/mini-map **rail** on the left, full **room page** on the right,
**breadcrumb bar** on top. Exits are the signature affordance — gold **choice cards** (`Great Oak Door →
Portal Room`); hidden doors are shown to the DM, marked with a DC. Encounter and NPC docks are movable
`FloatingWindow`s that layer on top, independent of each other.

---

## Key data facts (assume no other repo knowledge)

**Dungeon data is an opaque JSON blob.** Backend (`schemas.py` `Dungeon.data: Dict[str, Any]`) and
frontend (`types.ts` `Dungeon.data: Record<string, unknown>`) both treat it untyped. The typed read-model
lives entirely in the frontend (`dungeonModel.ts`).

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

**Connectivity = an undirected edge list.** A door's `leads_to` (and a stair's `leads_to_rooms`) is a
2-element `[roomA, roomB]` of `room_id`s. A room's exits = the edges whose pair contains the current
`room_id`; the *other* id is the destination. A stair is just a door that crosses floors
(`leads_to_floors:[x,y]`). Data is human-authored and messy — a pair can repeat a room (`[9,9]`), be a
scalar in older records, and ids skip numbers. Selectors tolerate all of this.

**Floors are authoritative for grouping.** `floors[i].room_ids` lists exactly which rooms sit on that
floor; degrade to one implicit "Rooms" group when `floors` is absent (the Greenhouse case).

**Room NPCs = `room.npcs: number[]`.** No `entry_type:"npc"` and no `entry.npc_id` in the real seed —
NPC wiring hangs off the room-level array, not a FeatureTile slot.

**Encounter creatures are a denormalized, id-less array**: `creatures[]` = `{ monster_id, original_name,
name, hp_current, hp_max, ac, status, conditions[] }`. Order is meaningful — it *is* turn order — and
round-trips through the array as-is. The runner assigns a synthetic `clientId` on load, strips it on
save. Monster `hp` is an **object** `{average, formula, minimum, maximum}`; quick-add derives
`hp_current = hp_max = hp.average`.

**NPC record fields are messy dicts** (`stats`/`saving_throws`/`skills`/`appearance`:
`Record<string, unknown>`; `senses`: array of `{type, range}`). **Real seed data uses full-word ability
keys** (`strength`, not `str`) — helpers must tolerate both. Any field can be absent (a talking-cat NPC
may have no AC/HP/speed).

---

## Design system in force

The signature is **neutral surfaces everywhere, one gold accent on the exit choice-cards, one teal
accent on HP meters, one rose accent on NPCs**, evoking a gamebook while staying inside the app's
Material Design 3 system. Consume the **real tokens in `frontend/src/theme.css`** — never the
`--md-sys-color-*` / `--md-sys-typescale-*` namespace (it does not exist in this project).

- **Content-role palette** (`theme.css`, dark theme): primary/violet = spells, secondary/gold = weapons
  + exit choice-cards, tertiary/teal = monsters + healthy HP, error/red = errors/traps/critical HP,
  **npc/rose** (hue 340.6, chroma 40) = NPCs — added in Stage N1 via `material-color-utilities`
  `Blend.harmonize()` toward the primary seed (documented inline in `theme.css` for regeneration). Each
  role exposes `--md-{role}`, `--md-on-{role}`, `--md-{role}-container`, `--md-on-{role}-container`, plus
  a `[data-variant='…']` mapping (`spell|monster|weapon|npc|neutral`) exposing `--variant-accent` /
  `--variant-on-accent` / `--variant-container` / `--variant-on-container` for any component to consume.
  **No new hues without going through this generator process.**
- **Type scale (one mapping, applied everywhere — no ad-hoc rem/px):** headline (1.5rem) = page/room/NPC
  name; title (1rem/500) = door/stair/ability-score/stepper labels; body (1rem) = prose; body-sm
  (0.875rem) = secondary detail, **floor for all prose**; label (0.875rem) = rail/breadcrumb/section
  headings; caption (0.6875rem) = eyebrows/chips/badges.
- **Icons:** local **Lucide** line-icon set (ISC license) in `frontend/src/components/icons/`, inline-SVG
  React components inheriting `currentColor`. No icon-font, no CDN, no emoji anywhere in the feature.
- **Accessibility floor:** visible focus rings everywhere; never hue-alone (icons + text always back
  color, e.g. `SkullIcon` at 0 HP, `user` icon on NPC chips); `prefers-reduced-motion` honored on every
  animation/transition; ≥48px touch targets on interactive controls (the encounter runner is
  touch-first, Surface Pro primary device).

---

## Component anatomy (the structural ideas — do not rebuild these shapes)

- **FeatureTile** (`DungeonViewPage.tsx`) — every room entry: type-icon badge → header (title + count +
  hidden-DC badge + reserved `.feature-tile-actions` slot) → body (`DiceText`) → meta rows, each shown
  only when present. The encounter entry's action slot hosts **"Run encounter"** (Stage E6).
- **Door/stair choice-card grid** — responsive 2-column grid of tall cards (icon → name → `→
  destination` → meta footer → reserved `.exit-card-actions` bar). Stairs render identically to doors.
- **CombatantCard** (`features/encounters/`) — HP meter (teal→gold→red by tier, `SkullIcon` at 0) +
  6-button stepper rail + drag handle with ▲/▼ accessible fallback + status chips.
- **NPCStatCard** (`features/npcs/`) — the character dossier: monogram + name + identity line + composed
  appearance sentence (hero), notes, conditional AC/HP/Speed strip, six-ability block with modifiers,
  saving-throws/skills/senses/languages sections each shown only when present. Takes a `compact` prop for
  dock use. Consumes `data-variant="npc"` for its accent.
- **FloatingWindow** (`components/`) — generic draggable/touch dock: grip header (pointer events,
  `touch-action:none`), minimize, close, `sessionStorage`-persisted position. Used verbatim by both the
  encounter dock and the NPC dock; multiple can be open at once (independent state, no shared DOM).
- **InspectorPanel + `Inspectable`** (`maplab/`) — a generic hover/focus details panel driven by
  `inspectableDescriptor(target)`, resolving room / door / stair / item to one `{title, typeLabel, icon,
  token, lines}` shape. Generalizes the old door-only popover; hosts Map Lab's session controls.
- **Reserved action slots** (`.feature-tile-actions`, `.exit-card-actions`) exist specifically so a
  future per-room editing phase can drop controls in without a re-layout.

---

## Shipped stages

| Stage(s) | What shipped |
|----------|--------------|
| **1–5** | Read-model + selectors (`dungeonModel.ts`); routes + shell (`/dungeons/:id[/rooms/:roomId]`); rich room detail (entries, treasure, cross-ref chips, hidden DC); exit choice-cards as real `<Link>`s; breadcrumbs + collapsible floor-grouped rail with `sessionStorage` trail persistence. |
| **6–11** | Migrated off the undefined `--md-sys-*` namespace onto real theme tokens (root cause of "flat text on nothing"); local Lucide icon set replacing emoji; floors/stairs parsed into the model and rail; **FeatureTile** anatomy; door/stair choice-card grid; final zero-`--md-sys-*` / zero-hardcoded-font-size audit + shared `.dungeon-back-button`. |
| **E1–E2** | Fixed `parseDungeonData` dropping numeric-string `encounter_id`/`monster_id` (real seed stores `"1"`); added nullable `active_index INTEGER` to the `encounter` table (`init_database.py`, threaded through schemas/router/types) to persist the turn pointer. |
| **E3–E4** | Headless `encounterRunner.ts` reducer (HP clamp, duplicate, add-from-monster, reorder/moveUp/moveDown, `nextTurn` with round++/wrap, active-reassignment on remove) + `useEncounterRunner` hook (optimistic updates, ~600ms debounced auto-save, `syncStatus`). |
| **E5–E6** | `CombatantCard`/`AddMonsterPanel`/`EncounterRunnerBoard` + standalone `/encounters/:id/run` route reached via a **Run** button; `FloatingWindow` component + dungeon dock launched from the encounter FeatureTile's action slot, bound to the room's `encounter_id`. Manually verified live. |
| **N1** | Fifth MD3 content role for NPCs (`--md-npc*` / `data-variant="npc"`) — rose/magenta, harmonized toward primary via a throwaway `material-color-utilities` script (not a runtime dependency). |
| **N2** | `npcModel.ts` headless helpers — ability-key-tolerant `getAbilityScores`, `formatModifier`, `composeAppearance`, `identityLine`, `hasCombatStats`. |
| **N3–N4** | `NPCStatCard` component (see anatomy above); rebuilt `NPCBrowserPage` detail pane on it, replacing `dictToLines`/`<dl>` markup — Edit/Delete moved to a sibling action row. |
| **N5–N6** | `useNpc(id)` hook + `NpcChip` (roster-backed name resolution, `NPC #{id}` fallback) wired into room NPC chips; `activeNpcId` state + NPC `FloatingWindow` dock in `DungeonViewPage`, sibling to the encounter dock. Manually verified live. |
| **C: Foundation** | Isolated Map Lab sandbox (`maplab/`, dev route `/dungeons/map-lab`) proving a programmatic coordinate model on real Isly Castle ids. Geometry core (`absoluteCells`, `layoutBounds`, `neighborCell`, `oppositeSide`, `doorWallSegment`, `roomOfCell`) on a rectangle + L-shape; single-floor SVG render with click/keyboard room-select; z-axis stairs (`floorsInLayout`, `roomsOnZ`, `stairEndpointsForZ`, floor tabs, cross-floor-aligned `viewBox`); padded 5 ft grid + "unknown space" backdrop + scale ruler; perimeter walls (`roomWallSegments`, `findDoorAtEdge`, `nonDoorWallSegments`); passage-state presentation (`PassageFlags`, `passagePresentation`, `secondaryPassageStates`) shared by doors + stairs. |
| **C: M0** | Mechanical scaffolding (Haiku, one context): type declarations + stubs (`effectivePassageState`, `inspectableDescriptor`, `sharedWallSegments`, `stairDirection`/`stairPresentation`), room `description?`/`kind?` fields, test-data descriptions + interlocking L test rooms, new icons, placeholder CSS, `it.skip` test stubs. |
| **C: M1** | Faithful L-shapes: removed the always-on per-cell interior stroke (was a checkerboard over each room's floor); moved hover/selected/focus emphasis onto the room's `nonDoorWallSegments` perimeter so a room reads as one unified shape. `sharedWallSegments(a,b,doors)` + a true zigzag-boundary interlocking-square proof (West/East Wing). |
| **C: M2** | Passage visuals (`frontend-design`): `doorSwingGeometry` renders the architectural leaf + swing-arc so a door is distinguishable from a wall **by shape**, not hue; unified the stair marker onto one `passagePresentation` token (neutral fill); directional stair iconography via `stairDirection`/`stairPresentation` (up from below, down from above). |
| **C: M3** | Generic inspector: `Inspectable` union + `inspectableDescriptor` resolving room/door/stair/item to one descriptor shape; `InspectorPanel` generalizes the door-only popover to rooms (hover/focus, additive to click-select); typed but **unrendered** `item` hook. |
| **C: M4** | Live session-state layer: `effectivePassageState(flags, session)` merges authored `PassageFlags` with `PassageSessionState` (open/closed, lock/unlock, disarm-trap, each independent); `doorPresentation`/`stairPresentation` swap open/closed + directional icons off effective flags; per-passage session controls in `InspectorPanel` + page-level "Reset session state". All 🚦 gates live-verified 2026-07-11. |
| **D: Stage 0** | Mechanical scaffolding (Haiku, one context) for the Map Lab **editor**: `InspectorPanel` extracted to its own file; `maplabEditor.ts` (`EditorState`/`EditorAction` union + reducer/init stubs); `maplabModel.ts` editor-helper stubs (`isCellAdjacentToRoom`, `isCellFree`, `canPaintCell`, `normalizeCells`, `nextRoomId`, `nextDoorId`); `fixtureTypes.ts` (`FieldSpec`/`FixtureTypeSpec`/`PASSAGE_FIELDS`/`FIXTURE_TYPES`); `useMapLabEditor`/`MapLabEditorPage` placeholders; new `/dungeons/map-lab/edit` route; `map_layout` table (`dungeon_id` PK, `data` TEXT) + `MapLayoutBlob` schema + stub `GET`/`PUT /dungeons/{id}/layout` router; `it.skip` test stubs. |
| **D: Stage 1** | Backend persistence (`GET`/`PUT /dungeons/{id}/layout`, upsert via `INSERT ... ON CONFLICT`) + editor shell: `mapLabEditorReducer`'s `addRoom`/`selectRoom`/`deleteRoom`(orphan-door cleanup)/`setActiveZ`/`loadLayout`/`resetToFixture`; `useMapLabEditor` (load-on-mount with 404→fixture fallback, ~600ms debounced autosave, `syncStatus`); `MapLabEditorPage` toolbar/floor-tabs/room-list/read-only canvas. All 🚦 gates live-verified 2026-07-12 (caught and fixed a stale dev backend process missing the new PUT route along the way). |
| **D: Stage 2** | Cell-painting: `isCellAdjacentToRoom`/`isCellFree`/`canPaintCell`/`normalizeCells` implemented; `toggleCell` reducer action (add via adjacency, remove guarded by an `isConnectedPolyomino` flood-fill so a removal can't split a room); paint overlay with four `data-paint-state`s (paintable/invalid/ownedSelected/ownedOther) rendered only for the selected room, shape-coded markers (not hue-alone) on hover. Also fixed the editor's missing "unknown space" grid backdrop (found first, matched the read-only viewer). 🚦 gate live-verified 2026-07-12. |
| **D: Stage 3** | Door placement + generic fixture properties menu: `nextDoorId` implemented; reducer gained `addDoor`/`selectDoor`/`updateFixtureFlags`/`deleteDoor` + `selectedDoorId` on `EditorState`; "Place door" mode makes deduped `nonDoorWallSegments` wall edges clickable; new `FixturePropertiesForm.tsx` renders `FIXTURE_TYPES.door`'s `PASSAGE_FIELDS` generically (boolean/number/text, `showWhen`-gated), dispatching through the debounced-autosave path; doors now render the same leaf+swing+icon glyph as the read-only viewer and are click-to-select into a new `.maplab-editor-inspector` panel (InspectorPanel + form + Delete/Close). **Implements the Phase-C FINAL-STAGE production-home decision** (`map_layout` table is now the live store, not just a recommendation). 🚦 gate live-verified 2026-07-12 (386 frontend tests, `pytest` unaffected, `tsc --noEmit` clean). |

---

## Reusable pieces (do not rebuild)

- `frontend/src/api/client.ts`: `getDungeon`/`listDungeons`, `getEncounter`/`updateEncounter`/
  `listEncounters`/`createEncounter`/`deleteEncounter`, `getNPC`/`listNPCs`, `listMonsters`.
- `frontend/src/components/`: `Card`, `SplitPane`, `SearchList`, `DiceText`, `ConfirmDialog`,
  `FloatingWindow`, `components/icons/` (Lucide set incl. `UserIcon`, `SkullIcon`, `GripIcon`,
  `NextTurnIcon`, stepper/reorder icons, plus Map Lab's `TrapIcon`/`LockIcon`/`UnlockIcon`/`HiddenIcon`/
  `DoorClosedIcon`/`DoorOpenIcon`/`TrapDisarmedIcon`/`StairsUpIcon`/`StairsDownIcon`/`RoomIcon`/`ItemIcon`).
- `frontend/src/features/dungeons/dungeonModel.ts`: the typed read-model + all selectors (floors,
  stairs, graph). **Extend this rather than adding a parallel model.**
- `frontend/src/features/encounters/`: `encounterRunner.ts` (pure reducer), `useEncounterRunner.ts`,
  `CombatantCard`, `AddMonsterPanel`, `EncounterRunnerBoard`.
- `frontend/src/features/npcs/`: `npcModel.ts` (formatting helpers), `useNpc.ts`, `NPCStatCard`,
  `NpcChip`.
- `frontend/src/features/dungeons/maplab/`: `maplabModel.ts` (geometry core, passage/stair/door
  presentation, `Inspectable`/`inspectableDescriptor`, session-state layer — the full selector surface
  below), `maplabData.ts` (hand-authored real-id layout), `MapLabPage.tsx` + `.css`, `InspectorPanel`.
- `frontend/src/theme.css`: the real design tokens (`--md-*`, `--type-*`, `--variant-*`). Consume these.
- **Dev servers:** `scripts/start_server.ps1` (backend :8000 + Vite :5173), `scripts/stop_server.ps1`.
- **Tests:** `npm run test` (frontend); `pytest` from repo root (backend, unaffected by any of this
  feature work except the one E2 migration).

---

## Known debt / deferred work (NOT yet built)

- **Editor round-trip fix.** `dungeonForm.ts`/`DungeonEditor.tsx` are still **lossy**: on save they force
  every entry to `entry_type:"feature"` and drop room `npcs[]`, `entry.monster_id`, `encounter_id`,
  `trap_ids`, `treasure_contents`, `hidden_dc`, `container*`, and floors/stairs. Rework `dungeonForm` to
  round-trip the full shape and make `dungeonModel.ts` the shared source for editor + viewer before
  per-room editing ships. Per-room Edit affordances then hang off the **reserved action slots**.
- **Cross-reference hover pop-outs** for monster/encounter chips (the NPC case is solved by the N6 dock).
- **Map Lab editor generalization + production fold-in** — see Design Phase D's own "Deferred" list
  below: room/door authoring tools themselves are shipped, but the editor is still hard-wired to Isly
  Castle ids, `window`/`chest` fixture types aren't built, and the `map_layout` store hasn't been folded
  back into the live `dungeonModel.ts`/dungeon pages.

---

## Verification (how to confirm the shipped feature end-to-end)

Run `scripts/start_server.ps1`. **Dungeon nav:** drive `/dungeons/4` (Isly Castle) — land on entry room;
content renders as icon-badged tiles; follow door **and** stair cards across both floors; rail
floor-grouping and breadcrumbs update; refresh mid-dungeon confirms trail persistence. **Encounter
runner:** from a room's encounter FeatureTile, **Run encounter** opens the `FloatingWindow` dock;
standalone `/encounters/:id/run` works identically; refresh confirms debounced auto-save. **NPC
dossier:** `/npcs` shows the redesigned card; a room's NPC chip resolves to a real name and opens the
same dossier in a dock, coexisting with an open encounter dock. **Map Lab:** `/dungeons/map-lab` renders
the hall + L-armoury + shared-wall door, the two-floor stair (coords aligned across z), and the
interlocking-L pair; doors show leaf+swing, stairs show directional icons, hover/focus opens the
inspector, session controls toggle open/lock/disarm + reset. Confirm throughout: no emoji, no
undefined-token flatness, no console errors. `npm run test` and `pytest` green; `tsc --noEmit` clean.
Production untouched: `git status` shows no change to `seed_dungeons.json`, `backend/`, or the live
dungeon model/pages.

---

## Design Phase C reference — Map Lab (the coordinate model, for the FINAL STAGE)

Map Lab is an **isolated sandbox** proving a coordinate model using **real Isly Castle ids** before we
decide whether/how to fold it into production. **Isolation (hard rule):** everything lives in
`frontend/src/features/dungeons/maplab/` + one dev route (`/dungeons/map-lab`); `seed_dungeons.json`, the
DB, all of `backend/`, `dungeonModel.ts`, `dungeonForm.ts`, `DungeonEditor.tsx`, and the live dungeon
pages are **untouched**. Stays in-stack (React + TS + SVG) so a proven model folds straight into
production; SVG elements are real DOM, so selection/focus/`theme.css` tokens/future drag-editing are
ordinary pointer events.

**The coordinate model.** Integer **cell grid**, `x`=column(right), `y`=row(down) — matches SVG axes.
Per-floor plane; all planes share one origin so a room directly above sits at the same `[x,y]`. Floor
identity via a `z` integer. Rooms are **polyominoes** (origin + relative cells) so rectangles and
L/T-shapes are cell-aligned; doors are a **named wall segment** of a cell; stairs cross `z` on two
endpoint cells sharing x/y.

**Final schema (`maplabModel.ts`):**
```ts
MapRoom      = { room_id, z, origin:[x,y], cells:[[dx,dy]…], title?, description?, kind? }  // polyomino
PassageFlags = { hidden, locked, trapped, breakDc?, pickDc?, hiddenDc?, note? }  // independent booleans
MapDoor      = PassageFlags & { door_id, cell:[x,y], side:'N|S|E|W', title? }    // named wall segment
MapStair     = PassageFlags & { stair_id, from:{z,cell}, to:{z,cell}, title? }   // crosses z on shared x/y
MapItem      = { item_id, cell:[x,y], title }         // typed, empty, UNRENDERED forward-compat slot
MapLayout    = { meta:{ cellSizeFt, padding }, rooms, doors, stairs, floors, items }
// runtime overlay:
PassageSessionState = { isOpen, isLocked, trapDisarmed }   // authored flags + this = effective state
```

**Flexible where it counts:** polyomino rooms express any orthogonal footprint; one shared
`PassageFlags`/`passagePresentation` serves doors *and* stairs; `Inspectable`/`inspectableDescriptor`
gives every element one descriptor shape; the session layer overrides each authored flag independently;
`items[]` reserves per-square contents without touching geometry. Geometry stays pure.

**Reusable selectors (do not rebuild):** `absoluteCells`, `layoutBounds`, `paddedBounds`, `neighborCell`,
`oppositeSide`, `doorWallSegment`, `roomOfCell`, `roomWallSegments`, `nonDoorWallSegments`, `findDoorAtEdge`,
`sharedWallSegments`, `doorSwingGeometry`; `floorsInLayout`, `roomsOnZ`, `stairEndpointsForZ`,
`stairDirection`; `passagePresentation`, `secondaryPassageStates`, `doorPresentation`, `stairPresentation`,
`effectivePassageState`, `defaultPassageSession`; `Inspectable` + `inspectableDescriptor`.

**Verified anchors (real seed ids/titles/connectivity):**
- Room 17 "Combat Training Hall" ↔ Room 23 "Armoury" via **door 32 "Heavy Stone Door"**
  (`leads_to:[23,17]`, `door_mechanics:"DC23 to break; DC18 to pick lock"` → `locked, breakDc:23,
  pickDc:18`).
- Room 32 "Back Stairwell" (floor 1) ↔ Room 33 "First Floor Landing" (floor 2) via **stair 2 "Stone
  Stairs"** (`leads_to_rooms:[32,33]`, `leads_to_floors:[1,2]`).

### Map Lab FINAL STAGE — Production-home decision (queued, no code)

Consumes the matured schema (session-state layer, generic inspector, interlocking geometry) + the
"reduce the messy" contrast table below. Assess the model against known real-data hazards:
non-rectangular footprints, **multi-door pairs like rooms 7↔10**, z-stacking, the **16
orphan/disconnected rooms**, prose-only "hidden" doors (`content:"Hidden"` while `is_hidden:false`),
scalar-vs-pair/`[9,9]` `leads_to`, and id gaps. Deliverable (appended here): the proven coordinate +
state schema; a **permanent-home recommendation** — additive `layout` block on the dungeon `data` blob
keyed by id, vs. embedding coordinate/state fields on the existing room/door objects — with a
`dungeonModel.ts` `RoomNode.position` / `getRoomGraph` migration sketch. **🚦 User-acceptance gate;** a
full `frontend-design` pass is a prerequisite before any production fold-in.

### "Reduce the messy" — clean schema vs. production seed (input to the FINAL STAGE)

| Messy (production seed) | Clean (Map Lab) |
|---|---|
| `door_mechanics: "DC23 to break; DC18 to pick lock"` — one free-text field mixing two DCs | `breakDc`, `pickDc` as separate typed numbers; DCs are data, not prose |
| Door "hidden-ness" is prose-only — `content:"Hidden"` while `is_hidden:false` (the two disagree) | `hidden: boolean` is the single source of truth; no parallel prose channel to drift |
| State scattered across fields (`is_hidden`, `door_mechanics` text, no lock/trap flags) | Independent booleans (locked *and* trapped at once) with defined display precedence, not an enum |
| `leads_to`/`leads_to_rooms` loosely typed — repeats (`[9,9]`), bare scalars, id gaps, 16 orphan rooms | Explicit objects keyed by real ids; connectivity from authored `cell`/`side`, not a lossy edge list |
| Layout implicit in a per-floor base64 `map_image` — no coordinates anywhere | Explicit `origin`/`cells`/`z` + `meta.cellSizeFt` — machine-usable geometry, not a picture |
| No item placement — contents live inside a room's `entries[]` prose | `MapItem { item_id, cell, title }` reserves a spatial slot; later item work is additive |

---

## Next: front-end design planning

*(Append new design phases/stages here. They inherit the design system, component anatomy, reusable
pieces, and reserved action slots documented above — build on them rather than re-deriving.)*

---

## Design Phase D reference — Map Lab Authoring Tools (shipped)

Turned the read-only Map Lab into an **editor** at a separate route `/dungeons/map-lab/edit` (the viewer at
`/dungeons/map-lab` stayed untouched): create rooms by **painting grid squares** (walls auto-derive from
`nonDoorWallSegments` — never stored), **place doors** on wall segments, and edit any fixture through a
**generic, schema-driven properties form** (`FieldSpec`/`FixtureTypeSpec` registry; ships the `door` entry
over `PASSAGE_FIELDS`, with the seam left open for `window`/`chest`). Mutable state = a pure
`mapLabEditorReducer` + `useMapLabEditor` hook (load-on-mount with 404→fixture fallback, ~600ms debounced
autosave, `syncStatus`), mirroring the shipped `encounterRunner` pattern. **Implements the Phase-C
FINAL-STAGE production-home decision:** authored layouts persist to an additive **`map_layout` table**
(`dungeon_id` PK, `data` TEXT) via `GET`/`PUT /dungeons/{id}/layout` — the one place Phase D crossed Phase
C's isolation line (the frozen seed, DB, and other routers stayed untouched). Stage-by-stage detail lives in
the "Shipped stages" table above (`D: Stage 0–3`).

**Deferred (NOT in Phase D):**
- Generalizing the editor route to **any** dungeon id (hard-wired to Isly Castle ids, `MAP_LAB_DUNGEON_ID = 4`).
- Actual `window`/`chest` fixture types (the registry seam is built; concrete types are later work).
- Folding the `map_layout` store back into the live `dungeonModel.ts` / dungeon pages.

---

## Design Phase E — Map Lab: unified data, canvas zoom, and layout redesign

**Goal:** make the two Map Lab pages one coherent tool. Today the **editor** (`/dungeons/map-lab/edit`) reads
and autosaves the backend `map_layout` row, but the **viewer** (`/dungeons/map-lab`) imports the static
`maplabData.ts` fixture directly and never touches the backend — so a door added in the editor never shows in
the viewer. The grid also **shrinks as the map grows** (a `viewBox` sized to `paddedBounds` is fit into a
`width:100%` SVG, so more cells = smaller cells; no zoom/pan exists), and the editor's controls are an
**ungrouped flat stack**. Phase E: (1) both pages read the same persisted layout; (2) add zoom + pan; (3) a
full front-end design pass grouping toolbars/rails/nav. **Scope: both pages.** **Zoom UX: +/−/Reset buttons +
Ctrl/⌘-wheel + drag-to-pan** (touch-friendly for the Surface Pro).

### Key facts (established during planning)

- **Data gap.** `MapLabPage.tsx` derives `floors`/`rooms`/`doors`/`stairs`/`bounds` from the module constant
  `mapLabLayout` (`maplabData.ts`). `useMapLabEditor.ts` already loads via `getDungeonLayout(4)` (404 →
  fixture) and PUTs via `saveDungeonLayout`. The `map_layout` table, the `GET`/`PUT /dungeons/{id}/layout`
  router (`backend/app/routers/layouts.py`), and the `{ data: <layout> }` wire shape already exist and are
  shared — **only the viewer's data source is wrong.** Viewer session toggles (open/locked/disarm) are
  ephemeral `useState` and stay local.
- **Zoom problem.** Both SVGs (`CELL_SIZE = 64` user units) set `viewBox` = `paddedBounds(...) × CELL_SIZE`
  with **no width/height**; `.maplab-svg { width:100%; height:auto }` (`MapLabPage.css:27–33`) fits the whole
  viewBox into the fixed flex-column width. Fix = give the SVG an explicit px size (`viewBoxUnits × zoom`)
  inside an `overflow:auto` viewport; keep the `.maplab-scale-ruler` consistent with the chosen scale.
- **Clutter.** `MapLabEditorPage.tsx` is one vertical flex: title → a flat `.maplab-editor-toolbar` mixing
  *create* (Add room), *mode* (Place door), *destructive* (Reset to fixture) and a *status* readout →
  floor-tabs → a 3-region flex row (`.maplab-editor-room-list` 14rem │ `.maplab-svg` │
  `.maplab-editor-inspector` 16rem, which collapses entirely unless a door is selected — selecting a **room**
  opens no inspector). The viewer's floor-tab row also carries a stray "Reset session state" button.

> **Model split (cost).** **Stage 0 is pure mechanical scaffolding — do it in ONE Haiku-4.5 context** (new
> file stubs, type/const declarations, `throw new Error('not implemented')` bodies, placeholder CSS classes,
> new icons, `it.skip` test stubs; no algorithms, geometry, render, or design logic). **Stages E1–E3 are the
> reasoning/design fill-ins — use Sonnet, one at a time, in order.** Every stage adds tests (vitest) per
> `docs/TESTING.md`. All work is frontend-only; consume `theme.css` tokens + existing model helpers (never
> hand-pick colors or rebuild geometry). Stages E1–E3 each end with a **🚦 gate: drive both `/dungeons/map-lab`
> and `/dungeons/map-lab/edit` live and get explicit user acceptance before the next stage.** Stage 0 has no
> visual surface (tests + `tsc --noEmit` sign it off).

#### Stage 0 — Scaffolding (Haiku 4.5, one context, mechanical only)

- `maplab/useMapLabLayout.ts` — **stub** read hook `useMapLabLayout(dungeonId)` returning
  `{ layout, loading, error }`; body `throw new Error('not implemented')` (or a typed placeholder return). No
  fetch logic yet.
- `maplab/useMapCanvasZoom.ts` — **stub** zoom/pan hook: `ZoomState` type (`scale: number`,
  `pan: { x: number; y: number }`), constants `MIN_SCALE`/`MAX_SCALE`/`BASE_PX_PER_UNIT`, and stubbed
  `zoomIn`/`zoomOut`/`reset`/`fitToBounds` + wheel/pointer handler signatures (`throw`). No math.
- `maplab/MapCanvas.tsx` — **placeholder** wrapper component: props `{ viewBox, bounds, children,
  controlsSlot? }`; renders a `.maplab-canvas-viewport` div wrapping the `<svg>` and a `.maplab-zoom-controls`
  slot. Minimal markup only (no zoom wiring).
- CSS placeholder classes (in `MapLabEditor.css`; shared ones in `MapLabPage.css`):
  `.maplab-canvas-viewport`, `.maplab-zoom-controls`, `.maplab-zoom-button`, `.maplab-toolbar-group`,
  `.maplab-toolbar-group-label`, `.maplab-editor-nav-rail`, `.maplab-inspector-rail`,
  `.maplab-inspector-rail-empty`. Empty or minimal rules — Stages E2/E3 fill them.
- `components/icons/index.ts` — add `ZoomInIcon`, `ZoomOutIcon`, `FitIcon` (from **valid** `lucide-react`
  exports — verify names, e.g. `ZoomIn`, `ZoomOut`, `Maximize`/`Maximize2`; Stage-0 icon re-export typos bit
  earlier phases twice).
- Test stubs (`it.skip`): `__tests__/useMapCanvasZoom.test.ts`, `__tests__/MapLabPage.test.tsx` (viewer
  data-source case), plus new `it.skip` stubs appended to `__tests__/MapLabEditorPage.test.tsx` for the
  regrouped toolbar / persistent inspector.

**Verify:** `tsc --noEmit` clean; `npm run test` green (skips); viewer + all existing suites unaffected.

**✅ COMPLETE (2026-07-12, commit 1e674ac):** Haiku scaffold. All 9 files created:
`useMapLabLayout.ts`, `useMapCanvasZoom.ts`, `MapCanvas.tsx`, zoom icons, CSS placeholders,
test stubs (useMapCanvasZoom.test.ts, MapLabPage E1 stubs, MapLabEditorPage E2/E3 stubs).
tsc clean, 386 tests pass | 19 skipped (no regressions). Ready for Stage E1.

#### Stage E1 — Unified data: viewer reads the shared backend layout (Sonnet) — *requirement 1*

- Implement `useMapLabLayout.ts`: `getDungeonLayout(dungeonId)` on mount → `blob.data as MapLayout`, 404 →
  seed from `mapLabLayout`, other errors → `error`; `{ layout, loading, error }`. Mirror the exact
  load/fallback from `useMapLabEditor.ts` (single source of the 404-fallback rule; optionally refactor
  `useMapLabEditor`'s initial fetch to reuse it — keep only if it stays clean; autosave unchanged).
- Rewire `MapLabPage.tsx` to consume `useMapLabLayout(MAP_LAB_DUNGEON_ID)` instead of importing
  `mapLabLayout` directly; derive `floors`/`rooms`/`doors`/`stairs`/`bounds` from the loaded layout; keep
  session toggles local. Keep reading `layout.floors` for tabs but tolerate it not matching the room `z` set
  (the editor never edits `floors`). Handle `loading`.
- **Tests:** viewer render test with a mocked `getDungeonLayout` returning a layout with an extra door → door
  renders; 404 mock → fixture rooms render. (Replace the Stage-0 `it.skip` stubs.)
- **🚦 Gate:** editor → add a door + a room (autosaves "Saved") → open the viewer → the new door/room show.

#### Stage E2 — Canvas zoom & pan, both pages (Sonnet)

- Implement `useMapCanvasZoom.ts` + `MapCanvas.tsx`: SVG gets explicit px `width`/`height =
  viewBoxUnits × (BASE_PX_PER_UNIT × scale)` inside the `overflow:auto` `.maplab-canvas-viewport`. Controls:
  **+ / − / Reset(fit-to-bounds)** buttons (≥48px, reuse pill styling), **Ctrl/⌘+wheel** zoom toward cursor,
  **click-drag** pan (pointer events, `touch-action:none`; don't begin a pan on room/door/paint-cell hits).
  Clamp to `MIN_SCALE`/`MAX_SCALE`; honor `prefers-reduced-motion`.
- **Remove** the `.maplab-svg { width:100%; height:auto }` shrink rule; move sizing onto the explicit
  width/height. Adopt `MapCanvas` in **both** `MapLabPage.tsx` and `MapLabEditorPage.tsx` (paint/placement
  overlays and hit-testing must still line up under zoom/pan). Keep the viewer's scale ruler consistent.
- **Tests:** unit test for zoom clamp + fit-to-bounds math; render test asserting the SVG gets explicit px
  width/height that changes with zoom (not `width:100%`). (Replace the Stage-0 `it.skip` stub.)
- **🚦 Gate:** on a large floor, zoom in → cells grow, the viewport scrolls (map does **not** shrink); Reset
  fits the floor; drag pans; Ctrl+wheel zooms; both pages; Surface-Pro touch.

#### Stage E3 — Full front-end design pass: grouping, rails, navigation (Sonnet + `frontend-design` skill)

Invoke the **`frontend-design` skill** before writing UI. Reorganize via `theme.css` tokens + the MD3 type
scale (no ad-hoc px/hex).

- **Editor top toolbar** → labelled clusters instead of one flat row: *Create* (Add room, Place door),
  *Canvas* (zoom +/−/Reset), *Session* (Reset to fixture), right-aligned *save-status*. Group with
  `.maplab-toolbar-group` containers/dividers, not one undifferentiated flex.
- **Left navigation rail** (`.maplab-editor-nav-rail`): floor tabs + the room list as one orientation column.
- **Center:** the `MapCanvas` (E2).
- **Right inspector rail** (`.maplab-inspector-rail`): make it **persistent** with a resting placeholder
  (like the viewer's always-present panel), and let selecting a **room** populate it (title/meta + delete),
  not only doors — so the rail stops popping in/out and room actions get a home.
- **Viewer:** apply the same grouping language — move the stray "Reset session state" button out of the
  floor-tab row into a grouped controls cluster; dock zoom controls consistently. Consolidate pill styling
  (`.maplab-editor-toolbar-button` / `.maplab-floor-tab` / `.maplab-session-*-button` / `.maplab-zoom-button`)
  onto one system.
- **Tests:** update render tests for the regrouped structure (toolbar groups present; room selection opens
  the inspector rail; controls reachable). (Replace the Stage-0 `it.skip` stubs.)
- **🚦 Gate:** live design review at both routes — grouped, uncluttered, tokens-only, no console errors;
  `npm run test` + `tsc --noEmit` green; `pytest` unaffected (frontend-only).

#### Deferred (NOT in Phase E)

- Real-time viewer refresh while the editor is open (Phase E syncs on load/navigation, not via a live push).
- The Phase-D deferred items above (generalize to any dungeon id; `window`/`chest` types; fold `map_layout`
  into `dungeonModel.ts`).
