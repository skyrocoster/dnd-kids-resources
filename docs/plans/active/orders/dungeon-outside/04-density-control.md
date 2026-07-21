WORK ORDER 04 — Density control (shared state + toolbar UI, both surfaces)
GOAL: a `Detailed` / `Auto` / `Simple` density setting, defaulting to `Auto`, persisted like the
layer toggles, with a control in both the session-view and editor toolbars. This order only adds
the state and the UI control — order 05 makes it actually simplify marker rendering.
DEPENDS ON: 01 (share the same file/localStorage-prefix pattern; no functional dependency on the
layer-visibility hook itself)

KNOWN STATE (already true — do NOT redo or re-derive):
- Add this next to `useMapLayerVisibility` in `MapLabPage.tsx` (order 01's location), reusing the
  exact same persistence pattern: `try { localStorage.getItem/setItem } catch {}`.
- Storage key: single key `'dnd-kids-maplab-density'` (not per-group — there is only one density
  setting for the whole canvas), storing one of the literal strings `'detailed' | 'auto' | 'simple'`.
  Default when nothing stored: `'auto'`.
- `useMapCanvasZoom()` (`frontend/src/features/dungeons/maplab/useMapCanvasZoom.ts`) already
  exposes `zoom.scale`, a number clamped between `MIN_SCALE = 0.25` and `MAX_SCALE = 3` (default
  `1`, stepped by `0.25` on the zoom buttons — see lines 22-27, 61-67). Both `MapLabPage.tsx` and
  `MapLabEditorPage.tsx` already call `useMapCanvasZoom()` and have `zoomApi.zoom.scale` in scope.
- Order 05 will need a single resolved boolean ("is this render simplified right now") derived from
  density + zoom scale — this order should export a helper `resolveMapDensity(density, scale):
  'detailed' | 'simple'` next to the hook: `'detailed'` density always resolves `'detailed'`,
  `'simple'` always resolves `'simple'`, `'auto'` resolves `'simple'` when `scale < 0.75` else
  `'detailed'`. `0.75` is the threshold — write it as a named constant
  `AUTO_DENSITY_SIMPLE_THRESHOLD = 0.75` so it's not a magic number at the call sites.
- Toggle-button visual pattern to copy for a 3-way control: there is no existing 3-way segmented
  control in this codebase — render it as three `maplab-pill-button`s in one `ToolbarTray` group,
  each `aria-pressed={density === value}` `data-active={density === value || undefined}`, `onClick`
  sets density directly to that value (not a cycling toggle — a DM picks one of three states
  explicitly).

START IN:
- frontend/src/features/dungeons/maplab/MapLabPage.tsx (add hook + helper here, alongside order
  01's `useMapLayerVisibility`; add the toolbar control to the existing `viewer-view` `ToolbarTray`
  group from order 02, or `viewer-session` if order 02 hasn't landed — check which exists)
- frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx (add the toolbar control to the
  existing `editor-view` `ToolbarTray` group)
- frontend/src/features/dungeons/maplab/useMapCanvasZoom.ts (read-only reference, no changes)

DO:
- Add `useMapDensity()` hook and `resolveMapDensity` helper as described in KNOWN STATE, exported
  from `MapLabPage.tsx`.
- Add the three-button density control to both toolbars, wired to `useMapDensity()`.
- Add tests: default is `'auto'`; clicking each button sets that density and persists it;
  `resolveMapDensity` unit-tested directly for all three density values across a scale above and
  below `0.75`.

STOP WHEN: `npx vitest run MapLabPage MapLabEditorPage` passes with the new tests. Then stop — this
order does not change what actually renders on the canvas; that's order 05.

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
