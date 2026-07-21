WORK ORDER 02 — Wire layer toggles into the session view (MapLabPage.tsx)
GOAL: the Map Lab session view (play surface) shows four toggle buttons — Outside, Props,
Passages, Labels — that hide/show their content on the canvas, and shows a message when every
layer is off.
DEPENDS ON: 01 (useMapLayerVisibility hook must exist and be exported from MapLabPage.tsx)

KNOWN STATE (already true — do NOT redo or re-derive):
- `MapLabPage.tsx`'s toolbar currently has one `ToolbarTray` group, `groupKey="viewer-session"`
  label "Session" (lines 366-376), holding only the "Reset session state" button.
- Canvas content rendered inside `<MapCanvas>` in `MapLabPage.tsx` (lines 428-624), by layer:
  - Outside = the bare-outside rect at lines 444-451 (`className="maplab-unknown-space"`) + the
    features map at lines 453-467 (`className="maplab-feature"`).
  - Props = the `props.map(...)` block at lines 603-623 (`<PropMarker>`).
  - Passages = doors (536-555, `<DoorMarker>` + door badge layer), stairs (557-582,
    `<StairMarker>`), and portals (584-601, `<PortalMarker>`) — all three together are one
    "Passages" layer, not three.
  - Labels = the room title `<text className="maplab-room-title">` at lines 529-531, inside the
    room `<g>` block (478-534). Do not hide the room cells/walls themselves — only the title text.
- `useMapCanvasZoom`, `MapCanvas`, and all marker components are already imported at the top of
  this file.
- `.maplab-affordance-placeholder` (line 632) is the existing empty-state paragraph class for "no
  selection" in the inspector — reuse the same visual language (plain `<p>`, no new CSS needed)
  for the new filtered-empty message, but do not reuse that exact class name since it lives in the
  sidebar, not the canvas area; add a sibling class instead (see DO).
- UX copy, exact string (from the Plan's UX decisions block, `docs/plans/active/dungeon-outside.md`
  lines 123-124): when every layer toggle is off, show
  "All layers are hidden. Turn one on to see the map."
- Toggle buttons need the existing 48px touch floor and keyboard/Tab traversal already used by
  other toolbar buttons (`maplab-pill-button` class) — no new keyboard handling needed, plain
  `<button>` elements traversed by Tab already satisfy this.

START IN:
- frontend/src/features/dungeons/maplab/MapLabPage.tsx
- frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx

DO:
- Add a new `ToolbarTray groupKey="viewer-view" label="View"` group next to the existing "Session"
  tray, with four toggle buttons (Outside/Props/Passages/Labels) using `useMapLayerVisibility()`
  from order 01, each `aria-pressed={visible[key]}` `data-active={visible[key] || undefined}`
  following the existing toggle-button pattern already used elsewhere in this codebase (see
  `MapLabEditorPage.tsx`'s "Ghost lower floor" button for the exact pattern: `aria-pressed`,
  `data-active`, `onClick` toggling).
- Gate the four content blocks listed in KNOWN STATE behind their respective `visible[key]` flags.
- When all four are `false`, render a `<p className="maplab-canvas-filtered-empty">All layers are
  hidden. Turn one on to see the map.</p>` in place of the `<MapCanvas>` in the
  `.maplab-canvas-area` div (the toolbar with the toggles must stay visible so the DM can turn a
  layer back on).
- Add/extend tests in `MapLabPage.test.tsx`: toggling each layer off hides its content and back on
  restores it; all-off renders the filtered-empty message.

STOP WHEN: `npx vitest run MapLabPage` passes with the new tests. Then stop — do not touch the
editor page or density in this order.

STATUS: DONE
