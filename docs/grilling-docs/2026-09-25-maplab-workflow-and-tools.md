# MapLab — workflow, usability, and off-the-shelf tools

Status: discussion synthesis and ideas for future investigation. This is not a Plan or implementation approval. No dependency, redesign, migration, or product change has been selected.

## Why this discussion happened

The user has hand-built most of MapLab. It has the starting features they want, but they wondered whether more off-the-shelf implementation tools should have been used, as happened with the move to Base UI. The review considered whether parts of MapLab could be replaced independently rather than looking for one complete replacement.

The user then clarified the main concerns: **getting the workflow right and making MapLab intuitive to use.**

## Shared understanding

- There are useful off-the-shelf tools for individual jobs, but no candidate discussed would decide or repair MapLab's workflow by itself.
- The map data and editing rules are application-specific: floors, connected room shapes, doors attached to wall edges, stairs and portals, D&D fixture state, NPC/encounter/loot links, and saving. Replacing the editor wholesale is not currently justified.
- MapLab already uses Base UI-backed shared controls for much of its interface. The most specialized hand-built work is the map model, SVG rendering, map-aware gestures, and domain rules.
- The user’s usability concern points to stepping back from feature implementation to examine the workflow—not starting the codebase over or changing its technical foundation.
- No implementation, new package, workflow redesign, or import feature has been approved by this discussion.

## What makes up MapLab

These are bounded observations from the source review, not a complete line-by-line audit.

- **Map data and geometry:** `frontend/src/model/maplabModel.ts` defines the MapLayout and its rooms, floors, doors, stairs, props, portals, and outdoor features, as well as map-specific geometry and compatibility helpers.
- **Authoring:** `frontend/src/features/dungeons/maplab/maplabEditor.ts` implements map editing actions, validation, selection, portal pairing, and undo/redo. `MapLabEditorPage.tsx` coordinates tools, floors, editing, and saving.
- **Drawing and navigation:** `frontend/src/map/MapCanvas.tsx` renders a shared SVG map surface. `useMapCanvasZoom.ts` handles pan and zoom for more than MapLab, while `useCanvasStroke.ts` converts pointer movement into grid-cell strokes.
- **Viewing and D&D behavior:** the viewer and inspector connect map objects to room content, fixture state, encounters, NPCs, and dungeon connections.
- **Interface controls:** MapLab uses shared buttons, popovers, fields, and toggles. Some rich feature flows, such as the grouped room finder in `ViewerRoomRail.tsx`, remain custom because they combine search with floor grouping and room-specific details.

## Off-the-shelf possibilities discussed

| Part | Possible help | Limits and current view |
| --- | --- | --- |
| **Tiled map editor** | Could be an optional external way to draw basic room geometry and import it. The repository already has a prototype that converts an L-shaped room, wall-side door, prop, floors, and paired stairs. Its focused check passed: `timeout 10s node "experiments/prototypes/maplab-tiled-trial/convert.mjs"`. | This is not a replacement for MapLab's in-app editor, viewer, or session behavior. The prototype covers a small fixture, not the full MapLab data contract or a round trip. Treat it as a possible import path only if external map authoring addresses a real workflow need. See `experiments/prototypes/maplab-tiled-trial/convert.mjs` and `experiments/fixtures/maplab-tiled-headline.tmj`. Tiled documents JSON map export in its [JSON map format documentation](https://doc.mapeditor.org/en/stable/reference/json-map-format/). |
| **Drag-and-drop toolkit such as dnd-kit** | Could help if MapLab adds discrete drag-to-place or drag-to-reposition interactions. It offers sensors and customizable drag/drop behavior. | It would not replace continuous room painting, grid-coordinate conversion, map validation, saving, or undo. Current object placement is click-based; `FixturePropertiesForm.tsx` notes that exact repositioning is deferred. Evaluate only against one concrete object-movement task if that becomes a priority. No DnD dependency is selected. See [dnd-kit](https://dndkit.com/). |
| **Base UI** | Continue using the existing shared primitives for standard interface behavior. Existing Base UI-backed controls are already used in MapLab. | The room finder’s grouped, rich results are not automatically a flat Combobox. A Base UI control can help with standard interaction mechanics, but will not determine the room-finding workflow or remove its MapLab-specific behavior. |
| **TanStack Query** | It is already listed in `frontend/package.json` and could help centralize repeated remote-data loading and caching. | The app does not currently have a QueryClient provider or use feature queries in MapLab. This could reduce request/loading boilerplate, but does not address usability and does not replace the editor reducer or its save rules. Lower priority than learning where users struggle. |
| **Pan/zoom package** | A pan/zoom package might take over some generic gesture mechanics. | `MapCanvas` is shared with other map views, and MapLab combines pan/zoom with painting, cell snapping, fitting, and saved navigation state. No specific pan/zoom problem was identified, so replacing it now has unclear benefit and broad compatibility risk. |

The viewer also uses the shared `FloatingWindow` for encounter/NPC docks. It already supports dragging and resizing, so a map DnD library would not be a direct substitute for it.

## Further thoughts: workflow questions to investigate

The source shows several interactions that may deserve observation, but none is established as the cause of the user's usability concern:

- The editor has separate select, room, passage, prop, and terrain tools. Users may or may not understand when the map is in a placement or drawing mode versus pan/select mode.
- Room drawing is a continuous brush gesture, while props, stairs, portals, and doors are placed by selecting a tool and clicking a cell or wall edge. These differences may be clear in use, or they may make the interaction model feel inconsistent.
- The destination picker chooses a random free square inside a selected room; the source comments that exact repositioning is deferred. This could surprise a user who expects to choose the exact square.
- MapLab supports both authoring and at-the-table viewing/session tasks. It is not yet clear from this discussion which audience and which workflow should drive the next usability improvement.

Treat these as test questions, not conclusions or defects. Observe what users expect, where they pause, and what they try before deciding what to change.

## Ideas for moving forward

1. **Name the intended users and their most important jobs.** For example: creating a layout, changing existing room content, placing or connecting map objects, or operating the map during play. Pick the few jobs that matter most instead of trying to make every feature equally easy at once.
2. **Watch a new user try realistic tasks without coaching.** Note hesitation, wrong tool choices, unexpected results, and where they ask what to do next. A concrete task is more useful than asking only whether the interface feels intuitive.
3. **Choose one observed point of friction.** Separate a workflow problem (the steps or choices are unclear) from a technical problem (the gesture or drawing behavior is unreliable). They may need different remedies.
4. **Try a small workflow alternative before changing production code.** Sketch or prototype the changed sequence, then see whether it helps someone complete the same task. Preserve the existing map model unless a test reveals a specific need to change it.
5. **Adopt an implementation library only for a demonstrated need.** For example, revisit dnd-kit if users need direct marker repositioning, or extend the Tiled import trial if external geometry authoring proves valuable. Neither is a prerequisite for improving MapLab's workflow.

## Open questions — not decisions

- Who is MapLab primarily for, and in what setting: preparing a dungeon, running a session, or both?
- Which one or two workflows currently feel least clear to the user or their intended users?
- Should future work prioritize in-app editing, at-the-table use, or a bridge between them?
- Is external map authoring/import desirable, or should users be able to complete the primary workflow inside MapLab?
- If object repositioning is tested, which object type is the simplest and most representative first case?

## Evidence and exclusions

- The Tiled prototype is a limited conversion demonstration; its passing check does not establish complete format coverage, production readiness, or user value.
- The DnD, Base UI, TanStack Query, and pan/zoom items above are possibilities discussed, not selected dependencies or approved changes.
- This record preserves the conclusion to investigate workflow usability before making broad implementation changes. It does not authorize a usability study, prototype, redesign, Plan, or source edit.
