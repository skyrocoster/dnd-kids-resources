# MapLab tool-choice Popovers - Searchable tool panels keep working

> **Status:** done - searchable Passages, Prop and Terrain flyouts accepted.

- **Read trigger:** Read before migrating the MapLab editor's Passages, Prop, or Terrain tool-choice flyouts to shared Popover or changing their focus and dismissal behavior.
- **Upstream:** [Base UI and Shared Interaction Migration](../../../master-plans/base-ui-migration.md) governs the OVERLAYS direction and focused overlay proof. [MapLab editor popovers](../../done/base-ui-maplab-editor-popovers/PLAN.md) governs the completed Map, View, and Connections work and its ordered Escape behavior. This Plan is separate; it does not reopen or expand that completed Plan. No signed-off design artifact is declared.

## Outcome
The MapLab editor's Passages, Prop, and Terrain tool-choice panels use the shared Popover while keeping their searchable contents, current tool behavior, group-relative placement, visual styling, and editor-owned Escape priority.

## Scope
- **Included:** Migrate the three searchable tool-choice flyouts to controlled shared Popovers. Preserve filter state/reset, focus-on-open, Enter-to-first-filtered-match, outside dismissal without focus theft, native option-button keyboard activation, tool selection, contents, and styling. Keep Escape with the editor's ordered arbiter.
- **Expected areas:** `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx`, `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx`, `frontend/src/features/dungeons/maplab/MapLabEditor.css`, `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx`, and `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx`. Read-only API evidence: `frontend/src/components/Popover.tsx` and `frontend/src/components/menus/Menu.tsx`.
- **Excluded:** Changes to the shared Popover or Menu APIs, dependencies, or their callers; Finder, viewer, Map/View/Connections panels; filter or activation redesign; new Menu/roving-arrow keyboard behavior; drawing, geometry, gestures, and domain/data behavior; unrelated files and worktree changes.

## Stages
1. **pending - Migrate searchable tool-choice flyouts.** Actions: (1) host the existing Passages, Prop, and Terrain panels in controlled Popover parts without forcing the fixed-item Menu API; (2) retain each flyout's existing state, contents, filtered options, empty state, focus-on-open, filter reset, and Enter activation of the first match; (3) use the Popover for outside dismissal without returning focus to its trigger, and preserve the current group-relative below/start placement, gap, floating layer, and popup styling; (4) keep Escape under the editor arbiter, closing only the first active owner in order: **stroke → flyout → Map → View → utility → expanded selection → selected object → disarm**; Escape from focused search must close only the flyout and return focus to its toggle, while ordinary editor shortcuts remain blocked during typing; (5) add focused regression coverage for outside dismissal/focus and retain the search, selection, and ordered-Escape coverage. **Proof:** run the integrated focused command in Proof. **Escalate** if preserving group-relative placement, outside-target focus, or editor-owned Escape requires changing the shared Popover API or expanding ownership. **Breakpoint:** none.

## Progress and decisions
- **Stage 1:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx` passed (2 files, 42 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Search focus/reset/filter/Enter, outside-focus, group placement and editor-owned Escape passed; completed Map/View/Connections behavior re-proved.
- **Decision:** Use the shared Popover for the searchable custom panel. The shared Menu remains read-only and is not used because its fixed `items` contract cannot host the required search input and filtered panel without redesign.

## Proof
Run from `frontend/`:

`timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.terrain-controls.test.tsx`

The command-level timeout is 120 seconds; use a 130000 ms Bash tool timeout. Acceptance coverage must show that all three flyouts retain their controls and styling; opening focuses search and resets its filter; filtering and Enter activation still work; outside presses dismiss without stealing focus; and each Escape press closes only its first active owner in the stated order, including when the flyout search owns focus. Typing in search must not activate editor shortcuts. Passing behavioral proof remains valid until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment.

## Escalation boundaries
- Stop before changing the shared Popover/Menu API, adding dependencies, or changing filter, activation, option keyboard, or focus behavior beyond this approved preservation scope.
- Stop if Popover cannot retain group-relative placement or outside-target focus, or if Escape cannot reach the editor arbiter without changing Map/View/utility/Finder/viewer ownership or the approved Escape order.
- Stop before including Finder, viewer, Map/View/Connections panels, drawing, geometry, gestures, or domain/data changes.

## Visible result
> Passages, Prop, and Terrain tool choices remain searchable and visually in place, and Escape continues to dismiss only the highest-priority active editor interaction.
