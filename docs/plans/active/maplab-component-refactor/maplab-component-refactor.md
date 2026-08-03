# Map Lab component refactor — smaller responsibility-oriented component files

> **Status:** Stage 2 shipped; Stage 3 is ready to begin against the preserved viewer contracts.

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
| 1 | Established the current Map Lab responsibility baseline and settled the component/file map without changing runtime behavior. Existing focused marker, panel, hook, model, and navigation files remain intact. |
| 2 | Moved shared toolbar preferences and controls into `MapLabToolbar.tsx`, and split the viewer canvas/layers and viewer overlays into `MapLabViewerCanvas.tsx` and `MapLabViewerOverlays.tsx`. Viewer/editor imports, route/session ownership, SVG ordering, accessibility, inspector behavior, docks, reset confirmation, and existing focused checks remain intact. |

## Touches
- `frontend/src/features/dungeons/maplab/*.tsx`
- `frontend/src/features/dungeons/maplab/*.ts`
- `frontend/src/features/dungeons/maplab/*.css`
- `frontend/src/features/dungeons/maplab/__tests__/*`
- `docs/TESTING.md`

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

### Stage 1 baseline (complete)
- **Verified source state:** `MapLabPage.tsx` is 1,050 lines and `MapLabEditorPage.tsx` is 2,195 lines. `FixturePropertiesForm.tsx` is 532 lines. The source has no monolithic `MapLabPage.test.tsx` or `MapLabEditorPage.test.tsx`; coverage is already split across focused viewer/editor suites.
- **Existing focused files to keep:** `MapLabRouteState.tsx`, `SelectionActions.tsx`, `ViewerRoomRail.tsx`, `useActiveRoom.ts`, `roomContent.ts`, `GhostFloorLayer.tsx`, `DungeonShell.tsx`, `ConnectionsResolveList.tsx`, `useCanvasStroke.ts`, `mapLabSessionActions.ts`, `RoomDetailsPanel.tsx`, `useMapLabSessionState.ts`, `RoomContentEditor.tsx`, `InspectorPanel.tsx`, `useMapLabLayout.ts`, and the marker components remain responsibility-oriented and are not split merely to reduce line count.
- **Settled responsibility map:** Stage 2 extracts shared viewer/editor chrome into `MapLabToolbar.tsx` (toolbar preference hooks, `ToolbarTray`, layer/density controls, and the stable `resolveMapDensity` boundary), viewer composition into `MapLabViewerCanvas.tsx` and `MapLabViewerOverlays.tsx`, and keeps route/session orchestration in `MapLabPage.tsx`. Stage 3 applies the analogous editor split with `MapLabEditorChrome.tsx`, `MapLabEditorCanvas.tsx`, and `MapLabEditorSelection.tsx`; Stage 4 reviews `FixturePropertiesForm.tsx`, `RoomContentEditor.tsx`, and `InspectorPanel.tsx` only for real remaining seams.
- **Shared boundary decision:** `MapLabToolbar.tsx` becomes the sole production home for shared toolbar exports; `MapLabPage.tsx` may re-export `resolveMapDensity` only while existing tests require that compatibility, and no production export is removed solely for test convenience. The editor must import shared toolbar symbols from the new module, never from the page component.
- **Cleanup decision:** Remove only stage-era comments that are plainly historical after extraction and only exports proven unused by production and test callers; do not remove `mapLabSessionActions.ts` or alter model/reducer exports during this refactor.
- **Preserved contracts:** Route behavior, rendered copy, DOM accessibility roles, Map Lab state ownership, API/client boundaries, autosave and session persistence, gestures, keyboard shortcuts, layer ordering, and current test coverage remain unchanged. New files remain colocated under the existing Map Lab directory; browser automation is not used.

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
