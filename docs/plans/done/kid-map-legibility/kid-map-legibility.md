# Kid Map Legibility — the tablet map reads from a child's seat

> **Status:** Closed 2026-07-27, superseded before completion. Stages 1-3 shipped; Stages 4-7 were
> never built and are **not** carried forward as written. Superseded by
> [Kid Map Viewer](../../active/kid-map-viewer/kid-map-viewer.md), which re-plans the same outcome
> from a different diagnosis.

- **Area guide:** [Players](../../../areas/players.md)

## Why this was superseded

Looking at `/play/map` on dungeon 4 after Stage 3 showed the map still unreadable, and measuring it
showed this plan had the cause wrong. It diagnosed the room fill's 1.08:1 contrast against the floor
plate as the bug and spent Stage 1 fixing it — but the DM viewer has essentially the same weak fill
ratio (1.23:1) and reads fine, because its contrast is spent on the **wall** and its wall has a real
pixel width. The kid map ended up with better numbers on every single measurement and looking like
graph paper, because the contrast went into a 7.24:1 outline around every individual 5ft square.

The actual cause is that zoom is **absolute** in the DM app (a fixed 64px per map unit) and
**derived** in the kid app (whatever fits the whole four-floor viewBox), so the kid renderer has no
sense of real size and everything downstream — sub-pixel walls, faded labels, oversized badges —
follows from that. That is a different plan, not a further stage of this one.

What happened to each shipped stage: Stage 1's palette is largely reversed (the kid map adopts the
DM's CSS instead of its own token set). Stage 2's shared `roomLabelAnchor` is good and survives
unchanged. Stage 3's doors survive in principle but change shape, and its numbered stair badges are
dropped — they were also actively wrong, drawing the wrong number on 3 of the 5 stair junctions on
dungeon 4. Stages 4-7 (party marker, follow, fold-out, table test) are re-planned in the successor;
side-by-side floors and the fold-out are cut entirely and parked.

## What we're building & why

Plan 0 put a live map on a tablet and proved the shape. The first real session then proved the map
cannot be read. Run on `Untitled Dungeon` (51 rooms, 32 doors, 5 stairs, four floors), the renderer
draws all four floor plates side by side in one `viewBox` — 10,368 × 2,176 units — which on a
~1180px tablet fits at scale 0.11: a 5ft square is **7.3px**, a room name **1.7px**, a door
**0.8px**. At the renderer's maximum zoom a room name is still 6.8px. No child was ever going to
read that. A room's fill also sits at **1.08:1** contrast against the ground it stands on, so rooms
were barely distinguishable from the floor plate at all. And twelve of the fifty-one rooms carry no
squares, yet the renderer still drew their names — twelve room titles floating on bare grid, which
is exactly the "orphaned" labels the record reports.

What worked was the thing the project rests on: they navigated room to room and across floors, and
they treated the map as a place. So this plan does not rethink the idea — it makes the drawing
honest. Rooms read as rooms, doors read as ways through, stairs say where they come out, and the
tablet points at where the party actually is instead of at the whole building at once. The DM gains
one control ("Party is here") and the tablet gains no controls at all beyond a single fold-out for
planning routes between floors. Nothing here conceals anything: the curtain stays a pass-through and
Plan 1 still owns fog.

## UX decisions — Kid map (`/play/map`)

```text
Surface:      Kid map (/play/map) — existing Surfaces row in areas/players.md, unchanged.
Mode:         play.        Operator: kid (UX_PATTERNS §Operators → Kid).
Focal:        the party's room. Rooms remain the focal element; doors, stairs and names are
              reinforcement and must not out-shout them.
Default view: the party's room, centred, at a zoom where a 5ft square is ~48px on screen —
              about 24x15 cells of a 39x34 floor. One floor only: the party's.
              With no party marker set, fall back to the current fit-the-floor view.
Zoom range:   minimum = the party's floor fitted; maximum generous. The four-plates-in-one-
              viewBox layout is retired from the default view and lives only in the fold-out.
Party room:   filled, always named, and pinned with an icon — three signals, because
              Never hue-alone and Never text-alone both bind on a kid surface.
Names:        constant on-screen size at every zoom, anchored at a point guaranteed to lie
              inside the room's own squares, faded out when the room is too small to hold
              them. The party's room keeps its name at every zoom. Rooms with no squares
              draw nothing at all — no cells, no name.
Doors:        the wall breaks at a doorway. Closed draws a leaf across the gap; open swings
              the leaf with its arc. Held at a size that can never go sub-pixel.
              Open/closed only — locked, trapped and hidden stay invisible; that is Plan 2.
Stairs:       drawn, with a badge at each end carrying the same number and an up/down arrow.
              The badge reads on a single floor; the connector line is fold-out only.
Fold-out:     one 64px control slides out a horizontally-scrolling strip of floor pairs —
              two floors on screen at once, stair connector lines drawn across the gap.
              Re-folding returns to the party's floor. It is a view, never an exit.
Re-centring:  the view snaps to the party's room whenever the marker moves. Double-tap
              anywhere re-centres — the gesture the six-year-old already reached for.
Touch:        pan, pinch-zoom, double-tap, and the fold-out control (64px floor).
Edit style:   none. Save: none. Read-only forever.
Empty:        unchanged — "No map yet."
Load failure: unchanged — "The map didn't load. Ask your DM."
Action failure: n/a. A failed poll leaves the last good frame and retries silently.
Destructive:  none. Keyboard: unchanged (focusable region, arrow keys pan).
```

## UX decisions — Map Lab session view (DM)

```text
Surface:      Map Lab session view (/dungeons/:dungeonId) — Dungeons area guide owns the
              Surfaces row; this plan adds one action to it and changes nothing else.
Action:       "Party is here" in the selected room's inspector. Selecting a room to read it
              never moves the marker — only the deliberate action does.
State:        stored per dungeon in the session blob beside the door/stair/portal overrides,
              so it survives switching dungeons and is cleared by the existing
              "Reset dungeon" action. Not on the global at-the-table pointer.
Feedback:     the action reads as set on the room that currently holds the marker, the way
              "At the table" does on the toolbar.
Touch:        48px floor (DM surface). Destructive: none — moving the marker is reversible
              by moving it again.
```

## Stages (historical — 1-3 shipped, 4-7 never built)

1. **A room looks like a room.** Give the kid map its own contrast rules instead of inheriting the
   DM's dark surface stack — rooms clearly raised off the ground, walls solid, doors distinct from
   both — and stop drawing anything at all for rooms that have no squares.

2. **Names that stay readable.** One shared helper that returns a label anchor guaranteed to sit
   inside a room's own squares, replacing the four duplicated centre-of-room functions across the
   player renderer, the Map Lab editor, the viewer and the ghost layer. Kid names then hold a
   constant on-screen size and fade below the size their room can hold. **This plan owns the label
   work for both apps**; Map Lab Editor Usability Stage 5 keeps fit, the zoom clamp and canvas
   chrome only.

3. **Doors and stairs you can find.** Doors break the wall, with a leaf across the gap when closed
   and a swing arc when open, at a size that can never go sub-pixel. Stairs draw with numbered
   up/down badges at both ends. Nothing about locks, traps or hidden passages reaches the tablet.

4. **The DM says where the party is.** A party marker in the per-dungeon session blob, set from a
   "Party is here" action in the session view's room inspector, cleared by Reset dungeon, and
   covered by the seed export policy.

5. **The tablet points at the party.** The kid map polls the session blob alongside the layout, so a
   door the DM opens appears within one poll and the marker is live. It shows the party's floor,
   centred on their room at a readable zoom, snaps back when the marker moves, re-centres on
   double-tap, and draws the party's room filled, named and pinned.

6. **The fold-out.** One control slides out the floor strip: two floors at a time, scrolling
   horizontally, with stair connector lines joining the numbered badges across the gap. Re-folding
   returns to the party's floor.

7. **Second table test.** Run another session on the same dungeon and record it, against the
   questions written from the first test — doors found without help, names found by scanning, the
   marker read as "us", the snap-back judged, the fold-out used for routes, stairs followed, rooms
   distinguishable at standard brightness, an opened door noticed, and whether the four-year-old can
   identify anything without reading. Ends with a filed record, as the input to Plan 1.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | The kid map stopped inheriting the DM dark surface stack: seven `--kid-map-*` aliases in `theme.css` repaint rooms as lit paper on dark ground (room fill 11.57:1 against its floor plate, up from 1.08:1), with walls solid and doors warm and heavier than walls. `PlayerMapRenderer` now draws nothing at all for a room with no squares, removing the twelve orphaned room names the table test found. |
| 2 | A shared `roomLabelAnchor` now places titles on an owned room cell across the kid map, Map Lab editor, ghost layer, and viewer, including notched and ring-shaped rooms whose centroid falls outside their geometry. Kid-map titles remain 16px on screen through fit and zoom transforms, keep a proportional halo, and fade when their room is too small to contain them. |
| 3 | Kid-map doors now draw a constant 8px leaf across the wall gap when closed and a hinged leaf with swing arc when open, while exposing only the open/closed distinction. Stair endpoints now carry constant-size, matching numbered badges with up/down arrows, using dedicated high-contrast kid-map stair tokens. |

## Touches

- `frontend/src/player/**`
- `frontend/src/model/maplabModel.ts`
- `frontend/src/features/dungeons/maplab/` — the room-label anchor call sites and the
  "Party is here" inspector action only; the rest of Map Lab belongs to
  [Map Lab Editor Usability](../../done/maplab-editor-usability/maplab-editor-usability.md).
- `backend/app/routers/session_state.py` and its schema
- `docs/table-tests/**`

## Planning byproducts

Contrast measurements behind Stage 1, run against `frontend/src/theme.css` — re-run this to check
whatever the new kid-map tokens land on:

```python
def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def L(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) for i in (0, 2, 4)]
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
def cr(a, b):
    la, lb = L(a), L(b); hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
```

Measured today: floor plate `--md-surface-2` `#28262e` vs room fill `--md-surface-3` `#2e2b35` =
**1.08:1**; room fill vs its outline `--md-outline-variant` `#49454f` = **1.49:1**; page background
`--md-surface` `#1c1b1f` vs floor plate = **1.15:1**. For scale, `--md-door` `#F9B79F` on the room
fill is 8.13:1.

Render arithmetic behind Stages 5–6, from `PlayerMapRenderer.tsx` (`CELL_SIZE 64`, `FLOOR_GAP 128`,
`MAX_SCALE 4`) and the exported layout for dungeon 4 (extent 33×25 cells, padding L3 R3 T3 B6):

```text
4 plates side by side = 4*(39*64) + 3*128 = 10,368 x 2,176 units
on 1180x740:  scale 0.114  ->  cell 7.3px, name 1.7px, door 0.8px
at MAX_SCALE 4:              cell 29px,  name 6.8px, door 3.2px
one floor at cell 48px:      shows ~24x15 of 39x34 cells
two floors side by side:     80x34 cells on 1180px -> cell 14.7px
rooms per floor:             38 / 11 / 1 / 1   (two plates hold one room each)
```
