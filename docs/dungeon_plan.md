# Dungeon Feature — State of Play & Design Foundation

This document is the single reference for the dungeon room-navigation feature and its follow-on design
phases. Original build (Stages 1–11), Design Phase A (Encounter Runner, E1–E6), Design Phase B (NPC
Dossier, N1–N6), Design Phase C (Map Lab, Foundation + M0–M4), and Design Phase D (Map Lab Authoring
Tools, Stage 0–3) are **all complete and shipped**. This
doc records what exists, the design system in force, and the facts a new executor needs, so the next
phase can build on it without re-deriving anything. New design phases get appended under **"Next:
front-end design planning"** at the bottom.

> **Status:** Original build + Phases A/B/C/D/E **all shipped.** The latest, **Design Phase E ("Map Lab:
> unified viewer/editor data, canvas zoom, and layout redesign")**, made the two Map Lab pages one coherent
> tool: the viewer and editor now read the same backend-persisted `map_layout` row, the canvas gained real
> zoom + pan (explicit-px SVG sizing, Ctrl/⌘-wheel, drag-pan), and a full front-end design pass regrouped the
> editor toolbar/nav-rail/inspector-rail. Shipped on branch `recover/phase-e` after a recovery detour; all
> gates live-verified through 2026-07-12 (see the collapsed "Design Phase E reference" below and the
> "Shipped stages" table for stage-by-stage detail). No backend change was needed for any
> dungeon/encounter/NPC/Map-Lab work except the encounter runner's one additive `active_index` column and
> Phase D's one additive `map_layout` table — the rest of the feature set is frontend against
> `getDungeon(id)`, `getEncounter`/`updateEncounter`, and `getNPC`/`listNPCs`.

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
| **E: Stage 0** | Mechanical scaffolding (Haiku, one context) for unified data + zoom: stub `useMapLabLayout`/`useMapCanvasZoom`/`MapCanvas`, zoom icons (`ZoomInIcon`/`ZoomOutIcon`/`FitIcon`), placeholder CSS classes, `it.skip` test stubs. Also the point where a **false-green typecheck gate** was discovered: root `frontend/tsconfig.json` has `"files": []`, so `tsc --noEmit` had been checking nothing — the real check is `tsc -b` (`npm run typecheck`/`npm run build`), which is how ~40 pre-existing + stub-related errors went undetected through earlier "COMPLETE" sign-offs. A commit-reset accident then lost most of the E1–E2 work-in-progress, recovered via `docs/phase-e-recovery-plan.md`'s Stage R0 (checkpoint + real typecheck gate + clearing the pre-existing Group B/C errors it exposed). |
| **E: Stage E1** | `useMapLabLayout.ts` unifies the viewer onto the same backend-persisted layout the editor already used (`getDungeonLayout`, 404→fixture fallback mirroring `useMapLabEditor.ts`); `MapLabPage.tsx` derives floors/rooms/doors/stairs/bounds from the loaded layout instead of the static `maplabData.ts` import. 🚦 gate live-verified 2026-07-12: a door/room added in the editor appears in the viewer after reload. |
| **E: Stage E2** | Real canvas zoom + pan on both pages: `Bounds` type exported from `maplabModel.ts`; `useMapCanvasZoom.ts` implements `zoomIn`/`zoomOut`/`reset`/`fitToBounds` (clamped `MIN_SCALE`–`MAX_SCALE`), Ctrl/⌘+wheel zoom-toward-cursor, and pointer-driven drag-pan that skips room/door/paint-cell hits; `MapCanvas.tsx` sizes the `<svg>` at explicit px `width`/`height` (`viewBoxUnits × BASE_PX_PER_UNIT × scale`) inside an `overflow:auto` viewport instead of shrinking to fit. Adopted in both pages. 🚦 gate live-verified 2026-07-12 (zoom buttons, Ctrl+wheel, drag-pan, both routes); fixed a real bug found live (drag-over-text triggered native text-selection alongside the pan). |
| **E: Stage E3** | Front-end design pass: one shared `.maplab-pill-button` base replaces five duplicated button-style blocks; editor toolbar regrouped into labelled Create/Session/Status clusters (`.maplab-toolbar-group` + the `.maplab-inspector-kind` caption style reused as `.maplab-toolbar-group-label`); floor tabs + room list unified into one `.maplab-editor-nav-rail` column; the door-only `.maplab-editor-inspector` replaced by an always-mounted `.maplab-inspector-rail` with door/room/empty-state branches (room selection now reuses the generic `InspectorPanel` + a Delete room action); room/door selection made mutually exclusive in the `maplabEditor.ts` reducer; viewer's stray "Reset session state" button moved into its own Session toolbar group. 🚦 gate live-verified 2026-07-12 on both routes; 390/390 tests, `tsc -b`/`npm run build` clean, `pytest` unaffected. |

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
undefined-token flatness, no console errors. `npm run test` and `pytest` green; `npm run typecheck` clean.
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

## Design Phase E reference — Map Lab: unified data, canvas zoom, and layout redesign (shipped)

Made the two Map Lab pages one coherent tool (delivered on branch `recover/phase-e` after a recovery detour;
all 🚦 gates live-verified 2026-07-12). Three requirements:

- **(1) Unified data.** The viewer (`/dungeons/map-lab`) now reads the same backend-persisted `map_layout` row
  as the editor via `useMapLabLayout(dungeonId)` (`getDungeonLayout`, 404 → `maplabData.ts` fixture fallback,
  mirroring `useMapLabEditor`), so a door/room added in the editor shows in the viewer after reload;
  `MapLabPage.tsx` derives `floors`/`rooms`/`doors`/`stairs`/`bounds` from the loaded layout instead of the
  static `mapLabLayout` import. Viewer session toggles (open/locked/disarm) stay ephemeral/local.
- **(2) Canvas zoom & pan.** `useMapCanvasZoom.ts` + `MapCanvas.tsx` give the SVG an explicit px
  `width`/`height` (`viewBoxUnits × BASE_PX_PER_UNIT × scale`) inside an `overflow:auto` viewport — the map
  **grows** on zoom instead of shrinking to fit (the old `.maplab-svg { width:100% }` shrink rule is gone).
  +/−/Reset(fit-to-bounds) buttons, Ctrl/⌘-wheel zoom-toward-cursor, and pointer drag-pan (skips
  room/door/stair/paint-cell hits, `touch-action:none`, `prefers-reduced-motion` honored); adopted on **both**
  pages. Shared `Bounds` type exported from `maplabModel.ts`.
- **(3) Front-end design pass.** One shared `.maplab-pill-button` base under all button variants; editor
  toolbar regrouped into labelled **Create / Session / Status** clusters (`.maplab-toolbar-group` +
  `.maplab-toolbar-group-label` reusing the `.maplab-inspector-kind` caption style); floor tabs + room list
  unified into one `.maplab-editor-nav-rail`; an always-mounted `.maplab-inspector-rail` with door / room /
  empty-state branches (room selection reuses the generic `InspectorPanel` + a Delete-room action);
  room/door selection made mutually exclusive in the `maplabEditor.ts` reducer; viewer's stray "Reset session
  state" button moved into its own Session group. Zoom buttons stay docked to `MapCanvas`'s `controlsSlot`.

Stage-by-stage detail (Stage 0 scaffolding + E1–E3) lives in the "Shipped stages" table above.

**False-green typecheck finding (repo-wide, kept):** root `frontend/tsconfig.json` has `"files": []`, so
`tsc --noEmit` checks nothing and reports clean even with real type errors — this masked ~40 errors through
earlier "COMPLETE" sign-offs. The real check is `tsc -b`, exposed as `npm run typecheck` (or `npm run build`);
`python -m pytest` is the reliable backend invocation in this shell. All "tsc --noEmit clean" notes elsewhere
in this doc predate the fix and should be read as unverified.

**Deferred (NOT in Phase E):**
- Real-time viewer refresh while the editor is open (Phase E syncs on load/navigation, not via a live push).
- The Phase-D deferred items above (generalize to any dungeon id; `window`/`chest` fixture types; fold
  `map_layout` into `dungeonModel.ts`).

---

## Next: Design Phase F — Room Props (static objects: chests, tables, mirrors…)

The Map Lab can author rooms, doors, and stairs, but rooms are empty shells — there's no way to place
the static furniture a DM narrates around (chests, tables, mirrors, statues, barrels). This phase adds a
**generic, flexible "prop" system**: place a static object **on a grid square** or **attached to a wall**,
give it `hidden` / `locked` / `perception` (and the rest of the proven passage flag bundle), and reserve a
**loot hook** so the future loot system can hang contents off a prop without a re-model.

**This is not a greenfield build — it lights up a seam that already exists.** The model reserves an
unrendered `MapProp` type (`{ prop_id, kind, cell, [side], [title], [loot] }`), a `layout.props` array,
an `Inspectable` `kind:'prop'` variant, and a `PropIcon`. Phase F extends that seam into a real feature by
**mirroring the door/stair patterns** (glyph render, click-to-select, generic properties form, autosaved
reducer).

**Decisions locked with the user:**
- **Name = `prop`** (not "item"). Rename the reserved `MapItem` slot to `MapProp` while it's unrendered,
  to avoid a permanent collision with the coming loot **items** system.
- **Flags = the full door bundle** — reuse `PassageFlags` wholesale (`hidden`, `locked`, `trapped`,
  `breakDc`, `pickDc`, `hiddenDc`, `note`). Maximum flexibility, zero new form code.

All work is **frontend-only** (no backend/seed change — props round-trip inside the opaque `map_layout`
blob). Consume `theme.css` tokens and existing `maplabModel` helpers; never hand-pick color.

**Stages:**
- **F0 — Scaffolding (shipped):** Rename + stubs + declarations; no algorithms/render/design. (Haiku 4.5, one context)
- **F1 — Model + reducer (shipped):** Implemented `addProp`/`selectProp`/`deleteProp` reducer branches
  (`nextPropId` was already implemented in F0) with full three-way mutual exclusion against room/door
  selection (also backfilled onto `addRoom`/`selectRoom`/`addDoor`/`selectDoor`, which previously only
  cleared each other, not props); `inspectableDescriptor`'s `'prop'` branch now returns real detail lines via
  `passageDescriptorLines`, a state-driven `token` via `passagePresentation`, and a per-kind icon from
  `PROP_KIND_ICONS` (promoted from placeholder strings to real `LucideIcon` components — chest/table/mirror/
  barrel/statue/other — wired through `fixtureTypes.ts`); `FixturePropertiesForm` gained `'select'` field
  rendering (a `<select>` over `field.options`), exercised by the prop `kind` field. Still unrendered —
  nothing draws on either Map Lab page yet (that's F2). (Sonnet, headless). Tests: reducer add/select/
  delete/updateFlags + mutual-exclusion (`maplabEditor.test.ts`), descriptor lines + kind-icon
  (`maplabModel.test.ts`), new `FixturePropertiesForm.test.tsx` for select rendering. 399 passed/4 skipped,
  `npm run typecheck`/`npm run build` clean, `pytest` unaffected (90.73% coverage) — confirmed no changes to
  `seed_dungeons.json`/`backend/`.
- **F2 — Render props (shipped):** New shared `PropMarker.tsx` component (on-square centers on the cell,
  stair-marker pattern; wall-attached anchors at `doorWallSegment`'s midpoint, door pattern, smaller radius) —
  used verbatim by both the viewer and editor so they draw props identically. Primary glyph is the per-kind
  icon (`PROP_KIND_ICONS`); the dominant `passagePresentation` state drives the token color, a dashed outline
  when hidden, and a small corner badge (`HiddenIcon`/`LockIcon`/`TrapIcon`) when hidden/locked/trapped —
  never hue-alone. Viewer (`MapLabPage.tsx`) filters `layout.props` to the active floor (same `roomOfCell`
  pattern as doors), renders them after stairs, and wires hover/focus into the existing `Inspectable`
  resolver (`kind: 'prop'`) so the generic `InspectorPanel` shows title/state/DC lines with no new UI.
  Editor (`MapLabEditorPage.tsx`) renders the same markers read-only (`interactive={false}` — no
  role/tabIndex/click; authoring lands in F3). Added `normalizeLayout()` (`maplabModel.ts`) so an
  older persisted `map_layout` row saved before `props` existed defaults to `[]` instead of crashing;
  wired into both `useMapLabLayout.ts` and `useMapLabEditor.ts`'s load paths. 🚦 **Gate live-verified
  2026-07-12:** the seeded "Treasure Chest" (Armoury) renders with the correct box glyph, gold "locked"
  token, and lock badge on both `/dungeons/map-lab` and `/dungeons/map-lab/edit`; hovering it in the viewer
  opens the inspector showing "Treasure Chest — PROP — State: Locked — Pick DC: 16"; no console errors.
  (En route, found and cleared a stale pre-Phase-F `map_layout` row in the dev DB — carried an orphan "Room
  101" from earlier E-phase manual testing and no `props` at all — via the editor's "Reset to fixture"
  button, which re-seeds from `maplabData.ts` including the chest.) Tests: `maplabEditor.test.ts` gained
  seeded-chest render assertions plus on-square-vs-on-wall and hidden-dashed-outline cases via a mocked
  backend layout (mirroring the existing Stage-E1 pattern) in both `MapLabPage.test.tsx` and
  `MapLabEditorPage.test.tsx`. 403 passed/3 skipped, `npm run typecheck`/`npm run build` clean, `pytest`
  unaffected (90.73% coverage) — confirmed no changes to `seed_dungeons.json`/`backend/`.
- **F3 — Editor authoring:** "Place prop" toolbar toggle, prop placement overlay, inspector-rail prop branch
  (kind select, Attach-to-wall select, Delete), autosave wiring. (Sonnet, 🚦 live gate)
- **F4 — Front-end design:** `/frontend-design` pass before UI. Finalize marker art, badges, loot-hook
  affordance (disabled placeholder row), accessibility floor. (Sonnet + frontend-design skill, 🚦 live gate)
