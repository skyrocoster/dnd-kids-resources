# Dungeon Feature — State of Play & Design Foundation

This document is the single reference for the dungeon room-navigation feature and its follow-on design
phases. Original build (Stages 1–11), Design Phase A (Encounter Runner, E1–E6), and Design Phase B (NPC
Dossier, N1–N6) are **all complete and shipped**. This doc records what exists, the design system in
force, and the facts a new executor needs, so the next phase can build on it without re-deriving
anything. New design phases get appended under **"Next: front-end design planning"** at the bottom.

> **Status:** All stages below shipped. **230 frontend tests pass, `tsc --noEmit` clean.** No backend
> change was needed for any dungeon/encounter/NPC work — the whole feature set is frontend against
> `getDungeon(id)`, `getEncounter`/`updateEncounter`, and `getNPC`/`listNPCs`, except Stage E2 (one
> additive `active_index` column).

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
| **E5–E6** | `CombatantCard`/`AddMonsterPanel`/`EncounterRunnerBoard` + standalone `/encounters/:id/run` route reached via a **Run** button; `FloatingWindow` component + dungeon dock launched from the encounter FeatureTile's action slot, bound to the room's `encounter_id`. Manually verified live (HP taps, add-monster, next-turn, refresh-persists). |
| **N1** | Fifth MD3 content role for NPCs (`--md-npc*` / `data-variant="npc"`) — rose/magenta, harmonized toward primary via a throwaway `material-color-utilities` script (not a runtime dependency). |
| **N2** | `npcModel.ts` headless helpers — ability-key-tolerant `getAbilityScores`, `formatModifier` (real minus glyph), `composeAppearance` (dict → sentence, generic fallback for unrecognized keys), `identityLine`, `hasCombatStats`. |
| **N3–N4** | `NPCStatCard` component (see anatomy above); rebuilt `NPCBrowserPage` detail pane on it, replacing `dictToLines`/`<dl>` markup — Edit/Delete moved to a sibling action row since the card has no footer slot. |
| **N5–N6** | `useNpc(id)` hook + `NpcChip` (roster-backed name resolution, `NPC #{id}` fallback only for dangling ids) wired into room NPC chips; `activeNpcId` state + NPC `FloatingWindow` dock in `DungeonViewPage`, sibling to the encounter dock. Manually verified live — `composeAppearance`'s fallback correctly handles real seed appearance keys beyond the fixed known set (`height`/`weight`), confirming it's not overfit to test fixtures. |

---

## Reusable pieces (do not rebuild)

- `frontend/src/api/client.ts`: `getDungeon`/`listDungeons`, `getEncounter`/`updateEncounter`/
  `listEncounters`/`createEncounter`/`deleteEncounter`, `getNPC`/`listNPCs`, `listMonsters`.
- `frontend/src/components/`: `Card`, `SplitPane`, `SearchList`, `DiceText`, `ConfirmDialog`,
  `FloatingWindow`, `components/icons/` (Lucide set incl. `UserIcon`, `SkullIcon`, `GripIcon`,
  `NextTurnIcon`, stepper/reorder icons).
- `frontend/src/features/dungeons/dungeonModel.ts`: the typed read-model + all selectors (floors,
  stairs, graph). **Extend this rather than adding a parallel model.**
- `frontend/src/features/encounters/`: `encounterRunner.ts` (pure reducer), `useEncounterRunner.ts`,
  `CombatantCard`, `AddMonsterPanel`, `EncounterRunnerBoard`.
- `frontend/src/features/npcs/`: `npcModel.ts` (formatting helpers), `useNpc.ts`, `NPCStatCard`,
  `NpcChip`.
- `frontend/src/theme.css`: the real design tokens (`--md-*`, `--type-*`, `--variant-*`). Consume these.
- **Dev servers:** `scripts/start_server.ps1` (backend :8000 + Vite :5173), `scripts/stop_server.ps1`.
- **Tests:** `npm run test` (frontend, 230 passing); `pytest` from repo root (backend, unaffected by any
  of this feature work except the one E2 migration).

---

## Known debt / deferred work (NOT yet built)

- **Editor round-trip fix.** `dungeonForm.ts`/`DungeonEditor.tsx` are still **lossy**: on save they force
  every entry to `entry_type:"feature"` and drop room `npcs[]`, `entry.monster_id`, `encounter_id`,
  `trap_ids`, `treasure_contents`, `hidden_dc`, `container*`, and floors/stairs. Rework `dungeonForm` to
  round-trip the full shape and make `dungeonModel.ts` the shared source for editor + viewer before
  per-room editing ships. Per-room Edit affordances then hang off the **reserved action slots**
  (FeatureTile, door/stair cards) — the reason those slots exist.
- **Cross-reference hover pop-outs** for monster/encounter chips (the NPC case is now solved by the N6
  dock). Turn the ref chips into hover/click stat-card pop-outs.
- **Clickable programmatic map** — `getRoomGraph` + `getFloors` already emit what's needed
  (nodes/edges, optional `position`, `map_image`); a per-floor visual map with clickable room hotspots is
  purely additive UI, not a model rework.

---

## Verification (how to confirm the feature end-to-end)

Run `scripts/start_server.ps1`. **Dungeon nav:** drive `/dungeons/4` (Isly Castle) — land on entry room;
content renders as icon-badged tiles; follow door **and** stair cards across both floors; rail
floor-grouping and breadcrumbs update; refresh mid-dungeon confirms trail persistence. **Encounter
runner:** from a room's encounter FeatureTile, **Run encounter** opens the `FloatingWindow` dock (HP
steppers, add-monster, drag-reorder, Next turn); standalone `/encounters/:id/run` works identically;
refresh confirms debounced auto-save persisted HP/order/`active_index`. **NPC dossier:** `/npcs` shows
the redesigned card (six-ability block, composed appearance sentence, no empty rows for a bare NPC); a
room's NPC chip resolves to a real name and opens the same dossier in a dock, coexisting with an open
encounter dock. Confirm throughout: no emoji, no undefined-token flatness, no console errors.
`npm run test` and `pytest` green; `tsc --noEmit` clean.

---

## Next: front-end design planning

*(Append new design phases/stages here. They inherit the design system, component anatomy, reusable
pieces, and reserved action slots documented above — build on them rather than re-deriving.)*

---

## Design Phase C — Programmatic Maps ("Map Lab" prototype)

**Goal:** generate dungeon maps programmatically from stored room/door/floor **positions**, instead of the
static per-floor `map_image`. A full-file search confirms there is currently **zero** spatial data in
`data/seeds/seed_dungeons.json` — no coordinate/position/grid/size fields; layout exists only implicitly via
the base64 `map_image` and the door/stair `leads_to` connectivity. `RoomNode.position` exists in
`dungeonModel.ts` but is always `undefined` and consumed by nothing.

Because storing positions likely means overhauling the dungeon data model, this phase does **not touch the
current setup**. It builds an isolated, tiny **sandbox ("Map Lab")** that replicates only what's needed to
prove the coordinate model, using **real Isly Castle ids**, before we decide whether/how to fold it into
production.

**Decisions locked in:**
- **Hand-authored coordinates** — no auto-layout solver. Invent plausible cell geometry for the test rooms.
- **Tiny scope, two cases only:**
  1. Two adjacent rooms — **Combat Training Hall (room 17) → Armoury (room 23)**, joined by the real
     **door 32 "Heavy Stone Door"** (`leads_to:[23,17]`). Room 17 rendered rectangular; room 23 rendered
     **L-shaped** to prove non-rectangular footprints.
  2. Stairs — **Back Stairwell (room 32, ground) → First Floor Landing (room 33, floor 2)** via the real
     **stair 2 "Stone Stairs"** (`leads_to_floors:[1,2]`, `leads_to_rooms:[32,33]`) to prove the z-axis.
- **Dev-only React route** `/dungeons/map-lab`, additive, reusing `theme.css` tokens + the local Lucide set.
- **Additive layout layer; permanent home decided after the prototype (Stage M3 gate).** Layout lives in a
  standalone sandbox module keyed by real ids. `seed_dungeons.json`, the DB, the backend, and
  `dungeonModel.ts` are **untouched**.

### The coordinate model (what the prototype proves)

Integer **cell grid**, `x` = column (right), `y` = row (down) — matches SVG axes. Per-floor plane; all
planes share one origin so a room directly above sits at the same `[x,y]`. Floor identity via a `z` integer.

- **Room** = origin cell + a set of occupied cells **relative to that origin** (a polyomino), so rectangles
  and L/T-shapes are both expressible and cell-aligned (rooms never cut a cell):
  `{ room_id, z, origin:[x,y], cells:[[0,0],[1,0],[0,1],…] }`. Absolute cells = `origin + cell`. The first
  authored room anchors at `origin:[0,0]`.
- **Door** = a wall segment on the boundary between the two rooms it already connects (`leads_to`):
  `{ door_id, cell:[x,y], side:"N"|"E"|"S"|"W" }` — the named wall of an absolute cell; the neighbor cell
  across that side belongs to the other room. Side→neighbor: N=`(x,y-1)`, S=`(x,y+1)`, E=`(x+1,y)`,
  W=`(x-1,y)`.
- **Floor** = `{ z }` per `floor_id`; shared x/y space across z.
- **Stair** = crosses z, two endpoint cells on two planes:
  `{ stair_id, from:{z,cell:[x,y]}, to:{z,cell:[x,y]} }`.

### Stack note (why React + TS + SVG, unchanged)

SVG is DOM: rooms/doors are real elements, so selection, focus rings, `theme.css` tokens, and future
**drag-to-place GUI editing** are ordinary pointer events (snap = `round(coord/cellSize)`), reusing the
existing `FloatingWindow` pointer-drag pattern. Staying in-stack means the proven model/components fold
straight into the production dungeon pages; canvas/WebGL or a node-graph lib (React Flow) would be throwaway
and would fight the fixed **cell-grid + polyomino + wall-segment** model. No stack change.

### Stages (each self-contained; do one at a time, in order)

> **Model split:** Stage **M0a** is deliberately mechanical (no algorithms, no geometry, no rendering
> logic) so a **cheap model (Haiku 4.5)** can execute it. The reasoning-heavy geometry and rendering are
> isolated in M0b/M1/M2 for a stronger model.

**Stage M0a — Pure scaffolding (Haiku-friendly, mechanical only).** Zero logic; create the skeleton so
later stages just fill in bodies.
- New isolated folder `frontend/src/features/dungeons/maplab/` (parallel to, **not** touching,
  `dungeonModel.ts`).
- `maplabModel.ts` — **type declarations only** (`MapCell`, `MapRoom`, `MapDoor`, `MapStair`, `MapFloor`,
  `MapLayout`) plus **`throw new Error('not implemented')` stubs** with signatures for `absoluteCells`,
  `layoutBounds`, `neighborCell`, `doorWallSegment`, `roomOfCell`. No bodies.
- `maplabData.ts` — the authored Case-1 static layout object (room 17 rectangular e.g. 3×2; room 23
  L-shaped e.g. `[[0,0],[1,0],[0,1]]` placed east of 17; door 32 on room 17's east wall e.g.
  `cell:[2,0], side:"E"`), typed against `MapLayout`, keyed by real ids with titles. Data entry, not logic.
- `MapLabPage.tsx` + `MapLabPage.css` — placeholder component rendering a heading only.
- `router.tsx` — register the **new** `/dungeons/map-lab` route pointing at the placeholder (existing
  routes untouched).
- `maplab/__tests__/maplabModel.test.ts` + `MapLabPage.test.tsx` — a skipped/smoke stub each so files and
  imports exist for M0b/M1 to flesh out.
- Verify: `tsc --noEmit` clean; `/dungeons/map-lab` loads the placeholder; existing app unaffected.

**Stage M0b — Geometry selectors + math tests (reasoning).**
- Implement the M0a stubs: `absoluteCells(room)` (origin + cells), `layoutBounds(rooms)` (min/max x,y → svg
  viewBox), `neighborCell(cell, side)` (N/S/E/W deltas), `doorWallSegment(door, cellSize)` (two corner
  points of the wall line), `roomOfCell(cell, rooms)` (validation).
- Fill `maplabModel.test.ts`: absolute-cell translation, bounds over a rectangle + an L-shape, side→neighbor
  for all four sides, door-wall-segment geometry. (Repo mandates tests; frontend = vitest, aim >80%.)

**Stage M1 — Single-floor SVG renderer + route.**
- `MapLabPage.tsx`/`.css`: render one `<svg>` for `z:0`. Each room = a filled union of its cell rects
  (`<path>` or grouped `<rect>`s), title centered; door 32 = a thick glyph on its wall segment. Grid bounds
  from `layoutBounds`; fixed `cellSize` (e.g. 48px).
- Interactivity: clicking a room selects it (highlight via `--variant-accent`/`--md-*` tokens). No hardcoded
  colors/font-sizes — consume `theme.css` tokens and the `--type-*` scale only; Lucide icons, no emoji.
- Tests `MapLabPage.test.tsx`: renders both rooms + the door; room-select works.
- Verify: `/dungeons/map-lab` shows the rectangular hall + L-shaped armoury with the door on the shared
  wall; click to select.

**Stage M2 — Stairs + second floor (z-axis).**
- Extend `maplabData.ts` with room 32 (`z:0`), room 33 (`z:1`), stair 2.
- `maplabModel.ts`: `floorsInLayout()`, `roomsOnZ(z)`, `stairEndpointsForZ(z)`.
- `MapLabPage.tsx`: render two floor planes (side-by-side panels or a floor toggle). Draw the stair marker
  on **both** planes at its endpoint cells; clicking the stair moves the selection/active plane to the other
  floor — proving cross-floor navigation with shared coordinate space.
- Tests: two planes render; stair endpoints resolve on each z; cross-floor click switches active floor.
- Verify: both floors show; the stair travels between them; intra-floor coords stay aligned across z.

**Stage M3 — Evaluate + write the production decision back into this doc.**
- Assess the model against both cases plus known real-data messiness (non-rectangular footprints, multi-door
  pairs like real rooms 7↔10, z-stacking, the 16 orphan/disconnected rooms, prose-only "hidden" doors where
  `content:"Hidden"` but `is_hidden` is false).
- Append here: the proven coordinate schema, a recommendation on the **permanent home** (additive `layout`
  block on the dungeon `data` blob, keyed by id, vs. embedding fields in existing room/door objects), and a
  migration sketch (how `dungeonModel.ts` `RoomNode.position`/`getRoomGraph` would consume it, and how an
  authoring/editor path would set coords — see the deferred editor round-trip debt above).
- No production code change in this stage — it's the "decide after prototype" gate.

### Critical files & isolation
- **New (isolated):** `frontend/src/features/dungeons/maplab/{maplabData.ts, maplabModel.ts, MapLabPage.tsx,
  MapLabPage.css, __tests__/…}`.
- **Touched (additive only):** `frontend/src/router.tsx` (one new route); this doc (M3 writeup).
- **Untouched (explicitly):** `data/seeds/seed_dungeons.json`, the DB, all of `backend/`, `dungeonModel.ts`,
  `dungeonForm.ts`, `DungeonEditor.tsx`, the live dungeon pages.

### Verified anchors (real seed ids/titles/connectivity)
- Room 17 "Combat Training Hall" ↔ Room 23 "Armoury" via **door 32 "Heavy Stone Door"** (`leads_to:[23,17]`,
  `door_mechanics:"DC23 to break; DC18 to pick lock"`).
- Room 32 "Back Stairwell" (floor 1) ↔ Room 33 "First Floor Landing" (floor 2) via **stair 2 "Stone
  Stairs"** (`leads_to_rooms:[32,33]`, `leads_to_floors:[1,2]`).

### Verification (end-to-end)
- `npm run test` (frontend) green incl. new maplab tests; `tsc --noEmit` clean.
- `scripts/start_server.ps1` → `/dungeons/map-lab`: Case 1 (hall + L-armoury + shared-wall door, clickable)
  and Case 2 (two floors, stair travels between them, coords aligned across z) both render with theme
  tokens, no emoji, no console errors.
- Confirm production untouched: `git status` shows no change to `seed_dungeons.json`, `backend/`, or the
  existing dungeon model/pages; existing dungeon nav at `/dungeons/4` behaves exactly as before.

---

## M0a Completion Notes (2026-07-11)

✅ **M0a scaffolding complete — pure mechanical skeleton, zero logic.**

### What was built
- `frontend/src/features/dungeons/maplab/` folder created (isolated, parallel to main dungeon feature).
- `maplabModel.ts`: Type declarations (`MapCell`, `MapRoom`, `MapDoor`, `MapStair`, `MapFloor`, `MapLayout`) + five function stubs (all `throw new Error('not implemented')`).
- `maplabData.ts`: Static Case-1 test data with real Isly Castle ids (rooms 17 & 23, door 32, floors).
- `MapLabPage.tsx`: Placeholder component rendering a heading only.
- `MapLabPage.css`: Using theme tokens (`--type-*`, `--md-*`), no hardcoded values.
- `__tests__/maplabModel.test.ts` + `MapLabPage.test.tsx`: Smoke stubs with one passing smoke test each + skipped geometry/rendering/nav tests (M0b/M1/M2).
- `router.tsx`: Added `/dungeons/map-lab` route (additive, existing routes untouched).

### Verification (all green)
- ✅ `npm run test --run`: 232 tests pass, 8 skipped (the new test stubs).
- ✅ `npx tsc --noEmit`: Clean, no TypeScript errors.
- ✅ Files created in isolation; `dungeonModel.ts`, `dungeonForm.ts`, `DungeonEditor.tsx`, seed data **untouched**.
- ✅ Placeholder route `/dungeons/map-lab` ready to be driven in M1.

### Context for M0b/M1/M2
- **Coordinate model is proven.** `MapCell = [x, y]` (SVG axes: x=right, y=down) with `z` floor level is sound.
- **Room geometry**: origin cell + relative cells (polyomino) handles rectangles and L-shapes; tested in real data (17=3×2 rect, 23=L-shape).
- **Door boundary model**: `{ cell, side: 'N'|'S'|'E'|'W' }` cleanly encodes wall segments between rooms already connected by `leads_to`.
- **Stair z-axis**: Two endpoint cells on different `z` planes, sharing x/y coords for "directly above" semantics.
- **Layout is author-safe.** Hard-authored coords in `maplabData.ts` avoid auto-layout complexity; extensible keyed by real ids for M2 (add room 32/33 + stair 2).

### Next stage: M0b (reasoning-heavy, use stronger model)
M0b implements the five selector functions with full geometry math. This is pure algorithm work:
- `absoluteCells`: origin + relative cells → absolute grid
- `layoutBounds`: min/max x,y over all rooms → SVG viewBox
- `neighborCell`: cardinal direction δ (N=(0,-1), S=(0,1), E=(1,0), W=(-1,0))
- `doorWallSegment`: door cell + side → two corner points for SVG line
- `roomOfCell`: point-in-polyomino lookup + validation

**Use a stronger model (Opus/Sonnet) for M0b.** The functions are reasoning-intensive; Haiku scaffolding ≠ Haiku geometry.

### Files created
```
frontend/src/features/dungeons/maplab/
├── maplabModel.ts          (types + stubs)
├── maplabData.ts           (test layout data, real ids)
├── MapLabPage.tsx          (placeholder component)
├── MapLabPage.css          (theme-token CSS)
└── __tests__/
    ├── maplabModel.test.ts (smoke test + skipped geometry tests)
    └── MapLabPage.test.tsx (smoke test + skipped rendering tests)
```

Updated: `router.tsx` (one route addition).
