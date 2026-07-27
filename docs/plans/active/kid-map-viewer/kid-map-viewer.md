# Kid Map Viewer — the tablet gets the DM's map, and colour a child can say out loud

> **Status:** Stages 1-6 shipped. Next: Stage 7, let the DM say where the party is. Supersedes [Kid Map Legibility](../../done/kid-map-legibility/kid-map-legibility.md)
> (Stages 1-3 shipped, then closed). Written from two grilling
> sessions on 2026-07-27 against `/play/map` on dungeon 4.

- **Area guide:** [Players](../../../areas/players.md)

## What we're building & why

The kid map was built as its own small renderer and it cannot be read. The reason is not contrast —
measured, the kid map beats the DM viewer on every ratio and still looks like graph paper. The reason
is **scale**: the DM canvas fixes 64px per map unit and lets you zoom, while the kid renderer derives
its scale from fitting all four floor plates into one viewBox, so a 5ft square lands between 7.3px
and 29px and the renderer has no idea how big anything really is. Walls go sub-pixel, labels fade,
badges swell to three times their cell. So this plan stops maintaining a second renderer: the kid map
is rebuilt on the **same canvas the DM already uses**, one floor at a time, with absolute zoom, real
pan and pinch, and the DM's own drawing rules — quiet fill, loud wall, no per-cell grid.

The second half is a language. The map currently carries meaning in 26 accent colours that were each
generated to the same lightness, so hue does 100% of the work and six of them read as "orange" to a
child. Instead, colour answers exactly one question — *which family of thing is this* — across four
families a six-year-old can name to a four-year-old: **green goes somewhere** (stairs, portals),
**yellow is a way through** (doors, windows), **blue is a thing** (chests, barrels, statues),
**pink is a person** (NPCs). Icons say which specific thing, badges say what state it is in, and the
four colours are computed together by a solver rather than eyeballed, so they can be re-derived later
without touching a single meaning. Everything else that wanted a colour — *here*, floors, terrain,
wall kinds — is resolved without spending one, because large areas get texture and lightness while
only small objects get hue.

## UX decisions — Kid map (`/play/map`)

```text
Surface:      Kid map (/play/map) — existing Surfaces row in areas/players.md, unchanged.
Mode:         play.        Operator: kid (UX_PATTERNS §Operators → Kid).
Focal:        the party's room. Rooms win by area and by being the only thing on the plate
              carrying a texture; every marker is a small disc that must not out-shout them.
Route shape:  Viewer — the same canvas as the Map Lab viewer, with none of its chrome.
Default view: the party's floor only, centred on the party's room, at a zoom where a 5ft
              square is ~48px on screen. With no party marker set, fall back to fitting the
              lowest floor.
Zoom range:   absolute, inherited from the shared canvas (64px per map unit, scale 0.25-3).
              The four-plates-in-one-viewBox layout is retired entirely.
Party room:   filled a step brighter in the same neutral, plus a screen-locked hatch, plus
              its name always drawn. No party marker, and no hue — "the stripy room" is the
              spoken handle, and it can never collide with "the green ones are stairs".
Names:        constant on-screen size at every zoom, anchored on a cell the room owns,
              faded when the run of owned cells around the anchor cannot hold them. The
              party's room keeps its name at every zoom. Rooms with no squares draw nothing.
Markers:      a filled disc in the family colour with the glyph on top, glyph colour computed
              black-or-white per family. Sized in constant pixels against the cell, never in
              viewBox units. Co-located markers fan out on the shared grid offset instead of
              hiding each other.
Doors:        a yellow disc straddling the wall segment, with the wall running through it.
              When open, a leaf swings into the room; when closed, no leaf. Windows are the
              same disc with a window glyph and never a leaf. Open/closed only — locked,
              trapped and hidden do not reach the tablet.
Stairs:       a green disc with an up or down chevron and no numeral. Tapping it changes
              floor. Portals are a green disc with their own glyph and no destination cue.
Hidden:       terrain (river, trees) and wall kinds (natural, open) do not render at all.
              Encounters never render. Data is untouched in every case.
Floors:       a stacked-slab picker — one slab per floor in real building order, current one
              lit, each carrying its raw z numeral ("-1" reads as underground). It doubles as
              the floor indicator, so there is one object, not two.
Re-centring:  follow until touched. The view follows the party while nobody has touched it;
              the first pan or pinch stops it following. One "return to current room" button
              re-centres on the room's bounds and re-arms following.
Touch:        pan, pinch-zoom, the floor picker, the return button, and stair discs — all at
              a 64px floor. Tapping a room does nothing; the inspector is kept possible and
              is not built here.
Edit style:   none. Save: none. Read-only forever.
Empty:        unchanged — "No map yet."
Filtered empty: n/a — the kid map has no filters.
No selection: n/a — nothing is selectable.
Load failure: unchanged — "The map didn't load. Ask your DM."
Action failure: n/a. A failed poll leaves the last good frame and retries silently.
Destructive:  none. Keyboard: unchanged (focusable region, arrow keys pan).
```

## UX decisions — Map Lab session view (DM)

```text
Surface:      Map Lab session view (/dungeons/:dungeonId) — Dungeons area guide owns the
              Surfaces row; this plan adds one action to it and changes nothing else.
Mode:         play.        Operator: DM.
Focal:        unchanged — the map. This plan adds one inspector action and no chrome.
Route shape:  Viewer — unchanged.
Action:       "Party is here" in the selected room's inspector. Selecting a room to read it
              never moves the marker — only the deliberate action does.
State:        stored per dungeon in the session blob beside the door/stair/portal overrides,
              so it survives switching dungeons and is cleared by the existing
              "Reset dungeon" action. Not on the global at-the-table pointer.
Feedback:     the action reads as set on the room that currently holds the marker, the way
              "At the table" does on the toolbar.
Edit style:   direct control in the existing inspector panel. Save: immediate, like the
              other session overrides.
Empty / Filtered empty / No selection / Load failure: unchanged — this plan adds no region.
Action failure: inline beside the "Party is here" button, role="status".
Destructive:  none — moving the marker is reversible by moving it again.
Keyboard:     the button joins the inspector's existing tab order; Enter/Space activate.
Touch:        48px floor (DM surface).
```

## Stages

1. **One canvas, two apps.** Promote the canvas, its zoom/pan, the grid, and the *dumb shape* half of
   the markers out of the Map Lab feature folder into a neutral shared module, leaving every piece of
   DM semantics behind. The kid app is currently forbidden by a mechanical test from importing any of
   it, so this is the gate everything else waits on. Neither app changes visibly.

2. **The curtain decides per field, in three states.** Every kid-visible field is declared `never`,
   `always`, or `whenKnown`, checked exhaustively by the compiler so adding a field to the model fails
   the build. The curtain **strips** what it does not declare rather than trusting components to
   ignore it, and encounters are stripped here. `whenKnown` has no knowledge record to read yet, so it
   resolves to hidden — it exists now so that the fog plan fills in a record and nothing else moves.

3. **The kid map becomes the viewer.** Rebuild the kid renderer on the shared canvas: one floor at a
   time, absolute zoom, real pan and pinch, and the DM's own CSS so the two can never drift again. The
   per-cell grid goes, walls get a real pixel width, terrain and wall kinds stop rendering, and most
   of the bespoke kid-map tokens disappear.

4. **Floors you can see the shape of.** A stacked-slab floor picker that is also the floor indicator:
   one slab per floor in building order, the current one lit, each carrying its raw z. Floor count is
   unbounded and z may be negative, so it has to be built from the layout rather than from a fixed
   list.

5. **A palette solved, not chosen.** A new script takes the four families and the colours they must
   not collide with, solves all four together for maximum perceptual separation inside their nameable
   hue bands with real lightness spread between them, and emits a generated token block. The
   documentation checker gates it, so a hand-edited kid colour fails the build — which is exactly the
   failure that put two identical hexes in the palette we have.

6. **Discs, glyphs and a door that opens.** Every marker becomes a family-coloured disc with a
   computed glyph: doors and windows straddling the wall in yellow, a leaf swinging in only when the
   door is open, stairs and portals in green with a chevron and no numerals, fixtures in blue, NPCs in
   pink. Tapping a stair changes floor. Co-located markers fan out instead of hiding each other, which
   is what today draws the wrong number on three of dungeon 4's five stair junctions.

7. **The DM says where the party is.** A party marker in the per-dungeon session blob, set from a
   "Party is here" action in the session view's room inspector, cleared by Reset dungeon, and covered
   by the seed export policy.

8. **Here, and getting back to it.** The party's room fills a step brighter and carries the one hatch
   on the plate — locked to screen pixels, with the room name still readable on top. The view follows
   the party until a finger touches it, and one button re-centres and re-arms following.

9. **Second table test.** Run another session on the same dungeon and record it: whether the four
   families get named out loud, whether a leaf reads as an open door, whether the stripy room reads as
   "us", whether stairs get tapped without help, whether the slab picker is understood, whether names
   are found by scanning, and whether the four-year-old can identify anything without reading. Ends
   with a filed record, as the input to the fog plan.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Promoted the shared map canvas, zoom/pan hook, grid, density resolver, and dumb marker shapes into `frontend/src/map/`, with DM importers and the layering rule updated. Stair, portal, and prop markers now render through the shared marker geometry and hit-area primitives without changing their DOM contract. |
| 2 | Added the compiler-exhaustive player curtain with `never`, `always`, and `whenKnown` field visibility maps. The transform strips DM-only and unknown fields, removes encounter markers and terrain features, preserves NPC props, and exposes the resulting `KidMapLayout` to the player map. |
| 3 | Rebuilt the kid map on the shared `MapCanvas` with absolute zoom and one-floor rendering, switched labels to the shared density signal, removed terrain and per-cell grid styling, and adopted the DM's quiet-fill/loud-wall treatment while preserving the `Dungeon map` accessibility landmark. |
| 4 | Added the unbounded stacked-slab floor picker, using raw z labels including negative floors, with a 64px touch floor and selected-state styling. The kid renderer now switches the single visible floor from the picker while preserving the lowest-floor default and existing map landmark. |
| 5 | Added a deterministic HCT-based solver for the four kid-map family colours and computed glyph colours, with contrast, separation, and reserved-colour tests. Published its generated token block in the theme and gated staleness through `check_docs.py`, with the design-system reference updated. |
| 6 | Added neutral kid marker family/icon helpers and rebuilt the player markers as constant-pixel family-coloured discs: yellow doors/windows, green stairs/portals, blue fixtures, and pink NPCs. Doors now show an open leaf only when open, co-located markers fan out, and stair discs switch floors on activation without numerals. |

## Touches

- `frontend/src/player/**`
- `frontend/src/map/**` — the neutral shared canvas module this plan creates
- `frontend/src/model/maplabModel.ts`
- `frontend/src/features/dungeons/maplab/**` — the promotion in Stage 1 and the "Party is here"
  inspector action in Stage 7 only
- `frontend/src/theme.css`
- `scripts/derive-kid-palette.mjs`, `scripts/check_docs.py`
- `backend/app/routers/session_state.py` and its schema
- `docs/table-tests/**`
- `docs/areas/players.md` — the import invariant, which Stage 1 widens to allow `frontend/src/map/`
  alongside `model/`, `api/` and `theme.css` (reconcile, not a work order: `importRule.test.ts` is a
  denylist of `features`/`components`/`layout`/`pages` and needs no code change for `map/`)

## Not in this plan

Four things this rethink surfaced belong to other areas and are queued in their guides rather than
here: moving `npc` and `encounter` out of the Map Lab fixture palette, warning in Map Lab when a
marker sits on a cell no room owns, redesigning terrain and wall kinds, and pruning the 26 DM-side
identity tints. Side-by-side floors and the fold-out are **cut and parked** — the requirement behind
them is route continuity across a floor change, which ghosting does not serve, and it should only be
revisited after children have been watched simply picking floors. Note that nothing else in this plan
addresses route continuity either; the mitigations in play are the clickable stair disc, its chevron,
and the slab picker.

## Compiler handoff

### Stage 7

- **Settled contracts:** carried over unchanged from the superseded plan, whose Stage 4 was compiled
  but never built. Party marker in the per-dungeon session blob beside the door/stair/portal
  overrides, set from a "Party is here" action in the session view's room inspector, cleared by the
  existing "Reset dungeon", and covered by the seed export policy. Not on the global at-the-table
  pointer. Selecting a room to read it never moves the marker.
- **Constraints:** `map_session_state.data` already carries `{isOpen, isLocked, trapDisarmed}` per
  fixture, so the blob's shape and its router are established; this adds a key, not a mechanism.
- **Open questions:** whether the marker stores a room id or a cell. Stage 8 highlights a **room** and
  re-centres on a room's bounds, so a room id is the natural shape, but the export policy and the
  reset path have not been read.

### Stage 8

- **Settled contracts:** there is **no party marker drawn** — the room the party is in is highlighted
  and nothing is drawn at a cell. Consequences that should not be rediscovered: the marker layer loses
  an object, so badge-crowding pressure drops for this case entirely; "return to current room"
  re-centres on a room's bounds, not a point; and "here" spends **no nameable hue**, which is why the
  colour bank still holds two.
- **Settled contracts:** the highlight is a step brighter in the **same neutral** as every other room,
  plus a **hatch**. The spoken handle is "we're in the stripy room" — not a colour word, so it can
  never collide with "the green ones are stairs". **Exactly one pattern exists, and it means here.**
  Pattern is not a general channel: a pattern marking a *floor* would cover every room on the plate,
  and the only reason a hatch works is that one room ever has it, so it is the single texture on an
  otherwise clean plate. This governs **area fills** — a dasharray on a line is a different channel and
  is not licence to texture the plate.
- **Settled contracts:** navigation is **follow until touched**. The map follows the party while
  nobody has touched it; the first pan or pinch stops it following; one "return to current room" button
  re-centres *and* re-arms following, carrying both jobs. This replaces the superseded plan's "snaps to
  the party's room whenever the marker moves", which would yank the view — possibly to another
  floor — out from under a child mid-look. The original intent survives: an untouched tablet on the
  table does point at the party.
- **Constraints:** the hatch is **locked to screen pixels**, roughly 8-10px spacing, redrawn as zoom
  changes. In viewBox units it goes sub-pixel at fit zoom and moirés on the tablet — the same defect as
  the sub-pixel walls. And the room name **must survive sitting on it**: either the hatch stays faint
  or the label gets a clear plate behind it.
- **Open questions:** none.

### Stage 9

- **Verified edit sites:** `docs/table-tests/` holds the first record,
  `2026-07-23-player-app-skeleton-stage-6.md`, which is the format to match.
- **Constraints:** the questions are listed in the Stages section above and are deliberately about
  whether the *spoken language* landed, not whether the code ran. The record is the input to the fog
  plan.
- **Open questions:** none.
