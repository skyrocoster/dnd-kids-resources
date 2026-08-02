# Map Lab component refactor — smaller responsibility-oriented component files

> **Status:** Planned — waiting for Map Obstacle State to finish before changing shared Map Lab components.

- **Areas:** dungeons
- **Read trigger:** Splitting or reorganizing oversized Map Lab frontend components without changing the viewer or editor experience.

## What we're building & why

The Map Lab source has grown into a pair of page-sized components that contain nearly every concern
of the viewer and editor. `MapLabPage.tsx` combines viewer state, toolbar controls, SVG layers,
inspector wiring, and floating docks; `MapLabEditorPage.tsx` combines editor state, tool palettes,
navigation, canvas placement layers, selection editing, and destructive-action dialogs. This makes
small fixes difficult to locate, increases the cost of focused review, and encourages unrelated
responsibilities to evolve together.

We will reorganize the existing components into small responsibility-oriented files, extracting
shared presentation and interaction pieces only where the boundary is real. This is a component
structure change, not a UX redesign or API change: the current Map Lab routes, behavior, accessibility
semantics, persistence, and visual language remain intact.

## Stages
1. Establish the post-Map-Obstacle-State component baseline and define the final responsibility-to-file map, including which existing files are already appropriately sized.
2. Split the session viewer into focused toolbar/view controls, canvas layers, room navigation, inspector/dock composition, and route-state responsibilities while preserving its harness and public route behavior.
3. Split the editor into focused tool/navigation chrome, canvas rendering and placement layers, selection-sheet editors, and confirmation/status responsibilities while preserving autosave, undo/redo, gestures, and keyboard behavior.
4. Split the remaining oversized form/editor seams where the responsibility boundary is clear, then review the Map Lab tree for duplicated state, accidental import cycles, stale stage labels, and discoverability; update only the minimum documentation or generated inventory required by the resulting tree.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|

## Touches
- `frontend/src/features/dungeons/maplab/*.tsx`
- `frontend/src/features/dungeons/maplab/*.ts`
- `frontend/src/features/dungeons/maplab/*.css`
- `frontend/src/features/dungeons/maplab/__tests__/*`
- `docs/TESTING.md`
- **Depends on:** [Map Obstacle State](../map-obstacle-state/map-obstacle-state.md)

## UX decisions — Map Lab viewer and editor composition

Surface:      Map Lab session view and Map Lab editor, owned by the Dungeons area guide
Mode:         both — the session viewer is play; the editor is prep
Operator:     DM
Focal:        the map canvas remains the focal element; rails, toolbars, inspectors, and overlays support it without changing its size, hierarchy, or glanceability
Route shape:  bespoke — Map Lab is a canvas workspace, not a record-shaped Browser/Viewer/Editor triad
Edit style:   direct controls for session state; inline panel/rail for selected fixture and room properties
Save:         explicit on create; the existing editor autosaves edits with visible idle/saving/saved/error status; session state keeps its existing persistence behavior
Empty:        StatePanel status with the existing route-specific copy: "No saved layout yet. This dungeon is starting from a blank map." for the viewer and "No saved layout yet. Your first edit will save this blank map." for the editor
Filtered empty: "All layers are hidden. Turn one on to see the map."
No selection:  "Select a room, door, stair, or prop for details." in the editor selection region; the viewer keeps "Select a room on the map to see its details."
Load failure: StatePanel/MapLabRouteState fills the route or map region that failed to load; do not blank the surrounding shell for an action failure
Action failure: inline beside the failed control or in the existing bottom-center canvas status region
Destructive:  preserve ConfirmDialog for room deletion, reset, and discarded unsaved changes with the current messages; reversible fixture/feature deletion keeps its existing inline Undo action
Keyboard:     preserve native DOM focus order, Enter/Space activation for SVG role-buttons, Escape closing the topmost flyout/popover/drawer or exiting fullscreen, and the editor's existing scoped tool and undo/redo shortcuts
Touch:        preserve the 48px floor; retain only the existing documented Map Lab canvas-glyph and compact property-control exceptions

## Compiler handoff

### Stage 1
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabPage.tsx` — 1,032 lines spanning viewer state, shared toolbar hooks, toolbar tray, canvas rendering, inspector composition, room details, and docks; `MapLabEditorPage.tsx` — 2,114 lines spanning editor state, tools, navigation, canvas rendering, selection editing, and dialogs; `FixturePropertiesForm.tsx` — 505 lines spanning generic fields, catalog pickers, destination pickers, and loot loading.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx`, `MapLabEditorPage.test.tsx`, `FixturePropertiesForm.test.tsx`, and the focused colocated component suites — the current tests exercise the page harness and the existing extracted marker/panel components.
- **Settled contracts:** The refactor preserves route behavior, rendered copy, DOM accessibility roles, Map Lab state ownership, API/client boundaries, autosave and session persistence, gestures, keyboard shortcuts, and current test coverage; new files remain colocated under the existing Map Lab directory.
- **Constraints:** Do not overlap the active Map Obstacle State implementation; do not change production exports solely for test convenience; preserve unrelated worktree changes; do not use browser automation; exact file boundaries are resolved from the post-dependency source state.
- **Open questions:** Record the final component file map and any shared helper boundary after the dependency ships; identify whether any stage-era comments or dead exports can be removed without changing behavior.

### Stage 2
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabPage.tsx` — viewer toolbar and persistent preference hooks at the top, viewer state/effects in the page body, SVG map layers in the main return, and inspector/dock/reset composition near the end; `ToolbarTray`, `useToolbarTrayCollapse`, `useMapLayerVisibility`, and `useMapDensity` are also imported by the editor.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx`, `useMapLayerVisibility.test.tsx`, `ViewerRoomRail.test.tsx`, `RoomDetailsPanel.test.tsx`, and focused marker/panel tests.
- **Settled contracts:** The viewer remains a play-mode bespoke canvas workspace with room navigation as a responsive overlay, direct session controls, bottom-center action feedback, and no behavior changes; shared toolbar preference exports must remain available to the editor or move behind an equivalent stable local boundary.
- **Constraints:** Keep route/API mocking semantics and component import boundaries equivalent; do not create a universal viewer fixture or hide behavior-specific composition behind an opaque wrapper; preserve SVG keyboard semantics and layer ordering.
- **Open questions:** Exact extracted filenames and whether viewer canvas layers should be grouped by map concern or interaction concern are resolved during `to-orders` from the post-dependency source state.

### Stage 3
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx` — editor tool state and flyouts, map/view controls, floor/room/connections rail, canvas layers and placement overlays, selection sheet, and confirmation dialogs are all co-located in the 2,114-line page.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx`, `useMapLabEditor.test.tsx`, `useCanvasStroke.test.ts`, `ConnectionsResolveList.test.tsx`, `RoomDetailsPanel.test.tsx`, `FixturePropertiesForm.test.tsx`, and marker suites.
- **Settled contracts:** The editor remains a prep-mode bespoke canvas workspace; selected fixture and room properties stay inline; autosave status, undo/redo, brush strokes, placement limits, ghost floor, fullscreen, responsive navigation, and scoped keyboard shortcuts retain their current behavior and copy.
- **Constraints:** Avoid changing the reducer/hook public contract or production model exports solely to split JSX; preserve overlay render order, prop/room clickability, 48px controls, ConfirmDialog usage, and the existing map canvas gesture seam.
- **Open questions:** Exact partitions for toolbar flyouts, canvas layers, placement overlays, and selection editors are resolved after Stage 1 and must avoid import cycles between page orchestration and extracted surfaces.

### Stage 4
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/FixturePropertiesForm.tsx` — generic field dispatch, encounter/NPC/loot catalog pickers, in-dungeon destination selection, and gateway destination selection; `RoomContentEditor.tsx` — room metadata, NPC assignment, and entry editing are already separate from the page but may contain a remaining focused seam; `InspectorPanel.tsx` — descriptor/session controls and live loot summary are adjacent responsibilities to review, not automatic extraction targets.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/FixturePropertiesForm.test.tsx`, `RoomDetailsPanel.test.tsx`, `MapLabEditorPage.test.tsx`, and `DungeonShell.test.tsx`; the final tree must continue to pass targeted files and the Map Lab directory check.
- **Settled contracts:** Extract only boundaries that reduce responsibility or repeated setup; keep pure presentation/model helpers separate from async catalog loading; no API, data-model, or user-visible behavior changes are part of this Plan.
- **Constraints:** Do not split already-focused marker components merely to lower line counts; preserve CSS ownership and generated testing inventory rules; run the documentation checker after documentation-impacting changes and reconcile only after full frontend checks are green.
- **Open questions:** Whether `docs/TESTING.md` needs regeneration and whether any source inventory is affected are determined by the checker after the final file tree is in place.
