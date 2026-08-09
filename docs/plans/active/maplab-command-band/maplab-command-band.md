# Map Lab Command Band — one labelled tool row with explicit active options

> **Status:** Stage 1 shipped; Stage 2 is ready to compile for viewer parity and responsive closeout.

- **Areas:** design, dungeons
- **Read trigger:** When implementing FL-06 of the Frontend Layout Redesign master plan.

## What we're building & why

Map Lab's existing controls are already functional, but the editor presents creation tools as one
legacy `Create` tray while view, map, floor, and active-tool controls live beside it without one clear
command-band grammar. This Plan delivers FL-06 without changing tool behavior: primary workflow tools
remain visibly distinct from the options for the currently armed tool, and constrained widths use
intentional rows rather than accidental flex wrapping.

The Plan implements only the FL-06 command-band outcome. FL-07 keeps the room rail and moves its
floor/deletion/connection responsibilities later; FL-08 removes that rail; Smart Room remains FL-10.

## Stages

1. Establish the shared Map Lab command-band composition and migrate the editor's primary tools plus
   active-tool options into explicit labelled groups, preserving all existing activation and flyout
   behavior.
2. Bring the viewer command controls into the same primary/utility grammar and finish wide/constrained
   layout behavior, keyboard semantics, and regression coverage across editor and viewer.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| Stage 1 | The Map Lab editor now separates Primary tools from Active tool options while preserving existing tool activation, flyouts, shortcuts, and utility controls. Focused tests and the full stage checks passed. |

## Touches
- `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx`
- `frontend/src/features/dungeons/maplab/MapLabToolbar.tsx`
- `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx`
- `frontend/src/features/dungeons/maplab/MapLabPage.tsx`
- `frontend/src/features/dungeons/maplab/MapLabPage.css`
- `frontend/src/features/dungeons/maplab/MapLabEditor.css`
- `frontend/src/features/dungeons/maplab/__tests__/**`

## UX decisions — Map Lab editor and viewer command band

Surface:      Map Lab editor (`/dungeons/:dungeonId/edit`) and viewer (`/dungeons/:dungeonId`), owned by the Dungeons area
Mode:         prep for the editor; play for the viewer
Operator:     DM
Focal:        the map canvas; the command band stays shallow and secondary so tools are reachable without competing with the map
Route shape:  bespoke workspace, because Map Lab is a spatial canvas rather than a catalog browser
Edit style:   direct controls for tools and view settings; selected-object properties remain in the existing inspector
Save:         existing editor autosave and existing viewer session behavior; this slice adds no save flow
Empty:        existing Map Lab region states and copy remain unchanged
Filtered empty: existing flyout copy `No tools match that.` remains unchanged
No selection:  existing Map Lab no-selection canvas state remains unchanged
Load failure: existing failed Map Lab region continues to own its current local failure presentation
Action failure: beside the failed Map Lab control or in the established canvas status chip, with `role="status"`
Destructive:  existing ConfirmDialog/reverse-action rules remain unchanged; this slice adds no destructive action
Keyboard:     preserve DOM order; native buttons activate with Enter/Space; existing tool shortcuts remain; Escape closes the highest flyout/popover or cancels the active operation
Touch:        every ordinary command-band control remains at least 48px; no new exception

## Human-visible outcome

> At wide and constrained sizes, Map Lab shows one labelled command band with a primary tool group and
> a separate active-tool options group; choosing tools and settings still behaves exactly as before.

### Before

```text
[Create tray: Select Room Passages Prop Terrain] [View] [Map] [Floor tabs]
```

### After

```text
[Primary: Select Room Passages Prop Terrain] [Active tool: current options] [View] [Map] [Floor tabs]
```

Constrained layouts use deliberate group rows and keep labels visible; the canvas is never made into a
second scroll owner by this change.

## Included

- Give primary tool selection and current-tool configuration separate labelled command-band groups.
- Keep existing Select, Room, Passages, Prop, Terrain, Erase, flyout, view, map, floor, and shortcut behavior.
- Make the composition legible at wide and constrained widths without arbitrary wrapping.

## Explicitly excluded

- Smart Room, room rail removal, floor/deletion/connection relocation, Room Finder, inspector redesign,
  contextual menus, canvas geometry, persistence/API changes, and new tools.

## Prerequisite

FL-02 is accepted in the master-plan receipt. FL-06 does not depend on FL-05; FL-07 and later slices
must not begin until this slice is human-accepted.

## Human acceptance script

1. Open Map Lab editor and viewer at a representative wide viewport; confirm one shallow labelled
   command band and a focal canvas.
2. Activate Select, Room, each Passage tool, Prop, and each Terrain tool; confirm the primary group
   identifies the active tool and the options group exposes only relevant options.
3. Open and dismiss every existing flyout and View/Map utility without losing selection or changing
   tool behavior.
4. Resize to a constrained viewport; confirm groups form intentional rows, labels remain visible,
   controls remain reachable, and the canvas remains usable.
5. Repeat the editor path with keyboard Tab, Enter/Space, existing shortcuts, and Escape; repeat the
   primary viewer path with touch.

## Automated gate

- Focused Map Lab editor chrome, viewer layout-control, navigation, and terrain-control tests.
- `cd frontend && npm run test:check -- src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx`
  plus the focused suites named by each work order.
- `cd frontend && npm run typecheck && npm run lint` for the completed stage.
- `.venv\Scripts\python.exe scripts/check_docs.py --check`.

## Stop condition

> Stop after Stage 2's command-band result is visible, focused and full checks pass, and the human
> marks FL-06 accepted. Do not begin FL-07's relocation work, FL-08's Room Finder, or FL-10 Smart Room.
