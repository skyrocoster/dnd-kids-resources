# Dungeon Outside — the world around the rooms becomes real, authored map space

> **Status:** Not started. Next: Stage 1 — wall kinds, the cheapest playtestable proof of the concept.

- **Area guide:** [Dungeons](../../areas/dungeons.md)

## What we're building & why

Map Lab can only draw rooms. Everything that is not a room is unpainted nothing, rendered with a
hatched "unknown space" pattern whose meaning is *nothing is authored here yet*. That makes a castle
impossible to describe: the courtyard, the yard, the wood behind the curtain wall and the river along
the east side have nowhere to live, and a room that is stone on three sides and open cliff on the
fourth has to be drawn as though it were sealed.

This plan makes the space around the rooms into real, authored map space. Three things change. Rooms
gain a **wall kind**, so a cave reads as a cave and an unbounded space — a clearing, a courtyard —
stops being a special case and becomes one dropdown value. **Outside Features** arrive as a new
polyomino entity, so a wood is one drag and a river is one drag. And the map's **extent** becomes a
world-size control the author sets per side, rather than a uniform decorative margin derived from the
rooms alone.

The through-line is the one that started the discussion: **clearness of visuals**. Every stage here
adds ink to a canvas that is already busy, so the last stage adds the levers — layer toggles and a
density control — that let the DM decide what they are looking at instead of the map deciding for
them.

### Settled decisions

These were argued out and should not be re-litigated during implementation.

**Outside is implicit, not painted.** Everything that is not a room *is* outside. There is no
per-cell terrain type and no terrain-painting layer — that was rejected specifically because it adds
a new dimension of stored data. Outdoor places that are still *places* are authored as rooms with an
`open` wall kind.

**Wall kind lives on the room, one kind per room.** A room that is stone on three sides and cliff on
the fourth is split into two rooms for now. Adding a sparse `wallOverrides` list later is purely
additive — no migration, no rework — and mirrors how doors already override derived wall edges. That
is the expected follow-up after playtesting, not part of this plan.

**Two separate kind registries, not one.** Wall kinds are edge-painted; feature kinds are cell-set
painted. They share no fields worth unifying, and one shared table would make every entry carry
fields half of them ignore.

**The registry bar.** Adding a kind is one registry entry plus one token in `theme.css`, and nothing
else: no `switch` on kind in the renderer, no `if kind === 'river'` in the editor, no hardcoded
dropdown lists. Dropdowns and the cell action menu read from the registry. The playtest loop must be
*add entry, reload, see it*.

**Wall kinds are distinguished by colour plus texture, never weight.** Stroke weight and
`--md-primary` are already the language of *selection* and *hover* (`MapLabPage.css:274-286`). If
kind also used weight, a selected `solid` room and an unselected `natural` room would fight over the
same channel at every zoom level. Colour carries kind; texture reinforces it.

**Never hue-alone is IN FORCE and is a release condition.** `solid` is the single plain-stroked kind
because it is the baseline. Every kind added after it ships with a texture. A colour-only kind is
legitimate as a scratch state while playtesting at the table; it is not legitimate in a shipped
build. This is the agreed reading of `UX_PATTERNS.md` §*Never hue-alone* for this feature.

**Features may overlap anything, and are not required to be connected.** A room may sit on a river —
that is how you get a mill, a bridge, a gatehouse over a moat. Trees may sit on a river; that is a
wooded bank. A scattering of trees across a hillside is one feature with disconnected cells, not
eleven features. Rooms remain hard-blocked from overlapping rooms, as they are today.

**Overlap is non-destructive and rooms paint opaquely over features.** Drawing a wood across the
castle stores tree cells under the rooms; deleting a room reveals them. The hidden state is accepted
deliberately: showing terrain through a building was rejected as biome-matching, which is the terrain
layer under another name. Paint order comes from registry order — features in registry order, then
rooms on top, always. "What is in front" is a property of the kind, set once; no feature ever gets a
manual layer control.

**Features carry a `z`, like rooms.** A river does not flow through the crypt. Drawing a `river` or
`trees` on any floor other than `z: 0` raises a soft, dismissible warning — an underwater cavern is
allowed, it just should not be an accident. The existing `GhostFloorLayer` already shows the floor
below faintly, so a river drawn on the ground floor stays visible for alignment while editing the
floor above without being clickable there.

**The extent includes features.** The map's box is computed from rooms **and** features, then grown
by per-side padding. Nothing authored can ever be silently clipped — the failure mode where deleting
a tower eats a river is designed out rather than warned about. Dragging a river east simply grows the
map; there is no drag limit and no auto-incrementing padding.

**Padding is per-side and is a world-size control, not a margin.** A castle with a river to its east
should not have to buy eight cells of empty world to the west to see it.

**The unknown-space hatch is deleted.** Under this model there is no unknown space; there is authored
outside. Bare outside inside the extent gets its own subtle token shade, and the canvas simply ends
at the extent. A hatched ring marking a boundary you cannot cross would add ink without adding
information.

**Bare squares hold no data.** Clicking bare outside opens an action menu — draw a feature, start a
room, place a prop — and the moment you act, a real object exists and *that* holds the data. Per-cell
notes were rejected because a prop is already the "something is at this exact square" object, and two
ways to say the same thing is worse than one. Invisible DM-only information belongs to a future
DM/player split, which would cover rooms, props and doors alike.

**Square grid only.** The deferred hex world map is not a zoomed-out version of this. Outside space
at 5ft per square and a hex covering a quarter-mile are different objects, and nothing here should be
generalised in anticipation of it.

## UX decisions — Map Lab canvas (session view and editor)

```
Surface:      Map Lab session view + Map Lab editor — both rows already exist in
              docs/areas/dungeons.md ## Surfaces; no new surface, no new route.
Mode:         both. Session view is play; editor is prep. Per UX_PATTERNS, the
              persistent canvas follows play rules and the panels opened from it
              follow prep rules.
Operator:     DM.
Focal:        the rooms. Outside must never out-shout them — bare outside is a
              low-contrast surface tone, feature fills sit below room fill in
              contrast, and room walls keep the strongest stroke on the canvas.
              If a wood reads louder than the hall, the stage is wrong.
Route shape:  bespoke — the Map Lab canvas is explicitly exempted from the
              Browser/Viewer/Editor triad (UX_PATTERNS §Route shape).
Edit style:   inline panel. Feature and room properties are edited in the existing
              inspector beside the canvas, never in a modal over it — the canvas is
              the context that makes the edit meaningful.
Save:         autosave on edit, matching the Map Lab editor's existing saveStatus
              and "Reset unsaved changes" behaviour. No new save model.
Empty:        canvas with no rooms already handles this (layoutStatus === 'empty',
              MapLabPage.tsx:347). Unchanged by this plan.
Filtered empty: when every layer toggle is off —
              "All layers are hidden. Turn one on to see the map."
No selection: inspector with nothing selected —
              "Choose a room, fixture, or outside feature on the map to see its details."
Load failure: unchanged — StatePanel error fills the canvas region.
Action failure: inline beside the control that failed, role="status". The z-warning
              on drawing a feature off z:0 reads
              "Rivers and woods usually sit on the ground floor. Draw it here anyway?"
              and is dismissible, not blocking.
Destructive:  deleting an outside feature routes through ConfirmDialog —
              'Delete "<name>"? This cannot be undone.' Drawing over an existing
              feature is not destructive and gets no confirm.
Keyboard:     DOM order, no tabIndex above 0. The cell action menu opens on Enter or
              Space on a focused cell and closes on Escape. Layer toggles are ordinary
              buttons traversed with Tab. No new global hotkeys.
Touch:        48px floor on every toggle and menu item. Canvas glyphs keep the
              existing documented exception (DESIGN_SYSTEM.md §Accessibility floor);
              this plan adds no new exception.
```

## Stages

1. **Wall kinds.** Give a room a wall kind, backed by an edge-kind registry with `solid`, `natural`
   and `open` in the first pass. `open` renders as a dashed perimeter hint with the title floating
   inside — that alone delivers unbounded rooms, so a courtyard becomes authorable with no new
   entity, no migration and no bounds work. This stage goes first because it is the cheapest thing
   that can be put on a table and played, and because what it teaches about how much outside you
   actually want should inform the extent migration that follows.

2. **Per-side padding and a real extent.** Migrate padding from a single number to four, default 3
   each, editable in the editor. The extent stops being a decorative margin and becomes first-class
   map space: clickable, authorable, inspectable. Delete the unknown-space hatch and give bare
   outside its own shade. Every saved layout needs migrating, so this stage owns that migration and
   its round-trip test.

3. **Outside Features.** The new polyomino entity plus its cell-set registry, with `river` and
   `trees` in the first pass. Drag to draw, one object per feature however scattered its cells,
   selectable and editable as a whole in the inspector. The extent grows to include features. The
   cell action menu on bare outside is built here, reading its options from the registry.

4. **Clarity controls.** Layer toggles — Outside, Props, Passages, Labels — plus a density setting of
   `Detailed` / `Auto` / `Simple` defaulting to `Auto`, where detail follows zoom. The manual
   overrides are what make zoom-driven complexity safe to ship: a DM about to describe a room can pin
   it and the map stops changing underneath them. Persisted per the existing `useToolbarTrayCollapse`
   localStorage pattern, honouring the area guide's "never lose session toggle state" invariant.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
