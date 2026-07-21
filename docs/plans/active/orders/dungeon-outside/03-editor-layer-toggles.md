WORK ORDER 03 — Wire layer toggles into the editor (MapLabEditorPage.tsx)
GOAL: the Map Lab editor shows the same four layer toggles (Outside, Props, Passages, Labels) as
the session view, sharing the same persisted visibility state, and hides/shows the matching editor
canvas content.
DEPENDS ON: 01 (useMapLayerVisibility hook)

KNOWN STATE (already true — do NOT redo or re-derive):
- `MapLabEditorPage.tsx` already has an `editor-view` `ToolbarTray` group (lines 643-654) with one
  button, "Ghost lower floor" (`showGhostFloor` state, toggled via `aria-pressed`/`data-active`) —
  this is the pattern to copy for the four new toggle buttons; add them into this same "View"
  group, not a new one.
- `useMapLayerVisibility` (order 01) is exported from `MapLabPage.tsx` and already imported here
  indirectly is NOT true yet — `MapLabEditorPage.tsx` currently imports `ToolbarTray` from
  `'./MapLabPage'` (line 26); add `useMapLayerVisibility` to that same import so both pages share
  one localStorage-backed visibility state (same keys, same persistence — a DM's toggle choice in
  the editor should carry into the session view and back).
- Canvas content in this file, by layer:
  - Outside = the bare-outside rect (lines 864-894, `className="maplab-unknown-space"`, which also
    carries the bare-outside click handler for the cell action menu — keep the click handler
    working, just gate the rect's *rendering*, not remove the handler logic) + the features map
    (lines 900-930, `className="maplab-feature"`).
  - Props = `propsOnActiveFloor.map(...)` at lines 1342-1356 (`<PropMarker>`). Note: prop
    *placement mode* overlay (lines 1056-1083) is a different, tool-mode concern — do not gate
    that behind the Props layer toggle, only the rendered existing props.
  - Passages = doors (1005-1019), stairs (1021-1039), portals (1041-1054) together.
  - Labels = the room title `<text className="maplab-room-title">` at lines 972-974, inside the
    room-rendering block (932-976). Only hide the title text, not the room cells/walls.
- Ghost-floor layer (`GhostFloorLayer`, lines 896-898) already renders rooms/doors/props/features
  for the floor below at reduced opacity — leave it as its own separate toggle ("Ghost lower
  floor"); it is not one of the four Stage-4 layers and this order does not touch it.
- Frontend suite baseline: 89 test files / 1111 passed / 6 skipped before this order (see order 01
  for how that was measured); this order should only add tests, not remove any.

START IN:
- frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx
- frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.test.tsx

DO:
- Add the four toggle buttons to the existing `editor-view` `ToolbarTray`, using the shared
  `useMapLayerVisibility()` hook from order 01 (same hook instance shape/keys as the session view).
- Gate the four content blocks listed in KNOWN STATE behind `visible[key]`.
- Add tests in `MapLabEditorPage.test.tsx` mirroring order 02's session-view coverage: each toggle
  hides/shows its layer's editor content.

STOP WHEN: `npx vitest run MapLabEditorPage` passes with the new tests. Then stop — do not add the
density control in this order.

STATUS: DONE
