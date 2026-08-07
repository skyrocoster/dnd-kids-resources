# Frontend Layout Redesign — Master Plan

> **Status:** Desired state agreed through guided review; no implementation Plan is authorized by
> this document alone. When a slice is selected, `to-plan` autonomously routes it to direct quick
> delivery or a focused Plan. Every slice still requires explicit human acceptance before the next
> dependent slice begins.

## What this document is

This is the detailed product destination for the DM application's layout and the explicitly included
completion of the kid spellbook reference surface. It is deliberately broader than a repository
execution Plan and more concrete than a design principle. It records what the human should see, how
the major surfaces should transform, and how the redesign must be divided into small, independently
reviewable outcomes.

This master plan is not part of the active-Plan queue. Work ships either through a focused Plan under
`docs/plans/active/` or, for a fully settled atomic slice, through the bounded direct route selected by
`to-plan`. Route-independent delivery receipts below preserve implementation and acceptance evidence;
they do not rank or queue work. Every route declares exact paths and dependencies, preserves unrelated
work, and stops for human UX acceptance at the end of every visible slice.

Unless a paragraph explicitly describes the existing implementation, present-tense language below
describes the agreed destination, not behavior already shipped. Canonical `IN FORCE` references continue
to describe the live app until the focused slice ships and reconcile updates those references.

## Why this redesign exists

The application already supports both touch and keyboard-plus-mouse, but its layout vocabulary has
grown feature by feature. Permanent rails consume workspace for actions that are already available on
the canvas. Headers repeat application identity without helping the current task. Toolbars, popovers,
drawers, inspectors, floating windows, and dialogs have individually useful behavior but need one clear
composition model.

The redesign must make the primary work obvious, give every secondary surface one job, and protect the
DM's attention at the table. The remaining kid spellbook work belongs here because it is now a visible
reference-layout outcome rather than a new data or routing capability. The redesign must not become a
big-bang rewrite. Every change must leave the app usable, produce one visible result a human can judge,
and pause before dependent visual work proceeds.

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

### 2. Four surface families

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

#### Kid reference surface

Used by the read-only kid spellbook. This is not a DM catalog browser: it has no collection-wide
catalog, selection/detail split, create action, mutation flow, or route back to the DM app. Persistent
character tabs, `Map`, and `Browse by` controls frame the active character's assigned-spell reference.

```text
+---------------------------------------------------------------+
| [character] [character] [Map]                                 |
+---------------------------------------------------------------+
| Browse by [Actions v]                                         |
+---------------------------------------------------------------+
| [icon] Damage                                           [open] |
|   Spell slot 1                                                |
|     Burning Hands — 15-foot cone; 3d6 fire                    |
|       expanded canonical reference                            |
| [icon] Heal                                         [disabled]|
+---------------------------------------------------------------+
```

The surface is designed for children to get an answer and return attention to the table. Controls use
an icon plus words and retain the 64px kid touch floor. Only the active character's assigned spells
appear. The app remains read-only, polls automatically, and preserves the last readable frame through
background failures.

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
- Choosing any action closes the contextual menu before the next operation or layer begins. Irreversible
  room deletion then opens `ConfirmDialog`; reversible fixture/feature deletion remains immediate and
  offers Undo through the canvas status chip.
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

Wide live surfaces may retain multiple draggable, resizable, minimisable `FloatingWindow` references at
once. On constrained layouts those references become edge-docked sheets. Multiple references may remain
represented there, but only one constrained sheet is expanded at a time; labelled minimized tabs
preserve the rest.

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
- The destination requires editor/viewer switching and ordinary refresh to preserve floor, coordinates,
  zoom, and focus during the browser session without turning navigation context into authored dungeon
  data. This is FL-05 work, not a claim about current persistence.
- A return-to-previous-view action remains rejected.

### Room Finder replaces the room rail

The permanent desktop room rail and responsive Rooms drawer are not part of the destination. This
intentionally supersedes the former rail presentation while preserving its selection, cross-floor,
off-screen focus, visible-room framing, and off-map reachability contracts. The command band provides
`Find room…`.

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
- Direct canvas targeting for Extend or Erase is available only after explicitly arming that operation.
- The selected room remains the target while Extend or Erase is active.

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
- Long-press contextual selection is active only in Select mode and must not interfere with drawing
  gestures.
- Inspector, command band, and contextual menu always refer to the same target.
- Double-clicking an ordinary item centers it.
- Space or middle-mouse drag temporarily pans while a desktop drawing tool is active.
- Two-finger gestures pan/zoom on touch without changing room geometry.
- Keyboard and assistive-technology users can choose operations and methods, cancel, undo, focus, and
  receive preview validity reasons.

### Map Lab contextual menus

Editor and viewer share contextual targeting. Editor menus expose existing authoring actions. Viewer
menus expose inspection/focus actions without mutation. The first menu set is explicit:

- Rooms: existing inspect/edit, Extend, Erase, focus, and delete behavior.
- Doors, stairs, and portals: existing inspect/edit/delete behavior in the editor, inspection/focus in
  the viewer, and ordinary left-click travel for stairs/portals remains unchanged.
- Props: existing inspect, focus, and reversible delete behavior in the editor; inspection/focus only in
  the viewer.
- Terrain features: existing inspect, erase, and reversible delete behavior in the editor;
  inspection/focus only in the viewer.
- Empty ground: room creation and existing placement choices in the editor; no mutation in the viewer.

Changing prop type, opening a door, duplication, movement, and connected-room editing remain deferred.

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

### Kid spellbook

The route, response-driven character tabs, persistent `Map` action, per-character in-memory view state,
automatic polling, and last-good-frame behavior already exist. Each character tab retains the
character's name and simple icon, and the active tab remains unmistakable. The remaining destination
completes the assigned-spell reading surface without turning it into a recommender, rules engine, slot
tracker, or full-catalog browser.

`Actions` is the default browse mode. Its fixed visible category order is `Damage`, `Heal`, `Protect`,
`Control`, `Move`, `Detect`, `Influence`, `Create`, `Summon`, and `Other`. One action category is open at
a time. Empty categories remain visible but disabled; empty spell-slot groups are hidden. Category
controls use a simple first-pass icon plus the category word. Inside an open category, assigned spells
are grouped under collapsible `Spell slot` levels, with one slot section open at a time. Categories
describe what a spell helps accomplish rather than its school or attack mechanic; a spell may appear
in multiple categories, and `Other` keeps every assigned spell discoverable.

A spell row shows only its name and existing concise `quick_rules`. One spell detail may be expanded at
a time, inline beneath its row. The detail begins with quick rules and then renders the canonical
casting time, range, duration, components, concentration and ritual state, description, and higher-level
text. It does not show remaining-slot counts, spent state, recommendations, or ranking, calculate rules,
or rewrite the source for children.

`Browse by` switches the same assigned collection rather than adding permanent filter chrome:

- `Spell Slot` groups by slot level and then action category.
- `Damage Type` groups by damage type and then slot level; a multi-type spell appears under every
  applicable type.
- Returning to `Actions` restores the character's last state. Character switching continues to retain
  that character's browse mode, open category or slot group, expanded spell, and scroll position.

Empty assignment state reads `No spells assigned yet.` A temporarily empty group reads `No spells in
this group.` The bootstrap-only no-character state reads `Choose a character to see their spells.` An
initial load failure reads `The spellbook didn't load. Ask your DM.` Background poll failure keeps the
last readable content instead of interrupting an expanded spell. Control failures are reported beside
the affected control with status semantics and never blank the reading surface.

Keyboard focus follows DOM order through character tabs, `Map`, `Browse by`, groups, spell rows, and
links; Enter and Space activate native buttons. Escape does not change route or dismiss persistent
content. Touch uses the same behavior with the 64px control floor. Final iconography, tactical
recommendations, favourites, usage ranking, current-slot state, and additional metadata browse modes
remain outside the destination.

## Shared DM/kid surface impact

The shell, catalog, workspace, Loom, and encounter redesign remains scoped to the DM application. The
kid spellbook completion above is the one explicit kid-layout inclusion. Some map infrastructure is
also shared even though the kid map itself is not being redesigned.

Shared contracts include `frontend/src/map/**`, `frontend/src/model/maplabModel.ts`, canvas geometry,
pan/zoom/fit, marker geometry, badge primitives, and theme tokens. DM composition work changes chrome
around `MapCanvas`; it does not fork or casually alter the shared renderer.

Every focused Plan that touches shared map/model paths must:

- name both Dungeons and Players ownership;
- preserve kid audience filtering and the curtain boundary;
- run DM and player map regression checks;
- preserve the kid 64px floor, no-exit rule, read-only behavior, and two-tap destination;
- keep `/play` outside `AppShell`; and
- preserve the completed kid spellbook route, polling, navigation, and per-character session state.

The kid app does not import DM `components/`, `features/`, `layout/`, or `pages/`. This redesign does not
weaken that boundary or make DM state components universal.

## Implementation protocol: small visible slices

### Hard human gate

Each delivery route ends in `Awaiting human UX acceptance`. Automated checks prove contracts but do not
substitute for human layout judgment. A dependent Plan may be drafted, but its implementation must not
begin until the user explicitly accepts the prior visible result and the receipt records that acceptance.

Every focused Plan copied from this master plan, and every direct brief where applicable, preserves:

1. **Human-visible outcome** — one sentence a non-developer can verify.
2. **Before and after** — an ASCII composition or equally concrete description.
3. **Included** — the exact user-visible behavior in this slice.
4. **Explicitly excluded** — nearby redesign work that must not hitchhike.
5. **Human acceptance script** — actions and visible results, including touch and keyboard where
   applicable.
6. **Automated gate** — focused regressions plus required repo checks.
7. **Stop condition** — the exact point where work stops instead of flowing into the next slice.
8. **Dependency** — encoded in the canonical active Plan or verified against the slice receipts when
   another slice must be accepted first.

### Autonomous route selection

When the user selects a slice, `to-plan` judges the execution route without asking whether a Plan or
work order is wanted. A slice goes directly through `implement-quick` and mandatory `quick-reconcile`
only when current repository evidence proves one atomic change, exact authorized paths and check, no
unsettled design/architecture/API/data/migration/compatibility/diagnosis decision, accepted
prerequisites, and no need for queued or multi-context coordination state. Otherwise it receives a
focused Plan. File count and a human acceptance gate do not by themselves require a Plan.

### Focused-slice specification template

Use this block when a slice needs a focused active Plan. Replace every prompt; `standard`, `responsive`,
and `as appropriate` are not decisions.

```md
### <slice ID> — <human-visible feature name>

**Human-visible outcome**
> <One sentence a non-developer can verify by looking at and operating the app.>

**Before**
<ASCII composition or exact description of what the human sees now.>

**After**
<ASCII composition or exact description of what the human will see.>

**Included**
- <Visible behavior delivered by this slice.>

**Explicitly excluded**
- <Nearby work that must not hitchhike.>

**Prerequisite**
<Accepted slice or none; encode this in the focused Plan's dependency.>

**Human acceptance script**
1. <Action at a named surface and viewport condition.>
2. <Visible result.>
3. <Keyboard-plus-mouse path where applicable.>
4. <Touch path where applicable.>

**Automated gate**
- <Focused behavior/accessibility regressions and required repository checks.>

**Stop condition**
> Stop when <exact visible outcome>, checks pass, and the human marks <slice ID> accepted.
> Do not begin <named adjacent slices>.
```

### Slice ledger

The IDs below identify destination slices, not active queue status. Focused Plans may narrow a slice
further if source evidence shows it is still too broad; they may not silently combine adjacent rows.

| Slice | Requires accepted | Human-visible outcome | Explicit boundary | Human gate |
|---|---|---|---|---|
| FL-01 | — | The non-functional application footer is gone. | No header, nav, or route-content change. | Compare one browser, workspace, and live surface; no content is obscured at the bottom. |
| FL-02 | FL-01 | The app-brand header and page header become one operational top row. | Footer already handled; no tool relocation. | Check Field Guide, one browser, Map Lab, Loom, and encounter play at wide and constrained widths. |
| FL-03 | FL-02 | Play surfaces begin with compact global navigation while prep preference remains unchanged. | No local workspace redesign. | Enter/leave play surfaces and verify navigation remains reachable and prep rail preference survives. |
| FL-04 | FL-02 | Standard browsers place Create in the top row and selected-record actions with detail. | No editor behavior or autosave migration. | Use one representative browser wide and narrow, then verify all standard browsers match. |
| FL-05 | — | Editor and viewer teach the same pan, zoom, floor, selection, focus, and Escape behavior. | No room authoring, layout replacement, or menu actions; contextual selection without travel is included. | Run the shared navigation script, including stair/portal click, right-click/keyboard selection without travel, and double-click. |
| FL-06 | FL-02 | Map Lab has one command band with primary tools and explicit active-tool options. | Existing tool behavior remains; Smart Room is separate. | Activate every existing tool and setting at wide and constrained widths without arbitrary toolbar wrapping. |
| FL-07 | FL-06 | Map Lab floor creation, room deletion, and connection resolution have clear homes outside the room rail. | The room rail still exists; no finder yet. | Add a floor, delete a selected room, and resolve a connection without using mixed rail controls. |
| FL-08 | FL-05, FL-07 | `Find room…` replaces the permanent room rail and responsive Rooms drawer. | No canvas, inspector, Smart Room, or context-menu redesign. | Find visible, off-screen, cross-floor, and off-map rooms with pointer, keyboard, and touch. |
| FL-09 | FL-02 | Map Lab inspector consumes no space without selection and adapts drawer/sheet presentation by available shape. | No property-field or obstacle-state redesign. | Select, clear, reselect, resize, and verify target/state continuity. |
| FL-10 | FL-05, FL-06 | Room authoring visibly supports Rectangle-first Smart Room, one-gesture overrides, previews, and undo. | No context menus or persistence-model redesign. | Complete the accepted room/porch/separate-room workflow with mouse, touch, and keyboard-accessible controls. |
| FL-11 | FL-05, FL-10 | Map Lab contextual menus work by right-click, Shift+F10/Context Menu, and long-press while all actions retain visible alternatives. | No speculative actions. | Exercise every listed first-set target/action in editor and viewer and verify the layered Escape order. |
| FL-12 | FL-02 | Loom utilities have labelled command-band homes with visible counts. | Inspector behavior remains until utility relocation is accepted. | Open thread navigation, legend, and Beat Bank without selecting a node. |
| FL-13 | FL-12 | Loom inspector appears only for selected nodes; the board fills released space. | No node model or speculative contextual menu. | Select, clear, use utilities, and test drawer/sheet behavior at constrained widths. |
| FL-14 | FL-03 | Persistent encounter/NPC references float wide and dock as one-expanded-at-a-time sheets when constrained. | No encounter rules or card-content redesign; multiple wide windows may remain expanded. | Open multiple references, resize the viewport, switch the one expanded constrained reference, and preserve state. |
| FL-15 | — | The kid spellbook opens in Actions mode with icon-and-word categories, assigned spells grouped by slot, and one inline canonical spell detail. | No alternate browse modes, recommendations, slot tracking, final icon polish, API/data redesign, or DM-app layout change. | Switch characters, browse populated and empty categories, expand one spell at a time, return to Map and back, and repeat with keyboard and touch. |
| FL-16 | FL-15 | `Browse by` switches the kid spellbook among Actions, Spell Slot, and Damage Type without adding permanent filter chrome. | No additional metadata modes, personalized ordering, or changes to the fixed category vocabulary. | Exercise all three modes, verify multi-type duplication and per-character sticky state, and confirm only assigned spells appear. |

### Detailed example slice — FL-08 Room Finder

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

FL-05 has shipped the selection/focus behavior the finder will invoke. FL-06 has established the
command-band host. FL-07 has moved unrelated floor, deletion, and connection actions. All three have
received human acceptance.

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
> pass, and the human marks FL-08 accepted. Do not begin inspector, Smart Room, or contextual
> menu changes.

## Slice delivery receipts

This route-independent table is maintained by `quick-reconcile` and `reconcile`; it is evidence, not
the active queue. Automated checks may record implementation, but only explicit human UX acceptance
may record an `Accepted` state.

| Slice | Route | State | Evidence |
|---|---|---|---|
| FL-01 | Direct | Accepted 2026-08-07 | Removed the non-functional `AppShell` footer and its style; the focused `AppShell.test.tsx` check passed and the user signed off the visible result. |
| FL-02 | Plan | Accepted 2026-08-07 | [Frontend Operational Top Row](../plans/done/frontend-operational-top-row/frontend-operational-top-row.md) merged the brand-only and route headers into one AppShell operational row across Field Guide and browsers, Map Lab, Loom, and encounter play; automated stage checks passed and the user accepted the visible result. |
| FL-03 | Plan | Accepted 2026-08-07 | [Frontend Play Navigation](../plans/done/frontend-play-navigation/frontend-play-navigation.md) adds temporary compact wide-screen AppShell navigation to the encounter runner while preserving the preparation preference and constrained navigation; focused and full automated checks passed and the user confirmed UX acceptance. |
| FL-04 | Plan | Accepted 2026-08-07 | [Frontend Standard Browser Actions](../plans/done/frontend-standard-browser-actions/frontend-standard-browser-actions.md) adds Monster selected-detail Delete and regression coverage for collection Create plus selected Edit/Delete across all nine standard browsers; focused and full checks passed and the user confirmed UX acceptance. |

## Explicitly outside this master plan

- A new palette, typeface, token scale, or arbitrary component colours.
- A global command palette, global search, toast system, or bespoke global hotkey layer.
- Kid-app layout beyond FL-15 and FL-16, kid mutation, exits to the DM app, or weakened import
  boundaries.
- Changes to the fixed action vocabulary before evidence from children using it, source cleanup or a
  child-facing rewrite for malformed canonical spell prose, and broader kid gear/reference surfaces.
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

## Source ownership expected by future delivery routes

This master plan changes no application code. Likely ownership packets for later routes are:

- Shared shell and browser composition: Design area; `frontend/src/layout/**`, shared components,
  standard browser consumers, and colocated tests.
- Map Lab layout and interaction: Dungeons area; `frontend/src/features/dungeons/maplab/**` and tests.
- Shared map/model changes, only if proven necessary: Dungeons and Players areas;
  `frontend/src/map/**`, `frontend/src/model/maplabModel.ts`, and both audience test suites.
- Loom layout: Loom and Design areas; `frontend/src/features/loom/**` and tests.
- Encounter live-console references: Encounters and Design areas; encounter/NPC features, shared
  `FloatingWindow`, and tests.
- Kid spellbook completion: Players, Reference, and Design areas; `frontend/src/player/**`, pure API or
  model contracts importable by the player build, player-owned tests, and canonical kid UX references.
- Canonical UX/layout changes: `docs/UX_PATTERNS.md`, `docs/DESIGN_SYSTEM.md`, affected area-guide
  Surfaces rows, this master plan, and generated documentation.

Every focused Plan or direct brief narrows these paths. None inherits the entire list merely by
referencing this document.

## Verification standard for future slices

Automated checks include focused Vitest/React Testing Library suites, `npm run test:check` for bounded
frontend work, typecheck, lint, build where applicable, relevant player-map regressions for shared map
touches, and the documentation checker. FL-15 and FL-16 each prove their focused kid interactions and
the player-build import boundary. FL-16 closeout additionally preserves regression evidence for
category validation and persistence, AI-seeded values, DM category edits, assigned-only responses, and
seed export/rebuild round-tripping. Generated API, data-model, testing, area-guide, and plan inventories
are refreshed only when their source contracts change. Tests must prove behavior and accessibility
contracts, not only class names.

The final UX gate remains human. Each slice's acceptance script must be performed at representative
wide and constrained sizes with keyboard-plus-mouse and touch where applicable. Browser automation is
not assumed; it is used only when explicitly requested. Human rejection returns the same focused Plan
to design/repair and does not authorize the next dependency.

## Provenance folded into this plan

The unshipped Kid Spellbook Stage 4 browse surface and Stage 5 verification closeout have been folded
into this destination as FL-15 and FL-16. The former `docs/Contracts/kid-spellbook.md` readiness
contract is superseded and removed rather than retained as a second source of future behavior. The
archived Kid Spellbook Plan remains the record that Stages 1–3 shipped the category/API contract, DM
category editor, `/play/spells` route, character bootstrap, navigation, sticky session state, and
resilient polling; it authorizes no further implementation. The former Stage 5 was not a visible
product slice, so its verification and documentation duties now live in the gates for FL-15 and FL-16
instead of becoming a duplicate ledger row.

This document supersedes the former Map Lab Editor UX Contract and Map Lab Editor UX Grilling Handoff.
Their settled interaction model, rationale, safety boundaries, implementation phasing, and accepted
mockups are preserved here. Historical implementation context remains available in the archived Map Lab
UX, component-refactor, test-refactor, and editor-usability Plans.

The full-redesign review deliberately changes two former presentation/phasing decisions: Room Finder
replaces the rail while retaining its behavioral payoff, and the formerly bundled navigation + Smart
Room release is split by independently usable layout slices. Behavioral dependency remains explicit:
shared navigation is accepted before Smart Room and contextual menus, and Smart Room is accepted before
contextual menu actions. These are intentional supersessions, not accidental omissions.

Repository evidence folded into the former handoff remains the basis for later focused exploration:
Map Lab orchestration is separated from toolbar/navigation, canvas composition, and selection-sheet
components; its reducer/history excludes selection and active-floor changes from undo history;
`useCanvasStroke` owns pointer capture and stroke continuity; `maplabModel.ts` owns validity, adjacency,
and geometry; and the Dungeons invariants preserve geometry, reducer, autosave, zoom/pan, fullscreen, and
persistence unless a focused Plan names them.

Comparable-product evidence used during the accepted review was directional rather than authoritative:
Tiled separates selection from boundary editing and supports contextual actions; Dungeon Alchemist
supports draw-first rooms and expansion; Foundry VTT uses focused canvas tools and contextual controls;
Inkarnate and Dungeondraft distinguish room/shape tools from freehand/object tools; and Figma/Miro
reinforce explicit selection and reversible edits. The repo-specific decisions in this master plan—not
those products—remain binding.
