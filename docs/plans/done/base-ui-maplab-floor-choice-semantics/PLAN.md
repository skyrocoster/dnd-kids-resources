# MapLab floor-choice semantics - Floor choices match the active map content

> **Status:** done - editor and viewer floor-choice semantics accepted.

- **Read trigger:** Read before changing the editor or viewer floor selector's roles, keyboard behavior, or shared-control composition.
- **Upstream:** [Base UI and Shared Interaction Migration](../../../master-plans/base-ui-migration.md) governs the DISCLOSURES direction and requires actual tab-panel associations. The [grilling record](../../../grilling-docs/2026-09-23-base-ui-full-migration.md) records the semantics question, not a component-level implementation approval. [Home chapter tabs](../../done/base-ui-home-chapter-tabs/PLAN.md) is the precedent for real tabs with associated panels. `frontend/src/player/FloorPicker.tsx` and its focused test are the controlled single-choice precedent. The completed [MapLab editor overlay](../../done/base-ui-maplab-editor-popovers/PLAN.md), [viewer View](../../done/base-ui-maplab-viewer-view-popover/PLAN.md), and [room Finder](../../done/base-ui-maplab-room-finder-popover/PLAN.md) Plans establish adjacent ownership boundaries only; their overlay behavior is not part of this Plan. No signed-off design artifact is declared.

## Outcome

The MapLab editor and viewer floor selectors expose semantics appropriate to the actual map content they control. Use tabs only if each floor has a genuine associated panel and the existing content and keyboard behavior can be preserved; otherwise use the existing controlled single-choice `ToggleGroup`. Preserve active-floor callbacks and ownership, floor labels and order, current layout, and all map geometry and gestures.

## Scope
- **Included:** Stage 1 resolves the editor selector in `MapLabEditorChrome`; Stage 2 resolves the viewer selector in `MapLabPage`. In each stage, first inspect the actual content association and the existing shared Tabs/ToggleGroup APIs before editing. Preserve controlled `activeZ` selection, callback values, floor labels/order, active map content, and the current floor-selector appearance. CSS may change only for local floor-selector parity.
- **Expected areas:** `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx`, `frontend/src/features/dungeons/maplab/MapLabPage.tsx`, and `frontend/src/features/dungeons/maplab/MapLabPage.css` only if local floor-selector parity requires it. Focused tests: `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx`, `MapLabEditorPage.terrain-controls.test.tsx`, `MapLabPage.layout-controls.test.tsx`, `MapLabPage.navigation.test.tsx`, and `MapLabPage.rendering.test.tsx` for active-floor content rendering. Read-only ownership/composition evidence: `MapLabEditorPage.tsx`, `MapLabEditorCanvas.tsx`, and `MapLabViewerCanvas.tsx`. Read-only shared-control evidence: `frontend/src/components/Tabs.tsx`, `frontend/src/components/form/ToggleGroup.tsx`, and `frontend/src/player/FloorPicker.tsx`.
- **Excluded:** Other editor chrome or viewer-page controls; MapLab overlay, menu/list, search, and Finder-ref work; changing callbacks, floor/session/navigation ownership, domain data, map geometry, gestures, or route behavior; changes to shared Tabs/ToggleGroup APIs or other shared controls; broad CSS changes, visual redesign, new dependencies, master-plan/grilling edits, unrelated worktree changes, and broad checks.

## Stages
1. **accepted - Resolve and migrate the editor floor selector.** Verified one active editor canvas, not associated tab panels. The controlled single-choice `ToggleGroup` retains floor order, selection, keyboard operation, active-map content and styling. Proof and breakpoint are recorded below.
2. **accepted - Resolve and migrate the viewer floor selector.** Verified one active-floor-filtered viewer canvas, not associated tab panels. The controlled single-choice `ToggleGroup` retains floor order, navigation/session synchronization, keyboard operation, active-map content and styling. Proof and breakpoint are recorded below.

Stages are sequential, not parallel. Retain passing proof until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment; rerun only invalidated proof.

## Progress and decisions
- **Stage 1:** accepted - the editor has one controlled active map canvas, not per-floor tab panels. The floor selector now uses the controlled single-choice `ToggleGroup`, retaining floor labels/order, callback, map content and pill styling. From `frontend/`, `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx` passed (2 files, 43 tests; command timeout 120 seconds, Bash tool timeout 130000 ms). Proof covers exclusive selection, non-deselection, keyboard choice and active-floor content. Breakpoint: none.
- **Stage 2:** accepted - from `frontend/`, `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabPage.layout-controls.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.rendering.test.tsx` passed (3 files, 81 tests; command timeout 120 seconds, Bash tool timeout 130000 ms). The viewer has one active-floor-filtered canvas; choice semantics, non-deselection, keyboard operation, map content, navigation/session sync and View/Finder/Escape behavior passed. Stage 1 proof remains valid because viewer styling is scoped to `.maplab-page`. Breakpoint: none.
- **Decision:** The current source appears to render one active map canvas per surface, controlled by `activeZ`, rather than separate per-floor panels. Verify that in each stage before editing; if confirmed, prefer the existing controlled single-choice ToggleGroup. Do not create artificial panels or move state into the shared control.

## Proof
- Run from `frontend/`; each command has a 120-second command-level timeout and requires a 130000 ms Bash tool timeout.
- **Stage 1:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx`
- **Stage 2:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabPage.layout-controls.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.rendering.test.tsx`
- No broad test, lint, formatting, build, or repository-hygiene checks are part of acceptance.

## Escalation boundaries
- Stop if inspection contradicts the current single-active-canvas relationship and the correct tabs-versus-choice semantics cannot be established from the actual content; do not guess or add synthetic tab panels.
- Stop if a fitting control changes active-floor callback/value behavior, permits the selected floor to clear, changes floor labels/order, moves session/navigation or reducer ownership, or requires a shared API change.
- Stop before editing other MapLab page/chrome controls, overlay/menu/list semantics, Finder refs, search fields, map geometry, drawing/gestures, routes, domain data, dependencies, or unrelated CSS. Preserve unrelated and concurrent work.

## Visible result
> In the editor and viewer, choosing a floor uses accessible single-choice or tab behavior that matches the map content, and the same floor remains active in the map.
