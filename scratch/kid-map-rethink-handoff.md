# Kid map rethink — settled decisions and handoff

**What this is.** The output of two grilling sessions on 2026-07-27, triggered by looking at
`/play/map` on dungeon 4 and finding it unreadable. Session 1 settled the code split, the drawing
rules and the shape of a colour system; session 2 closed the colour system out and resolved every
colour-related open question. It settles a set of decisions that
**supersede parts of `docs/plans/active/kid-map-legibility/kid-map-legibility.md`** and parts of
`scratch/dm-player-split-intent.md`. It is a planning input, not a plan — no work orders here.

**What it supersedes.** Specifically:

- `dm-player-split-intent.md`, Plan 0's decision *"The pure map model is promoted to a neutral
  location; the renderer is not. The kid map gets its own renderer."* That was right about markers
  and wrong about the canvas. See §3.1.
- `kid-map-legibility.md` UX block: the `Zoom range`, `Names`, `Doors`, `Stairs`, `Fold-out` and
  `Re-centring` lines. See §3.
- `kid-map-legibility.md` Stages 5, 6 and the shipped Stage 1 palette work. See §5.

**Reading order.** §1 is measured fact — do not re-derive it. §2 is the colour system. §3 is the
settled decision list, which is the thing a plan should be compiled from. §4 is what remains open —
three items, none of them colour.

---

## 1. Verified facts

All measured on 2026-07-27 against the live app and the exported layout for dungeon 4
(`Untitled Dungeon`, 4 floors). Do not re-derive these.

### 1.1 The DM map code splits into four layers, not two

| Layer | Files | LOC | Kid needs it? |
|---|---|---|---|
| **Canvas + zoom/pan** | `MapCanvas.tsx`, `useMapCanvasZoom.ts`, `canvasGrid.ts` | 612 | **Yes, wholesale.** Zero dungeon semantics. |
| **Geometry** | `maplabModel.ts`, `roomLabelAnchor` | (already shared) | **Yes.** Pure functions. |
| **Markers** | `DoorMarker`, `StairMarker`, `PropMarker`, `PortalMarker`, `BadgeRing`, `GhostFloorLayer` | 683 | **Shape yes, semantics no.** Every one computes `markerBadges()` from `locked`/`trapped`/`hidden` and draws it. |
| **DM chrome** | `MapLabPage.tsx` (room rail, inspector, toolbar, floor tabs, edit link) | 1001 | **No.** |

### 1.2 Zoom is a different model in each app, and that is the legibility bug

```
DM      BASE_PX_PER_UNIT = 64, scale 0.25-3      -> a 5ft square is 16px to 192px, ABSOLUTE
kid     scale derived by fitting whole canvas    -> a 5ft square is 7.3px to 29px on a 1180px tablet
```

The kid renderer has no absolute sense of size. Everything downstream — sub-pixel walls, faded
labels, oversized badges — follows from this.

### 1.3 Stage 1's palette diagnosis was correct about symptom, wrong about cause

```
DM VIEWER                                    KID MAP (Stage 1 as shipped)
room fill vs ground     1.23:1               room fill vs plate    11.57:1
wall vs room fill       8.14:1  <- signal    wall vs room fill     13.28:1  at 0.68px wide
title vs room fill     10.76:1               per-cell grid          7.24:1  at 0.11px wide
no per-cell grid                             a grid line on EVERY 5ft square
```

The DM viewer has essentially the same weak fill-vs-ground ratio the plan diagnosed as a bug
(1.23:1 vs the 1.08:1 it complained about) and is legible anyway, because the contrast is spent on
the **wall**, and the wall has a real pixel width because zoom is absolute. The kid map has better
numbers on every measurement and looks like graph paper, because the contrast went to a 7.24:1
outline around every individual 5ft square.

**The rule: quiet fill, loud wall, no per-cell grid, absolute zoom.**

### 1.4 Defects in shipped Stages 1-3

These are bugs against what those stages claimed to ship, not new scope:

1. **Stair badges stack.** Where two stairs share a cell, both endpoints render at identical
   coordinates and one hides the other. On dungeon 4: floor 1 (6,-12) draws `1` and `6` (only `6`
   visible); floor 1 (8,-17) draws `3` and `4` (only `4`); floor 2 (8,-17) draws `4` and `5` (only
   `5`). **3 of 5 stair junctions are wrong** — climbing stair `1` lands you beside a badge reading
   `6`. `PlayerMapRenderer.tsx:267-290` ignores `gridMarkerOffset` / `markersAtCell` /
   `MAX_MARKERS_PER_CELL`, which the model already exports and the DM markers already use via their
   `offset` and `grouped` props.
2. **Badges are ~3x the cell.** `STAIR_BADGE_R_PX 16` = a 32px circle on an 11.9px cell (7.3px on
   the tablet). It covers a 3x3 block and clips room names — visible as `Ro...4` over "Room 4".
3. **Walls are sub-pixel.** `.player-map-wall { stroke-width: 6 }` and
   `.player-map-room-cell { stroke-width: 1 }` are **viewBox units, not px** — 1.1px and 0.19px at
   fit scale; 0.68px and 0.11px on the tablet. Doors got constant-px treatment in Stage 3; walls
   never did.
4. **The label `fits` test measures the wrong box.** `PlayerMapRenderer.tsx:207-209` compares
   `title.length * 0.55 * 16px` against the room's **bounding box**, but the anchor is a single cell
   with `text-anchor: middle`. L-shaped and narrow rooms pass the test and then spill their label
   onto bare floor ("Room 62" on floor 1). It should measure the run of owned cells around the
   anchor.
5. **40 of 49 room names are `opacity: 0`** at the default view. The fade rule works as specified;
   the spec assumed a zoom-to-party default that never shipped.

Also: **stair 2's upper endpoint (floor 1, cell (2,1)) sits on a cell no room owns** — a badge
floats on bare plate. Authored-data problem, but Map Lab permitted it and the tablet draws it.
Resolved by §3.13.

### 1.5 Plates are padded to the whole layout's bounds, not their own

```
floor z=0   own content  33 x 25 cells   drawn on a 39 x 34 plate
floor z=1   own content  21 x 18         drawn on a 39 x 34 plate
floor z=2   own content  19 x 16         drawn on a 39 x 34 plate
floor z=3   own content   4 x  4         drawn on a 39 x 34 plate   <- 12 cells on a 1326-cell plate
```

Consequence for a side-by-side strip: 162 cells wide with shared bounds, **83 with per-floor
cropping**. Relevant only if side-by-side ever returns (§4.1).

Also: the plan's *"rooms per floor: 38 / 11 / 1 / 1"* is stale. Actual is **29 / 11 / 8 / 1**.

### 1.6 The existing palette cannot carry meaning

26 content-role accent colours. **Every one lands at 10.0-10.1:1 against `--md-surface`** — they
were each generated to the same tone, so lightness carries *zero* information and hue does 100% of
the work. Six read as "orange" to a child, four as "red", four as "blue", three each as
purple/green/teal. `--md-boss` and `--md-loom-thread-1` are the **same hex** (`#FFB1C1`);
`--md-passage-locked` `#C5C0FF` and `--md-loom-thread-5` `#C4C0FF` differ by one unit.

Root cause: `Blend.harmonize()` toward a single seed plus uniform tone-stepping. Coherence is
precisely what destroyed distinguishability. §1.8 names the exact tool and lines.

### 1.7 `scratch/colour-advice.md` — architecture sound, palette not usable

Adopt its *reasoning*; do **not** adopt its hex values. Verified failures:

- Four claimed contrast ratios are materially wrong (Grey −2.75, Gold +2.21, Purple +1.57, Teal
  +1.20) and the claimed luminance order is not the actual order.
- The grayscale stepping the architecture rests on isn't there: Pink/Purple **ΔL\* = 0.0**,
  Grey/Blue 0.4, Blue/Purple 1.4, Blue/Pink 1.5.
- Its CVD claims are wrong under Viénot simulation: "Yellow safe for all CVD types" collides with
  Gold in all four conditions; Green/Red ΔE = 17.6 under deuteranopia ("prevents muddying" — it
  muddies); Pink is identical to Teal (8.0) and Grey (8.3) under deuteranopia; Teal/Grey ΔE = 6.7.
  Yellow/Gold collide at ΔE 15.9 in **normal** vision.
- Says "these 9 semantic buckets", lists 10.
- Its §1 ("cannot use lightness as a modifier") and §2 ("distinct luminance stepping") read as
  contradictory. They aren't — the first means two lightnesses of one hue must never mean two
  different *things*; the second means two different hues must not land on the same luminance — but
  stated loosely an implementer will lose one of them.

**No CVD at this table** (confirmed by the user — neither child, nor the DM). CVD is therefore not a
hard constraint. It is not designed against, and §2.6 explains why that costs nothing later.

### 1.8 The palette is quantised onto two tones, and one tool did it

`scripts/generate-md3-tokens.mjs` is the mechanical cause of §1.6. Its signature is
`--seed <hex> --role <name>`: **one role per invocation.** It therefore cannot see the colours
already in the palette and is structurally incapable of separating a new colour from the existing
ones. It then does two things that guarantee collapse:

```
Blend.harmonize(seedArgb, 0xffd0bcff)     pulls every hue toward one violet
Hct.from(hue, chroma, 80 / 20 / 30 / 90)  pins every output to four fixed tones
```

It is **not wired into `check_docs.py`**, so nothing has ever flagged the result. Measured L\* of
what it produced:

```
wall             #cac4d0   L* 79.9        outline-variant  #49454f   L* 30.0
door leaf        #F9B79F   L* 79.9        river fill       #004B71   L* 30.0
natural wall     #86D5C1   L* 79.9        trees fill       #005143   L* 30.1
                                          kid door         #683B29   L* 30.0

plate  #1c1b1f  L* 10.0     surface-1  #232128  L* 13.2
surface-2  #28262e  L* 15.7  surface-3  #2e2b35  L* 18.2
```

Tone 80 and tone 30, exactly as the script's constants dictate.

### 1.9 The door is invisible against the wall, at 1.001:1

The long-standing door legibility complaint is now measured. A door is drawn as a **stroke replacing
a wall segment** (`nonDoorWallSegments()` excludes the segment so the two never draw on the same
line), which means the door stroke and the wall stroke abut end to end:

```
.maplab-wall       stroke var(--md-on-surface-variant) #cac4d0  width 4   (MapLabPage.css:376)
.maplab-door-leaf  stroke var(--md-door)               #F9B79F  width 6   (MapLabPage.css:397)

contrast  1.001 : 1        dL*  0.05
```

Two thin strokes at **identical lightness**, differing only in hue, meeting end to end. Hue is doing
100% of the work at the size where hue does least. This is not a tuning miss; it is inherent to
drawing a door as a stroke on a line, and it is why §3.10 changes the geometry rather than the hex.

`.maplab-wall[data-wall-kind='natural']` is `#86D5C1`, also L\* 79.9 — **1.001:1 against the default
wall too**, distinguishable only by its dasharray.

### 1.10 Other structural facts confirmed this session

- **`layout.floors` is unbounded and `z` may be negative.** Nothing caps floor count; basements are
  legal. Any fixed per-floor palette would break, which is one reason §3.5 rejects floor colours.
- **A stair has exactly two endpoints** (`from` / `to`), so `otherFloorZ(stair, currentZ)` always
  yields one destination. A token never has to show two directions. Two *different* stairs sharing a
  cell is the §1.4.1 case, handled by `gridMarkerOffset`.
- **`wallKind` is a property of the room, not of an edge** (`maplabModel.ts:26`, applied at
  `MapLabPage.tsx:818`). `open` restyles a room's entire perimeter; it has never marked a specific
  passable gap. Hiding wall kinds therefore costs no route information (§3.12).
- **NPCs and encounters are already separate entities.** The `npcs` and `encounter` tables hold the
  real records; `map_layout.props` holds only a **pin** — a cell plus `npc_id` / `encounter_id`.
  `npcIdsFromMarkersInRoom()` (`maplabModel.ts:512`) reads those pins back out. The complaint about
  them "being props" is an authoring-palette complaint, not a storage one (§3.14).
- **Door open/closed is session state, not knowledge state.** `map_session_state.data` carries
  `{isOpen, isLocked, trapDisarmed}` per fixture. `isOpen` is therefore `always`-visible under §3.2;
  `isLocked` is `whenKnown`.

---

## 2. The colour system

### 2.1 What colour is for

```
COLOUR  ->  which family of thing is this?      the spoken handle across the table
ICON    ->  which specific thing is it?         chest vs barrel vs statue
BADGE   ->  what state is it in?                locked / trapped / hidden / searched
```

Three channels, three questions. Colour never has to compete with itself, and `Never hue-alone` is
satisfied structurally rather than by remembering to add a second cue.

### 2.2 The governing principle

Settled in session 2, and it decides more arguments than the family list does:

> **Large areas get texture and lightness. Small objects get hue.**

Hue on a 30-cell room fill fights the 20-pixel discs sitting on top of it and wins — which is the
§1.3 failure inverted. So the *here* highlight, the floor identity, the walls and the plate are all
resolved without spending a single nameable hue, and the four hues that do get spent go to the
smallest objects on the map. Every §3 decision below that looks like restraint is this principle
being applied.

### 2.3 Locked / trapped / hidden are icon badges, not colours

They are **sub-attributes of a type**, so colouring them would fight the type's own colour. They
become modifiers on the type icon. This is continuous with existing DM convention rather than new:
the DM already dashes hidden markers (`StairMarker.tsx:74`) and already carries state on a badge
disc via `BadgeRing` / `collapsedStatusDescriptor`.

**Constraint this imposes:** layering a type icon plus a state badge needs pixels. The DM uses
`DOOR_BADGE_RADIUS = 8` at 64px base. It works at ~48px per cell and fails below ~20px — which is a
second, independent argument for absolute zoom and one floor at a time.

Note that under §3.2 all three of these currently resolve to hidden, so **no state badge is visible
on the kid map today.** The one state that *is* visible is door open/closed, and it is carried by
geometry rather than a badge (§3.10).

### 2.4 The families — closed list

| Family | Members | Spoken hue | Why one colour |
|---|---|---|---|
| **Transition** | stairs, portals | **GREEN** | "This takes you somewhere else." Icons separate stair from portal. |
| **Opening** | doors, windows | **YELLOW** | "This is a way into the next room." Same plane, not a transition. |
| **Fixture** | chest, barrel, statue, table, mirror, other | **BLUE** | Icons carry the type entirely. |
| **People** | NPCs | **PINK** | "The pink ones are people." Maximally far from the other three. |

Things that were candidates and are deliberately **not** spoken hues:

| | Resolution | Where |
|---|---|---|
| **Here / us** | a room highlight — brighter neutral + hatch, no hue | §3.7, §3.8 |
| **Floors** | a large translucent raw-`z` numeral in a corner | §3.5, §3.9 |
| **Terrain** | hidden on the kid map pending its own redesign | §3.11 |
| **Wall kinds** | hidden on the kid map pending its own redesign | §3.12 |
| **Encounters** | never shown on the kid map | §3.14 |

```
spoken hues used     4     green, yellow, blue, pink
in the bank          2     orange, purple
reserved             3     red   (already error/danger, --md-error)
                           grey  (already the map's own furniture)
                           brown (muddy on a dark plate; low-chroma dark orange
                                  is the worst case for "name that colour")
ceiling              ~9-10 nameable hues for a 6-year-old leading a 4-year-old
```

Why these four bands, and why pinned rather than solver-chosen: **the spoken handles are the
product.** Four families is small enough that the solver has slack either way, so trading a sentence
a child can learn for 3 ΔE nobody can perceive is a bad trade.

- **Green for transition** because *go* is already in a 6-year-old's vocabulary from every road
  crossing in their life.
- **Yellow and blue** to Opening and Fixture because they are the two most separable remaining
  bands, and doors and fixtures are the two most numerous marker types — the ones most likely to sit
  near each other in a cluttered room.
- **Pink for people** is arbitrary but sticks, and sits furthest from the other three.

### 2.5 Where a family colour lives

On a **filled disc**, with the glyph on top and the glyph's own colour **computed per family — black
or white, whichever contrasts.**

Naming a hue needs *area*. A thin outlined chest icon at cell size gives a four-year-old almost no
colour to look at, and *"the orange one"* stops working the moment they zoom out. The disc also
matches what the DM markers already do via `BadgeRing`, so the shared dumb-shape layer from §3.1
carries over rather than being reinvented.

The important second-order effect: because the glyph colour is computed, **the four discs are free
to sit at different lightnesses.** That restores lightness as a real channel. If instead every disc
had to be light enough for a fixed dark glyph, all four would be pinned to one tone — §1.8's failure
reproduced at smaller scale.

The cost, which must be respected: a filled disc is the largest object on a cell, and §1.4.2 is the
story of what an oversized badge does. **The disc is sized in constant pixels against the cell**,
never in viewBox units — the same discipline as the walls (§1.4.3) and the hatch (§3.8).

### 2.6 Why this survives without a later redesign

The user's stated requirement was *"I don't want a redesign later if possible."* This structure
delivers it, and it isn't the hexes that do the work:

- **Adding a new fixture type costs zero colours.** A new prop kind is a new icon.
- **Adding a new state costs zero colours.** A new state is a new badge.
- Only a new **family** costs a colour, and families are few and slow-moving — and there are two
  hues in the bank plus three reserved.
- Therefore the hexes can be re-derived later — for CVD, a brighter room, a different tablet —
  **without touching a single meaning.** The durable artefact is the family list, not the palette.

This is why not designing against CVD today is safe. It is also why the derivation must be a
**command** and not a grilling session (§3.6): the promise "the hexes are re-derivable" is only real
if re-deriving them is one line in a terminal.

### 2.7 Family is a render-time lookup, never a column

`kind -> family` is resolved in the renderer. It is not stored, not migrated, and not authored.

This is the seam that makes §2.6 true, and the `window` case is what proves it exists: `window` is a
**prop kind** in the data, sitting in the list next to `barrel` and `statue`, but it maps to the
**Opening** family and draws in yellow alongside doors. No data change, no migration, and next
year's new prop kind picks up a family and an icon for free.

### 2.8 Two-tier palette

This small **spoken** palette carries meaning and appears on kid surfaces. The existing 26
**identity** tints stay as DM-side authoring aesthetics — never spoken, never on a kid surface.
Pruning the 26 (duplicate hexes, collapsed hue bands) is its own job in the design area and must not
block the map.

---

## 3. Settled decisions

### 3.1 Three-way code split

Promote **layer 1 (canvas + zoom/pan)** and **layer 2 (geometry)** to a neutral shared module and
use them wholesale — this is the "clean, large, full-powered viewer" the user asked for, and it is
where absolute zoom, pinch, pan and fit already live, tested. Split **layer 3 (markers)** into a
dumb shape (glyph, ring, `offset`, `grouped`, `simplified`) that is shared, and a semantics layer
(badge/dasharray computation) that stays DM-side. Never touch **layer 4 (DM chrome)**.

Revises Plan 0's *"the renderer is not [promoted]"*.

Two things the kid map gains by inheritance: `offset`/`grouped` fixes the stair-badge stacking bug
(§1.4.1), and `resolveMapDensity(density, zoom.scale)` driving `simplified` replaces the crude
`fits` boolean (§1.4.4-5).

### 3.2 Attribute visibility is declared per field, in three states

```
never      -> pickDc, breakDc, hiddenDc, note        DM-only, permanently
always     -> door_id, cell, side, title, isOpen     structural or session state
whenKnown  -> locked, trapped, hidden                gated on the knowledge record
```

**All three declared now.** `whenKnown` currently resolves to hidden (no knowledge record exists
yet), so it behaves as `never` and does nothing — it is a **live marker for future progress**, so
that Plan 2 fills in the record and nothing else in the system changes.

Two properties that are the point of it:

- The curtain **strips** undeclared fields rather than trusting components to ignore them. A kid
  component is handed an object with no `pickDc` on it.
- With only `never` and `always` available, "enable locks" is a one-word edit that hands the kids
  every secret in the school at once. The third state makes that edit impossible to make by
  accident.

Enforcement should be compiler-exhaustive (`Record<keyof T, Visibility>` — adding a field to
`MapDoor` fails the build) rather than a hand-maintained list. `npm run typecheck` is a real
`tsc -b`; note that bare `tsc --noEmit` checks nothing in this repo.

`isOpen` sits in `always` because it comes from `map_session_state`, not from a knowledge record
(§1.10). That is what makes §3.10's open-door leaf drawable today.

### 3.3 Drawing style: adopt the DM palette and CSS outright

Quiet fill, loud wall, no per-cell grid, absolute zoom. The kid map uses the **same CSS** so the two
can never drift. Most of the seven `--kid-map-*` tokens Stage 1 added disappear.

If a bright-room test says it is too dark, the structure is right and it is a token flip rather than
a rebuild — which is what Stage 7's *"rooms distinguishable at standard brightness"* question was
already written to ask.

### 3.4 Navigation: follow until touched

The kid map follows the party while nobody has touched it. The **first pan or pinch stops it
following.** A **"return to current room"** button re-centres *and* re-arms following — it carries
both jobs.

This replaces the plan's `Re-centring: the view snaps to the party's room whenever the marker moves`,
which would yank the view — possibly to another floor — out from under a child mid-look. The
original intent survives: a tablet sitting untouched on the table does point at the party.

Note this now centres on a **room**, not a marker (§3.7).

### 3.5 Kid gets a floor picker; stairs are full clickable tokens

Clicking a stair changes floor, using the DM's existing path:
`setActiveZ(otherFloorZ(stair, activeZ))` with `destinationLabel={'go to floor ' + targetZ}`
(`MapLabPage.tsx:863,876,881`).

The kid gets a floor picker. Its **shape is open** — the DM's is a row of text pills
(`Starting Floor / First Floor / …`) which a four-year-old cannot read, against a kid-operator rule
of never-text-alone. See §4.2. It **cannot** be colour swatches, because floors get no colours
(§3.9).

### 3.6 Kid surfaces get the DM's capability and none of its chrome

In: zoom, pan, absolute scale, the clean look, and **hooks left open for an inspector panel** in a
later stage (locks, traps, searched items, NPCs). Out: room rails, room pickers, selection UI,
session toolbar, the edit link, and any other information furniture. The children zoom and move
around to view sub-sections of space that make sense to them; noise is the enemy.

The inspector is **not built at this stage** — only kept possible.

### 3.7 "Here" is a highlighted room, not a token

There is **no party marker.** The room the party is in is highlighted; nothing is drawn at a cell.

Consequences that fall out of this and should not be rediscovered:

- The marker layer loses an object, so §2.3's badge-crowding pressure drops for this case entirely.
- §3.4's "return to current room" re-centres on a room's bounds, not on a point.
- "Here" spends **no nameable hue** (§3.8), which is why the bank still holds two.

### 3.8 The highlight is a brighter neutral plus one hatch

The current room fills a **step brighter in the same neutral** as every other room, and carries a
**hatch**. No hue. The spoken handle is *"we're in the stripy room"* — which, being not a colour
word, can never collide with *"the green ones are stairs"*.

**Exactly one pattern exists, and it means "here".** Pattern is not a general channel. A pattern
that marked a *floor* would cover every room on the plate, which is §1.3 with a different brush; the
reason a hatch works at all is that **only one room ever has it**, so it is the single texture on an
otherwise clean plate and the eye goes straight to it.

Two non-negotiable constraints:

- **The hatch is locked to screen pixels, not viewBox units** — roughly 8-10px spacing, redrawn as
  zoom changes. In viewBox units it goes sub-pixel at fit zoom and moirés on the tablet, which is
  §1.4.3 all over again.
- **The room name must survive sitting on it** — either the hatch stays faint or the label gets a
  clear plate behind it.

Scope note: "one pattern, one meaning" governs **area fills.** A dasharray on a line is a different
channel and is not covered by this rule; it must not be read as licence to texture the plate.

### 3.9 Floors are a raw-`z` numeral, not a colour

A **large translucent numeral in a corner** of the plate: `-1`, `0`, `1`, `2`. Raw `z`, matching the
DM's own numbers exactly.

Negative numbers are not arithmetic here — the minus sign reads as *underground*, which is a concept
both children have. Raw `z` was chosen over a render-time renumbering (1..N from the bottom)
specifically so the number never shifts under the kids when a basement is added later, and so the DM
and the kids are always saying the same number.

Floor **colours were considered and rejected.** Recorded so it isn't re-litigated: an ordered warm-
to-cool ramp would have bought a spoken handle for the hardest thing on the map (*"the stairs go up
to the yellow floor"*, partly repaying what §4.1 parked), but it costs four hues, leaves zero
headroom, and breaks outright on an unbounded floor count (§1.10).

### 3.10 Doors: a token on the wall, plus a leaf only when open

A door draws as a **filled disc straddling the wall segment** (§2.5) **and**, when the door is open,
a **leaf swinging into the room**. When the door is closed there is **no leaf** — the token alone,
with the wall running through.

Why each half is there:

- **The token fixes §1.9 structurally.** A circle interrupting a line is not a line, whatever colour
  either one is. Geometry does the separating, so the Opening hue is free to be chosen for
  nameability instead of for beating an L\* 79.9 wall — a fight it would lose, since a light disc on
  a dark plate has nowhere to go.
- **The leaf is the most readable "door" concept there is**, and *"is there a flap sticking into the
  room, yes or no"* is the single most legible state on the map: no colour, no text, no badge, and a
  four-year-old reads it from across the table.
- **Drawing the leaf only when open deletes the broken geometry.** `.maplab-door-leaf-closed` lies
  flat *along* the wall line, and that is the only place the 1.001:1 problem actually lived. An open
  leaf sits over the quiet room fill, where contrast is abundant.

Windows are the same token with a **window icon and never a leaf** — which is exactly right, since
you don't swing a window into a room, and it means the icon channel does the door-vs-window work
that colour cannot (both are Opening/yellow).

The **DM keeps its leaf and swing arc unchanged.** Only the kid renderer swaps to tokens.

### 3.11 Terrain is hidden on the kid map, data untouched

`river` and `trees` stop rendering on the kid surface. The Map Lab tool stays, already-authored
terrain stays, and the DM map is unchanged. The user intends to revisit terrain's entire
implementation separately.

Their two fills (`#004B71`, `#005143`, both L\* 30.0) still go into the solver's **reserved** set
(§3.6 of the spec below) so the revisit does not have to re-derive the family palette.

### 3.12 Wall kinds are hidden on the kid map

All walls draw as the default solid wall. `natural` and `open` are not distinguished. Wall styling
is getting its own redesign.

This costs no route information, because `wallKind` is **room-level, not edge-level** (§1.10) —
`open` restyles a whole perimeter and has never marked a passable gap.

It also disposes of a live collision: `--wall-natural-stroke` is `--md-nature` `#86D5C1`, a **mint
green wall**, which would have fought GREEN for transition. With wall kinds hidden, the mint stays
DM-side and **transition keeps green.**

### 3.13 A marker on bare plate renders, and Map Lab warns

The §1.4 case — stair 2's endpoint on a cell no room owns — is not suppressed and not blocked. The
kid map draws it; **Map Lab flags it** as a mistake to fix.

Suppressing it leaves the map quietly drawing nonsense forever. Hard-blocking it in the editor would
eventually prevent something legitimate, like placing a stair in a corridor not yet roomed. The
warning tells the DM without ever breaking the kids' map.

The solver includes **bare plate** in the background set regardless of this decision — it is the
darkest surface, so light discs clear it easily and it costs nothing.

### 3.14 Encounters and NPCs

- **Encounters never appear on the kid map.** Combat happens on the table with minis, so the marker
  has no job during the fight, and before the fight it is a spoiler a six-year-old can read off the
  whole floor at once. Stripped at the curtain; costs no colour and no icon. Showing them later,
  gated on a knowledge record, remains possible without changing anything decided here.
- **NPCs do appear, wherever they are authored,** and get the PINK family. Removing one from a room
  is done by marking it **hidden**, not by moving it.
- **NPC pins are not a movement tracker.** The map exists so the children can broadly understand
  where they are, what connects to what, and where they can go. Anything more precise and the game
  starts being played *on the tablet*. This is the answer to the pin-staleness objection: it is not a
  bug to be engineered away, it is out of scope by design.
- **`npc` and `encounter` remain props in the data.** The complaint was about the authoring palette
  — a person and a fight should not be chosen from the same flyout as Barrel and Statue. Moving them
  to their own tool is **its own job in the dungeons / Map Lab area**, not part of this plan. No
  storage split, no migration, no removal of the pin concept (which would lose the ability to say
  "the shopkeeper is behind *this* counter").

### 3.15 Stair and portal tokens

- **A stair token shows a direction chevron and nothing else** — up or down. No destination numeral.
- **Stage 3's paired badge numbers are dropped.** Their only job was matching a stair's two ends
  across side-by-side plates; side-by-side is parked (§4.1) and stairs are clickable, so the numbers
  have no reader — and §1.4.1 proves they are actively lying on 3 of 5 junctions on dungeon 4 today.
- **A portal is its own icon in the transition colour, with no destination cue.** A portal can result
  in a completely new map spawning, so the token must not promise a destination it may be unable to
  describe.

### 3.16 The palette is derived by a solver, gated in the checker

A new script — `scripts/derive-kid-palette.mjs` — takes the family list and the reserved colours as
input, **solves all four colours together**, and emits a generated token block. Its output is
**staleness-checked by `check_docs.py --check`**, so a hand-edited kid token fails the build. (That
is precisely the failure mode that produced two identical hexes in §1.6.)

**Not** an extension of `generate-md3-tokens.mjs.` Its one-role-per-invocation signature is
structurally incapable of set-wise optimisation, its harmonize-toward-violet step is the actual
cause of the collapse, and making it set-aware would break its existing callers. Leave it doing
DM-side identity tints, where coherence is what you want.

`@material/material-color-utilities` is already in `frontend/node_modules` and provides Hct for hue
bands and lightness, so this is a bounded search over four hues, not a research project.

**The spec:**

```
SOLVE FOR    4 disc colours          transition GREEN   opening YELLOW
                                     fixture    BLUE    people  PINK
             + a computed black-or-white glyph colour per family

BACKGROUNDS  each disc must clear the contrast floor against all of:
             plate            #1c1b1f   L* 10.0
             quiet room fill  ~#232128  L* 13.2   (see 3.3 -- DM value governs)
             here room fill   the brighter neutral step of 3.8

RESERVED     must not collide with:
             wall             #cac4d0   L* 79.9   (the door token abuts it)
             outline variant  #49454f   L* 30.0
             river / trees    #004B71 #005143     terrain is parked, not gone

FLOOR        4.5:1
             Not 3:1 -- legal for graphical objects, but these are 20px objects
             read across a table by a four-year-old and the icon strokes inside
             them are text-like in every way that matters.
             Not 7:1 -- forcing four hues to clear 7:1 against a BRIGHT here-room
             drives all four toward near-white, flattening lightness and
             re-creating 1.6 exactly.

OBJECTIVE    maximise the minimum pairwise dE2000 across the four,
             each staying inside its pinned nameable band,
             subject to a minimum dL* between any pair so that lightness
             carries information instead of sitting flat at tone 80

OUTPUT       a generated token block, staleness-gated by check_docs.py

METHOD       compute, do not eyeball. Eyeballing and then annotating ratios
             afterwards is exactly how both the existing palette (1.6, 1.8) and
             colour-advice.md (1.7) failed.
```

---

## 4. Open questions

Three remain. **None of them are colour.**

### 4.1 Side-by-side floors — removed from the plan, parked

**Cut entirely** from `kid-map-legibility`, including the fold-out. To be revisited only after the
DM-style viewer is in place and the user has playtested children simply picking floors.

Record of the analysis so it is not re-derived:

The real requirement is **route continuity across a z-change** — a child holds one line in their
head (entrance → hallway → back stairwell → up → across the landing → into a classroom) and at the
stairwell that line has to jump plane and carry on. Children handle `(x,y,z=0) → (x+10,y-10,z=0)`
easily and `(x,y,z=0) → (x+10,y-10,z=1)` badly. **Ghosting does not serve this** — ghosting answers
"what is directly beneath this square", a vertical-alignment question, which is what the editor's
`GhostFloorLayer` was built for.

Note that §3.9 declined the one cheap partial substitute for this (floor colours on stair tokens),
so route continuity across `z` is **wholly unaddressed** for now. The mitigations in play are the
clickable stair token, the chevron, and the corner numeral.

Three registrations were identified, unresolved:

1. **Shared bounds (today).** Stair endpoints always exactly 41 cells apart at identical y —
   perfectly predictable, but 1968px at a readable zoom when the screen holds 24 cells.
2. **Per-floor cropped bounds.** Halves the strip (162 → 83 cells); stair 3's two ends fall to 23
   cells apart = 1104px, which fits an 1180px tablet. But it only works for centrally-placed
   stairs, and connectors become diagonal and variable-length, so the gesture can't be learned.
3. **Registered on the stair.** Draw the two floors a stair joins, translated so *that stair's* two
   endpoints sit a fixed few cells apart on one horizontal line. The joint is then short, straight
   and identical for every stair, whatever floor and wherever on it. Cost: the plates no longer sit
   in one fixed global strip, and the fold-out becomes "scroll through the joints" rather than
   "scroll through the floors" — arguably what the plan already meant by *"a strip of floor
   **pairs**"*.

Recommended if it returns: **3**, because the requirement is a route problem and route continuity is
what a constant short joint buys.

### 4.2 What shape is the floor picker?

Constrained but undecided. It **cannot be colour swatches** (§3.9 gave floors no colour) and it
**cannot be text pills** like the DM's `Starting Floor / First Floor / …`, against the
never-text-alone rule for a pre-reader.

What is available: vertical position (a stack of slabs with the current one lit, which is a picture
of a building), the raw-`z` numeral already established in §3.9, and the clickable stair tokens as
the primary way floors actually change during play. A stacked-slab picker would also double as the
corner indicator, so the two should probably be designed as one object.

### 4.3 What does tapping a room do today?

§3.6 keeps inspector hooks open but builds no panel. So what happens on tap right now — nothing, or
select-with-empty-panel? Needs an answer before the surface is built, because "nothing" and "selects"
are different components.

### 4.4 Plan shape and the area-guide discrepancy

`dm-player-split-intent.md` states Plan 0 creates the owning area guide `docs/areas/player-app.md`.
**That file does not exist** — `docs/areas/` holds design, dungeons, encounters, infra, loom,
players, reference. `kid-map-legibility` points at `docs/areas/players.md`. Needs reconciling before
replanning.

And the shape question: whether this becomes a rewrite of `kid-map-legibility` or a new plan
superseding it is undecided. What is known about the fate of the shipped stages:

- **Stage 1's palette** is largely reversed by §3.3 and §2.
- **Stage 2's `roomLabelAnchor`** is good, shared, and survives.
- **Stage 3's doors** survive in principle but change shape (§3.10); its stair badges are dropped
  (§3.15) and buggy (§1.4).

Work that this rethink adds outside the kid map, and which needs a home:

- Move `npc` / `encounter` out of the Map Lab fixture palette (§3.14) — dungeons area.
- Warn on markers placed on unowned cells (§3.13) — Map Lab.
- Terrain redesign (§3.11) and wall-kind redesign (§3.12) — design area.
- Prune the 26 identity tints (§2.8) — design area.

---

## 5. What has NOT been done

No code changed. No plan file edited. No palette hexes chosen — §3.16 specifies the solver that will
choose them, and it does not exist yet. `scratch/` is the only thing written to.
