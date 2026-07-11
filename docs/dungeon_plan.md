# Dungeon Feature — State of Play & Design Foundation

This document is the single reference for the dungeon room-navigation feature and its follow-on design
phases. Original build (Stages 1–11), Design Phase A (Encounter Runner, E1–E6), and Design Phase B (NPC
Dossier, N1–N6) are **all complete and shipped**. This doc records what exists, the design system in
force, and the facts a new executor needs, so the next phase can build on it without re-deriving
anything. New design phases get appended under **"Next: front-end design planning"** at the bottom.

> **Status:** Original build + Phases A/B shipped; Design Phase C ("Map Lab") foundation shipped
> through the geometry/visual proof (see the Foundation table below). **Stage 0 scaffolding complete
> (type declarations + stubs + test data + icon set + test placeholders); frontend tests + `tsc --noEmit`
> green.** No backend change was needed for any dungeon/encounter/NPC/Map-Lab work — the
> whole feature set is frontend against `getDungeon(id)`, `getEncounter`/`updateEncounter`, and
> `getNPC`/`listNPCs`, except Stage E2 (one additive `active_index` column). Map Lab is a fully
> isolated sandbox — seed/DB/`dungeonModel.ts` untouched.

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

---

## Reusable pieces (do not rebuild)

- `frontend/src/api/client.ts`: `getDungeon`/`listDungeons`, `getEncounter`/`updateEncounter`/
  `listEncounters`/`createEncounter`/`deleteEncounter`, `getNPC`/`listNPCs`, `listMonsters`.
- `frontend/src/components/`: `Card`, `SplitPane`, `SearchList`, `DiceText`, `ConfirmDialog`,
  `FloatingWindow`, `components/icons/` (Lucide set incl. `UserIcon`, `SkullIcon`, `GripIcon`,
  `NextTurnIcon`, stepper/reorder icons, plus Map Lab's `TrapIcon`/`LockIcon`/`UnlockIcon`/`HiddenIcon`).
- `frontend/src/features/dungeons/dungeonModel.ts`: the typed read-model + all selectors (floors,
  stairs, graph). **Extend this rather than adding a parallel model.**
- `frontend/src/features/encounters/`: `encounterRunner.ts` (pure reducer), `useEncounterRunner.ts`,
  `CombatantCard`, `AddMonsterPanel`, `EncounterRunnerBoard`.
- `frontend/src/features/npcs/`: `npcModel.ts` (formatting helpers), `useNpc.ts`, `NPCStatCard`,
  `NpcChip`.
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
- **Clickable programmatic map** — the Map Lab prototype (Design Phase C, below) is proving the
  coordinate model that would back this.

---

## Verification (how to confirm the shipped feature end-to-end)

Run `scripts/start_server.ps1`. **Dungeon nav:** drive `/dungeons/4` (Isly Castle) — land on entry room;
content renders as icon-badged tiles; follow door **and** stair cards across both floors; rail
floor-grouping and breadcrumbs update; refresh mid-dungeon confirms trail persistence. **Encounter
runner:** from a room's encounter FeatureTile, **Run encounter** opens the `FloatingWindow` dock;
standalone `/encounters/:id/run` works identically; refresh confirms debounced auto-save. **NPC
dossier:** `/npcs` shows the redesigned card; a room's NPC chip resolves to a real name and opens the
same dossier in a dock, coexisting with an open encounter dock. Confirm throughout: no emoji, no
undefined-token flatness, no console errors. `npm run test` and `pytest` green; `tsc --noEmit` clean.

---

## Next: front-end design planning

*(Append new design phases/stages here. They inherit the design system, component anatomy, reusable
pieces, and reserved action slots documented above — build on them rather than re-deriving.)*

---

## Design Phase C — Programmatic Maps ("Map Lab")

**Goal:** generate dungeon maps programmatically from stored room/door/floor **positions**, instead of
the static per-floor `map_image`. There is **zero** spatial data in `seed_dungeons.json` — layout exists
only implicitly via the base64 `map_image` + `leads_to` connectivity. Map Lab is an isolated **sandbox**
that proves a coordinate model using **real Isly Castle ids** before we decide whether/how to fold it
into production.

**Isolation (hard rule):** everything lives in `frontend/src/features/dungeons/maplab/` +
`frontend/src/router.tsx` (one route). `seed_dungeons.json`, the DB, all of `backend/`,
`dungeonModel.ts`, `dungeonForm.ts`, `DungeonEditor.tsx`, and the live dungeon pages are **untouched**.
Dev-only route `/dungeons/map-lab`. Hand-authored coordinates (no auto-layout solver). Stays in-stack
(React + TS + SVG) so a proven model/component folds straight into production; SVG elements = real DOM,
so selection/focus/`theme.css` tokens/future drag-editing are ordinary pointer events.

### The coordinate model

Integer **cell grid**, `x`=column(right), `y`=row(down) — matches SVG axes. Per-floor plane; all planes
share one origin so a room directly above sits at the same `[x,y]`. Floor identity via a `z` integer.
Rooms are **polyominoes** (origin + relative cells) so rectangles and L/T-shapes are cell-aligned; doors
are a **named wall segment** of a cell; stairs cross `z` on two endpoint cells sharing x/y.

### Map Lab — Foundation (shipped)

All of the following is built and green. Selector/helper names are the reusable surface.

| Capability (shipped) | Key selectors / notes |
|---|---|
| **Geometry core** | `absoluteCells`, `layoutBounds`, `neighborCell`, `oppositeSide`, `doorWallSegment`, `roomOfCell` — polyomino math proven on a rectangle (Hall 6×4) + an L-shape (Armoury). |
| **Single-floor SVG + route** | `MapLabPage.tsx` renders `z:0`: per-cell room `<rect>`s, centered title, door glyph on its wall segment. Click/Enter/Space selects a room (`--md-primary` highlight, focus ring). `/dungeons/map-lab` registered. |
| **Z-axis stairs** | `floorsInLayout`, `roomsOnZ`, `stairEndpointsForZ`. Floor-tab bar switches `activeZ`; `viewBox` computed from **all** rooms across floors so x/y stay aligned across planes; stair marker travels between floors on click. |
| **5 ft grid + unknown space** | `paddedBounds(layout)` expands the room union by `meta.padding` and centers it; a faint two-tier grid = "unknown space" behind solid room floor cells; `CELL_SIZE 64`, `meta.cellSizeFt 5`, "1 square = 5 ft" scale ruler; castle-realistic footprints. |
| **Walls + passage affordances** | `roomWallSegments` (perimeter; shared walls between two rooms wall from both), `findDoorAtEdge`, `nonDoorWallSegments` (perimeter minus the door segment). Doors/stairs are hover- **and** focus-able with a details popover (title/state/DCs/note), click pins a door's popover / travels for a stair. |
| **State presentation** | `PassageFlags` (independent `hidden`/`locked`/`trapped` + optional `breakDc`/`pickDc`/`hiddenDc`/`note`), `passagePresentation` (precedence trapped>locked>hidden>unlocked → `{state, icon, token, label}`, reusing MD3 semantic roles), `secondaryPassageStates`. Shared by doors **and** stairs. |

> **Prototype-grade visuals.** M1 visuals were accepted (2026-07-11: "looks fine for early prototype")
> and the padded-grid/wall pass followed — but this is **not production-final**. A full `frontend-design`
> pass is owed (Stage 2 below begins it; the FINAL STAGE requires it before any fold-in).

### Current Map Lab schema (`maplabModel.ts`) — reviewed for flexibility

```ts
MapRoom      = { room_id, z, origin:[x,y], cells:[[dx,dy]…], title? }   // polyomino; any orthogonal shape
PassageFlags = { hidden, locked, trapped, breakDc?, pickDc?, hiddenDc?, note? }  // independent booleans
MapDoor      = PassageFlags & { door_id, cell:[x,y], side:'N|S|E|W', title? }    // named wall segment
MapStair     = PassageFlags & { stair_id, from:{z,cell}, to:{z,cell}, title? }   // crosses z on shared x/y
MapItem      = { item_id, cell:[x,y], title }         // typed, empty, UNRENDERED forward-compat slot
MapLayout    = { meta:{ cellSizeFt, padding }, rooms, doors, stairs, floors, items }
```

**Flexible where it counts:** polyomino rooms express any orthogonal footprint; one shared
`PassageFlags`/`passagePresentation` serves doors *and* stairs; `items[]` reserves per-square contents
without touching geometry (contents attach via a parallel `[x,y]`-keyed array, mirroring the reserved
action-slot pattern). Geometry stays pure.

**Gaps the next round closes** (drive the Stage 0 type additions):
1. **No mutable/runtime state, and no open-vs-closed concept** — every flag is authored-static. → a
   `PassageSessionState` layer (Stage 4).
2. **No generic "inspectable" abstraction** — only passages have a presentation. → an `Inspectable`
   union + `inspectableDescriptor` (Stage 3).
3. **Rooms carry only `title`** — no description/kind for an inspector. → additive optional fields.
4. **Door↔room link is geometry-derived, not stored** — fine for the sandbox; a FINAL-STAGE note vs.
   production's explicit `leads_to` edge list.

---

### The next round (Stage 0 + Stages 1–4, then FINAL STAGE)

> **Model split (cost).** **Stage 0 is pure mechanical scaffolding — do it in ONE Haiku-4.5 context**
> (type declarations, `throw new Error('not implemented')` stubs, data entry, empty CSS classes, icon
> components, skipped test stubs; no algorithms/geometry/rendering logic). **Stages 1–4 are the
> reasoning-heavy fill-ins — use Sonnet.** Do stages one at a time, in order.
>
> **Visual-check gates.** Stages 1–4 each end with a **🚦 gate: drive `/dungeons/map-lab` live and get
> explicit user acceptance before starting the next stage.** Stage 0 has no visual surface (tests +
> `tsc` sign it off). All stages stay inside `maplab/` + the one route.

#### Stage 0 — Scaffolding (Haiku 4.5, one context, mechanical only) ✓ COMPLETE

Front-load **all** scaffolding for Stages 1–4 so the reasoning stages just fill bodies.

**Completed 2026-07-11:**
- **`maplabModel.ts`** — type declarations + stubbed signatures:
  - `MapRoom` gains `description?: string`, `kind?: string` ✓
  - `PassageSessionState` and `EffectivePassageState` types + `effectivePassageState(flags, session?)` stub ✓
  - `Inspectable` discriminated union + `inspectableDescriptor(target)` stub ✓
  - Stage-1 helper `sharedWallSegments(roomA, roomB, doors)` stub ✓
  - Stage-2 helpers: `stairDirection(stair)` and `stairPresentation(stair)` / `StairPresentation` interface ✓
- **`maplabData.ts`** — descriptions added to existing rooms (17, 23, 32, 33); two interlocking L-shaped test
  rooms (99 "West Wing", 100 "East Wing") on z:2, tessellating a 4×4 square; new `{ z: 2, title: 'Two-Wing Test Layout' }` floor ✓
- **`components/icons/index.ts`** — new icons: `DoorClosedIcon`, `DoorOpenIcon`, `TrapDisarmedIcon`, `StairsUpIcon`, `StairsDownIcon` ✓
- **`MapLabPage.css`** — placeholder classes: `.maplab-door-glyph-open`, `.maplab-stair-glyph-directional`,
  `.maplab-inspector-row`, `.maplab-session-control-button` ✓
- **Test stubs** — `it.skip` cases for Stages 1–4 in both `MapLabPage.test.tsx` and `maplabModel.test.ts`;
  new data tests verify interlocking L-rooms and floor count ✓
- **Verification:** Tests green (71 passed, 18 skipped); no new TypeScript errors in maplab code path ✓

#### Stage 1 — Room geometry: faithful L-shapes + interlocking-square proof (Sonnet) — *point 4*

- **Faithfulness fix:** the room hover/selection must highlight **only occupied cells** (the L's notch
  stays empty — no bounding-box overlay). If the always-on per-cell grid strokes make an L read as a
  solid rectangle, adjust so occupied vs. unknown space is unmistakable (unify the room fill as one
  shape / lighten interior cell lines) — this is the "box around a rectangle implies the outside region
  is included" concern.
- **Interlocking proof:** render the two new L-rooms; each highlights only its own 8 cells; the **shared
  zig-zag wall renders from both perimeters**; no cell belongs to both; the notch is never highlighted
  for either room.
- Tests: per-room `absoluteCells`, shared-wall edges on both, no cell overlap, notch excluded. **🚦 Gate.**

#### Stage 2 — Passage visuals: colour-clash fix + stair iconography (Sonnet, `frontend-design` skill) — *point 2*

- **Fix verified clashes:** an *unlocked* door glyph and plain walls both resolve to
  `--md-on-surface-variant` (indistinguishable); the stair marker mixes `--md-tertiary-container` fill
  with `--md-on-surface-variant` stroke/icon (two token families). Give the door a distinct leaf/gap
  treatment and the stair a single coherent token family — **stay within existing MD3 semantic roles; no
  new hues without the `Blend.harmonize()` generator.**
- **Stair iconography:** replace the bare circle + state-icon with a real directional stair glyph
  (`StairsUp`/`StairsDown` by plane). This is the owed aesthetic pass — build with the `frontend-design`
  skill.
- Tests: door vs wall separable (distinct class/token); stair renders directional glyph; no hardcoded
  colours/font-sizes; no emoji. **🚦 Gate.**

#### Stage 3 — Generic hover inspector for any element + item/chest hooks (Sonnet) — *point 1*

- Implement `Inspectable` + `inspectableDescriptor`. Generalise the door/stair affordance panel into an
  **element-agnostic inspector**: hovering/focusing a **room** (title, kind, description, size) **or** a
  door/stair shows its descriptor in the same panel; keep click-to-pin, keyboard parity, `aria-live`.
- **Leave typed hooks for out-of-scope content** (`kind:'item'`/chests): the union + descriptor path
  exist and are unit-tested, but **no item rendering or authoring UI** (explicitly out of scope here).
- Tests: room hover reveals descriptor; door/stair still work; item-descriptor path unit-tested with no
  rendered item. **🚦 Gate.**

#### Stage 4 — Passage state: authored default + live session override (Sonnet) — *point 3 (both layers)*

- Implement `effectivePassageState(flags, session)` merging authored `PassageFlags` with
  `PassageSessionState`. Add **open/closed** (new concept — closed = gap+glyph, open = swing/open glyph),
  **lock/unlock**, **disarm trap** as in-memory session controls surfaced in the Stage-3 inspector (≥48px
  targets, keyboard-operable). The authored default is the reset baseline; the override changes only
  session state, never the authored data (the sandbox has no persistence).
- Rendering reflects effective state (open door leaf, `TrapDisarmedIcon`, unlock recolour) via the
  Stage-2 presentation path.
- Tests: merge precedence (authored locked → session unlocked → effective unlocked; disarm clears the
  trapped presentation; open/closed toggles the glyph); reset returns to the authored default. **🚦 Gate.**

#### FINAL STAGE — Production-home decision (still a long way off)

No code. Consumes the matured schema (incl. the session-state layer, generic inspector, and interlocking
geometry) + the "reduce the messy" contrast table below. Assess the model against known real-data
hazards: non-rectangular footprints, **multi-door pairs like rooms 7↔10**, z-stacking, the **16
orphan/disconnected rooms**, prose-only "hidden" doors (`content:"Hidden"` while `is_hidden:false`),
scalar-vs-pair/`[9,9]` `leads_to`, and id gaps. Append here: the proven coordinate + state schema; a
**permanent-home recommendation** — additive `layout` block on the dungeon `data` blob keyed by id, vs.
embedding coordinate/state fields on the existing room/door objects — with a `dungeonModel.ts`
`RoomNode.position` / `getRoomGraph` migration sketch. **🚦 User-acceptance gate;** a full
`frontend-design` pass is a prerequisite before any production fold-in.

#### Deferred — NOT planned here (*point 5*)

- **Edit / authoring tools** for placing rooms/doors/coords and setting authored state. Needed before any
  production fold-in; ties into the lossy-`dungeonForm`/`DungeonEditor` round-trip debt above. Noted only.

---

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

### Verified anchors (real seed ids/titles/connectivity)
- Room 17 "Combat Training Hall" ↔ Room 23 "Armoury" via **door 32 "Heavy Stone Door"**
  (`leads_to:[23,17]`, `door_mechanics:"DC23 to break; DC18 to pick lock"` → `locked, breakDc:23,
  pickDc:18`).
- Room 32 "Back Stairwell" (floor 1) ↔ Room 33 "First Floor Landing" (floor 2) via **stair 2 "Stone
  Stairs"** (`leads_to_rooms:[32,33]`, `leads_to_floors:[1,2]`).

### Verification (Map Lab end-to-end)
- `npm run test` (frontend) green incl. maplab tests; `tsc --noEmit` clean.
- `scripts/start_server.ps1` → `/dungeons/map-lab`: Case 1 (hall + L-armoury + shared-wall door,
  clickable), Case 2 (two floors, stair travels, coords aligned across z), and (from Stage 1) the
  interlocking-L pair all render with theme tokens, no emoji, no console errors.
- Production untouched: `git status` shows no change to `seed_dungeons.json`, `backend/`, or the existing
  dungeon model/pages; `/dungeons/4` behaves exactly as before.
