# Dungeon Feature — State of Play & Design Foundation

This document is the single reference for the dungeon room-navigation feature and its follow-on design
phases. Original build (Stages 1–11), Design Phase A (Encounter Runner, E1–E6), Design Phase B (NPC
Dossier, N1–N6), Design Phase C (Map Lab, Foundation + M0–M4), Design Phase D (Map Lab Authoring Tools,
Stage 0–3), Design Phase E (Map Lab unified data/zoom/redesign, E1–E3), Design Phase F (Room Props,
F0–F4), Design Phase G (Ghost Objects, G-fix + G0–G2), and **Design Phase H Stages H0–H2 (Stair/Portal scaffolding + Stair authoring + Portal doors)** are **all complete and shipped**. This
doc records what exists, the design system in force, and the facts a new executor needs, so the next
phase can build on it without re-deriving anything. New design phases get appended under **"Next:
front-end design planning"** at the bottom.

> **Status:** Original build + Phases A/B/C/D/E/F/G **all shipped**, plus **Phase H Stages H0–H2 — complete**. **Latest:** Stage H2 (Sonnet) implemented portal doors: reducer `addPortal`/`selectPortal`/`deletePortal` (5-way mutual exclusion with room/door/prop/stair) plus paired-linking on `updateFixtureFlags('portal', …, {to})` — re-targeting an empty cell auto-creates a return portal there, re-targeting a cell that already has a portal re-links it instead of duplicating. New `PortalMarker.tsx` (on-square, same visual language as stair/prop markers), a "Place portal" toolbar toggle, portal canvas placement/selection in the editor, and a portal inspector-rail branch reusing `FIXTURE_TYPES.portal` + the shared `DestinationPickerField`. 490/493 tests pass (3 skipped = H3–H4 stubs), `npm run typecheck`/`npm run build` clean, `pytest`/seed data untouched. Before H2: Stage H1 (Sonnet) implemented stair authoring: reducer `addStair`/`selectStair`/`deleteStair` (5-way mutual exclusion with room/door/prop/portal), a "Place stair" toolbar toggle, the editor's first on-canvas stair rendering (click-to-select, not floor-jump), a new `DestinationPickerField` (floor `<select>` + clickable mini floor-plan) shared by the stair inspector form, and a `stairMarkerOffset` helper so co-located up/down stair "landings" render as distinct, independently selectable markers in **both** the editor and the pre-existing viewer. Before H1: Stage H0 (Haiku 4.5, one context) delivered the mechanical type setup for Phase H Stair Authoring + Portal Doors: `MapPortal` interface + `portals: MapPortal[]` on `MapLayout`, `Inspectable`'s `'portal'` variant, `EditorState`/`EditorAction` additions (`selectedStairId`/`selectedPortalId`, stubs for 6 new actions), `nextStairId`/`nextPortalId` id generators, `normalizeLayout` extended to default portals. Portal icon: `Sparkles` (verified non-colliding per F4's `Landmark` check). Windows feature **fully implemented** (no stubs): added `'window'` to `PROP_KIND_OPTIONS`/`PROP_KIND_ICONS`, immediately placeable/editable via existing "Place prop" mode. 🚦 H0 gate verified: `npm run typecheck`/`npm run build` clean, 412/412 tests pass, windows prop kind ready for placement. Before H0: **Design Phase G** (G-fix + G0–G2) shipped Ghost Objects — an editor toggle overlaying the floor below, dimmed and read-only, for cross-floor alignment. G1 found and fixed a real pre-existing bug (doors/props misattributed when floors share `[x,y]`); G2 fixed ghost props incorrectly carrying per-state hue. The feature phases preceding Phase G: **Design Phase F ("Room Props")**, E, D, C, original build, all shipped.

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
- **Map Lab passage-state colors** (Stage J3): `PASSAGE_STATE_TOKENS`/`passagePresentation` use
  `--md-error` (trapped), **`--md-passage-locked`** and **`--md-passage-hidden`** (`theme.css`, generated
  via `docs/design_plan.md` DP1's banked-token process), and `--md-on-surface-variant` (unlocked — no
  chip). As of this stage, `--md-secondary`/gold is **exclusively** the exit-choice-card color — it no
  longer doubles as the locked-passage color, so gold and passage state never collide.
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
| **G: G-fix** | Live regression fix (shipped ahead of the feature): editor's `MapCanvas` was missing `variant="neutral"`, so `--variant-container` resolved undefined and SVG defaulted to opaque black. Fix: pass `variant="neutral"` to editor's `MapCanvas` (matches viewer); add CSS fallback `fill: var(--variant-container, var(--md-surface-variant))` so future missing-variant never black-fills. Test: `MapLabEditorPage.test.tsx` asserts canvas wrapper renders `data-variant="neutral"`. 🚦 Gate live-verified 2026-07-13: editor rooms render with neutral container fill, not black; 409/409 tests, `npm run typecheck` clean, `pytest` unaffected (90.73% coverage). |
| **G: Stage 0** | Mechanical scaffolding (Haiku, one context) for the Ghost Objects feature: `maplabModel.ts` `ghostFloorZ` stub (returns null this stage, intended for G1); new `GhostFloorLayer.tsx` stub (renders null, full rendering deferred to G1); `showGhostFloor` state in `MapLabEditorPage.tsx` + "Ghost lower floor" toggle pill in new View toolbar group (disabled when no lower floor, non-functional this stage); placeholder `.maplab-ghost-layer` CSS; `it.skip` test stubs for G0 toolbar + G1 rendering. 🚦 Gate verified 2026-07-13: 409/409 tests (6 skipped), `npm run typecheck` clean, `pytest` unaffected (90.73% coverage). |
| **G: Stage G1** | Implemented `ghostFloorZ` (nearest `z` strictly below `activeZ` with rooms, `null` at the lowest); extracted `doorsOnFloor`/`propsOnFloor` selectors so the ghost layer and the active floor share one floor-membership filter instead of duplicating it. `GhostFloorLayer.tsx` renders the lower floor's rooms (cells + `nonDoorWallSegments` + title), doors (leaf/swing glyph), and props (`PropMarker interactive={false}`) as read-only glyphs inside one `<g className="maplab-ghost-layer" aria-hidden="true">` — no `role`/`tabIndex`/`onClick` anywhere in the tree. Inserted immediately after the unknown-space backdrop and before the active-floor rooms in `MapLabEditorPage.tsx`, so ghosts sit behind the live floor (SVG paints later siblings on top) while the active layer stays topmost and clickable. Styling is tokens-only: `.maplab-ghost-layer { opacity: 0.35; pointer-events: none; }`, dashed neutral-outline room cells/walls (`--md-outline`), no hand-picked color, `prefers-reduced-motion` respected. Toggle defaults off, recomputes `ghostFloorZ` on every floor switch, stays disabled at the lowest floor. **Real bug found and fixed en route** (not part of the G1 spec, but blocked correct verification): `doorsOnActiveFloor`/`propsOnActiveFloor` (editor) and the equivalent inline filter (viewer) inferred floor membership *purely from spatial cell overlap* — since two floors can legitimately share an `[x,y]` (a stairwell's aligned coordinates, e.g. real fixture rooms 32 z:0 / 33 z:1 both at `[11,0]`), a door/prop authored on one floor would leak onto the other floor's live render whenever their cells coincided (confirmed live: door 98 "Rusty Trap Door", authored on room 32's own wall, was rendering as an interactive door on floor 1 too). Fixed by giving `MapDoor`/`MapProp` an optional `z` field, stamped from `state.activeZ` on creation (`addDoor`/`addProp` in `maplabEditor.ts`); `doorsOnFloor`/`propsOnFloor` now filter by authored `z` when present, falling back to the old spatial inference only for legacy data that predates the field (exact for a single floor, the only case it was ever correct for). `normalizeLayout` backfills `z` on load for any door/prop saved before this fix, so ambiguous legacy data resolves once and stays resolved. Real fixture (`maplabData.ts`) and both pages' door/prop filtering migrated to the new selectors. **Tests:** `ghostFloorZ` (nearest-lower / null-at-lowest / skips-non-adjacent-lower), `doorsOnFloor`/`propsOnFloor` floor-stacked-coordinate regression cases (including the real door-98 fixture), G0's previously-skipped toolbar tests implemented (group/disabled/aria-pressed), G1 rendering tests (`aria-hidden` ghost `<g>` with no interactive descendants, ghost-precedes-active document order, toggle visibility). 423/423 tests, `npm run typecheck`/`npm run build` clean, `pytest` unaffected (90.73% coverage) — confirmed no changes to `seed_dungeons.json`/`backend/`. 🚦 **Gate live-verified 2026-07-13** on Isly Castle's two floors: editing the upper floor and enabling the toggle ghosts the ground floor's rooms/doors/props, dimmed and behind; the active floor's rooms, paint overlay, and door/prop placement still select and click through with no interference; the toggle is disabled on the lowest floor; no console errors. |
| **G: Stage G2** | Front-end design pass (`/frontend-design`, headless — no new UI, one CSS fix). Live-drove the editor (Isly Castle, Floor 1 → "Ghost lower floor") and found the one real gap: the seeded chest prop on Floor 0 ghosted at 0.35 opacity but kept its full `locked` gold token, so it read as "a real gold-locked chest, just faint" rather than "another floor" — the room cells/walls and door leaf/swing around it were already neutral `var(--md-outline)` + dashed, so the prop was the only ghost element still carrying live color. Fixed in `MapLabPage.css`: `.maplab-ghost-layer .maplab-prop-marker`/`.maplab-prop-icon`/`.maplab-prop-state-badge` forced to `var(--md-outline)` (`!important`, overriding `PropMarker`'s inline per-state `style` color) plus an always-on dashed ring, matching the room/door treatment — no component or reducer change. Verified structurally: touch-target/z-order integrity unaffected (`pointer-events:none` on the whole ghost `<g>` predates this stage); focus never lands on ghost elements (`aria-hidden`, no `role`/`tabIndex` anywhere in `GhostFloorLayer`, unchanged); no motion added, so `prefers-reduced-motion` is moot; no emoji; tokens-only (`var(--md-outline)`, no hand-picked color). Tests: new `MapLabEditorPage.test.tsx` case (Stage G2) renders a prop on the ghosted floor and asserts it lands inside `.maplab-ghost-layer` with no `role`/`tabindex`. 424 passed, `npm run typecheck`/`npm run build` clean, `pytest` unaffected (90.73% coverage) — confirmed no changes to `seed_dungeons.json`/`backend/`. 🚦 **Gate live-verified 2026-07-13**: on Isly Castle, Floor 1 with "Ghost lower floor" on, the ghosted Armoury's chest now renders as a neutral dashed ring + icon indistinguishable in treatment from the ghost room walls/door around it (screenshots taken before/after); the live First Floor Landing room still selects/opens the inspector/paint-overlay normally with the ghost layer beneath it; toggle still disables at Floor 0 (regression, unchanged from G0/G1). |
| **H: Stage H0** | Mechanical scaffolding (Haiku 4.5, one context) for Stair Authoring + Portal Doors: `MapPortal` interface (extends `PassageFlags`, adds `portal_id`/`cell`/`z`/`to:{z,cell}`/title) + `portals: MapPortal[]` on `MapLayout`; `Inspectable`'s `'portal'` variant with optional `session` state; `EditorState` gains `selectedStairId`/`selectedPortalId` fields; `EditorAction` gains 6 new stub action types (`addStair`/`selectStair`/`deleteStair`/`addPortal`/`selectPortal`/`deletePortal`); `nextStairId`/`nextPortalId` id generators (follow `nextDoorId`/`nextPropId` pattern); `updateFixtureFlags` type signature extended to include `'stair'`/`'portal'` (reducer body stubs all 6 new actions); `normalizeLayout` extended to default `portals: layout.portals ?? []`; all 5 selection types made mutually exclusive in existing case bodies (`addRoom`/`selectRoom`/`addDoor`/`selectDoor`/`addProp`/`selectProp`/`initialEditorState`); icons: `Sparkles` for portals (verified non-colliding per F4 check); `FieldSpec` type extended with `'destinationPicker'` field type; `STAIR_FIELDS`/`PORTAL_FIELDS` defined (both `PASSAGE_FIELDS` + one `destinationPicker` for `to`), registered in `FIXTURE_TYPES.stair`/`.portal`; placeholder CSS (`.maplab-stair-placement-overlay`, `.maplab-portal-marker`, `.maplab-destination-picker`); test stubs with `it.skip` for H1–H4 behaviors. **Windows feature fully implemented** (no stubs): added `'window'` to `PROP_KIND_OPTIONS`/`PROP_KIND_ICONS` with `Window` icon, immediately placeable/editable via existing "Place prop" mode + properties form — no window-specific code elsewhere. 🚦 Gate verified: `npm run typecheck`/`npm run build` clean, 412/412 tests pass, `pytest` unaffected (90.73% coverage), windows prop kind ready for placement, `git status` shows only maplab/* + icons + dungeon_plan.md (no schema/backend change). |
| **H: Stage H1** | Stair authoring (Sonnet). Reducer: `addStair` (one-shot cell-click placement, `from:{z:activeZ,cell}`, placeholder `to = from`, auto-selects, 5-way mutual exclusion matching `addDoor`/`addProp`), `selectStair`/`deleteStair` wired through the same exclusion pattern; `updateFixtureFlags`'s pre-existing `'stair'` branch (already implemented in H0) now exercised for real, including nested `to:{z,cell}` writes via shallow-merge. Toolbar "Place stair" pill in the Create group (3-way exclusive with door/prop placement, each handler now clears the other two). **Editor renders stairs on-canvas for the first time**: new `stairsOnActiveFloor` selector (`stairEndpointsForZ`), marker `<g>` reusing the viewer's `stairPresentation` circle+icon glyph but wired to `selectStair` (not floor-jump, which stays viewer-only) with `data-selected`/`aria-pressed`. New `DestinationPickerField` component in `FixturePropertiesForm.tsx` (modeled on `EncounterPickerField`'s seam): floor `<select>` (`floorsInLayout`) + a read-only mini SVG floor-plan of the chosen floor's rooms (`roomsOnZ`/`absoluteCells`) where clicking a cell fires `onChange(field.key, {z, cell})`; `FixturePropertiesForm`/`FixtureField` gained an optional `layout` prop threaded through for it. Stair inspector-rail branch (`InspectorPanel` + `FixturePropertiesForm(FIXTURE_TYPES.stair)` passing `layout={state.layout}` + Delete/Close), inspector empty-state copy updated to mention stairs. **Landings:** stair placement overlay has no occupancy guard (matches `addProp`); new `stairMarkerOffset(stairs, stair, z)` helper in `maplabModel.ts` groups stairs by `(z, cell)` and fans co-located markers out horizontally so up/down landings render as distinct, independently hoverable/clickable icons — adopted by **both** the editor's new stair rendering and the pre-existing viewer rendering in `MapLabPage.tsx` (which also had its private `stairCellForZ`/`otherFloorZ` helpers promoted to exported `maplabModel.ts` functions so editor and viewer share one implementation instead of duplicating it). Tests: reducer `addStair`/nested `to`-write via `updateFixtureFlags`/`deleteStair`, stair selection clearing room/door/prop and vice versa; `maplabModel` unit tests for `stairCellForZ`/`otherFloorZ`/`stairMarkerOffset` (lone stair no offset, two co-located stairs fan out symmetrically, unrelated stairs unaffected); `DestinationPickerField` render/floor-switch/cell-click/no-layout-renders-nothing; editor placement+selection, 3-way placement-mode exclusion, and a co-located-landing test asserting two distinct non-overlapping markers that select independently. 481/486 tests pass (5 skipped = H2–H4 stubs, correctly deferred), `npm run typecheck`/`npm run build` clean, `pytest` unaffected — `git status` confirms no change to `seed_dungeons.json`/`backend/`. 🚦 Gate verified via the automated test suite (frontend-only stage per H's scoping; no live browser pass required by CLAUDE.md's browser-automation policy since no stage-specific visual/interaction confirmation was called for beyond what the reducer/render/DOM tests already assert): stair placement, destination-picker persistence, delete, and the two-co-located-stairs landing case all pass; existing door/prop placement unaffected. |

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

## Design Phase F reference — Room Props (shipped)

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
- **F3 — Editor authoring (shipped):** "Place prop" toolbar toggle in the Create group, mutually exclusive
  with "Place door" (activating one cancels the other); a placement overlay clickable over every room cell
  on the active floor (`.maplab-prop-placement-cell`, reusing the paint-cell visual language) dispatches
  `addProp(cell)` on click, which auto-selects the new prop and exits placement mode. Props render as real
  `PropMarker`s now (`interactive`, `role="button"`, click-to-select, `data-selected` outline) on both the
  editor and viewer. New inspector-rail prop branch mirrors the door branch: `InspectorPanel` + a
  `FixturePropertiesForm` over `FIXTURE_TYPES.prop` (title/kind-select/**Attach to wall** select
  `Off|N|S|E|W`/hidden/locked/trapped/DCs/note) + Delete-prop/Close actions. `PROP_FIELDS` gained the
  `side` select field; the page adapts `prop.side ?? 'Off'` for display and writes `undefined` back on
  `'Off'` so an absent `side` (on-square) round-trips correctly. All wiring (`addProp`/`selectProp`/
  `deleteProp`/`updateFixtureFlags('prop',…)`) already existed from F1/F2 — F3 was purely the editor-page
  UI layer. 🚦 **Verified via test suite** (browser session not driven this pass — see verification notes
  below): place an on-square prop → form appears → autosave; door/prop placement modes are mutually
  exclusive; edit kind/flag/attach-to-wall → autosaved `props[0]` matches → delete clears the inspector.
  406 passed, `npm run typecheck`/`npm run build` clean, `pytest` unaffected (90.73% coverage) — confirmed
  no changes to `seed_dungeons.json`/`backend/`.
- **F4 — Front-end design (shipped):** `/frontend-design` pass, headless (no browser driven this pass —
  see verification notes below). Found and fixed a real pre-existing bug the pass was meant to catch:
  `MapLabPage.tsx` (the viewer) had its own **drifted local copy** of `InspectorPanel` — a byte-identical
  fork of `InspectorPanel.tsx` predating the Stage-D0 extraction — so the loot-hook row below had to be
  added twice or (correctly) the viewer switched to import the shared component, deleting the ~55-line
  duplicate. Also fixed a **z-order hit-testing bug** in the editor: `propsOnActiveFloor` rendered before
  the paint/placement overlays, so the room-paint overlay (mounted over every cell of a selected room,
  including ones a prop sits on) silently swallowed clicks on props within that room — moved the prop
  render block to after all three overlays so props stay the topmost, clickable layer in every mode.
  Swapped the statue kind's icon from `Gem` (already used elsewhere for treasure/loot — a real collision
  with the *other* reserved slot this phase explicitly avoided colliding with) to `Landmark` (a columned-
  monument glyph, verified present in the installed `lucide-react`). Kind/wall-side `<select>` options
  upgraded from raw lowercase values (`'chest'`, `'N'`) to a `SelectOption{value,label}` pair (`FieldSpec.options`
  type widened accordingly) so the picker reads "Chest"/"North wall" instead of the storage string — the
  underlying values are untouched, so no reducer/save-path change. Added the **loot-hook affordance**:
  `InspectorPanel` renders a disabled `.maplab-loot-hook-row` ("Contents — added with the loot system")
  for `kind:'prop'` targets only, styled inert (lower opacity, hairline divider, no hover/focus state,
  `aria-disabled`) — the form still never writes `loot`. Marker art itself (ring + kind icon + single
  state badge, dashed-hidden outline) was already consistent with the door/stair language from F2 — no
  change needed there. Confirmed the on-square/on-wall marker radius (`CELL_SIZE * 0.32` / `* 0.22`)
  already matches the stair marker's own radius exactly, so canvas-glyph touch-target sizing follows the
  established Map Lab convention rather than the toolbar's 48px floor (glyphs on a zoomable SVG canvas
  vs. touch-first toolbar controls are treated differently throughout this feature, not just for props).
  Tests: new `MapLabPage.test.tsx` case asserting the loot row appears for a prop and not for a door; new
  `MapLabEditorPage.test.tsx` case asserting a prop on a selected (paint-overlay-active) room cell is still
  clickable — this one only documents the intended DOM order fix (jsdom's `fireEvent.click` targets the
  queried node directly regardless of CSS `pointer-events`/stacking, so it can't itself catch a stacking
  regression; the live gate below is what actually proves it). 408 passed, `npm run typecheck`/`npm run
  build` clean, `pytest` unaffected (90.73% coverage) — confirmed no changes to `seed_dungeons.json`/`backend/`.
  🚦 **Live gate — not yet driven this pass; see "What to check" below.**

**Deferred (NOT in Phase F):**
- The loot system itself (Phase F only reserves the `loot` slot + the F4 disabled affordance row).
- A session/runtime layer for props (disarm-trap / reveal-hidden toggles like doors have) — authored flags
  only for now.
- Generalizing beyond the Isly Castle fixture (inherits Phase D/E's "any dungeon id" deferral).

**What to check (live, in a browser — this is what F4 asked for and wasn't driven this pass):**
- **Editor** (`/dungeons/map-lab/edit`): select the Armoury (room 23, has the seeded chest) — confirm the
  paint overlay appears over its cells *and* the chest marker is still clickable (opens the inspector +
  form), not swallowed by the overlay. Click "Place prop" → click a room square → a marker appears,
  selected; the inspector's **Kind** dropdown now reads "Chest"/"Table"/"Mirror"/"Barrel"/"Statue"/"Other"
  (not lowercase codes) and **Attach to wall** reads "On the floor"/"North wall"/etc; pick "Statue" and
  confirm the marker's icon is a columned-monument glyph, not a gem. Scroll the inspector — a disabled,
  visually inert row reads "Contents — added with the loot system" below the state lines, with no
  hover/click affordance.
- **Viewer** (`/dungeons/map-lab`): hover the seeded "Treasure Chest" — the same disabled "Contents" row
  appears in its inspector panel; hover a door or stair instead and confirm that row does **not** appear
  (props-only).
- **Both:** no console errors; no emoji; marker art (ring + icon + state badge) still reads as one system
  with doors/stairs, tokens-only.
- **Regression:** `npm run test` (408 passing) + `npm run typecheck` + `npm run build` green;
  `python -m pytest` unaffected (90.73%). `git status` shows no change to `seed_dungeons.json`, `backend/`,
  or the live dungeon model/pages — Phase F stayed confined to `maplab/` + the shared icon layer.

---

## Design Phase G — Ghost Objects (shipped: G-fix + G0 + G1 + G2 — Phase G complete)

**Goal.** A toggle in the Map Lab **editor** that displays the objects of the floor **below** the active
one as **ghosted, non-interactive overlays**, so a DM designing a multi-level dungeon can align connected
features (stairs, shafts, matching rooms) across floors. Ghosts are visually distinct and never
interactive while editing the current floor.

**Why the ground is favorable (no re-derivation needed).** Floors are `z` integers sharing one origin, so
a cell on the floor below sits at the same `[x,y]` — exactly the property that makes ghosting useful for
alignment. `paddedBounds(layout)` already spans **all** floors, so the viewBox needs no change and ghost
cells already fall inside it. `PropMarker` already accepts `interactive={false}`. The editor already
computes `roomsOnActiveFloor`/`doorsOnActiveFloor`/`propsOnActiveFloor` by z-filtering
(`MapLabEditorPage.tsx`) — the same machinery pointed at the lower floor is the whole feature. **Frontend-
only**, confined to `maplab/`; no backend/seed change.

**Direction convention.** "Lower floor" = the nearest `z` **strictly below** `activeZ` that has rooms
(smaller z = physically lower; higher z = higher up, per Isly Castle: floor 1 = Ground, floor 2 = First).
Trivially invertible if the z convention is ever read the other way. Default ghosts the **single nearest
lower floor** (cleanest for alignment, avoids visual soup); ghosting *all* floors below is a deferred
extension of the same layer.

### Stage G-fix — black-fill bug (shipped 2026-07-13)

A live regression, fixed ahead of the feature. **Root cause:** room cells are styled
`.maplab-room-cell { fill: var(--variant-container) }` (`MapLabPage.css`), a custom property that only
exists when an ancestor carries `data-variant`, which `MapCanvas` sets from its `variant` prop
(`MapCanvas.tsx`). The **viewer** passes `variant="neutral"` (`MapLabPage.tsx`); the **editor** rendered
`<MapCanvas>` with **no `variant` prop** (`MapLabEditorPage.tsx`), so `--variant-container` was undefined,
`fill` resolved invalid, and SVG fell back to its default **opaque black** — every editor room painted
solid black.

**Implementation (Haiku 4.5, one context):**
- Fixed: pass `variant="neutral"` to the editor's `<MapCanvas>` in `MapLabEditorPage.tsx` (matches the viewer).
- Defense in depth: widen the CSS to `fill: var(--variant-container, var(--md-surface-variant))` so a
  future missing-variant never black-fills again.
- Test: added `MapLabEditorPage.test.tsx` case asserting the canvas wrapper renders `data-variant="neutral"`.

**🚦 Gate verified 2026-07-13:** editor rooms render with the neutral container fill, not black; 409/409 tests pass; `npm run typecheck` clean; `pytest` unaffected (90.73% coverage).

### Stage G0 — Scaffolding (shipped 2026-07-13, Haiku 4.5, one context)

**Implementation:**
- `maplabModel.ts`: `ghostFloorZ(layout, activeZ): number | null` stub — intended to return the nearest
  `z` strictly below `activeZ` that has rooms (sits next to `roomsOnZ`/`floorsInLayout`). Returns `null` this stage.
- New presentational `GhostFloorLayer.tsx` stub (props: the ghost floor's rooms/doors/props +
  `cellSize`); renders `null` this stage, full rendering deferred to G1.
- `showGhostFloor` local state in `MapLabEditorPage.tsx` + a **"Ghost lower floor"** toggle pill in a new **View** toolbar group
  (`aria-pressed`, disabled when no lower floor exists, non-functional this stage).
- Placeholder `.maplab-ghost-layer` CSS with TODO comment for G1 implementation.
- Test stubs with `it.skip` for G0 (View toolbar group appearance/toggle) and G1 (ghost rendering/z-order/selector logic) in `MapLabEditorPage.test.tsx`.

**🚦 Gate verified 2026-07-13:** 409/409 tests pass (6 new skipped); `npm run typecheck` clean; `pytest` unaffected (90.73% coverage).

### Stage G1 — Implementation (shipped 2026-07-13, Sonnet)

Shipped as specified — see the "Shipped stages" table above for full detail, including the real
floor-attribution bug (doors/props leaking across floors that share `[x,y]`) found and fixed along the
way. 🚦 Gate live-verified 2026-07-13; 423/423 tests, `npm run typecheck`/`npm run build` clean, `pytest`
unaffected (90.73% coverage).

### Stage G2 — Front-end design pass (shipped 2026-07-13, Sonnet)

Shipped as specified — see the "Shipped stages" table above for full detail. Live-driving the editor found
that ghost props (not rooms/doors) were the one element still carrying live per-state hue at 0.35 opacity,
so a ghosted locked chest read as "a real gold chest, just faint" rather than "another floor." Fixed with a
scoped CSS override forcing ghost props to the same neutral/dashed treatment as ghost rooms and doors — no
component or reducer change. 🚦 Gate live-verified 2026-07-13; 424/424 tests, `npm run typecheck`/`npm run
build` clean, `pytest` unaffected (90.73% coverage).

**Deferred (NOT in Phase G):**
- Ghosting **all** floors below (map the same layer over every `z < activeZ`) — the layer is built for one
  floor; multi-floor stacking is a later extension.
- Ghosting the floor **above** the active one.
- Any ghost interactivity (click-through selection, "copy from floor below") — authored read-only overlay only.

---

## Design Phase H — Stair Authoring + Portal Doors (H0–H2 shipped; H3–H4 queued)

**Goal.** Stairs are a fully-built **read/view-only** feature (`MapStair`, `stairEndpointsForZ`,
`stairPresentation`, `Inspectable`'s `'stair'` case, and the viewer's click-to-jump floor navigation all
exist in `MapLabPage.tsx`) but have **zero editor-side support** — no `selectedStairId`, no
`addStair`/`selectStair`/`deleteStair`, no toolbar button, no canvas placement/rendering, no inspector
branch. `EditorState`/`EditorAction`'s `updateFixtureFlags` type signature already includes `'stair'` in its
`fixtureType` union but the reducer body silently no-ops for it — a pre-existing dead branch this phase
retires. This phase also adds a new **portal door**: a freestanding door (on-square, never wall-attached,
like a prop) that links to a non-adjacent destination, **paired/two-way** (setting a portal's destination
auto-creates or re-links a matching return portal at the target — mirrors how a stair's `from`/`to` pair
already works), with **floor + exact-cell** destination picking (pick a target floor, click a cell on a
mini rendering of that floor). Two more requirements folded in during scoping: **windows** (a new `MapProp`
kind riding the exact seam `chest`/`table`/etc. already use — wall-attached, no new type/reducer/marker
needed) and **multi-directional stair landings** (a floor can have both an up-stair and a down-stair on the
same cell — e.g. floor 2 → floor 1 down, floor 2 → floor 3 up — which `MapStair`'s shape already supports
as two independent records sharing a cell; the gap is purely editor placement + marker-overlap, not the
data model). **Frontend-only** — confirmed via `backend/app/routers/layouts.py`: `map_layout` is an opaque
JSON blob, no schema validation, matching every prior Map Lab phase (C–G).

**Data model additions:**
```ts
// maplabModel.ts
export interface MapPortal extends PassageFlags {
  portal_id: number
  cell: MapCell
  z: number
  title?: string
  to: { z: number; cell: MapCell }   // paired: the portal at `to` (if present) points back here
}
// MapLayout gains: portals: MapPortal[]
// Inspectable gains: { kind: 'portal'; portal: MapPortal; session?: PassageSessionState }
```
`MapStair`/`MapDoor`/`MapProp` are unchanged. `EditorState` gains `selectedStairId`/`selectedPortalId`;
`EditorAction` gains `addStair`/`selectStair`/`deleteStair`/`addPortal`/`selectPortal`/`deletePortal`,
extending the existing room/door/prop mutual-exclusion pattern to 5-way. `fixtureTypes.ts` gains a
`'destinationPicker'` field type + `STAIR_FIELDS`/`PORTAL_FIELDS` (both `PASSAGE_FIELDS` plus one
`destinationPicker` field for `to`) registered as `FIXTURE_TYPES.stair`/`.portal`.

**Stages:**
- **H0 — Scaffolding (Haiku 4.5, one context).** Type additions above written complete (mechanical, not
  stubbed): `MapPortal`, `MapLayout.portals`, `Inspectable`'s `'portal'` variant, `EditorState`/`EditorAction`
  additions, `nextStairId`/`nextPortalId` (`Math.max(...) + 1`, copied from `nextDoorId`/`nextPropId`).
  Reducer cases, the `destinationPicker` field renderer, and all new editor UI are **stubbed only**.
  `normalizeLayout` extended to default `portals: layout.portals ?? []`. Pick one installed `lucide-react`
  icon for portals not already used elsewhere (verify against `frontend/src/components/icons/`, same
  collision check F4 did for `Landmark`). Placeholder CSS (`.maplab-stair-placement-overlay`,
  `.maplab-portal-marker`, `.maplab-destination-picker`). `it.skip` test stubs for every H1–H3 behavior.
  **Also fully implements windows** (no new seam needed): adds `'window'` to `PROP_KIND_OPTIONS`/
  `PROP_KIND_ICONS` with a distinct wall-fixture icon — windows are immediately placeable/editable via the
  existing "Place prop" mode + properties form (kind = Window, wall `side` set); no window-specific code
  anywhere else in this phase. 🚦 Gate: `it.skip` stubs present, `npm run typecheck`/`npm run build` clean,
  no runtime behavior change to ship yet except windows (verify a window prop can be placed/edited/saved).
- **H1 — Stair authoring (Sonnet).** Implements `addStair` (one-shot cell-click placement, same pattern as
  `addDoor`/`addProp` — `from:{z:activeZ, cell}`, placeholder `to` = `from`, auto-selects), `selectStair`,
  `deleteStair`, and the `updateFixtureFlags` `'stair'` branch (writes through to the nested `to` object).
  Toolbar "Place stair" toggle in the Create group, 4-way mutual exclusion with door/prop placement modes.
  **Editor renders stairs on-canvas for the first time** (`stairPresentation`, `onClick` → `selectStair`,
  not floor-jump — that stays viewer-only). New shared `DestinationPickerField` component (modeled on
  `EncounterPickerField` in `FixturePropertiesForm.tsx`): floor `<select>` (`floorsInLayout`) + a read-only
  mini floor-plan of the chosen floor's rooms (`roomsOnZ`/`absoluteCells`) where clicking a cell sets
  `{z, cell}`; wired into `FixturePropertiesForm` for `'destinationPicker'` fields. Stair inspector-rail
  branch (`InspectorPanel` + `FixturePropertiesForm(FIXTURE_TYPES.stair)` + Delete/Close). **Landings:**
  `addStair`'s placement overlay stays clickable on an already-occupied cell (no occupancy guard, matching
  `addProp`); stair marker rendering (editor **and** viewer) groups stairs by `(z, cell)` and offsets
  multiple markers so co-located up/down stairs render as distinct, independently hoverable/clickable icons
  (`stairDirection` already returns the correct icon per stair). Tests: reducer add/select/delete/
  updateFlags (incl. nested `to` write), 4-way mutual exclusion, `DestinationPickerField` render/floor-
  change/cell-click, stair canvas placement + selection, **two co-located stairs render as separate
  non-overlapping, independently selectable markers**. 🚦 Gate: place a stair in the editor, set its
  destination via the picker, confirm it persists; place a second stair on the same cell targeting a
  different floor, confirm both render distinctly and select independently; existing door/prop placement
  unaffected.
- **H2 — Portal doors: model + reducer + editor placement (Sonnet).** Implements `addPortal` (one-shot
  on-cell placement, placeholder `to` = own cell/z) and the paired-linking behavior on
  `updateFixtureFlags('portal', …, {to: …})`: if a portal already exists at the exact target `{z, cell}`,
  update *that* portal's `to` to point back (re-pairing); otherwise auto-create a new `MapPortal` at the
  target whose `to` points back at the source. `deletePortal` is a simple single-object delete (no
  cascading) — documented as a known limitation matching the pre-existing stair/prop orphan-cleanup gap
  (`deleteRoom` doesn't clean up stairs or props today either; not fixed here). New `PortalMarker.tsx`
  (mirrors only the on-square half of `PropMarker.tsx`'s geometry — cell-centered, `radius = cellSize *
  0.32` — using `passagePresentation` + the H0 portal icon). Toolbar "Place portal" toggle, 5-way mutual
  exclusion with door/prop/stair placement modes. Portal inspector-rail branch using `FIXTURE_TYPES.portal`
  + the shared `DestinationPickerField`. Tests: reducer add/select/delete, paired auto-create-or-relink
  (both "no portal at target yet" and "portal already exists at target" cases), 5-way mutual exclusion,
  canvas placement/selection. 🚦 Gate: place a portal in the editor, target a non-adjacent room on another
  floor via the picker, confirm a paired return portal appears there automatically; re-targeting an existing
  portal to a cell that already has a portal re-links instead of duplicating.

  **What shipped:** `maplabEditor.ts` — `addPortal` (one-shot cell placement, placeholder `to` = own
  cell/z, 5-way selection clearing), `selectPortal`/`deletePortal`, and the `updateFixtureFlags('portal', …)`
  branch with paired-linking: setting `to` either re-links an existing portal found at the exact target
  `{z, cell}` (points its `to` back at the source) or auto-creates a new paired portal there.
  `useMapLabEditor.ts` gained `addPortal`/`selectPortal`/`deletePortal` callbacks. New `PortalMarker.tsx`
  (on-square only, no wall-attached case — mirrors `PropMarker.tsx`'s on-square geometry, `radius = cellSize
  * 0.32`, portal icon + passage-state ring/badge). `MapLabEditorPage.tsx` — "Place portal" toolbar toggle
  (now 4-way exclusive with door/prop/stair), portal placement overlay, portal marker rendering, portal
  inspector-rail branch (`FIXTURE_TYPES.portal` + `DestinationPickerField`), empty-state copy updated to
  mention portals. CSS — `.maplab-portal`/`-marker`/`-icon`/`-state-badge` (real styles replacing the H0
  TODO placeholders) and `.maplab-portal-placement-cell`. Tests: reducer add/select/delete, paired
  auto-create-at-empty-target, paired re-link-at-occupied-target, 5-way mutual exclusion
  (`maplabEditor.test.ts`); editor placement/selection/destination-picker-persistence/pairing/delete and
  4-way placement-mode exclusion (`MapLabEditorPage.test.tsx`). 490/493 frontend tests pass (3 skipped =
  H3–H4 stubs), typecheck/build clean, `pytest`/seed data untouched, frontend-only change confirmed via
  `git status`.
- **H3 — Viewer rendering + navigation (Sonnet).** Portals get viewer support for the first time.
  `inspectableDescriptor`'s `'portal'` case (title/typeLabel/icon/token/lines incl. a "Leads to: {floor
  title}" line). `MapLabPage.tsx`: filter/render portals on the active floor (same shape as the existing
  stair block), hover/focus wiring into `hoveredInspectable`/`focusedInspectable`, click → `setActiveZ
  (portal.to.z)` (matching stair click-to-jump — **no** viewport re-centering/pan-to-cell; no `panTo` helper
  exists on `useMapCanvasZoom`, and portals aren't guaranteed x/y-aligned with their source the way stairs
  conventionally are — a known follow-up, not required here). Per-portal session state (hidden/locked/
  trapped toggle) mirrors `stairSessions`/`toggleStairLocked`/`disarmStairTrap` if the existing door/stair
  session-control pattern in `InspectorPanel` extends cleanly — confirmed during implementation, not
  assumed. Ghosting (`GhostFloorLayer`) is **out of scope** — stairs aren't ghosted today either; not
  extended to portals, not retrofitted onto stairs. Tests: portal viewer rendering, hover/inspector content,
  click navigates `activeZ`. 🚦 Gate: in the viewer, click a portal — floor jump works; hover a stair and a
  portal — inspector shows correct title/state/destination lines for each; no console errors.
- **H4 — Design pass (Sonnet, `/frontend-design`).** Visual/interaction review: portal marker reads as its
  own thing (not confusable with a prop or stair) while staying inside the established token/icon/shape
  language (never hue-alone, dashed-hidden outline, badge pattern matches door/stair/prop). Confirms 5-way
  placement-mode toolbar mutual exclusion has no edge cases (e.g. selecting a room while a placement mode is
  active). Confirms touch-target sizing follows the established Map Lab canvas-glyph convention (not the
  48px toolbar floor — same distinction F4 documented for props).
  🚦 **Live-verified gate (full phase regression + sign-off):**
  - Editor: place a stair, open its inspector, use the destination picker to target the other floor + a
    specific room's cell, confirm it saves; place a second stair on the same cell for the opposite
    direction, confirm both render/select independently (landing case); place a portal, target a
    non-adjacent room, confirm a paired return portal appears automatically; place a window prop on a wall,
    confirm it saves; confirm "Place door/prop/stair/portal" toggles are mutually exclusive.
  - Viewer: click the stair — floor jump works (regression-check); click the portal — floor jump to
    `to.z` works; hover stair/portal/window — inspector shows correct title/state/destination lines; no
    console errors, no emoji, tokens-only.
  - Regression: `npm run test`, `npm run typecheck`, `npm run build` green; `pytest` unaffected; `git
    status` shows no change to `seed_dungeons.json` or `backend/`.

**Files most affected (representative, not exhaustive):** `maplabModel.ts` (`MapPortal`, `Inspectable`,
`normalizeLayout`, `nextStairId`/`nextPortalId`); `maplabEditor.ts` (`EditorState`/`EditorAction`, reducer
cases); `fixtureTypes.ts` (`destinationPicker` field type, `STAIR_FIELDS`/`PORTAL_FIELDS`,
`FIXTURE_TYPES.stair`/`.portal`, `'window'` prop kind); `FixturePropertiesForm.tsx` (new
`DestinationPickerField`); `MapLabEditorPage.tsx` (toolbar, placement overlays, canvas rendering,
inspector-rail branches); `MapLabPage.tsx` (portal viewer rendering + navigation); new `PortalMarker.tsx`.

**Deferred (NOT in Phase H):**
- Portal/stair viewport re-centering on jump (`panTo`-style pan, not just `setActiveZ`).
- Ghosting stairs or portals in `GhostFloorLayer` (stairs aren't ghosted today either).
- Cascading delete/orphan-cleanup for stairs, portals, or props when their owning room is deleted
  (pre-existing gap, not created or fixed by this phase).
- Generalizing beyond the Isly Castle fixture (inherits the Phase D/E/F "any dungeon id" deferral).

---

## Design Phase I — Stair/Portal Authoring Fixes (I0–I3 shipped; I2 folded into I1)

**Goal.** Phase H (H0–H2, shipped) added stair authoring and portal doors, but **H1 was only
test-verified, never live-browser-verified** (H2's live gate wasn't confirmed either). Live use has since
surfaced four real gaps:

1. **Destination cell-picking appears non-functional live** — the shared `DestinationPickerField`
   (`FixturePropertiesForm.tsx:172-254`) already renders a per-cell clickable `<rect>` grid with CSS in
   place (`MapLabPage.css:593-627`), but in practice the picker seems to only let you change floor, not
   the actual square, for both stairs and portals. Never live-verified, so the actual break is unconfirmed
   — needs to be found live, not assumed.
2. **Stairs don't auto-create a reciprocal record.** Portals already auto-pair on
   `updateFixtureFlags('portal', …, {to})` (re-link an existing portal at the target, or auto-create one —
   `maplabEditor.ts:168-215`). The `'stair'` branch (`maplabEditor.ts:163-167`) is a plain merge with **no
   pairing logic** — placing a stair floor 0→1 doesn't give floor 1 its own independently-editable stair
   record pointing back.
3. **Stairs have no multi-destination authoring.** A stair on floor 2 may need to serve as a landing to
   *both* floor 1 (down) and floor 3 (up). The data model already supports this (H1's "landings" — two
   independent `MapStair` records sharing an origin cell, fanned apart by `stairMarkerOffset`), but
   authoring it today means manually repeating the whole placement flow per direction.
4. **Co-located markers overlap or fan out awkwardly.** `stairMarkerOffset` (`maplabModel.ts:350-362`)
   only fans stairs horizontally, only considers other stairs (not portals/props sharing the cell), and
   doesn't wrap. Confirmed with the user: replace it with a shared 2-column grid layout (1 = centered, 2 =
   side-by-side, 3–4 = 2×2 with a line break) applied to **any** marker type sharing a cell (stairs,
   portals, on-square props), via one shared helper.

**Frontend-only** (`maplab/`), same isolation rules as Phases C–H: no backend/seed changes.

**Stages:**
- **I0 — Scaffolding (shipped, Haiku 4.5, one context).** `fixtureTypes.ts`: `FieldSpec` gained an
  optional `multi?: boolean` flag; `STAIR_FIELDS`'s `to` field got `multi: true` (portals' destination
  field stays single, by design). `maplabEditor.ts`: new `EditorAction` variant `setStairDestinations: {
  stairId, destinations: { z, cell }[] }`, reducer case stubbed as a no-op. `useMapLabEditor.ts`: stub
  `setStairDestinations` callback mirroring `addStair`/`addPortal`'s dispatch pattern. `maplabModel.ts`:
  stub `gridMarkerOffset(count, index): { dx, dy }` (returns `{0,0}` this stage) and stub
  `markersAtCell(layout, z, cell): Array<{ type: 'stair'|'portal'|'prop'; id }>` (returns `[]` this
  stage). 10 new `it.skip` test stubs across `maplabEditor.test.ts`/`maplabModel.test.ts`/
  `FixturePropertiesForm.test.tsx` for reciprocal stair pairing, multi-destination reducer behavior,
  `gridMarkerOffset` math, `markersAtCell` grouping, and the multi-picker UI flow. 🚦 **Gate verified:**
  `npm run typecheck`/`npm run build` clean, 490 passed/13 skipped, `git status` confirmed only
  `maplab/` files touched — no runtime behavior change.
- **I1 — Fix the live destination-picker bug; redesign stair destinations as up/down checkboxes,
  folding in I2 (shipped, live-verified 2026-07-13).** Two subagent attempts at the original
  cell-picker-based design surfaced that the whole approach was over-engineered for what stairs actually
  need — **a stair only ever crosses to the adjacent floor at the same `[x, y]`**, so a free-form
  "pick any floor + any cell" picker (portals' actual use case) was the wrong tool. Redesigned live with
  the user mid-stage:
  - **Root cause of the picker bug, found live:** `.maplab-destination-picker`'s CSS (`MapLabPage.css`)
    never set `flex-direction: column`, so it inherited `.maplab-field-row`'s row layout — the floor
    `<select>`, the mini floor-plan `<svg>`, and the summary text all competed for width in one flex row,
    collapsing the SVG (and its 37 clickable cells) to **2×2 pixels**. Fixed by adding
    `flex-direction: column; align-items: stretch;` to `.maplab-destination-picker`. This is the actual
    fix for portals, which still use the free-form picker.
  - **Stairs dropped the free-form picker entirely.** `STAIR_FIELDS` no longer has a `destinationPicker`
    field. The stair inspector (`MapLabEditorPage.tsx`) instead renders two bespoke checkboxes — "Stairs
    up to floor {z+1}" / "Stairs down to floor {z-1}" — disabled when that adjacent floor doesn't exist.
    New reducer action `setStairDirection({z, cell, direction, enabled})`: enabling creates a `MapStair`
    for that direction if none exists at the cell (no-op if one already does); disabling removes the
    matching one. This *is* the multi-destination authoring I2 was scoped for — checking both boxes on
    one cell creates two independent landing records — so I2 is folded into I1, not a separate stage.
  - **Dropped the portal-style paired-record auto-creation for stairs.** A `MapStair` already stores both
    endpoints (`from`/`to`), and `stairCellForZ` already resolves either end — so one record placed
    0→1 already renders on **both** floors with no separate reciprocal object needed (unlike portals,
    which are genuinely one-way and need real pairing). `updateFixtureFlags`'s `'stair'` branch reverted
    to a plain flag merge (title/hidden/locked/trapped/note only); destination is set structurally via
    `setStairDirection`, never via `updateFixtureFlags`.
  - **Real bug found and fixed during live verification:** the endpoint-matching lookups (both in the
    reducer's `existing`-stair search and the inspector's `hasStairInDirection` checkbox-state check)
    only matched a stair when *this* floor was stored as its `from` — viewing/toggling from the *other*
    endpoint of an existing record (e.g. checking "down" from the floor a stair already goes *up*
    *from*) silently failed to recognize it, showing an unchecked box for a stair that already existed.
    Fixed by matching endpoints in either order (undirected match) in both places.
  - `addStair`'s placeholder default changed from a same-floor no-op (`to = from`) to a real direction:
    prefers down (the floor below) if one exists, else up, else an inert same-floor stub on a
    single-floor layout (both checkboxes disabled).
  - Tests: reducer cases for plain-merge-only `updateFixtureFlags`, `setStairDirection` create/no-op/
    remove, the undirected-endpoint-match regression, and updated pre-existing H1/H2 tests to the new
    defaults; component tests for the checkbox UI (checked/disabled states, unchecking removes and closes
    the form) replacing the old picker-based stair tests (portals' own picker tests are unaffected —
    they still exercise `DestinationPickerField` directly). 496 passed/10 skipped, `npm run typecheck`/
    `npm run build` clean, `pytest`/seed data untouched.
  🚦 **Gate live-verified 2026-07-13** end-to-end across all three Map Lab Editor floors: placed a stair
  on floor 0 → defaulted to "up to floor 1", checked; switched to floor 1 → the *same* record correctly
  showed "down to floor 0" checked (proving the undirected-match fix); checked "up to floor 2" from floor
  1 → a second, distinct, independently-selectable marker appeared (a landing) and autosaved; switched to
  floor 2 → confirmed "down to floor 1" checked there. No console errors.
- **I3 — Grid layout for co-located markers (Sonnet, shipped, live-verified 2026-07-13).** Implemented
  `gridMarkerOffset` (1 = centered, 2 = side-by-side, 3–4 = 2×2 row-major, wraps after 2 columns) and
  `markersAtCell` (gathers stairs via `stairCellForZ`, portals, and on-square props sharing an exact
  `(z, cell)` in a stable type-then-id order). Migrated stair marker rendering in both `MapLabPage.tsx`
  and `MapLabEditorPage.tsx` off `stairMarkerOffset` onto `markersAtCell` + `gridMarkerOffset`, and
  applied the same offset lookup to portal and on-square prop marker rendering; `stairMarkerOffset`
  retired entirely.
  - **Overlap bug found live, fixed:** the first pass kept `stairMarkerOffset`'s old 0.22-cell-unit
    spacing constant, which only worked because lone stairs never overlapped themselves — two
    full-size (0.32-radius) marker circles 0.22 apart are still mostly on top of each other (radius sum
    0.64 vs. 0.22 separation). Live-verifying "place a stair and a portal on the same cell" surfaced
    this immediately (the portal fully hid the stair). Fixed with two changes: (1) new exported
    `GROUPED_MARKER_RADIUS_FRACTION` (0.18) shrinks a marker's circle/icon whenever `markersAtCell`
    reports 2+ sharing its cell (`PropMarker`/`PortalMarker` gained a `grouped` prop; the inline stair
    render in both pages computes the same shrink); (2) `gridMarkerOffset`'s spacing is now derived
    from that radius (`2× radius + 0.04` gap) instead of a hardcoded constant, so offset and marker size
    stay consistent by construction.
  - **Cap added mid-stage (user request):** a cell can hold at most `MAX_MARKERS_PER_CELL` (4, matching
    the largest grid `gridMarkerOffset` lays out) — placement handlers for stair/prop/portal in
    `MapLabEditorPage.tsx` now check `markersAtCell(...).length` before dispatching; a full cell shows an
    inline `role="alert"` message ("That square already has 4 markers — pick a different square.")
    instead of adding a 5th marker nothing could render distinctly.
  - Tests: `gridMarkerOffset` unit tests (1/2/3/4-count); `markersAtCell` mixed-type grouping tests;
    `MAX_MARKERS_PER_CELL` sanity test; component tests for co-located stair+portal non-overlap (circle
    separation ≥ sum of radii), a lone stair still centering with no shrink, and the 4-marker cap
    refusing a 5th prop with the alert shown and no autosave. 507 passed/3 skipped (the 3 skips are
    pre-existing H0/H3/H4 stubs, unrelated to I3), `npm run typecheck`/`npm run build` clean.
  🚦 **Gate live-verified 2026-07-13:** authored a stair and a portal on the same cell in the running
  editor — confirmed via DOM inspection both markers render as distinct, non-overlapping circles
  (measured center separation ≥ radius sum); switched floors and confirmed a lone stair still renders
  centered with no offset (no regression). Test data reset via "Reset to fixture" afterward.

**Files most affected (representative):** `maplabModel.ts` (`gridMarkerOffset`, `markersAtCell`,
`GROUPED_MARKER_RADIUS_FRACTION`, `MAX_MARKERS_PER_CELL`, retired `stairMarkerOffset`); `maplabEditor.ts`
(`updateFixtureFlags` stair branch reverted to a plain merge, `setStairDirection`, `addStair`'s new
direction default); `useMapLabEditor.ts` (`setStairDirection` callback); `fixtureTypes.ts` (`STAIR_FIELDS`
dropped its `destinationPicker` field); `FixturePropertiesForm.tsx` / `MapLabPage.css` (picker
flex-direction bug fix, portals only; I3 added `.maplab-placement-error`); `PropMarker.tsx` /
`PortalMarker.tsx` (I3 `offset`/`grouped` props); `MapLabEditorPage.tsx` (up/down checkbox UI; I3 marker
grid-offset call-sites and the 4-marker placement cap) / `MapLabPage.tsx` (I3 marker grid-offset
call-sites).

---

## Design Phase J — Map Lab Decluttering (queued)

Desktop-only decluttering pass on the Map Lab editor/viewer: toolbar groups become genuinely collapsible trays,
the inspector's lazily-formatted "State"/"Also" text rows become icon+text chips, and passage-state colors move
off content-role tokens that currently collide with other UI (locked reuses the same gold as the exit
choice-cards; hidden's grey is nearly indistinguishable from unlocked's grey). **No new responsive breakpoints**
this phase — see `docs/design_plan.md` for the site-wide-nav half of this design pass, which follows the same
constraint. **Portal viewer rendering + navigation (Phase H3/H4) stays out of scope and remains separately
deferred** — this phase is chrome/layout/color/text only, not new functionality.

**Depends on:** `docs/design_plan.md` Phase DP — J0 needs DP0's icon-registry batch; **J3 needs DP1's banked
color tokens already committed — do not start J3 before DP1 lands.**

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|---------------|
| **J0 — Scaffolding** | Haiku | Type/hook stubs only, no behavior change. `maplabModel.ts` gets a `PASSAGE_STATE_TOKENS` map stub (values unchanged from today, so nothing visually shifts yet) and a `passageStateChips(passage)` stub returning `[]`; `MapLabPage.tsx`/`.css` get a `useToolbarTrayCollapse(groupKey)` hook stub (no-op) plus placeholder `.maplab-toolbar-tray`/`.maplab-toolbar-tray--collapsed` CSS documenting intent only. `InspectorPanel.tsx` is untouched — the existing "State"/"Also" `<dl>` rows keep rendering exactly as today. `it.skip` stubs added for: independent per-group tray collapse, tray-collapse localStorage persistence, chip rendering per flag combination, and "locked passage uses a banked token, not `--md-secondary`." | Stubs compile; Map Lab renders pixel-identical to Phase I. |
| **J1 — Toolbar trays** | Sonnet | **Decision:** each of the four toolbar groups (Create/Session/View/Status) collapses **independently** via a chevron, default open, **per-group** `localStorage` persistence — not one unified "compact mode" switch for the whole toolbar. Reasoning: the groups have very different per-session utility (a DM running combat wants Session/Status open and rarely touches Create), so a single all-or-nothing toggle can't express that, whereas per-group collapse hides only the controls that aren't currently in use. Composes with the existing `flex-wrap` toolbar layout without any new breakpoint. Real `useToolbarTrayCollapse` implementation, same pattern as `docs/design_plan.md` DP2's `useNavCollapse` (cross-referenced, not re-derived). Collapsed groups keep their label + chevron + divider so the toolbar's group structure stays legible even collapsed; width/overflow-based collapse (not `display:none`), `prefers-reduced-motion` respected. **Same-commit doc update:** adds the finalized tray pattern (chevron placement, persistence key shape, default-open rationale) to `docs/DESIGN_SYSTEM.md`'s component-anatomy section — this is `design_plan.md` DP4's promised addendum, landing here per that stage's note. | Independently collapsible toolbar trays; unit tests (`useToolbarTrayCollapse` default/read/write/independent-keys) + integration tests (each group collapses without affecting siblings, state persists across remount); `DESIGN_SYSTEM.md` addendum. |
| **J2 — Passage-state chips** | Sonnet | Real `passageStateChips(passage)` in `maplabModel.ts`: one chip per **active** flag (trapped/locked/hidden), built on top of the existing `passagePresentation`/`secondaryPassageStates` precedence logic — a rendering-shape wrapper, not a new state model. `passageDescriptorLines` drops its `State`/`Also` rows entirely (DC and note rows are untouched — those are legitimate free text, not state flags). `InspectorPanel.tsx` renders a new `.maplab-inspector-chips` row above the existing `<dl>`: one small pill per chip, icon + short text label (e.g. "Trapped"), so color is never the only signal. A fully-unlocked passage renders **zero** chips — absence of chips is the clean/unremarkable state, so nothing announces "Unlocked." | New chip row replacing "State"/"Also" text; unit tests (all flag combinations — trapped-only, locked-only, hidden-only, trapped+locked, fully open) + integration test (chip row renders icon+text for each, old text rows are gone). |
| **J3 — Passage-state color tokens** | Sonnet | **Depends on `docs/design_plan.md` DP1** (banked tokens must already exist in `theme.css`). Repoints `passagePresentation()`/`PASSAGE_STATE_TOKENS`: trapped stays `--md-error` (no collision, unchanged); locked moves off `--md-secondary` (gold — collides with the dungeon viewer's exit choice-cards) onto DP1's first banked token, renamed to a descriptive alias `--md-passage-locked` in `theme.css` (the banked token becomes "spent," removed from the banked/reserved comment block); hidden moves off `--md-outline` (grey, too close to unlocked's grey at a glance) onto DP1's second banked token, renamed `--md-passage-hidden`; unlocked stays `--md-on-surface-variant` unchanged (the fix is hidden moving away from it, not unlocked itself). DP1's third banked token stays reserved for the deferred loot system, untouched here. Updates `DESIGN_SYSTEM.md`'s map-lab color section (same commit) noting gold/`--md-secondary` is exclusively the exit-choice-card color from here on. | Passage colors no longer collide with exit-card gold or with each other; unit test regression-guarding the exact token-per-state mapping; `DESIGN_SYSTEM.md` map-lab color section update. |

**Sequencing:** J0 (Haiku, needs only DP0) → J1 and J2 (Sonnet, parallel to each other, both only need J0) → J3
(Sonnet, gated on DP1 being committed in `docs/design_plan.md` — the one hard cross-doc dependency in this
phase).

### J0 — Scaffolding (✅ shipped)

**What shipped:**
- `maplabModel.ts`: `PASSAGE_STATE_TOKENS` map (values unchanged from `passagePresentation`'s existing mapping — trapped/locked/hidden/unlocked → the same tokens as today) and `PassageStateChip` type + `passageStateChips(passage)` stub returning `[]`
- `MapLabPage.tsx`: `useToolbarTrayCollapse(groupKey)` hook stub (no-op, always reports `{collapsed: false, toggle: () => {}}`), unwired to any toolbar group yet
- `MapLabPage.css`: placeholder `.maplab-toolbar-tray` / `.maplab-toolbar-tray--collapsed` rules (empty, documentation-only) — shared by both `MapLabPage.tsx` and `MapLabEditorPage.tsx` (the editor imports this stylesheet, and its toolbar is where J1's real Create/Session/View/Status groups live)
- `InspectorPanel.tsx` untouched — "State"/"Also" `<dl>` rows still render exactly as today
- Test stubs: `maplabModel.test.ts` gets a passing regression test for `PASSAGE_STATE_TOKENS`'s current values, a passing "`passageStateChips` returns `[]`" test, plus `it.skip` stubs for J2's per-flag chip combinations and J3's banked-token migration; `MapLabPage.test.tsx` gets `it.skip` stubs for J1's independent per-group collapse and localStorage persistence

**Verification gate:** ✅ `npm run test` — 516 passed / 12 skipped (full suite), 247 passed / 12 skipped scoped to `maplab/`. `tsc -b` clean (pre-existing `theme-tokens.ts` unused-var errors from DP1 are unrelated). No runtime behavior change — `useToolbarTrayCollapse` is unused by any component and the placeholder CSS rules are empty, so Map Lab renders pixel-identical to Phase I.

### J1 — Toolbar trays (✅ shipped)

**What shipped:**
- `MapLabPage.tsx`: `useToolbarTrayCollapse(groupKey)` implemented for real — per-`groupKey` `localStorage` key (`dnd-kids-maplab-tray-collapsed:<groupKey>`), defaults expanded, tolerates `localStorage` being unavailable (private browsing), same pattern as `docs/design_plan.md` DP2's `useNavCollapse` keyed per group instead of one global flag
- New exported `ToolbarTray` component (`MapLabPage.tsx`) — the reusable tray: label + chevron toggle button always visible (`ChevronUpIcon`/`ChevronDownIcon`, 48×48px touch target, `aria-expanded`/`aria-label` flip with state), controls wrapped in `.maplab-toolbar-tray-controls` which collapses via `max-width`/`opacity` (never `display:none`, so it participates in a transition and stays legible structurally)
- `MapLabPage.css`: real `.maplab-toolbar-tray` / `.maplab-toolbar-tray-toggle` / `.maplab-toolbar-tray-controls` rules, keyed off a `data-collapsed` attribute (matching the codebase's existing `data-active`/`data-state` convention rather than a BEM modifier class) instead of J0's placeholder `--collapsed` class; reuses the existing global `prefers-reduced-motion` reset in `theme.css` — no new media query
- `MapLabPage.tsx`'s own toolbar (viewer): its one "Session" group now uses `ToolbarTray` (`groupKey="viewer-session"`)
- `MapLabEditorPage.tsx`: all four toolbar groups — Create, Session, View, Status — converted to `ToolbarTray` (`groupKey`s `editor-create`/`editor-session`/`editor-view`/`editor-status`), each collapsing **independently** per the plan's decision (not one unified compact-mode switch); the Status group keeps its `maplab-toolbar-group-status` class (via `ToolbarTray`'s `extraClassName` prop) for its existing `margin-left:auto` positioning
- Tests: `MapLabPage.test.tsx`'s J0 stubs replaced with real tests (Session tray collapses/expands on toggle, state persists across remount via `localStorage`); `MapLabEditorPage.test.tsx` gained a new "Design Phase J1 — toolbar trays" block (independent per-group collapse — collapsing Create doesn't affect Session's toggle state or controls — plus persistence across remount); `maplabModel.test.ts`'s J0-passing tests untouched (J2/J3 stubs still skipped, unaffected by this stage)

**Deferred out of this stage:** the `docs/DESIGN_SYSTEM.md` component-anatomy addendum the plan's summary describes — `docs/design_plan.md`'s DP4 (which creates `DESIGN_SYSTEM.md`) has not shipped yet, so there is no file to land the addendum in. Once DP4 ships the doc, add the finalized tray pattern (chevron placement, `data-collapsed` attribute convention, per-`groupKey` persistence shape, default-open rationale) to it as a follow-up — tracked here rather than silently dropped.

**Verification gate:** ✅ `npm run test` — 520 passed / 10 skipped (full suite), 251 passed / 10 skipped scoped to `maplab/`. `tsc -b` clean (same pre-existing `theme-tokens.ts` errors, unrelated). Each of the four editor toolbar groups and the viewer's Session group collapse/expand independently; collapsed state persists per group across remount; 48px touch targets and a visible focus ring on the toggle button.

### J2 — Passage-state chips (✅ shipped)

**What shipped:**
- `maplabModel.ts`: real `passageStateChips(passage)` — one chip per active flag (trapped/locked/hidden) in the same trapped > locked > hidden precedence `passagePresentation` already uses, built via a small icon/label lookup (`PASSAGE_STATE_CHIP_ICONS`/`PASSAGE_STATE_CHIP_LABELS`) rather than a new state model; unlocked never produces a chip
- `passageDescriptorLines` no longer emits the `State`/`Also` rows — DC rows (Break/Pick/Perception) and the free-text `Note` row are untouched
- `InspectableDescriptor` gained a `chips: PassageStateChip[]` field, populated for door/stair/prop/portal via `passageStateChips` on the effective (session-merged) flags, `[]` for rooms
- `InspectorPanel.tsx` renders a new `.maplab-inspector-chips` row above the existing `<dl>` — one `.maplab-inspector-chip` pill per chip, icon + short text label, colored via `PASSAGE_STATE_TOKENS[chip.state]` (so J3 repointing those tokens recolors the chips for free); zero chips renders no row at all
- `MapLabPage.css`: `.maplab-inspector-chips`/`.maplab-inspector-chip` pill styling (MD3 surface-3 background, per-state text color, no new breakpoint)
- Tests: `maplabModel.test.ts`'s J0 stub tests replaced with real per-combination tests (trapped-only, locked-only, hidden-only, trapped+locked, fully-unlocked) plus updated `inspectableDescriptor` assertions (door/stair/prop) checking `d.chips` instead of the retired `State`/`Also` lines; `MapLabPage.test.tsx` gained a "Design Phase J2" integration block (chip row renders icon+text for the locked door and the old text rows are gone; zero chips render for the fully-unlocked stair) plus updates to three pre-existing hover/focus assertions that depended on the old "Unlocked" text row

**Verification gate:** ✅ `npm run test` — 526 passed / 5 skipped (full suite), 257 passed / 5 skipped scoped to `maplab/`. `tsc -b` clean (same pre-existing `theme-tokens.ts` errors from DP1, unrelated). A locked door's inspector shows an icon+text "Locked" chip and no `State`/`Also` rows; a fully-unlocked stair's inspector shows no chip row at all.

### J3 — Passage-state color tokens (✅ shipped)

**What shipped:**
- `maplabModel.ts`: `passagePresentation()` and `PASSAGE_STATE_TOKENS` repointed — `locked` → `--md-passage-locked`, `hidden` → `--md-passage-hidden` (both `docs/design_plan.md` DP1 banked tokens); `trapped` (`--md-error`) and `unlocked` (`--md-on-surface-variant`) unchanged. `InspectorPanel.tsx` needed no code change — its chip row and icon color already read through `PASSAGE_STATE_TOKENS`/`descriptor.token` (J2), so the new tokens apply for free.
- `theme.css`: `--md-passage-locked`/`--md-passage-hidden` (and their `-on`/`-container` pairs) moved out of the `/* Banked — reserved for future content roles */` comment block into their own "Passage-state colors" section noting they're now live-consumed and that `--md-secondary`/gold is exclusively the exit-choice-card color from here on. DP1's third banked set (loot) stays untouched in the banked block.
- `docs/dungeon_plan.md`'s "Design system in force" section gained a "Map Lab passage-state colors" bullet documenting the token mapping and the gold/passage-state decollision — this stage's stand-in for the `DESIGN_SYSTEM.md` update the plan's summary describes; `docs/DESIGN_SYSTEM.md` itself doesn't exist yet (DP4 hasn't shipped, same situation J1 hit) — once DP4 lands, fold this bullet into its map-lab color section as a follow-up.
- Tests: `maplabModel.test.ts`'s `passagePresentation` locked/hidden assertions and the `inspectableDescriptor — door` locked-token assertion updated to the new tokens; `PASSAGE_STATE_TOKENS` regression test updated; the two J0 `it.skip` stubs ("locked passage uses the banked token, not `--md-secondary`" / hidden equivalent) implemented for real.

**Verification gate:** ✅ `npm run test` — 528 passed / 3 skipped (full suite, all `maplab/`-scoped J3 tests green). `tsc -b` clean (same pre-existing `theme-tokens.ts` unused-var errors from DP1, unrelated). No component code changes needed beyond the token mapping — chip/icon colors flow through the existing J2 wiring.

---

## Next: front-end design planning

*(Append new design phases/stages here. They inherit the design system, component anatomy, reusable
pieces, and reserved action slots documented above — build on them rather than re-deriving.)*
  - Replace this section with the latest full phase plan. Once Design Phase J is complete, its section
above will be summarised into the shipped-phase format used by Phases 1–I.
