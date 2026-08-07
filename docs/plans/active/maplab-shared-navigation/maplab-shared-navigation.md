# Map Lab Shared Navigation — editor and viewer use one navigation language

> **Status:** Stage 4 shipped; Stage 5 is ready to compile.

- **Areas:** dungeons, design
- **Read trigger:** Map Lab editor/viewer shared navigation, selection, focus, or keyboard behavior

## What we're building & why

Map Lab's editor and viewer currently share canvas primitives but diverge on selection, focus,
Escape, and stair/portal input. This Plan makes their navigation behavior teachable and predictable
without changing room authoring, replacing the layout, or adding the contextual-menu action set.

The first implementation passed component checks but failed its live-browser acceptance run. This
repair pass makes the rendered canvas honor the already-settled navigation contract rather than
changing that contract or widening FL-05 into contextual menus.

## UX decisions — Map Lab navigation repair

Surface:      Map Lab editor and session viewer, owned by the Dungeons area guide
Mode:         both — the editor remains prep; the session viewer remains play
Operator:     DM
Focal:        the map canvas and the selected or travelled-to target; framing must keep that target visible without moving an already-visible selection
Route shape:  Editor at `/dungeons/:dungeonId/edit`; Viewer at `/dungeons/:dungeonId`
Edit style:   direct navigation controls and canvas selection; navigation never edits authored or encounter-session data
Save:         no authored save; browser-session navigation state is written only after restored state has hydrated
Empty:        preserve `No saved layout yet. Your first edit will save this blank map.` in the editor and `No saved layout yet. This dungeon is starting from a blank map.` in the viewer
Filtered empty: preserve `No rooms on this floor yet.`; no new filtering behavior is introduced
No selection: the editor reserves no inspector width; the viewer retains `Select a room, door, stair, or prop for details.`
Load failure: the existing layout error state fills the Map Lab workspace with `Failed to load dungeon layout.`
Action failure: unresolved-portal feedback remains canvas-local with `This portal has no destination.` and `role="status"`
Destructive:  none; all repaired actions are temporary navigation or selection
Keyboard:     DOM-order Tab remains unchanged; Enter/Space activate controls; Escape dismisses one highest layer, then clears selection, without dismissing an unrelated lower layer
Touch:        preserve the 48px control floor and pan/pinch gestures; long-press and contextual menus remain FL-11

## Stages

1. Establish shared floor, pan/zoom, selection, focus/centering, and browser-session navigation state
   for the editor and viewer, including stair/portal destination focus and unresolved-portal feedback.
2. Align pointer and keyboard navigation semantics: empty-space clearing, layered Escape cancellation,
   ordinary selection, contextual invocation without travel, and double-click centering without duplicate
   stair/portal navigation.
3. Add focused editor/viewer regressions and the durable shared navigation acceptance script; run the
   complete frontend and documentation gates.
4. Repair browser-session hydration and restoration so floor, pan, zoom, selection, and requested
   focus return as one coherent dungeon-keyed context without an initial default-state write erasing
   restored values.
5. Repair rendered navigation semantics: visible targets preserve framing, off-screen and travelled-to
   targets center from their actual geometry, connection double-click centers without deselection or
   travel, empty canvas clears selection, and viewer Escape follows the documented layer order.
6. Add geometry-aware regressions for every browser-found failure, rerun the automated desktop/tablet
   acceptance script, and stop for explicit human UX acceptance only after every in-scope row passes.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Map Lab editor and viewer now share validated dungeon-keyed browser-session navigation state, map-point centering, floor/zoom restoration, destination focus, and unresolved-portal feedback without writing navigation context to authored layout data. Focused and full automated checks passed; the visible slice still awaits human acceptance. |
| 2 | Editor and viewer now clear selection through empty-space and layered Escape behavior, support right-click/Context Menu/Shift+F10 selection without travel, and center double-clicked connections without duplicate navigation. Focused and full automated checks passed; human UX acceptance remains outstanding. |
| 3 | Canonical references and the durable [FL-05 shared navigation acceptance script](../../../FL-05-maplab-navigation-acceptance.md) are complete. Documentation checks passed at implementation closeout, but the 2026-08-07 browser execution failed several required behaviors; the human result remains intentionally unfilled. |
| 4 | Browser-session hydration and route restoration now preserve one dungeon-keyed floor, pan, zoom, selection, and requested-focus context before write-back, including editor/viewer return timing. Focused and full automated checks passed; human UX acceptance remains outstanding. |

## Touches

- `frontend/src/features/dungeons/maplab/**`
- `frontend/src/map/**`
- `frontend/src/features/dungeons/maplab/__tests__/**`
- `docs/UX_PATTERNS.md`
- `docs/areas/dungeons.md`
- `docs/FL-05-maplab-navigation-acceptance.md`
- `docs/master-plans/frontend-layout-redesign.md`

## Compiler handoff

### Stage 5
- **Verified edit sites:** `frontend/src/map/useMapCanvasZoom.ts` — shared `centerOn` geometry primitive; `frontend/src/features/dungeons/maplab/MapLabPage.tsx` — viewer focus, travel, double-activation, empty-space, and Escape flows; `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx` — editor visibility/centering and double-activation flows; `frontend/src/features/dungeons/maplab/MapLabEditorCanvas.tsx` and `MapLabViewerCanvas.tsx` — canvas selection and background event wiring.
- **Verified tests:** `frontend/src/map/__tests__/useMapCanvasZoom.test.ts` proves the primitive; `MapLabEditorPage.canvas.test.tsx` can assert SVG translation; `MapLabPage.navigation.test.tsx` covers travel, contextual no-travel selection, one bounded empty-space path, and only drawer/popover Escape.
- **Settled contracts:** Center using the target's real map anchor and the current canvas viewport. Ordinary visible selection preserves framing; off-screen selection and explicit focus center; travel centers the destination after floor/dungeon resolution; double-click centers the current connection without toggling it off or travelling; any genuine canvas background clears selection; viewer Escape closes one Map Lab layer at a time and clears selection after overlays are gone.
- **Constraints:** Preserve primary-click editor select-only/viewer travel behavior and right-click/Context Menu/Shift+F10 select-without-travel. Do not add long-press, menus, or menu actions; those remain FL-11.
- **Open questions:** determine whether the failed background clicks landed beyond the current outside-layer rect or exposed an additional event-target gap; fix the complete canvas-background contract, not one test coordinate.

### Stage 6
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx`, `MapLabEditorPage.canvas.test.tsx`, and `useMapLabNavigationSession.test.ts` — current focused seams; `frontend/src/model/__tests__/maplabModel.geometry.test.ts` and `frontend/src/map/__tests__/useMapCanvasZoom.test.ts` — geometry seams; `docs/FL-05-maplab-navigation-acceptance.md` — durable desktop/tablet acceptance ledger.
- **Verified tests:** Current suites omit off-screen room centering, room-anchor choice, connection double-click, destination framing, page-level hydration, viewer selection Escape, and background clicks outside the padded-bounds rect. The live browser run must measure target position relative to the canvas viewport rather than infer centering from selection.
- **Settled contracts:** Every in-scope automated row must pass at 1440×1000 and 768×1024 before requesting human acceptance. Automated evidence may update the execution ledger and FL-05 receipt but may not record human acceptance.
- **Constraints:** Treat optional session-state 404 as the documented empty-state flow; do not widen into backend session-state work. The unresolved-portal post-error zoom observation was not a reproduced defect and is a rerun check, not an authorized repair. Run full frontend and documentation gates after focused checks.
- **Open questions:** none.
