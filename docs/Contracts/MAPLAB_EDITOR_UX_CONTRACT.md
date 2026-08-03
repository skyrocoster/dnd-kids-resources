# Map Lab Editor UX Contract

> **Status:** Product contract agreed; implementation is staged into separate Plans.

This contract turns the accepted Map Lab editor UX handoff into a product boundary. Map Lab remains a
map-first authoring instrument: rooms define spatial regions, while props, passages, doors, stairs,
portals, and terrain reinforce them. Existing meaning and persistence are not being redesigned.

## Product outcome

The editor lets a DM draw a room, extend it with a porch or alcove, continue shaping it, and then draw a
separate room without losing useful editing context. Selection, navigation, and editing remain separate
concepts. The editor and viewer are sister surfaces and teach the same navigation language, although only
the editor mutates authored data.

## Product phases — one Plan per phase

The phases below are separate Plans with their own scope, checks, and reconciliation. The two existing
Map Lab refactor Plans are prerequisites, not part of this contract's implementation scope.

### Prerequisite Plans — existing refactors

Ship these first through their existing Plan workflow:

- [Map Lab component refactor](../plans/active/maplab-component-refactor/maplab-component-refactor.md)
- [Map Lab test suite refactor](../plans/active/maplab-test-suite-refactor/maplab-test-suite-refactor.md)

The UX work uses the cleaned tree after those Plans ship. It must not require a big-bang rewrite or take
the editor offline.

### Phase 1 Plan — Shared editor/viewer navigation

Both surfaces receive the same product behavior: pan, zoom, floor switching while preserving coordinates
and zoom, room/object selection, empty-space clearing, Escape, focus/centering, Fit floor, Focus selected
room/object, room-rail focus rules, stair/portal navigation, keyboard context-menu selection without
travelling, and double-click centering without travelling. Duplicate navigation from a browser
double-click sequence must not occur.

The existing editor/viewer switch remains the route between surfaces. Moving between them preserves floor,
coordinates, zoom, and focus whenever possible. That navigation context survives ordinary refreshes during
the current browser session, but is not authored dungeon data. Layout changes are deferred to a later
contract or Plan.

### Phase 2 Plan — Smart Room authoring vertical slice

Deliver the room-first editor workflow with the full accepted toolbar language:

```text
[Room]  [ Rectangle v ]   Smart: ON   [Erase]   [Undo]
```

The behavior includes Rectangle as the default cell-snapped method, Freehand as the secondary method,
New/Extend/Erase as operations upstream of shape method, Smart Room as the persistent default, explicit
Force New and Force Extend one-gesture overrides, explicit one-gesture Erase, visible operation previews,
selected-room targeting, and New creation on empty ground. Existing-room gestures do nothing until a room
has been selected.

Rectangle and Freehand share the continuity rule: blocked cells may leave a continuous L-shape or similar
result, but disconnected results are invalid and never partially commit. Previews show valid, blocked,
and problem cells where possible. One valid gesture is one undoable map edit; selection, focus, tool
changes, and previews are not history entries.

Selection clearing, Escape, autosave, undo/redo, content preservation, and destructive-action safeguards
remain intact. Touch has full parity, with two-finger pan/zoom separate from drawing. Keyboard and
assistive-technology users have full access to operation choices, cancellation, undo, previews, and
validity reasons.

### Phase 3 Plan — Shared contextual menus

Add contextual menus after the navigation and Smart Room Plans. Right-click, Context Menu/Shift+F10, and
touch long-press select the target before opening the menu; Escape closes it. Both surfaces share this
targeting language. The editor receives existing authoring actions; the viewer receives inspection/focus
actions without mutation.

The first menu set covers rooms, props, doors, stairs, portals, terrain, and empty ground. Speculative
actions such as changing prop type, opening a door, duplication, movement, or connected-room editing stay
deferred.

## Detailed settled interaction model

### Four separate concepts

The editor separates:

1. **Navigation** — pan, zoom, floor switching, fitting, and focusing.
2. **Selection** — identify the room, prop, door, stair, portal, or terrain feature being examined.
3. **Room operation** — New, Extend, or Erase.
4. **Shape method** — Rectangle first, Freehand second.

Selecting a target must never silently activate an editing operation. The Room tool may remain active as
a workflow session, but its operation and target remain visible and understandable.

### Room authoring rules

- Rectangle means an axis-aligned, cell-snapped drag from one corner to the opposite corner.
- Freehand is a secondary method for irregular spaces.
- New, Extend, and Erase all use the same Rectangle/Freehand choice.
- With no room selected, Smart Room may create a new room on empty ground.
- With no room selected, a gesture over an existing room does not edit it; the room must first be selected
  through Select mode, the room rail, or a contextual menu.
- Toolbar actions operate on the selected room.
- Context-menu actions operate on the room that was right-clicked and selected.
- Direct canvas targeting for Extend or Erase is available only after explicitly arming that operation.
- A selected room remains the target while Extend or Erase is active.

### Smart Room behavior

- Smart Room is the default.
- The Room tool is persistent until another tool is selected or Escape is used.
- A visible target halo identifies the selected room eligible for automatic extension.
- A gesture on or adjacent to the haloed selected room previews **Extend Room <id>**.
- A gesture on empty ground away from the halo previews **New room**.
- The preview explicitly names the resolved operation before commit.
- Force New applies to one gesture only, then returns to Smart mode.
- Force Extend applies to one gesture only, then returns to Smart mode.
- Erase is explicit and applies to one gesture, then returns to Smart mode.
- Choosing a drawing action from a contextual menu closes the menu and arms the operation; the next drag
  previews and commits it.
- Right-click never automatically becomes the first painted cell.

The intended continuous workflow is:

```text
draw a 4x4 room → extend a 2x1 porch → add another shape → draw a separate room
```

### Validity and continuity

- Rectangle and Freehand use the same structural continuity rule.
- A room must remain one continuous spatial region.
- When blocked cells are removed from a proposed result, the remaining usable cells may form a continuous
  L-shape or similar shape.
- If blocked cells split the result into disconnected regions, the operation is invalid.
- Invalid operations do not partially commit.
- The preview shows valid, blocked, and disconnected/problem cells where possible.
- Existing room ownership, overlap, adjacency, content-preservation, and off-map behavior remain
  authoritative.
- No room, door, passage, or connection semantics change as part of this UX work.

### Selection, clearing, and focus

- Left-clicking empty space in Select mode clears selection.
- Left-clicking empty space while a drawing tool is active begins that tool's operation.
- Clicking the already-selected item again clears selection.
- Escape cancels an in-progress stroke or preview first, then clears selection or returns to Select as
  appropriate under the existing layered Escape rules.
- Right-clicking an entity selects it before opening its contextual menu.
- The inspector, toolbar, and contextual menu always refer to the same active target.
- Double-clicking an ordinary item centers it.
- Double-clicking a stair or portal centers the current connection without navigating.

### Shared navigation rules

Editor and viewer share pan, zoom, floor switching, room selection, empty-space clearing, Escape,
focus/centering, and Fit floor behavior. Surface-specific mutations remain different: the editor
authorizes editing actions and the viewer does not.

Room rail behavior:

- Selecting a room from the rail selects it.
- If it is off-screen, the map focuses it.
- If it is already visible, current framing is preserved.

Floor and connection navigation:

- Choosing a floor preserves the same map coordinates and zoom.
- Using a stair changes floor and centers the destination stair.
- Using a portal changes floor/dungeon and centers the destination portal when it resolves.
- An unresolved portal stays put and reports a local error.
- Single-clicking a stair or portal uses it and navigates.
- Right-click or the keyboard context-menu action selects and inspects it without travelling.
- Double-clicking a stair or portal centers the current connection without travelling.
- The first click in a browser double-click sequence must not cause duplicate navigation.

Framing provides Fit floor and Focus selected room/object. A return-to-previous-view action is explicitly
rejected as junk information.

Navigation context is preserved when switching through the existing editor/viewer button and during an
ordinary refresh in the current browser session. It preserves floor, coordinates, zoom, and focus when
possible, without becoming authored dungeon data. Layout changes remain outside this contract.

### Drawing navigation and input parity

- Desktop users can temporarily pan while a drawing tool is active with Space or middle-mouse drag.
- Touch users use two fingers for pan/zoom.
- Temporary panning never changes room geometry.
- Touch supports the complete Smart Room workflow rather than a reduced product variant.
- Keyboard and assistive-technology users can choose Room, Rectangle/Freehand, Smart, Force New, Force
  Extend, Erase, Undo, focus, and cancellation without relying on pointer gestures.
- Previews and validity reasons are communicated meaningfully to keyboard and assistive-technology users.

### Contextual-menu product rules

Right-click is an accelerator, not the only route to an action. Every option remains available through
selection plus the toolbar or inspector.

- Editor and viewer use one shared contextual targeting language.
- The editor gets existing authoring actions only.
- The viewer gets inspection/focus actions and never mutation.
- The keyboard Context Menu key and Shift+F10 provide the desktop equivalent.
- Long-press is the touch equivalent and selects the target first.
- Long-press is active in Select mode and must not interfere with drawing gestures.
- Escape closes the menu.

The first menu content is:

- Rooms: existing inspect/edit, Extend, Erase, focus, and delete behavior.
- Doors, stairs, and portals: existing inspect/edit/delete behavior, preserving ordinary left-click
  navigation for stairs and portals.
- Props: existing inspect/focus/delete behavior.
- Terrain features: existing inspect/erase/delete behavior.
- Empty ground: room creation and existing placement choices.

### Feedback, safety, and history

- Invalid room operations show invalid/problem cells in the preview.
- The canvas status chip initially reports **“Room shape must stay connected.”**
- No modal interrupts room drawing.
- No data is committed until the operation is valid.
- One committed rectangle or freehand gesture equals one undoable map edit.
- Selection, focus, tool changes, and previews are not history entries.
- Existing autosave, undo/redo, room-content safeguards, and destructive-action rules remain in force.

### First-slice boundary

The first coordinated product release is the combination of the Phase 1 navigation Plan and Phase 2
Smart Room Plan. Phase 3 contextual menus follows as its own usable Plan. The work must remain usable
throughout and must not require a big-bang migration, complete rewrite, or taking the editor offline.

## Cross-phase rules and non-goals

- Selecting a target never silently activates an editing operation.
- The inspector, toolbar, and menu refer to the same active target.
- Select-mode empty-space clicks clear selection; drawing tools interpret them as gestures.
- Clicking an already-selected item clears selection.
- Invalid room operations show **“Room shape must stay connected.”** in the canvas status chip; no modal
  interrupts drawing and no invalid operation commits.
- Existing room ownership, overlap, adjacency, off-map, content-preservation, autosave, and destructive
  action rules remain authoritative.
- No room, door, passage, stair, portal, connection, API, database, or storage redesign is authorized.
- No “return to previous view” action, Photoshop-style workflow, speculative prop action, or editor
  shutdown is included.
- Layout is explicitly deferred to a later contract/Plan.

## Product ownership and authorized area

The Dungeons area owns this work. The Plans may touch:

- `frontend/src/features/dungeons/maplab/**`
- `frontend/src/features/dungeons/maplab/__tests__/**`
- `frontend/src/model/maplabModel.ts` and colocated tests when geometry behavior is directly involved

Backend, API, database, seed, shared-token, and layout changes require explicit ownership in a later Plan.
Each Plan narrows these paths before implementation.

## Accepted design evidence

The following accepted mockups are copied verbatim from the handoff.

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

## Next step

The coordinator should complete the existing refactor Plans first, then create one Plan for Phase 1,
one Plan for Phase 2, and one Plan for Phase 3. This contract does not authorize implementation.
