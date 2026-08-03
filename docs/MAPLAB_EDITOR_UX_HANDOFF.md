# Map Lab Editor UX Grilling Handoff

> **Status:** Product contract drafted at [MAPLAB_EDITOR_UX_CONTRACT.md](Contracts/MAPLAB_EDITOR_UX_CONTRACT.md); implementation remains paused behind the refactor Plans.

This document preserves the decisions and reasoning from the Map Lab editor workflow review so the
conversation can resume without re-deriving the interaction model. The next step is to turn the
settled material into [MAPLAB_EDITOR_UX_CONTRACT.md](Contracts/MAPLAB_EDITOR_UX_CONTRACT.md), which divides the
work into separate Plans for shared navigation, Smart Room authoring, and contextual menus.

## Core product understanding

Map Lab is a **map-first authoring instrument**, not a generic graphics editor. Its mental model is a
person drawing spaces on hex-style paper by hand. The primary job is defining spatial regions
(rooms), with props, passages, and terrain reinforcing those spaces.

The editor and viewer are sister surfaces. They should share the same navigation language even though
the editor mutates authored data and the viewer does not.

The underlying meaning of rooms, doors, passages, connections, and their persisted relationships is
not being redesigned. This is an interaction and workflow improvement.

## Problems the change must solve

- Selection and editing are currently too entangled; selecting a room can arm the Room brush.
- Clearing a selection feels like extra work.
- Room extension is not discoverable or fast enough.
- Room creation needs a primary rectangle workflow and a secondary freehand workflow.
- The user needs to create a room, add a porch or alcove, keep shaping it, and then start another
  room without repeatedly losing the useful editing context.
- Contextual access is missing on desktop even though right-click is natural for a spatial editor.
- The viewer and editor should not teach different pan, zoom, floor, selection, and focus behaviors.
- The first implementation must be usable while the editor remains operational; it must not require a
  big-bang refactor or taking the editor offline.

## Guiding interaction model

The editor separates four concepts:

1. **Navigation** — pan, zoom, floor switching, fitting, and focusing.
2. **Selection** — identify the room, prop, door, stair, portal, or terrain feature being examined.
3. **Room operation** — New, Extend, or Erase.
4. **Shape method** — Rectangle first, Freehand second.

Selecting a target must not silently activate an editing operation. The Room tool can remain active as
a workflow session, but the operation and its target must remain visible and understandable.

The conceptual hierarchy is:

```text
Room operation
├── New
├── Extend
└── Erase

Shape method
├── Rectangle   (default)
└── Freehand
```

## Settled decisions

### Room authoring

- The primary authoring workflow is **shape construction**, not freehand painting.
- Rectangle is the default room shape method.
- Rectangle means an axis-aligned, cell-snapped drag from one corner to the opposite corner.
- Freehand is a secondary shape method for irregular spaces.
- Extend and Erase are operations upstream of the shape choice; they are not peer tools to
  Rectangle and Freehand.
- New, Extend, and Erase all use the same Rectangle/Freehand choice.
- With no room selected, Smart Room mode may create a new room on empty ground.
- With no room selected, a gesture over an existing room does not edit it; the room must first be
  selected through Select mode, the room rail, or right-click.
- Toolbar actions operate on the selected room.
- Context-menu actions operate on the room that was right-clicked and selected.
- Direct canvas targeting for Extend or Erase is available only after explicitly arming that
  operation.
- A selected room remains the target while Extend or Erase is active.

### Smart Room mode

The Room tool is a persistent workflow session, but New versus Extend should not force the user to
toggle after every small shape.

- Smart Room mode is the default.
- A visible target halo identifies the selected room eligible for automatic extension.
- A gesture on or adjacent to the haloed selected room previews **Extend Room <id>**.
- A gesture on empty ground away from the halo previews **New room**.
- The preview explicitly names the resolved operation before commit.
- If the interpretation is wrong, the user can use Force New or Force Extend.
- Force New applies to one gesture only, then returns to Smart mode.
- Force Extend applies to one gesture only, then returns to Smart mode.
- Erase is explicit and applies to one gesture, then returns to Smart mode.
- Choosing a drawing action from a context menu closes the menu and arms the operation; the next drag
  previews and commits it.
- Right-click does not automatically become the first painted cell.
- The Room tool stays active until another tool is selected or Escape is used.

This is intended to support the workflow:

```text
draw a 4x4 room → extend a 2x1 porch → add another shape → draw a separate room
```

without requiring a full tool reset after each operation.

### Validity and continuity

- Rectangle and Freehand use the same structural continuity rule.
- A room must remain one continuous spatial region.
- When blocked cells are removed from a proposed rectangle or freehand result, the remaining usable
  cells may form a continuous L-shape or similar shape.
- If blocked cells split the result into disconnected regions, the operation is invalid.
- Invalid operations do not partially commit.
- The preview shows valid, blocked, and disconnected/problem cells where possible.
- The existing room ownership, overlap, adjacency, content-preservation, and off-map behavior remain
  authoritative.
- No room, door, passage, or connection semantics are changed by this UX work.

### Selection and clearing

- Left-clicking empty space in Select mode clears selection.
- Left-clicking empty space while a drawing tool is active begins that tool's operation.
- Clicking the already-selected item again clears selection.
- Escape cancels an in-progress stroke or preview first, then clears selection/returns to Select as
  appropriate according to the existing layered Escape rules.
- Right-clicking an entity selects it before opening its context menu.
- The inspector, toolbar, and context menu always refer to the same active target.
- Double-clicking an ordinary item centers it.
- Double-clicking a stair or portal centers the current connection without navigating.

### Navigation shared by editor and viewer

Editor and viewer share the following navigation contract:

- Pan behavior.
- Zoom behavior.
- Floor switching.
- Room selection.
- Empty-space clearing.
- Escape behavior.
- Focus/centering behavior.
- Fit-floor behavior.

Surface-specific mutations remain different: the editor authorizes editing actions; the viewer does
not.

Room rail behavior:

- Selecting a room from the rail selects it.
- If the room is off-screen, the map focuses it.
- If the room is already visible, the current framing is preserved.

Floor and connection navigation:

- Choosing a floor from the floor picker preserves the same map coordinates and zoom.
- Using a stair changes floor and centers the destination stair.
- Using a portal changes floor/dungeon and centers the destination portal when it resolves.
- An unresolved portal stays put and reports a local error.
- Single-clicking a stair or portal uses it and navigates.
- Right-click or the keyboard context-menu action selects and inspects it without travelling.
- Double-clicking a stair or portal centers the current connection without travelling.
- The implementation must avoid duplicate navigation caused by the first click in a browser
  double-click sequence.

Framing shortcuts:

- Provide **Fit floor**.
- Provide **Focus selected room/object**.
- Do not add a “return to previous view” action; it was explicitly rejected as junk information.

### Panning while drawing

- Desktop users can temporarily pan while a drawing tool is active with Space or middle-mouse drag.
- Touch users use two fingers for pan/zoom.
- Temporary panning never changes room geometry.

### Context menus

Right-click is an accelerator, not the only route to an action. Every option remains available through
selection plus the toolbar/inspector.

First pass principles:

- Use one shared contextual-menu component and target/action model for editor and viewer.
- The editor gets existing authoring actions only.
- The viewer gets the shared component and target plumbing as a scaffold; it does not need a fully
  fledged menu in the first pass.
- Do not add speculative first-pass actions such as changing prop type or opening a door.
- Later passes may add actions such as Change prop type, Open door, Duplicate, Inspect connected
  rooms, Move, or other context-specific operations.
- Right-click selects the target and opens its menu.
- The keyboard Context Menu key and Shift+F10 should provide the equivalent desktop path.
- Long-press is the touch equivalent of right-click, and selects the target before opening the menu.
- Long-press is active in Select mode and must not interfere with drawing gestures.
- Escape closes the menu.

First-pass contextual menu content:

- Rooms: existing inspect/edit, Extend, Erase, focus, and delete behavior.
- Doors, stairs, portals: existing inspect/edit/delete behavior, with navigation behavior preserved
  for ordinary left-click on stairs and portals.
- Props: existing inspect/focus/delete behavior.
- Terrain features: existing inspect/erase/delete behavior.
- Empty ground: room creation and existing placement choices.

## Agreed terminal mockups

The following mockup was shown in the terminal and explicitly accepted. It must be copied **verbatim**
into the eventual contract document.

```text
MAP LAB - CONTEXT MENU MOCKUPS

1) Empty ground / right-click

        +------------------------------+
        | New rectangular room         |
        | New freehand room            |
        +------------------------------+
        | Place prop              >    |
        | Paint terrain           >    |
        +------------------------------+

2) Room / right-click

        +------------------------------+
        | Room 12                      |
        +------------------------------+
        | Inspect room                 |
        | Extend room              >   |
        | Erase room cells         >   |
        | Focus room                  |
        +------------------------------+
        | Delete room                  |
        +------------------------------+

3) Extend room submenu

        +------------------------------+
        | Extend room                  |
        +------------------------------+
        | Rectangle                    |
        | Freehand                     |
        +------------------------------+

4) Prop / right-click - first pass

        +------------------------------+
        | Barrel                       |
        +------------------------------+
        | Inspect prop                 |
        | Focus prop                   |
        | Delete prop                  |
        +------------------------------+

Interaction rule:
  right-click target -> select target -> open menu
  left-click empty space in Select mode -> clear selection
  Escape -> close menu / cancel preview / clear selection

```

The following Smart Room mockup was also shown and accepted. It should be preserved in the eventual
contract as design evidence; the final contract may add prose around it but should not silently change
its behavior.

```text
MAP LAB - SMART ROOM MODE MOCKUP

Toolbar while Room is active:

  [Room]  [ Rectangle v ]   Smart: ON   [Erase]   [Undo]

The Room tool remains active. The editor resolves New vs Extend from
where the next gesture begins, but always shows the result in the preview.

STEP 1: Draw a new room on empty ground

              drag here
          +-------------+
          |  4 x 4      |
          |  New room   |
          +-------------+

  Preview badge:  New room
  On release:    creates Room 12, selects it, keeps Room active

STEP 2: Draw the porch beside the selected room

          +-------------+----+
          |  Room 12    |  ? |
          |             |    |
          +-------------+----+
                        ^ drag begins adjacent to selected room

  Preview badge:  Extend Room 12
  Preview result: 4 x 4 room with connected 2 x 1 porch
  On release:      extends Room 12 as one undoable change

STEP 3: Draw somewhere else

          +-------------+----+
          |  Room 12    |    |
          +-------------+----+

                              +---------+
                              | New room|
                              |         |
                              +---------+

  Preview badge:  New room
  On release:    creates Room 13 and selects it

EXPLICIT OVERRIDES:

  [Force New]     next gesture always creates a new room
  [Force Extend]  next gesture requires a selected target room
  [Erase]         next gesture removes cells from the target room
  [Smart]         return to automatic New vs Extend resolution

AMBIGUOUS OR INVALID PREVIEW:

  Preview badge:  Cannot extend Room 12
  Reason:         The result would split into disconnected cells.
  On release:     no change

  Preview badge:  Choose New or Extend
  Reason:         The gesture touches multiple rooms.
  On release:     no change

```

## Feedback and safety

- Invalid room operations show the invalid/problem cells in the preview.
- The canvas status chip reports the reason, initially: **“Room shape must stay connected.”**
- No modal interrupts room drawing.
- No data is committed until the operation is valid.
- One committed rectangle or freehand gesture equals one undoable map edit.
- Selection, focus, tool changes, and previews are not history entries.
- Existing autosave, undo/redo, room-content safeguards, and destructive-action rules remain in force.

## Implementation boundary

The first implementation must be a usable vertical slice that leaves the editor operational throughout.
It must not require a big-bang migration or taking the editor offline.

The currently preferred first slice is:

- Smart Room mode.
- Rectangle-first room drawing.
- Freehand fallback.
- Continuity preview and errors.
- One-gesture undo behavior.
- Selection-clearing rules required to use the workflow.

The shared context-menu infrastructure and the shared editor/viewer navigation work can follow as
separate usable slices without invalidating the room-authoring design.

The user is currently refactoring Map Lab to make it more AI-friendly for testing and reading. That
refactor should be respected and coordinated with, but this UX work must not wait for a complete
refactor or widen into a mandatory full rewrite.

## Explicit non-goals

- No redesign of what a room is.
- No redesign of doors, passages, stairs, portals, or connections.
- No API or database redesign unless later implementation evidence shows a narrowly scoped need.
- No speculative first-pass prop-type changes.
- No first-pass door-open/close context action.
- No Photoshop-style transform/layer workflow.
- No “return to previous view” navigation action.
- No full viewer context-menu feature set in the first pass.
- No browser automation was performed; this remains a design handoff, not a UI verification record.

## Evidence used during grilling

Repository findings:

- `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx` currently combines tool state,
  flyouts, selection, navigation rail, canvas layers, selection sheet, and dialogs.
- `frontend/src/features/dungeons/maplab/maplabEditor.ts` owns reducer/history behavior and excludes
  selection and active-floor changes from undo history.
- `frontend/src/features/dungeons/maplab/useCanvasStroke.ts` already provides pointer capture,
  deduplication, and gap-filled strokes.
- `frontend/src/model/maplabModel.ts` owns cell validity/adjacency helpers and room/marker geometry.
- `docs/areas/dungeons.md` requires room geometry and room content to remain separate documents and
  says to preserve Map Lab geometry, reducer, autosave, zoom/pan, fullscreen, and persistence unless a
  focused plan owns them.
- `docs/plans/done/maplab-ux-pass/maplab-ux-pass.md` records the existing sticky palette, brush model,
  undo, touch gestures, canvas status chip, and responsive shell decisions.
- `docs/plans/active/maplab-component-refactor/maplab-component-refactor.md` and
  `docs/plans/active/maplab-test-suite-refactor/maplab-test-suite-refactor.md` are active refactor
  plans with no compiled orders yet.

Comparable-product research:

- Tiled supports explicit selection versus boundary editing, rectangle tools, Escape cancellation,
  contextual actions, and selecting underlying objects.
- Dungeon Alchemist supports draw-first rooms and room expansion.
- Foundry VTT uses focused canvas tool palettes and contextual controls.
- Inkarnate and Dungeondraft separate shape/room tools from freehand and object tools.
- Figma and Miro reinforce explicit selection, reversible edits, duplication, and recovery rather
  than silently changing structural relationships.

## Resume point

The next conversation should:

1. Confirm or revise this handoff.
2. Create the requested contract document from the settled decisions, including the accepted terminal
   mockups verbatim.
3. Decide the contract’s exact first vertical slice and authorized paths.
4. If the slice is multi-stage, use the Plan workflow rather than attempting a big-bang change.
