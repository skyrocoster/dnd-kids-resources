# MapLab editor popovers - MapLab editor panels use shared Popover

> **Status:** done - Map, View, Connections and editor Escape priority accepted.

- **Read trigger:** Read before migrating MapLab editor panels to shared Popover or changing their dismissal and keyboard handling.
- **Upstream:** [Base UI and Shared Interaction Migration](../../../master-plans/base-ui-migration.md) — settled direction, OVERLAYS boundaries, and overlay proof expectations. This Plan records the approved narrower scope: MapLab editor panels only. No signed-off design artifact is declared.

## Outcome
Map and View panels and the Connections utility panel use the shared Popover while retaining their existing controls, state behavior, and layout. Escape closes only the highest-priority active editor interaction, so keyboard dismissal does not also clear a selection or disarm a tool.

## Scope
- **Included:** Migrate Map, View, and Connections panels to the existing shared Popover. Preserve their controlled open state, content, actions, outside-press dismissal, focus behavior, and visual layout. Keep tool-flyout rendering, filtering, focus-on-open, and Enter activation intact while making Escape available to the ordered editor arbiter when its search field is focused.
- **Expected areas:** `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx`, `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx`, `frontend/src/features/dungeons/maplab/MapLabEditor.css`, `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx`, and `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx`. Read-only shared API evidence: `frontend/src/components/Popover.tsx` and `frontend/src/components/__tests__/Popover.test.tsx`.
- **Excluded:** `ViewerRoomRail`, the viewer, and Finder migration; tool-flyout/menu migration or filter/activation redesign; map geometry, drawing and gestures; domain/data behavior; confirmation dialogs; changes to shared Popover or dependencies; unrelated files and worktree changes.

## Stages
1. **pending - Migrate Map and View panels.** Actions: (1) keep their current state transitions, contents, and mutual exclusion with each other and utility state; (2) replace their manual outside-dismissal listeners with controlled shared Popovers; (3) retain current anchors, alignment, gaps, dimensions, colors, and panel styling, while leaving Escape ownership with the editor arbiter; (4) add focused regression coverage for panel contents/actions, outside dismissal, internal interaction, and keyboard focus. **Proof:** run the Stage 1 filtered command in Proof. **Escalate** if the shared primitive cannot retain the current panel layout or focus contract without changing its shared API or expanding scope. **Breakpoint:** none.
2. **pending - Migrate Connections and preserve ordered Escape ownership.** Actions: (1) move the Connections panel to controlled shared Popover state without changing its actions or utility behavior; (2) route Escape through the editor's ordered owner chain: **stroke → flyout → Map → View → utility → expanded selection → selected object → disarm**, with each press dismissing only the first active owner; (3) allow Escape to reach this arbiter when the in-scope flyout search is focused while keeping normal editor shortcuts blocked during typing, and preserve flyout filtering, autofocus, and Enter activation; (4) return focus to the owning trigger on Escape without stealing focus from an outside-press target; (5) leave Finder and viewer ownership untouched. **Proof:** run the Stage 2 filtered command, then the integrated focused command in Proof. **Escalate** if this behavior requires changing Finder/viewer ownership, committed drawing behavior, or shared Popover API. **Breakpoint:** none.

## Progress and decisions
- **Stage 1:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx -t "Map popover|layer toggles|editable per-side padding|density control"` passed (13 tests, 25 skipped; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Map/View controlled Popovers preserve panel behavior and editor-owned Escape.
- **Stage 2:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx` passed (2 files, 41 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Re-proved Stage 1 panel behavior plus Connections dismissal/focus and editor-owned one-at-a-time Escape, flyout search/Enter/typing guard.
- **Decision:** shared Popover is read-only for this work; no new dependency or visual redesign.

## Proof
Run commands from `frontend/`. Each command has a 120-second command-level timeout; use a 130000 ms Bash tool timeout.

- **Stage 1 targeted:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx -t "Map popover|layer toggles|editable per-side padding|density control"`
- **Stage 2 targeted:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx -t "ordered Escape|Escape closes an open popover|editor hotkeys|quick-select|Connections"`
- **Integrated acceptance:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx`

Acceptance coverage must show that the panel controls still work; outside presses dismiss the migrated panels while inside actions do not; Escape closes one owner in the specified order; the search field still filters and activates its top match with Enter; typing does not activate normal editor shortcuts; and keyboard dismissal returns focus to the owning trigger. A passing proof remains valid until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment. Stage 2 reruns only Stage 1 proof affected by its changes; the integrated command establishes final acceptance.

## Escalation boundaries
- Stop and ask before including Finder, `ViewerRoomRail`, or viewer changes; migrating tool menus; changing map drawing/geometry/gesture or domain behavior; altering shared Popover contracts or dependencies; or changing the approved Escape order, focus ownership, outside-dismissal behavior, layout, or acceptance.

## Visible result
> MapLab's Map, View, and Connections panels keep working as before, and each Escape press closes only the current top-priority editor interaction.
