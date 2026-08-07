# Frontend Layout Redesign — Master Plan

> **Status:** Desired state agreed through guided review; no implementation Plan is authorized by
> this document. Each visible slice below requires its own focused Plan and explicit human acceptance
> before the next dependent slice begins.

## What this document is

This is the detailed product destination for the DM application's layout. It is deliberately broader
than a repository execution Plan and more concrete than a design principle. It records what the human
should see, how the major surfaces should transform, and how the redesign must be divided into small,
independently reviewable outcomes.

This master plan is not part of the active-Plan queue and carries no implementation status. Work ships
only through focused Plans under `docs/plans/active/`. Those Plans must link back to the relevant slice,
declare exact paths and dependencies, preserve all unrelated work, and stop for human UX acceptance at
the end of every visible slice.

## Why this redesign exists

The application already supports both touch and keyboard-plus-mouse, but its layout vocabulary has
grown feature by feature. Permanent rails consume workspace for actions that are already available on
the canvas. Headers repeat application identity without helping the current task. Toolbars, popovers,
drawers, inspectors, floating windows, and dialogs have individually useful behavior but need one clear
composition model.

The redesign must make the primary work obvious, give every secondary surface one job, and protect the
DM's attention at the table. It must not become a big-bang rewrite. Every change must leave the app
usable, produce one visible result a human can judge, and pause before dependent visual work proceeds.

## Governing product principle

Prepare as much as useful; remain present during play.

- The app is a preparation and reference instrument, not the game itself.
- Prep surfaces favor throughput, precision, and keyboard efficiency.
- Play surfaces favor glanceability, interruption safety, large targets, and persistent live actions.
- Maps are a legitimate exception to the preference for brief device use because spatial work requires
  sustained operation.
- The DM remains responsible for fiction, rulings, pacing, and revelation. The app organizes prepared
  truth; it does not adjudicate novel situations.
- Kid-facing surfaces remain read-only, respectful, direct, and designed to return attention to the
  table.

## Non-negotiable input and accessibility baseline

- Every DM presentation works with touch and keyboard-plus-mouse. Neither is a reduced variant.
- Layout transforms according to available space, not detected input type or device labels.
- Ordinary interactive controls meet the existing 48px touch floor. Kid surfaces retain their 64px
  floor.
- DOM order is focus order. Visible focus rings remain. Enter and Space activate button-like controls.
- Escape closes or cancels only the highest applicable layer or in-progress operation.
- Right-click is always an accelerator. Equivalent actions remain reachable without it.
- Colour never carries meaning alone.
- Shared components and theme tokens remain the visual and accessibility foundation.

## The shared layout grammar

### 1. A shallow shell

The global shell owns application navigation. The current surface owns its focal work, commands,
selection, and responsive transformations.

The separate brand-only application header and padded page header become one operational top bar.

```text
Wide:
+------+--------------------------------------------------------+
| home | Surface · context       quiet status       primary act |
+------+--------------------------------------------------------+
| nav  | optional surface command band                          |
+------+--------------------------------------------------------+
| nav  | focal surface                                          |
+------+--------------------------------------------------------+

Constrained:
+---------------------------------------------------------------+
| [menu] Surface · context       status              action     |
+---------------------------------------------------------------+
| optional surface command band                                 |
+---------------------------------------------------------------+
| focal surface                                                 |
+---------------------------------------------------------------+
```

The surface name remains a visible `<h1>`. A subtitle appears only when it carries operational context.
The app brand/home action moves into the wide navigation rail. The persistent footer is removed; any
project identity copy belongs on the Field Guide home page.

### 2. Three surface families

#### Catalog browser

Used by spells, weapons, items, loot, monsters, NPCs, players, encounters, and other list/detail
catalogs.

```text
+------+--------------------------------------------------------+
| home | Spells                                      [New]      |
+------+----------------------+---------------------------------+
| nav  | Search spells…       | Fireball                        |
|      | list                 | [Edit] [Delete]                 |
|      |                      | selected record                 |
+------+----------------------+---------------------------------+
```

Search is persistent because finding records is the primary task. Collection actions belong in the
top bar. Selection actions belong with the selected detail. On narrow layouts, list and detail become
sequential views with an in-flow Back to results action.

#### Spatial or board workspace

Used by Map Lab and Loom. The workspace is focal. A selected-object inspector may dock beside it only
when enough space remains.

```text
+------+--------------------------------------------------------+
| home | Workspace · context     status             mode/action |
+------+--------------------------------------------------------+
| nav  | tools | active options | finders | view controls      |
+------+-----------------------------------------+--------------+
| nav  | focal canvas or board                   | inspector    |
+------+-----------------------------------------+--------------+
```

When width is constrained, navigation and inspectors overlay the workspace instead of permanently
crushing it. The workspace remains visible behind a contextual inspector whenever that visual context
matters.

#### Live console

Used by encounter running and other at-table control surfaces.

```text
+------+--------------------------------------------------------+
| menu | Encounter · Round 3                  [Advance/Next]     |
+------+--------------------------------------------------------+
|      | glanceable live state and direct controls              |
|      |                                                        |
|      | persistent reference dock when requested               |
+------+--------------------------------------------------------+
```

Play surfaces begin with compact global navigation on wide screens without overwriting the normal prep
navigation preference. Their workflow-advancing action remains visible. Navigation remains reachable;
play surfaces do not become traps.

### 3. One identity band and at most one command band

A surface may own:

1. one shared identity/top band; and
2. one optional command band.

The top band contains surface identity, operational context, quiet status, mode, and at most one primary
route or live action. The command band contains tools, active-tool options, finders, utilities, and view
controls. A conceptual group may change with the active tool, but commands do not accumulate into an
arbitrary stack of independent toolbars.

### 4. Editing presentation follows the edited thing

- An independent record with its own identity is edited in a `Dialog`.
- Properties of an object selected on a canvas or board are edited in an inspector.
- Values changed repeatedly during play use direct controls.

A dialog is never used when the user must see the underlying workspace to make the edit meaningful.
An inspector is never used as a generic record editor merely to avoid a dialog.

### 5. Inspectors are selection-only

An inspector exists only while something is selected. Clearing selection removes the docked inspector
or responsive sheet and returns the space to the focal workspace. Persistent utilities do not use the
inspector as spare storage.

```text
Nothing selected:                 Selected:
+----------------------------+    +------------------+----------+
| full workspace             |    | workspace        | target   |
|                            |    |                  | inspector|
+----------------------------+    +------------------+----------+
```

### 6. Drawers and sheets follow role and available shape

- Left-side navigation becomes a left drawer.
- A selected-object inspector prefers a right drawer when the workspace remains usable.
- It becomes a bottom sheet when a right drawer would leave too little horizontal workspace.
- A collapsed bottom sheet retains a labelled peek identifying the selected target.
- Presentation may change without changing the target, content, or operation state.

### 7. Search sits beside the collection it serves

- Catalog search remains persistently visible above the catalog list.
- Workspace navigation uses a compact finder that shows useful results before typing.
- Assignment dialogs use local search for the collection being assigned.
- There is no global search box or application-wide command palette in this redesign.

### 8. Tool-driven workspaces use primary and active-tool groups

The command band separates choosing a workflow from configuring the current workflow.

```text
Primary:     [Select] [Room] [Passages] [Prop] [Terrain]
Room active: [Rectangle] [Smart: ON] [Erase] [Undo]
```

Wide layouts may present the groups on one visual row when they remain legible. Constrained layouts use
intentional group rows rather than arbitrary wrapping. The same semantic order serves touch and
keyboard users.

### 9. Controlled redundancy

An action may appear in more than one place only when each placement provides a distinct access route.

| Location | Job |
|---|---|
| Toolbar/command band | Persistent modes, armed tools, and workflow-wide commands |
| Inspector | Properties and complete actions for the selected target |
| Contextual menu | Short accelerator list for the invoked target |
| Dialog | A bounded edit or confirmation, never another action catalogue |

A contextual menu may repeat Delete or Focus from an inspector. That does not justify adding permanent
Delete and Focus buttons to every toolbar.

### 10. Transient layer hierarchy

```text
Highest      Dialog or confirmation
                 Contextual menu
                    submenu
              Toolbar popover/flyout
          Inspector + workspace + command band
```

- Opening one toolbar popover closes another.
- Opening a contextual menu closes toolbar popovers and tool flyouts.
- A submenu remains part of the same contextual-menu family.
- A dialog sits above and temporarily blocks lower layers.
- Escape dismisses only the highest applicable layer.
- A docked inspector may remain while a menu or popover is used.
- Choosing Delete closes the contextual menu before opening `ConfirmDialog`.
- Play-mode persistent reference windows are an intentional exception described below.

### 11. Popovers contain immediate choices, not private drafts

Popover values apply immediately or enter the existing autosave flow. Escape, outside-click, opening
another layer, or a responsive transformation must never discard uncommitted typing. Long
selected-object forms belong in inspectors. Bounded record forms belong in dialogs. Destructive choices
may launch `ConfirmDialog` but are not confirmed inside a popover.

### 12. Contextual menus are selective workspace accelerators

Contextual menus may be used for direct-manipulation objects on a canvas or board when selection already
has clear meaning. They are not added to ordinary catalog rows.

An eligible surface must provide right-click, Context Menu/Shift+F10, and touch long-press paths; select
the invoked target before opening; preserve ordinary click/tap behavior; and keep every action available
through the toolbar or inspector. Map Lab is binding. Loom is eligible for a later focused decision but
receives no speculative menu actions from this master plan.

### 13. Persistent references float wide and dock when constrained

Wide live surfaces may retain draggable, resizable, minimisable `FloatingWindow` references. On
constrained layouts those references become edge-docked sheets. Multiple references may remain open,
but only one is expanded at a time; labelled minimized tabs preserve the rest.

```text
Wide:                              Constrained:
+-----------------------------+    +-----------------------------+
| live console                |    | live console                |
|       +-------------------+ |    +-----------------------------+
|       | NPC dossier [_][x]| |    | [Mira] [Runner]  tabs      |
|       |                   | |    +-----------------------------+
+-------+-------------------+-+    | expanded reference      [v]|
                                  +-----------------------------+
```

Switching presentation does not discard reference state. A dialog remains above the dock.

### 14. Explicit scroll ownership

- Catalog browsers keep the route frame stable while list and detail own independent vertical
  overflow. Narrow layouts expose only one of those regions at a time.
- Spatial workspaces lock document scrolling. The canvas owns pan/zoom navigation; an inspector owns
  only its own vertical overflow.
- Live consoles may vertically scroll their live content, but the action needed to advance play stays
  reachable. Docked references own their internal overflow.
- Responsive drawers overlay constrained workspaces rather than adding another page scroll owner.

### 15. Feedback remains local and durable

- Quiet save state may live in the top bar.
- Canvas or tool failures use the established canvas status chip.
- A control failure appears beside the failed control with status semantics.
- A load failure replaces only the region that failed.
- One failure appears once. No toast or global notification system is introduced.

### 16. Labels survive compression

Tool families and domain actions retain visible labels. State-changing choices expose visible state,
such as `Smart: ON`. Only established, unambiguous compact actions such as Close, Undo, Redo, or zoom
may be icon-only, and they still require accessible names and touch-safe targets. Narrow layouts group
or move controls instead of stripping all labels.

## Map Lab product model preserved by the redesign

Map Lab is a map-first authoring instrument, not a generic graphics editor. Rooms define spatial
regions; props, passages, doors, stairs, portals, and terrain reinforce them. The editor and viewer are
sister surfaces and teach the same navigation language, while only the editor mutates authored data.
Existing room, door, passage, connection, API, database, and persistence meaning is not redesigned.

### Four separate concepts

1. **Navigation** — pan, zoom, floor switching, fitting, and focusing.
2. **Selection** — identify the room, prop, door, stair, portal, or terrain being examined.
3. **Room operation** — New, Extend, or Erase.
4. **Shape method** — Rectangle first, Freehand second.

Selecting a target never silently activates an editing operation. The Room tool may remain active as a
workflow session, but its operation and target remain visible.

```text
Room operation                 Shape method
├── New                        ├── Rectangle (default)
├── Extend                     └── Freehand
└── Erase
```

### Shared editor/viewer navigation

- Both surfaces share pan, zoom, floor switching, selection, empty-space clearing, Escape,
  focus/centering, Fit floor, and Focus selected behavior.
- Choosing a floor preserves map coordinates and zoom.
- Selecting a room already visible preserves framing.
- Selecting an off-screen room focuses it.
- Using a stair changes floor and centers the destination stair.
- Using a resolved portal changes floor or dungeon and centers the destination portal.
- An unresolved portal stays put and reports a local error.
- Single-clicking a stair or portal uses it and navigates.
- Right-click or keyboard contextual invocation selects it without travelling.
- Double-clicking a stair or portal centers the current connection without travelling.
- A browser double-click sequence must not trigger duplicate navigation.
- Editor/viewer switching and ordinary refresh preserve floor, coordinates, zoom, and focus during the
  browser session without turning navigation context into authored dungeon data.
- A return-to-previous-view action remains rejected.

### Room Finder replaces the room rail

The permanent desktop room rail and responsive Rooms drawer are not part of the destination. The
command band provides `Find room…`.

```text
+---------------------------------------------------------------+
| [Floor 2] [Find room…] [Fit floor] [Focus selected]           |
+---------------------------------------------------------------+
|                                                               |
|                            map                                |
|                                                               |
+---------------------------------------------------------------+
```

The finder shows results before typing, searches room number/title/floor, prioritizes the current floor,
labels off-map rooms, preserves concise viewer threat/NPC hints, supports all floors, and closes after
selection. It preserves the agreed focus rules above. Off-map rooms remain selectable even though they
have no canvas geometry to focus.

The current rail's unrelated responsibilities move separately before rail removal:

- Add floor belongs with floor controls.
- New room belongs with the Room workflow.
- Delete selected room belongs in inspector and contextual menu.
- Connection resolution receives a labelled utility launcher with meaningful unresolved count.

### Smart Room authoring

- Rectangle is the default axis-aligned, cell-snapped shape method.
- Freehand is the secondary method for irregular spaces.
- New, Extend, and Erase all use the current Rectangle/Freehand choice.
- Smart Room is the default and the Room tool persists until another tool or Escape is chosen.
- With no room selected, a gesture on empty ground may create a new room.
- With no room selected, a gesture over an existing room does nothing until that room is selected
  through Select mode, Room Finder, or contextual menu.
- A visible target halo identifies the selected room eligible for automatic extension.
- Gesturing on or adjacent to that halo previews `Extend Room <id>`.
- Gesturing on empty ground away from it previews `New room`.
- The preview names the resolved operation before commit.
- Force New and Force Extend each apply to one gesture, then return to Smart mode.
- Erase is explicit, applies to one gesture, then returns to Smart mode.
- A contextual drawing action closes its menu and arms the next gesture.
- Right-click never becomes the first painted cell.

Rectangle and Freehand share the continuity rule. Removing blocked cells may leave a continuous L-shape
or similar result, but disconnected results are invalid and never partially commit. Previews identify
valid, blocked, and problem cells where possible. One valid gesture is one undoable map edit. Selection,
focus, tool changes, and previews are not history entries.

### Selection and input

- Left-clicking empty space in Select mode clears selection.
- Left-clicking empty space with a drawing tool active begins that tool's operation.
- Clicking the already-selected item clears selection.
- Escape cancels an active stroke/preview before clearing selection or returning to Select.
- Right-clicking an entity selects it before opening its contextual menu.
- Inspector, command band, and contextual menu always refer to the same target.
- Double-clicking an ordinary item centers it.
- Space or middle-mouse drag temporarily pans while a desktop drawing tool is active.
- Two-finger gestures pan/zoom on touch without changing room geometry.
- Keyboard and assistive-technology users can choose operations and methods, cancel, undo, focus, and
  receive preview validity reasons.

### Map Lab contextual menus

Editor and viewer share contextual targeting. Editor menus expose existing authoring actions. Viewer
menus expose inspection/focus actions without mutation. The first menu set covers rooms, props, doors,
stairs, portals, terrain, and empty ground. Changing prop type, opening a door, duplication, movement,
and connected-room editing remain deferred.

### Feedback, safety, and history

- Invalid room operations show problem cells and initially report `Room shape must stay connected.` in
  the canvas status chip.
- No modal interrupts drawing.
- Invalid operations commit nothing.
- Existing autosave, undo/redo, room-content safeguards, and destructive-action rules remain in force.
- Existing room ownership, overlap, adjacency, off-map behavior, and content preservation remain
  authoritative.

## Concrete targets outside Map Lab

### Catalog browsers

All standard browsers share the merged top bar, persistent list search, collection-level create action,
selection-local edit/delete actions, collapsible wide list region, and narrow list-to-detail navigation.
They do not gain contextual menus, toolbars, inspectors, or a global command palette.

### Loom

The Loom remains a board workspace. Its inspector appears only for a selected node. Thread navigation,
legend, and Beat Bank leave the no-selection inspector fallback and receive labelled command-band
launchers. A short chooser may use a popover; a searchable collection uses a finder; a longer actionable
Beat Bank uses a drawer or sheet. Counts remain visible on their triggers. Opening utilities does not
manufacture node selection.

Loom is eligible for a later contextual-menu slice only after its exact menu actions receive their own
focused human decision. This master plan does not invent them.

### Encounter runner and persistent references

The encounter runner follows the live-console family: compact global navigation, one persistent
workflow-advancing action, glanceable direct controls, and local errors. Encounter and NPC reference
windows remain free-floating on wide screens and become edge-docked sheets on constrained screens.
Multiple references may remain represented, but only one constrained sheet is expanded at a time.

## Shared DM/kid surface impact

The full layout redesign is scoped to the DM application, but some map infrastructure is shared.

Shared contracts include `frontend/src/map/**`, `frontend/src/model/maplabModel.ts`, canvas geometry,
pan/zoom/fit, marker geometry, badge primitives, and theme tokens. DM composition work changes chrome
around `MapCanvas`; it does not fork or casually alter the shared renderer.

Every focused Plan that touches shared map/model paths must:

- name both Dungeons and Players ownership;
- preserve kid audience filtering and the curtain boundary;
- run DM and player map regression checks;
- preserve the kid 64px floor, no-exit rule, read-only behavior, and two-tap destination;
- keep `/play` outside `AppShell`; and
- reconcile active Kid Spellbook path overlap before implementation.

The kid app does not import DM `components/`, `features/`, `layout/`, or `pages/`. This redesign does not
weaken that boundary or make DM state components universal.

## Implementation protocol: small visible slices

### Hard human gate

Each focused Plan ends in `Awaiting human UX acceptance`. Automated checks prove contracts but do not
substitute for human layout judgment. A dependent Plan may be drafted, but its implementation must not
begin until the user explicitly accepts the prior visible result.

Every focused Plan copied from this master plan must include:

1. **Human-visible outcome** — one sentence a non-developer can verify.
2. **Before and after** — an ASCII composition or equally concrete description.
3. **Included** — the exact user-visible behavior in this slice.
4. **Explicitly excluded** — nearby redesign work that must not hitchhike.
5. **Human acceptance script** — actions and visible results, including touch and keyboard where
   applicable.
6. **Automated gate** — focused regressions plus required repo checks.
7. **Stop condition** — the exact point where work stops instead of flowing into the next slice.
8. **Dependency** — encoded in the canonical active Plan when another slice must be accepted first.

### Slice ledger

The IDs below identify destination slices, not active queue status. Focused Plans may narrow a slice
further if source evidence shows it is still too broad; they may not silently combine adjacent rows.

| Slice | Human-visible outcome | Explicit boundary | Human gate |
|---|---|---|---|
| FL-01 | The non-functional application footer is gone. | No header, nav, or route-content change. | Compare one browser, workspace, and live surface; no content is obscured at the bottom. |
| FL-02 | The app-brand header and page header become one operational top row. | Footer already handled; no tool relocation. | Check Field Guide, one browser, Map Lab, Loom, and encounter play at wide and constrained widths. |
| FL-03 | Play surfaces begin with compact global navigation while prep preference remains unchanged. | No local workspace redesign. | Enter/leave play surfaces and verify navigation remains reachable and prep rail preference survives. |
| FL-04 | Standard browsers place Create in the top row and selected-record actions with detail. | No editor behavior or autosave migration. | Use one representative browser wide and narrow, then verify all standard browsers match. |
| FL-05 | Map Lab floor creation, room deletion, and connection resolution have clear homes outside the room rail. | The room rail still exists; no finder yet. | Add a floor, delete a selected room, and resolve a connection without using mixed rail controls. |
| FL-06 | `Find room…` replaces the permanent room rail and responsive Rooms drawer. | No canvas, inspector, Smart Room, or context-menu redesign. | Find visible, off-screen, cross-floor, and off-map rooms with pointer, keyboard, and touch. |
| FL-07 | Map Lab has one command band with primary tools and explicit active-tool options. | Existing tool behavior remains; Smart Room is separate. | Activate every tool and setting at wide and constrained widths without arbitrary toolbar wrapping. |
| FL-08 | Map Lab inspector consumes no space without selection and adapts drawer/sheet presentation by available shape. | No property-field or obstacle-state redesign. | Select, clear, reselect, resize, and verify target/state continuity. |
| FL-09 | Editor and viewer teach the same pan, zoom, floor, selection, focus, and Escape behavior. | No room authoring or context actions. | Run the shared navigation script, including stair/portal click, context selection, and double-click. |
| FL-10 | Room authoring visibly supports Rectangle-first Smart Room, one-gesture overrides, previews, and undo. | No context menus or persistence-model redesign. | Complete the accepted room/porch/separate-room workflow with mouse, touch, and keyboard-accessible controls. |
| FL-11 | Map Lab contextual menus work by right-click, Shift+F10/Context Menu, and long-press while all actions retain visible alternatives. | No speculative actions. | Exercise every first-set target in editor and viewer and verify the layered Escape order. |
| FL-12 | Loom utilities have labelled command-band homes with visible counts. | Inspector behavior remains until utility relocation is accepted. | Open thread navigation, legend, and Beat Bank without selecting a node. |
| FL-13 | Loom inspector appears only for selected nodes; the board fills released space. | No node model or speculative contextual menu. | Select, clear, use utilities, and test drawer/sheet behavior at constrained widths. |
| FL-14 | Persistent encounter/NPC references float wide and dock as one-expanded-at-a-time sheets when constrained. | No encounter rules or card-content redesign. | Open multiple references, resize the viewport, switch expanded references, and preserve state. |

### Detailed example slice — FL-06 Room Finder

**Human-visible outcome**

> The permanent room sidebar and tablet Rooms drawer are gone. A `Find room…` control now appears in
> Map Lab's command row.

**Before**

```text
+--------------+------------------------------------------+
| Rooms        |                                          |
| Room 1       |                                          |
| Room 2       |                 map                      |
| Room 3       |                                          |
| scroll       |                                          |
+--------------+------------------------------------------+
```

**After**

```text
+---------------------------------------------------------+
| [Floor 2] [Find room…] [Fit] [Focus selected]           |
+---------------------------------------------------------+
|                                                         |
|                         map                             |
|                                                         |
+---------------------------------------------------------+
```

Opening the finder:

```text
             +--------------------------------------+
             | Search rooms…                        |
             +--------------------------------------+
             | CURRENT FLOOR                        |
             | Room 12 — Kitchen                    |
             | Room 15 — Guard post                 |
             +--------------------------------------+
             | OTHER FLOORS                         |
             | Room 3 — Floor 1 — Crypt             |
             | Room 28 — Floor 3 — Off map          |
             +--------------------------------------+
```

**Included**

- Remove permanent and responsive room-list layouts in editor and viewer.
- Add one visible finder control to both surfaces.
- Show useful results before typing and filter by room number, title, and floor.
- Keep off-map rooms discoverable and viewer hints concise.
- Preserve selection, floor switching, and conditional focus rules.
- Support mouse, touch, Tab, Enter, Escape, focus restoration, and touch-safe rows.

**Explicitly excluded**

- Canvas geometry, pan/zoom implementation, authoring, contextual menus, inspector fields, shared kid
  map behavior, global search, and unrelated toolbar cleanup.

**Prerequisite**

FL-05 has moved unrelated floor, deletion, and connection actions and received human acceptance.

**Human acceptance script**

1. Open a dungeon with titled, untitled, cross-floor, off-screen, and off-map rooms.
2. Confirm no room rail consumes map width and no Rooms drawer exists when constrained.
3. Open the finder without typing and confirm current/other-floor grouping.
4. Filter by room title and number.
5. Select an already-visible room; selection changes and framing does not.
6. Select an off-screen room; selection changes and the map focuses it.
7. Select a cross-floor room; the floor changes and the room is focused.
8. Select an off-map room; it remains reachable and clearly identified without inventing geometry.
9. Repeat opening, filtering, selection, and dismissal with keyboard only.
10. Repeat the primary path with touch.
11. Confirm the kid map still renders and navigates unchanged.

**Stop condition**

> Stop when Room Finder has replaced room-list navigation in both Map Lab surfaces, automated checks
> pass, and the human marks FL-06 accepted. Do not begin toolbar, inspector, Smart Room, or contextual
> menu changes.

## Explicitly outside this master plan

- A new palette, typeface, token scale, or arbitrary component colours.
- A global command palette, global search, toast system, or bespoke global hotkey layer.
- Kid-app layout redesign, mutation, exits to the DM app, or weakened import boundaries.
- API, database, seed, dungeon semantic, room semantic, passage, stair, portal, or connection redesign.
- Shared map renderer or geometry redesign unless a later focused Plan explicitly owns both audiences.
- Autosave migration for the six existing modal record editors; it still requires a shared undo design.
- Offline support, optimistic updates, or a new global state library.
- Photoshop-style layers/transforms, return-to-previous-view, speculative Map Lab context actions, or
  taking the editor offline for a rewrite.
- Automatic implementation of a dependent slice merely because automated tests pass.

## Accepted Map Lab design evidence

The following mockups are preserved verbatim from the accepted Map Lab review.

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

## Source ownership expected by future focused Plans

This master plan changes no application code. Likely ownership packets for later focused Plans are:

- Shared shell and browser composition: Design area; `frontend/src/layout/**`, shared components,
  standard browser consumers, and colocated tests.
- Map Lab layout and interaction: Dungeons area; `frontend/src/features/dungeons/maplab/**` and tests.
- Shared map/model changes, only if proven necessary: Dungeons and Players areas;
  `frontend/src/map/**`, `frontend/src/model/maplabModel.ts`, and both audience test suites.
- Loom layout: Loom and Design areas; `frontend/src/features/loom/**` and tests.
- Encounter live-console references: Encounters and Design areas; encounter/NPC features, shared
  `FloatingWindow`, and tests.
- Canonical UX/layout changes: `docs/UX_PATTERNS.md`, `docs/DESIGN_SYSTEM.md`, affected area-guide
  Surfaces rows, this master plan, and generated documentation.

Every focused Plan narrows these paths. None inherits the entire list merely by referencing this
document.

## Verification standard for future slices

Automated checks include focused Vitest/React Testing Library suites, `npm run test:check` for bounded
frontend work, typecheck, lint, build where applicable, relevant player-map regressions for shared map
touches, and the documentation checker. Tests must prove behavior and accessibility contracts, not only
class names.

The final UX gate remains human. Each slice's acceptance script must be performed at representative
wide and constrained sizes with keyboard-plus-mouse and touch where applicable. Browser automation is
not assumed; it is used only when explicitly requested. Human rejection returns the same focused Plan
to design/repair and does not authorize the next dependency.

## Provenance folded into this plan

This document supersedes the former Map Lab Editor UX Contract and Map Lab Editor UX Grilling Handoff.
Their settled interaction model, rationale, safety boundaries, implementation phasing, and accepted
mockups are preserved here. Historical implementation context remains available in the archived Map Lab
UX, component-refactor, test-refactor, and editor-usability Plans.
