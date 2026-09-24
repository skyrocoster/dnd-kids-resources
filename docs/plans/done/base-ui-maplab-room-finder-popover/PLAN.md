# MapLab viewer room Finder - A grouped room search with controlled popover behavior

> **Status:** complete - Finder primitive and viewer integration accepted; breakpoint: none.

- **Read trigger:** Read before migrating `ViewerRoomRail` to shared Popover or changing its dismissal, focus, search, or Escape behavior.
- **Upstream:** [Base UI and Shared Interaction Migration](../../../master-plans/base-ui-migration.md) — OVERLAYS boundaries and overlay proof expectations. [MapLab viewer View popover](../../done/base-ui-maplab-viewer-view-popover/PLAN.md) — completed adjacent viewer scope and Escape order; this Plan is an independent Finder migration. [MapLab editor popovers](../../done/base-ui-maplab-editor-popovers/PLAN.md) — separate editor ownership; existing editor caller remains read-only. No signed-off design artifact is declared.

## Outcome

The MapLab viewer room Finder uses the shared controlled Popover while preserving its grouped floor and off-map search, room-selection callbacks, and viewer interaction order. Search receives focus when it opens; Escape, Close, and room selection return focus to its trigger and reset the query; outside presses do not dismiss it.

## Scope

- **Included:** Migrate the `ViewerRoomRail` Finder to the existing shared Popover. Preserve its `open`/`onOpenChange` and `onSelectRoom` behavior, focused search on open, wrapped Tab navigation, query reset on close, active-floor-first and off-map result groups, and keyboard/close/selection focus return. Keep outside-press dismissal blocked, View and Finder mutually exclusive, and the viewer's ordered Escape ownership: **View → Finder → encounter → NPC → reset → selected**.
- **Expected areas:** Edit `frontend/src/features/dungeons/maplab/ViewerRoomRail.tsx`, `frontend/src/features/dungeons/maplab/MapLabPage.css`, `frontend/src/features/dungeons/maplab/__tests__/ViewerRoomRail.test.tsx`, and `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx`. Read-only callers: `frontend/src/features/dungeons/maplab/MapLabViewerCanvas.tsx` and `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx`. Read-only shared contract evidence: `frontend/src/components/Popover.tsx` and `frontend/src/components/__tests__/Popover.test.tsx`.
- **Excluded:** Changes to `MapLabPage.tsx`, `MapLabViewerCanvas.tsx`, or `MapLabEditorChrome.tsx`; changes to shared Popover or dependencies; flattening the Finder into Combobox results; changes to room data, grouping/filter rules, map geometry, gestures, or domain behavior; changes to View's contents/layout or the approved Escape order; unrelated files and worktree changes.

## Stages

1. **completed - Migrate and prove the Finder primitive.** Actions: (1) use the shared Popover as the controlled Finder while retaining the existing `ViewerRoomRail` props and callbacks; (2) block outside-press dismissal; keep search focused on open, wrap Tab, and reset the query and return focus to the trigger on Escape, Close, and room selection; (3) preserve grouped active-floor/off-map results, result semantics, and room selection behavior; (4) keep Finder styling scoped to its own classes so the portalled Positioner does not inherit conflicting `.maplab-editor .maplab-viewer-rail-panel` positioning or collide with View popover rules; (5) add focused component regressions. **Proof:** run the focused command in Proof. **Escalate** if the existing shared API cannot meet these behaviors without an API/dependency change, caller edits, or a broader page-level overlay-rule change. **Breakpoint:** none.
2. **completed - Prove representative viewer integration and keyboard ownership.** Actions: (1) use the existing MapLab page navigation tests to verify that opening View closes Finder and opening Finder closes View; (2) verify that room selection still updates the viewer and closes Finder; (3) retain one-owner-per-Escape behavior in the order **View → Finder → encounter → NPC → reset → selected**, including focus return after keyboard dismissal; (4) make only focused assertions needed in the navigation test, leaving `MapLabPage.tsx` and both existing callers unchanged. **Proof:** rerun the focused command in Proof after integration assertions or implementation changes. **Escalate** if the shared Finder cannot preserve the ordered viewer Escape behavior or compatibility with the read-only editor caller within the approved areas. **Breakpoint:** none.

## Progress and decisions

- **Stage 1:** completed - proof: `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/ViewerRoomRail.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx` from `frontend/` (2 files, 51 tests passed; command timeout: 120 seconds; Bash tool timeout: 130000 ms); breakpoint: none.
- **Stage 2:** completed - proof: the retained focused component/navigation command above (2 files, 51 tests passed; includes room selection and ordered Escape ownership) plus the read-only mutual-exclusion proof below (1 file, 20 tests passed; command timeout: 120 seconds; Bash tool timeout: 130000 ms); breakpoint: none.
- **Decision:** Reuse the existing shared Popover without changing its API or adding dependencies. The existing editor and viewer-canvas callers remain read-only.

## Proof

Run from `frontend/`. The command timeout is 120 seconds; use a 130000 ms Bash tool timeout. Run after each stage. A passing behavioral proof remains valid until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment.

- **Focused acceptance:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/ViewerRoomRail.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx`
- **Stage 2 mutual-exclusion proof (read-only):** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabPage.layout-controls.test.tsx` — covers the existing View/Finder mutual-exclusion assertion without editing that test file.

Acceptance coverage must show search focus on open; wrapped Tab navigation; Escape, Close, and selection closing the Finder, clearing its query, and returning focus to its trigger; blocked outside-press dismissal; grouped active-floor and off-map results; room selection callbacks and viewer updates; View/Finder mutual exclusion; and one-owner-per-Escape behavior in the specified viewer priority. Do not replace the room groups with flattened Combobox results.

## Escalation boundaries

- Stop and ask before changing the outside-press, focus, query-reset, grouping, selection, mutual-exclusion, or Escape-order contract; modifying `MapLabPage.tsx` or either read-only caller; changing shared Popover behavior or dependencies; flattening Finder result semantics; or broadening CSS changes beyond Finder-specific rules to resolve overlay conflicts.

## Visible result

> Find room opens with its search ready, keeps matches grouped by floor and off-map status, and closes only by its keyboard, Close, or selection actions while returning focus to Find room.
