WORK ORDER 05 — Density actually simplifies marker rendering
GOAL: when resolved density is `'simple'` (either explicit `Simple`, or `Auto` below the zoom
threshold), prop/stair/portal markers drop their kind icon and render as a plain identity-colored
ring, so a DM zoomed far out sees clean dots instead of illegible glyphs; `Detailed` (or `Auto`
zoomed in) always shows the full icon.
DEPENDS ON: 04 (needs `resolveMapDensity` and the density state)

KNOWN STATE (already true — do NOT redo or re-derive):
- `PropMarker.tsx`, `StairMarker.tsx`, `PortalMarker.tsx` each already render the identical
  three-piece structure: an identity-colored `<circle className="maplab-*-marker">`, a kind
  `<Icon>` wrapped in a translated `<g>` (e.g. `PropMarker.tsx` lines 113-123, `StairMarker.tsx`
  lines 100-110, `PortalMarker.tsx` lines 88-98), and a `<BadgeRing>` for state badges. The circle
  and `BadgeRing` already carry all state/identity information without the icon — hiding the icon
  `<g>` block is a purely additive, no-regression change to each component.
- None of the three components currently accept a "simplified" prop; add the same prop name and
  behavior to all three for consistency: `simplified?: boolean` — when `true`, skip rendering the
  icon `<g>` (everything else renders unchanged).
- `DoorMarker.tsx` uses a different shape (hinged leaf + swing arc, not a circle+icon), and room
  titles/walls are already covered by the Labels layer toggle (order 02/03) — this order does NOT
  touch `DoorMarker.tsx`, room walls, or room titles. Density in this pass is scoped to the three
  circle+icon markers only.
- Callers to update, all four already render these markers and already have `zoomApi.zoom.scale` in
  scope:
  - `MapLabPage.tsx`: `<PropMarker>` (~line 606), `<StairMarker>` (~line 564), `<PortalMarker>`
    (~line 587).
  - `MapLabEditorPage.tsx`: `<PropMarker>` (~line 1346), `<StairMarker>` (~line 1027),
    `<PortalMarker>` (~line 1044).
- Each caller should compute one `const simplified = resolveMapDensity(density, zoomApi.zoom.scale)
  === 'simple'` per render and pass `simplified={simplified}` to all three marker types it renders
  — one computed value reused across all markers on that page, not per-marker.

START IN:
- frontend/src/features/dungeons/maplab/PropMarker.tsx
- frontend/src/features/dungeons/maplab/StairMarker.tsx
- frontend/src/features/dungeons/maplab/PortalMarker.tsx
- frontend/src/features/dungeons/maplab/__tests__/PropMarker.test.tsx
- frontend/src/features/dungeons/maplab/__tests__/StairPortalMarker.test.tsx
- frontend/src/features/dungeons/maplab/MapLabPage.tsx
- frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx

DO:
- Add `simplified?: boolean` to each of the three marker prop interfaces; when `true`, don't render
  the icon `<g>` block (leave circle + `BadgeRing` untouched).
- Wire `simplified` from both pages using `resolveMapDensity` + `useMapDensity()` (order 04) and
  `zoomApi.zoom.scale`, as described in KNOWN STATE.
- Extend `PropMarker.test.tsx` and `StairPortalMarker.test.tsx` with a case per component: passing
  `simplified` omits the icon element but keeps the marker circle.

STOP WHEN: `npx vitest run PropMarker StairPortalMarker MapLabPage MapLabEditorPage` passes with
the new tests. Then run the full suite (`npx vitest run` in `frontend/`) once and confirm no
regressions before writing STATUS.

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
