# Map Lab Relocations — clear homes for floors, room deletion, and connections

> **Status:** Stage 1 shipped; floor creation now lives in the command band. Next: Stage 2 — move selected-room deletion to the inspector.

- **Areas:** design, dungeons
- **Read trigger:** When implementing FL-07 of the Frontend Layout Redesign master plan.

## What we're building & why

Map Lab's room rail still mixes room navigation with floor creation, room deletion, and connection
resolution. This Plan delivers FL-07 by giving those three responsibilities clear, labelled homes while
leaving the room rail itself in place for the later Room Finder slice.

The editor remains a spatial workspace: the map stays focal, existing authored data and persistence
meaning remain unchanged, and the accepted FL-06 command-band grammar remains the host for controls that
belong there. This is a presentation and ownership relocation, not a new dungeon or connection model.

## Stages

1. Move floor creation into the labelled floor controls associated with the command band while preserving floor selection, disabled-state behavior, and layout persistence.
2. Keep room navigation in the existing rail but move selected-room deletion to the selection inspector, preserving confirmed deletion and selection cleanup.
3. Give connection resolution a labelled utility home separate from mixed room-rail controls, preserving unresolved, broken, and missing-return actions and their local feedback.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Moved Add floor above/below from the room-navigation rail into the labelled command-band floor controls, preserving floor selection, disabled adjacent-floor behavior, handlers, keyboard semantics, responsive layout, and room-rail navigation. Added focused regression coverage for the relocated composition and preserved interactions. |

## Touches
- `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx`
- `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx`
- `frontend/src/features/dungeons/maplab/MapLabEditor.css`
- `frontend/src/features/dungeons/maplab/SelectionActions.tsx`
- `frontend/src/features/dungeons/maplab/ConnectionsResolveList.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.shell.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/ConnectionsResolveList.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.canvas.test.tsx`

## UX decisions — FL-07 Map Lab responsibility relocation

Surface:      Map Lab editor (`/dungeons/:dungeonId/edit`); the viewer is unchanged
Mode:         prep
Operator:     DM
Focal:        the map canvas; navigation and utility controls remain secondary
Route shape:  bespoke workspace, because Map Lab is a spatial canvas
Edit style:   floor controls and connection launcher are direct controls; selected-room deletion is in the selection inspector
Save:         existing editor autosave and existing ConfirmDialog flow; no new save or persistence flow
Empty:        existing Map Lab empty-layout states remain unchanged
Filtered empty: existing connection-resolution empty copy remains unchanged
No selection: existing no-selection inspector/canvas state remains unchanged
Load failure: the connection utility retains its established local `StatePanel` failure presentation
Action failure: beside the failed control or in the established canvas status chip; do not blank the map
Destructive: room deletion remains confirmed because it spans layout and dungeon data; no `window.confirm`
Keyboard:     preserve DOM order, native Enter/Space activation, visible focus, and Escape's highest-layer behavior
Touch:        ordinary controls retain the 48px floor; do not add a Map Lab exception

## Human-visible outcome

> In the Map Lab editor, floor creation, selected-room deletion, and connection resolution each have a
> clear labelled home outside the mixed room rail, while the room rail still exists for room navigation.

### Before

```text
[command band: Primary | Active tool options | View | Map | Floors]
[room rail: floor actions | New room | rooms | delete/connection responsibilities]
[focal map]                                             [inspector]
```

### After

```text
[command band: Primary | Active tool options | Floors | View | Map | floor/connection utilities]
[room rail: room navigation only]
[focal map]                                             [selected-room inspector: Delete room]
```

The room rail remains present. The later FL-08 Room Finder is not part of this Plan.

## Included

- Give Add floor above/below a clear floor-control home associated with the command-band/navigation grammar.
- Keep room list navigation available in the existing rail, without removing the rail or adding Room Finder.
- Make Delete room available from the selected-room inspector and preserve the existing confirmed deletion path.
- Give unresolved, broken, and missing-return connection actions a labelled utility home separate from room navigation.
- Preserve current floor selection, room selection, connection resolution/repoint/remove/return behavior, autosave, and local errors.
- Preserve keyboard and touch access at wide and constrained editor sizes.

## Explicitly excluded

- Removing or replacing the room rail or responsive Rooms drawer (FL-08).
- Room Finder, Smart Room authoring, contextual menus, inspector redesign beyond the delete action, or canvas geometry.
- Viewer layout or viewer connection controls.
- New connection, portal, floor, room, API, database, seed, or persistence semantics.
- Command-band redesign already shipped by FL-06, shared renderer changes, or arbitrary colors/tokens.

## Prerequisite

FL-06 is accepted in the master-plan receipt: `docs/master-plans/frontend-layout-redesign.md` records
`Accepted 2026-08-09` for the archived [Map Lab Command Band](../../done/maplab-command-band/maplab-command-band.md).
No active Plan dependency is required because FL-06 is archived and accepted.

## Human acceptance script

1. Open a dungeon editor with at least two floors, a selected room, and unresolved or cross-dungeon connections.
2. Add a floor above and below from the labelled floor home; confirm the floor appears, selection remains coherent, and unavailable adjacent-floor actions are disabled.
3. Select a room, use the inspector's `Delete room`, confirm the named destructive dialog, and verify the room disappears without deleting an unrelated fixture or changing the room rail into a finder.
4. Open the labelled connection utility and resolve an unfinished connection, repoint/remove a broken connection where available, and add a return gateway for an incoming gateway; verify local failure/empty feedback remains beside the utility.
5. Repeat the editor path at a constrained viewport: the navigation drawer overlays rather than crushing the map, labels remain visible, and no second page scroll owner appears.
6. Repeat floor, deletion, and connection paths with keyboard Tab plus Enter/Space and Escape; repeat the primary paths with touch.
7. Confirm the viewer, kid map, existing tool behavior, autosave, and FL-08 room-rail prerequisite remain unchanged.

## Automated gate

- Focused `MapLabEditorPage.chrome.test.tsx`, `MapLabEditorPage.shell.test.tsx`,
  `MapLabEditorPage.canvas.test.tsx`, and `ConnectionsResolveList.test.tsx` coverage for the moved homes,
  confirmation, keyboard semantics, and preserved connection states.
- `cd frontend && npm run test:check -- src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.shell.test.tsx src/features/dungeons/maplab/__tests__/ConnectionsResolveList.test.tsx`
- `cd frontend && npm run typecheck && npm run lint && npm run build`
- `.venv\Scripts\python.exe scripts/check_docs.py --check`

## Stop condition

> Stop when FL-07's three responsibilities are visibly separated in the editor, focused and full checks
> pass, and the human marks FL-07 accepted. Do not begin FL-08 Room Finder, FL-09 inspector work, FL-10
> Smart Room, or FL-11 contextual menus.

## Compiler handoff

### Stage 1
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx` — `MapLabEditorChrome` and `MapLabEditorNavigation`; current floor tabs and `Add floor above`/`Add floor below` controls are rendered in the chrome/navigation split. `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx` — `MapLabEditorChrome`/`MapLabEditorNavigation` call sites and existing `addFloorAbove`/`addFloorBelow` state actions.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx` — existing assertions cover Add floor above/below and disabled adjacent-floor controls.
- **Settled contracts:** Floor creation remains the existing `maplabEditor` actions and autosave path; floor tabs continue to select floors; the rail remains for room navigation; no Room Finder is introduced.
- **Constraints:** Preserve FL-06's command-band groups, labelled controls, DOM order, 48px ordinary controls, and constrained overlay behavior.
- **Open questions:** none about product behavior; `to-orders` should verify the smallest final control placement and exact affected CSS/test assertions.

### Stage 2
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx` — `selectionActions` selected-room branch currently supplies `Delete room`; `frontend/src/features/dungeons/maplab/SelectionActions.tsx` — shared selection action group; existing room deletion state/confirmation remains in the page.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx` — current Delete room presence coverage; `MapLabEditorPage.canvas.test.tsx` — selected-room and editor interaction coverage.
- **Settled contracts:** Room deletion remains a confirmed destructive action and must not become a reversible fixture delete; clearing the selected room follows existing cleanup behavior.
- **Constraints:** Do not redesign the inspector or move deletion into a contextual menu; do not change room data semantics or confirmation copy without evidence.
- **Open questions:** none about product behavior; `to-orders` should verify whether the existing inspector placement already satisfies FL-07 or needs only composition/CSS and regression updates.

### Stage 3
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx` — `MapLabEditorNavigation` currently passes/render connection data alongside room navigation; `frontend/src/features/dungeons/maplab/ConnectionsResolveList.tsx` — existing unresolved, broken-gateway, missing-return, empty, and load-error states; `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx` — connection loading and resolve callbacks.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/ConnectionsResolveList.test.tsx` — all connection list states and callbacks; `MapLabEditorPage.chrome.test.tsx` — editor chrome and navigation integration.
- **Settled contracts:** Preserve `Choose destination`, `Repoint`, `Remove`, and `Add the return gateway`; preserve `Every connection has both ends. Nothing to resolve.` and the local load-error panel; retain existing API callbacks and no new data model.
- **Constraints:** Utility launcher must be labelled, keyboard/touch reachable, and separate from room list navigation; no viewer change and no speculative connection actions.
- **Open questions:** none about product behavior; `to-orders` should verify the existing utility's final host and responsive disclosure pattern.
