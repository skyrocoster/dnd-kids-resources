# MapLab ordinary actions - List, detail, selection, and viewer actions are ordinary, accessible buttons.

> **Status:** done - Stage 1 ordinary actions and Stage 2 viewer Fit/Zoom accepted.

- **Read trigger:** Before implementing the approved MapLab ordinary-action controls.
- **Upstream:** Assessment-approved scope in the coordinator packet; no separate design artifact declared.

## Outcome
People can use the approved MapLab resolve-list, room-detail, selection, and viewer actions as ordinary buttons while their accessible names, callbacks, types, disabled behavior, and visual style remain intact.

## Scope
- **Included:** The four ordinary actions in `ConnectionsResolveList`, Run encounter and Party is here in `RoomDetailsPanel`, Delete and Close in `SelectionActions`, and Fit/Zoom in `MapLabViewerCanvas`.
- **Expected areas:** `frontend/src/features/dungeons/maplab/ConnectionsResolveList.tsx`, `frontend/src/features/dungeons/maplab/RoomDetailsPanel.tsx`, `frontend/src/features/dungeons/maplab/SelectionActions.tsx`, `frontend/src/features/dungeons/maplab/MapLabViewerCanvas.tsx`, and their focused tests listed under the relevant stages.
- **Excluded:** `MapLabPage.tsx` and `MapLabEditorPage.tsx` owner files; shared APIs, domains, gestures, routes, drag behavior, and overlays; unrelated controls or refactors. Use component-local CSS only for appearance parity. Do not edit `MapLabViewerCanvas.tsx` while the concurrent viewer overlay Plan owns View/Finder; Stage 2 waits until that ownership work is complete.

## Stages
1. **accepted** - Update the editor/list/detail/selection controls.
   - In `ConnectionsResolveList.tsx`, make the four approved actions ordinary buttons. In `RoomDetailsPanel.tsx`, do the same for Run encounter and Party is here; in `SelectionActions.tsx`, do the same for Delete and Close.
   - Preserve each action's accessible name, callback and existing types, disabled behavior, and visual style. Limit appearance parity changes to local CSS; keep `MapLabPage.tsx` and `MapLabEditorPage.tsx` out of scope.
   - **Focused proof:** From `frontend`, run `timeout 120s npm test -- src/features/dungeons/maplab/__tests__/ConnectionsResolveList.test.tsx src/features/dungeons/maplab/__tests__/RoomDetailsPanel.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.props.test.tsx` with a 130000 ms bash tool timeout.
   - **Escalation boundary:** Stop if the change requires altering an owning page, shared API/domain, route, gesture, drag behavior, overlay, or any approved accessibility, callback, type, disabled-state, or styling contract.
   - **Breakpoint:** None.
2. **accepted** - Update viewer Fit/Zoom after the concurrent viewer overlay Plan's View/Finder ownership work is complete.
   - Only after that ownership work is complete, update the approved Fit and Zoom actions in `MapLabViewerCanvas.tsx` as ordinary buttons, preserving their accessible names, callbacks and existing types, disabled behavior, and visual style. Use component-local CSS only for appearance parity; do not change View/Finder or overlay behavior.
    - **Focused proof:** From `frontend`, run `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.canvas.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.rendering.test.tsx` with a 130000 ms bash tool timeout.
   - **Escalation boundary:** If View/Finder ownership is not complete, do not edit the canvas; defer this stage. Stop if Fit/Zoom changes require touching `MapLabPage.tsx` or `MapLabEditorPage.tsx`, or changing overlay behavior or another excluded contract.
   - **Breakpoint:** View/Finder ownership completion is a prerequisite, not a request to resolve concurrent ownership within this Plan. No human visual approval is specified.

## Progress and decisions
- **Stage 1:** accepted - `timeout 120s npm test -- src/features/dungeons/maplab/__tests__/ConnectionsResolveList.test.tsx src/features/dungeons/maplab/__tests__/RoomDetailsPanel.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.props.test.tsx` passed (3 files, 35 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Names, callbacks, types, enabled state and CSS classes retained.
- **Stage 2:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.canvas.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.rendering.test.tsx` passed (2 files, 55 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Actual viewer Fit/Zoom controls retained their names, button type, CSS classes, and enabled state; direct clicks changed the rendered viewer SVG size through Zoom in, Zoom out, and Fit callbacks. View/Finder ownership prerequisites were complete; breakpoint: none.
- **Decision retained:** Match ordinary-button appearance with component-local CSS only; preserve names, callbacks, types, disabled behavior, and existing visual style. No shared API/domain, gesture, route, drag, or overlay changes.

## Proof
- Stage 1's named tests directly cover the resolve list and room detail; the editor props test exercises selection actions.
- Stage 2's named canvas and page rendering tests exercise the viewer canvas. A passing stage proof remains valid until a later change affects the command, inputs, exercised behavior, configuration, dependencies, or environment.

## Escalation boundaries
- Ask the coordinator before expanding scope to an owner page or changing any excluded API, domain, gesture, route, drag, overlay, ownership, or acceptance boundary.
- Do not begin Stage 2 until the concurrent viewer overlay Plan has completed View/Finder ownership work; do not modify its owned behavior as part of this Plan.

## Visible result
> The approved MapLab list, detail, selection, and viewer actions are usable as ordinary buttons without losing their accessible names, callbacks, disabled behavior, or visual style.
