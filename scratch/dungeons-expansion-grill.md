# Dungeons Expansion — Grilling Notes (design settled)

**Status:** Grilling complete. Design settled, and both plans written.
**Shipped from this:** `docs/plans/active/dungeon-outside.md` (next up) and
`docs/plans/active/dungeon-connections.md` (active, not next), plus updates to
`docs/areas/dungeons.md`, `docs/README.md`, `docs/PLAN_TEMPLATE.md` and `.agents/skills/plan/SKILL.md`.
**Outstanding:** work order
`docs/plans/active/orders/documentation-multi-active-plans/01-multi-link-active-plan.md` — a one-line
`check_docs.py` change so a guide's `Active plan` line can list more than one plan. The checker fails
on `dungeon-connections.md` until it lands.

The user's opening brief: a major expansion covering **clearness of visuals, different wall types,
outside as a legit place, connecting dungeons (and the areas between them), a world map built from
multiple dungeons, and getting the outside "dead space" to the correct size.**

---

## Grounding facts (verified in code)

- **Walls are not data.** `roomWallSegments(room)` derives a room's perimeter edges;
  `nonDoorWallSegments` subtracts door edges; the renderer strokes what remains. No wall record, no
  wall id.
- **A door is already a sparse override of one derived wall edge**, matched by
  `findDoorAtEdge({cell, side})`.
- **`.maplab-wall` is `stroke-width: 4`, `--md-on-surface-variant`.** Selection is `stroke-width: 5`
  + `--md-primary`; hover is `--md-outline` (`MapLabPage.css:274-299`). **Weight and `--md-primary`
  are the language of state**, which is why wall *kind* may not use them.
- **The canvas is SVG with a live `<defs>`** (`MapLabPage.tsx:429`) already holding the unknown-space
  `<pattern>`. Textured strokes, `feTurbulence` roughening, and markers are all available.
- **Doors deliberately satisfy never-hue-alone by shape** (`maplabModel.ts:238`).
- **Dead space is one number.** `MapLayoutMeta.padding = 3`, uniform. `paddedBounds()` =
  `layoutBounds(rooms)` + padding — **derived from rooms only**, so anything outside the room union
  is clipped.
- **Zoom range is 0.25–3** (`useMapCanvasZoom.ts:22-24`), `BASE_PX_PER_UNIT = 64`.
- **Rooms are hard-blocked from overlapping rooms** on the same floor and must be connected
  polyominoes (`maplabEditor.ts:176-180`).
- **`Inspectable` is a tagged union of authored objects** (`maplabModel.ts:622`) — room, door, stair,
  prop, portal. There is no concept of inspecting a cell.
- **Floors are `{ z, title }`**; `createEmptyMapLayout` always seeds `z: 0`. `GhostFloorLayer` already
  draws the floor below faintly for alignment.
- **Session state is `useState` inside `MapLabPage`** (`MapLabPage.tsx:170-172`) — `doorSessions`,
  `stairSessions`, `portalSessions`. Component-local, persisted nowhere. Only toolbar-tray collapse
  is `localStorage`-backed (`useToolbarTrayCollapse`, `MapLabPage.tsx:105`).
- **Routes are `dungeons/:dungeonId`** (`router.tsx:42`), so another dungeon unmounts `MapLabPage`.
- **`map_layout` is one blob row per dungeon**, `dungeon_id PRIMARY KEY`, `ON DELETE CASCADE`
  (`init_database.py:311`). `layouts.py` has only GET/PUT layout.
- **`UX_PATTERNS.md` §Never hue-alone is IN FORCE** — this constrained the wall-kind rendering answer.
- **`Corridor` in the area guide vocabulary was stale** — survives only in
  `archive/ingestion/parse_dungeon.py`. Now demoted to an _Avoid_ entry.

---

## Settled — captured in the active plan

All of these are written up in `docs/plans/active/dungeon-outside.md` under *Settled decisions*.
Listed here only as an index; that plan is the source of truth.

1. Outside is implicit, not painted — no per-cell terrain type, ever.
2. Wall kind lives on the room, one per room; sparse `wallOverrides` later is purely additive.
3. Two separate kind registries (edge kinds, cell-set kinds), never unified.
4. The registry bar: add a kind = one entry + one token, zero changes elsewhere.
5. Wall kinds read by **colour + texture, never weight** — weight belongs to selection.
6. **Never hue-alone is a release condition**: `solid` is the one plain kind; everything after it
   ships with a texture. Colour-only is a playtest scratch state, not a shipped state.
7. Features may overlap anything and need not be connected; rooms still may not overlap rooms.
8. Overlap is non-destructive, rooms paint opaquely over features; paint order = registry order.
9. Features carry a `z`; soft dismissible warning off `z: 0`.
10. The extent includes features — nothing authored is ever silently clipped.
11. Padding is per-side (`{n,s,e,w}`, default 3) and is a world-size control.
12. The unknown-space hatch is deleted; bare outside gets its own token shade.
13. Bare squares hold no data; clicking one opens an action menu that reads from the registry.
14. Square grid only. The hex world map is **not** a zoomed-out version of this and shares nothing —
    outside space at 5ft/square and a hex covering a quarter-mile are different objects.

---

## Settled — now `docs/plans/active/dungeon-connections.md`

Written up as an active-but-not-next plan; it inherits the next-up slot when Dungeon Outside
completes. Summarised here for continuity. Three stages, in this order.

### Stage 1 — Permanent session state

Session toggles are permanently stored **on the backend**, not `sessionStorage`. A new per-dungeon
state record with its own table and endpoints — *not* fields inside the `map_layout` blob, because
the layout is the authored map and opening a door must not dirty the map document.

**One live state per dungeon, plus a "Reset dungeon" action.** Named runs (separate states per group
of kids) were considered and deferred as far off; a run id is a column that can be added later, at
which point today's single state becomes the default run.

This stage stands alone and is worth doing regardless of gateways — it fixes the existing bug where
refreshing the page mid-session loses everything. It is also the **least understood stage in the
whole expansion**: how tangled those three `useState` hooks are with the rest of that large component
is the biggest unknown, and `to-orders` should measure it rather than assume.

Not coupled to the Loom. A `loom_sessions` table exists and is a natural future hook, but wiring it
now would drag the Loom into this.

### Stage 2 — Optional destinations and the resolve list

**`to` becomes optional on a portal** — "this goes somewhere, I'll decide later" is a legitimate,
saveable state.

**A "to resolve" list, connections only.** One membership test: *there is a link here that does not
have two ends.* Three row types — portals with no destination; incoming links with no return;
gateways whose target dungeon was deleted. Each row has an obvious action.

General map hygiene (rooms with no doors, untitled rooms, unreachable floors) was **rejected**: it
turns a to-do list into a linter, and linters accumulate rules nobody agreed to and then get ignored
because they're always yellow. A room with no doors might be exactly what you meant.

Doing this before gateways means the list ships useful immediately — it covers unfinished in-dungeon
portals — and the cross-dungeon rows later slot into an existing surface.

### Stage 3 — Gateways

`MapPortal.to` gains an optional dungeon reference: `to: { dungeon_id?, z, cell }`. Absent = same
dungeon, so every existing portal keeps working. Chosen over a new edge-level property and over a new
`exit` feature kind: one nullable field, and it inherits pairing, `PassageFlags` and DCs for free — a
*barred* portcullis or a *hidden* mountain pass between dungeons costs nothing extra.

**Links are one-way in the data, paired in the UI.** In-dungeon portals auto-pair today, which is a
local edit to one document. Across dungeons, auto-pairing would mean writing into a second dungeon's
layout blob — a document you have not opened and may have open in another tab. One blob row per
dungeon, no locking: that is a real way to lose work. Instead the target dungeon's editor *shows*
incoming links — "The Castle links here, at square 2,9" — with a one-click **Add the return
gateway**. Nothing is written unless you are in that dungeon.

**Deleting a dungeon is never blocked and never cleans up after itself.** Because links are one-way,
deleting the Crypt cannot corrupt the Castle — it turns that gateway into a resolve-list row with
`[repoint]` and `[remove]`. No delete-blocking, no scanning every layout on delete, no silent editing
of another dungeon's map. No DB constraint could enforce this anyway: the reference lives inside a
JSON blob.

**No portal kinds in this pass.** A road head and a magic teleporter are distinguished by their
title. The distinction that matters — *does this leave the dungeon?* — is already in the data the
moment `dungeon_id` exists and renders automatically, so it cannot be forgotten the way a kind field
can. A portal-kind registry stays purely additive if playtesting asks for it.

### UX decisions for that plan (settled, drop straight in)

```
Surface:      Map Lab session view + editor (existing rows). The resolve list is a new
              region inside the editor, not a new route — it needs the map beside it.
Mode:         both. Following a gateway is play; resolving links and resetting is prep.
Operator:     DM.
Focal:        in the resolve list, the unfinished connection — each row leads with what
              is broken; its action button is the only emphasised control in the row.
Route shape:  existing routes. A gateway navigates in the same tab; permanent state is
              what makes that safe.
Edit style:   inline panel. Picking a destination is pick-from-a-list in the inspector,
              never a typed coordinate, never a modal over the canvas.
Save:         autosave on edit, matching the existing Map Lab editor. Session toggles
              write through immediately — a toggle is not a form.
Empty:        "Every connection has both ends. Nothing to resolve."
Filtered empty: n/a — the list has no filter. Adding one needs its own distinct copy.
No selection: "This portal has no destination yet. Choose where it leads."
Load failure: StatePanel error fills the resolve-list region only; the canvas keeps its
              map. A link-state failure must not blank the board mid-session.
Action failure: inline beside the failing control, role="status", persists until the next
              action. No toasts — none exist and none are to be introduced.
Destructive:  "Reset dungeon" via ConfirmDialog — 'Reset "<name>"? Every door, trap, and
              toggle returns to its authored state. This cannot be undone.'
              Removing a broken gateway uses the standard delete confirmation.
Keyboard:     DOM order. Resolve rows are ordinary buttons traversed with Tab, not a
              listbox. Escape closes the ConfirmDialog unless pending.
Touch:        48px floor on resolve actions and the reset control. No new exceptions.
```

---

## Deferred, deliberately

- **Hex world map.** Dungeons pass directly one → another for now; no geometry between them. A
  secondary hex map with dungeons placed on it may come later. The scale problem that killed "one
  continuous 5ft grid": `cellSizeFt` is 5, so a mile is 1,056 cells and a day's march is 21,120.
  Nothing in this expansion assumes a square grid for that later layer, and nothing is shared with
  it — see settled decision 14.
- **Sparse `wallOverrides`** (per-edge exceptions to a room's wall kind). Purely additive; expected
  follow-up after playtesting.
- **Portal kinds registry.** Additive if playtesting asks.
- **Named runs** (multiple session states per dungeon). Far off; a run id column later.
- **DM/player split.** The right home for invisible/secret map information; would cover rooms, props
  and doors alike, not just squares.
- **Loom coupling** for dungeon session state.

---

## Process reminders

- Per `CLAUDE.md`: Claude writes the Plan and work orders, never implementation code. `plan` →
  `to-orders` → (small model) `implement-order` → `reconcile`.
- **An area may hold several active plans; exactly one is next up.** Write a plan as soon as its
  design is settled — do not wait for a slot, and do not invent a "queued" plans directory. The area
  guide's `Active plan` line lists them in order, first one marked `(next up)`.
- Run the checker via the repo venv: `.venv\Scripts\python.exe scripts/check_docs.py --check`.
- User's stated preference: **one plain-language question at a time, with ASCII previews built from
  real data.** Jargon and skipped steps lose them.
