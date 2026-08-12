# Frontend Layout Recovery — restore the focal page after FL-01–FL-08

> **Status:** Stages 1–4 shipped; automated checks and the complete post-fix screenshot matrix passed. Awaiting explicit human UX acceptance of the combined recovery and FL-08 result; do not begin FL-09+.

- **Areas:** design, dungeons, encounters, loom
- **Read trigger:** When repairing the combined responsive layout delivered by FL-01 through FL-08, or before accepting FL-08 and starting any later frontend-layout slice

## What we're building & why

The first eight layout slices delivered their individual controls, but their combined composition is not
shippable. At desktop width Map Lab's command chrome consumes roughly half the viewport, the viewer's
room finder anchors to the page origin, and encounter navigation clips into fragments. At constrained
widths Map Lab becomes a stack of controls with almost no map, the Monster browser squeezes two unusable
panes side by side, and Loom's title collides with its actions. The Field Guide compositions at 1920px
and 700px are the acceptable shell baseline to protect.

This is one mandatory recovery pass, not a new destination slice. It restores the master plan's shallow
shell, single compact command band, focal workspace, transient finder, sequential constrained browser,
and explicit scroll ownership before further redesign work compounds the damage. It preserves all
shipped domain behavior and does not begin FL-09.

### Before

```text
Desktop Map Lab:   [identity]
                   [primary........................active/options]
                   [floors........finder][expanded connection cards]
                   [                 reduced canvas              ][details]

Constrained:       [identity and actions collide]
                   [tools]
                   [more tools]
                   [floors]
                   [expanded utilities / finder]
                   [little or no focal workspace]

Viewer finder:     [finder starts at viewport origin over shell]
                   [unbounded results become a page column]
```

### After

```text
Desktop Map Lab:   [identity · context · route actions]
                   [primary tools | active options | view/map | utilities]
                   [floor controls | Find room…]
                   [          focal map          ][selected details only]

Constrained:       [menu | identity/context | essential route action]
                   [intentional command rows; horizontally scrollable chips where needed]
                   [                 focal map                 ]
                   [selected details overlay/bounded below map]

Finder open:       [identity remains unobscured]
                   [command band + trigger]
                   [bounded finder over map; its results scroll internally]
```

## UX decisions — recovered cross-route layout

Surface:      App shell, standard catalog browser, Map Lab editor/viewer, Loom board, and encounter runner; their existing area-guide rows remain authoritative
Mode:         both — catalog and Map Lab editor favor compact prep throughput; Map Lab viewer, Loom board, and encounter runner preserve play-mode glanceability and persistent live actions
Operator:     DM
Focal:        Route content wins: selected catalog detail on wide screens or the one active list/detail view when constrained; Map Lab's canvas; Loom's board/empty state; encounter live cards. Chrome may use only the height and width required by its visible controls.
Route shape:  Existing shapes remain: Browser for catalogs, Viewer for Map Lab session view, Editor for Map Lab authoring, bespoke for Loom and encounter runner
Edit style:   Unchanged — selected canvas properties remain inline; independent records retain their existing editors; encounter values remain direct controls
Save:         Unchanged — Map Lab authored edits keep autosave/status; this Plan changes composition only
Empty:        Preserve each surface's existing exact copy, including Loom's `No story threads found` and catalog `No <plural noun> found.`
Filtered empty: Preserve existing SearchList and room-finder copy; no new data state
No selection: Preserve each catalog's existing payoff copy; Map Lab reserves no editor inspector width and shows no fabricated selection
Load failure: Existing StatePanel or canvas-local failure continues to replace only the failed region
Action failure: Existing inline or canvas status location remains; layout recovery does not duplicate it
Destructive:  Existing ConfirmDialog and reversible Undo contracts remain unchanged
Keyboard:     DOM order is identity, commands, workspace, then selected details; Enter/Space keep native activation. Escape closes finder/popover/drawer first, then preserves existing Map Lab cancellation and selection order. Finder close restores focus to `Find room…`.
Touch:        Existing 48px floor remains. At constrained widths controls regroup, scroll within their semantic row, or move to an overlay; labels are never removed merely to make them fit.

## Settled responsive contract

- **Shared shell:** At widths above 768px the preparation rail is either the readable 200px rail or the
  intentional 64px icon-only persisted state. The encounter's temporary 64px play rail must use true
  icon-only content; no label or brand fragment may paint outside it. At 768px and below the rail spends
  zero layout width and the labelled navigation trigger opens the existing drawer. The operational row
  uses intrinsic title/context and action groups: actions never overlay the title. If both cannot fit,
  they form two deliberate in-flow rows rather than allowing title text to sit behind controls.
- **Catalogs:** The wide split remains through 768px only while both regions meet their usable widths.
  At 768px and below, selecting a record replaces the list with detail and exposes the existing in-flow
  `Back to <collection>` action; returning restores list search and scroll. There is no squeezed 700px
  split. Wide list and detail retain independent vertical overflow inside a stable route frame.
- **Map Lab command band:** It contains two compact semantic rows at desktop: workflow/tools/options/
  view utilities, then floor/navigation utilities. Groups align from the start edge; no group receives a
  large flex basis that creates blank fields. At 768px and below those same groups form deliberate rows;
  long floor/tool sets scroll horizontally inside their own row rather than increasing document height.
  The canvas begins immediately after the band. Connection resolution is a labelled compact trigger with
  a meaningful unresolved count; its existing cards appear only in a bounded transient panel with internal
  scrolling, never permanently inside the command band.
- **Room Finder:** Closed by default. On wide screens it is positioned from the trigger inside a positioned
  workspace/command container, bounded to the viewport, no wider than 24rem, no taller than available space,
  and result rows scroll internally. It does not alter flow, cover the operational row, or expose another
  expanded toolbar utility behind it. At 768px and below it is a viewport-contained sheet below the identity
  row with `Close`, Escape dismissal, focus containment appropriate to its dialog semantics, and trigger focus
  restoration. At 375px it uses the available width without horizontal clipping.
- **Map Lab workspace:** The fill shell locks document scrolling. Identity and command rows remain in frame;
  the canvas gets all remaining block size and owns pan/zoom. Desktop selected details use one bounded adjacent
  region with internal vertical overflow; no-selection reserves no width. Constrained selected details overlay
  or sit in the existing bounded sheet region without turning map + details + reference content into a long
  page. Finder, connection utility, View, and Map are mutually exclusive transient layers.
- **Loom and encounter:** Only shell composition changes. Loom's existing body/empty state and the encounter's
  live cards are not redesigned. Loom's title remains visible beside or above its command group without overlap.
  Encounter's compact wide navigation is a legible icon rail, and its live content occupies the remaining
  width without clipping shell content.
- **Overflow gate:** No layout-caused horizontal document overflow at 1920×1080, 1280×900, 700×900, or
  375×812. Spatial routes have no vertical document scroll; only the named internal regions scroll.

## Stages

1. **Stabilize shared shell and catalog transformation.** Repair operational-row intrinsic sizing and
   compact-play rail clipping; move standard browsers to one-view list/detail at the 768px constrained
   boundary while preserving the acceptable Field Guide and existing browser state.
2. **Recompose Map Lab command chrome.** Replace flex-basis drift and permanently expanded connection
   content with the settled two-row command grammar and bounded utility trigger/panel, preserving every
   FL-06/FL-07 command and operation.
3. **Contain the finder and workspace.** Make the shared finder closed-by-default and correctly anchored/
   sheeted, enforce transient-layer exclusivity, restore viewer/editor canvas fill and bounded selected
   details, and remove competing document scroll.
4. **Regression and live visual gate.** Run focused and full frontend checks, then capture matching
   post-fix screenshots at 1920×1080, 1280×900, 700×900, and 375×812 for Field Guide, Monsters, Map Lab
   editor/viewer (initial, finder open, selected), Loom, and encounter runner. Stop for human UX acceptance;
   update FL-08 acceptance only after the user accepts this full matrix.

## Human acceptance script

1. At 1920×1080 and 1280×900, open `/` and confirm the accepted Field Guide composition did not regress.
2. Open `/monsters` at 1920×1080: search/list and selected detail remain independently usable. Resize to
   700×900: only the list is present initially; select a monster to see only detail plus `Back to monsters`;
   return and confirm search text, selection context, and list position survive.
3. Open `/dungeons/1/edit` at every matrix size. Confirm the finder and connection utility are closed,
   the command band is compact and deliberately grouped, and the map receives the remaining viewport.
4. Activate each existing tool and View/Map utility. Confirm controls stay labelled, rows do not arbitrarily
   wrap, only one transient utility is open, Escape closes only that layer, and focus returns to its trigger.
5. Open connection resolution. Confirm its trigger shows the unresolved count and its existing unresolved,
   broken, missing-return, empty, and error states fit in a bounded internally scrolling panel without moving
   the map. Close it and verify the released workspace returns immediately.
6. Open `Find room…` in editor and viewer. At wide sizes it remains attached to the trigger below the identity
   row; at 700px and 375px it is a contained sheet. Results scroll inside it. Search and select visible,
   off-screen, cross-floor, and off-map rooms; selection/focus behavior remains FL-08's contract.
7. With Great Hall selected, confirm editor and viewer details are readable without clipped fields/actions,
   the map remains visible, clearing selection releases the detail region, and opening Finder does not also
   expose expanded utility content.
8. Confirm Map Lab routes do not vertically scroll the document and have no horizontal overflow; pan/zoom,
   floor switching, View/Edit route switching, Save status, Undo/Redo, and viewer session controls still work.
9. Open `/loom` at 1920px and 700px. Confirm `The Loom` is unobscured, actions form an intentional group,
   and the empty state/body is otherwise unchanged.
10. Open `/encounters/1/run` at 1920px and 700px. Confirm wide compact navigation is icon-only and readable,
    constrained navigation uses the drawer trigger, `Next turn` remains visible, and combatant cards are unchanged.
11. Compare the complete before/after screenshot matrix. Reject the pass for clipped labels, overlapping layers,
    unexpected open panels, layout-caused document scroll, or a workspace subordinated to chrome.

## Automated gate

- Focused Vitest coverage must assert shell title/action wrapping, true icon-only play rail containment,
  catalog sequential transformation at 700px, finder default-closed/placement/dismissal/focus restoration,
  command grouping and utility exclusivity, and editor/viewer scroll ownership.
- Existing Map Lab navigation, toolbar, room-finder, connection-resolution, AppShell, PageHeader, SplitPane,
  BrowserLayout, Loom, encounter runner, and representative browser suites must pass.
- Stage closeout runs strict frontend tests, lint, build/typecheck, and the documentation checker.
- Browser verification must report console errors and failed requests separately. The observed
  `/api/dungeons/1/session-state` 404 is the existing absent-session-state contract and is not a layout failure.

## Explicitly excluded

- FL-09 inspector redesign, FL-10 Smart Room, FL-11 contextual menus, FL-12/13 Loom utilities/inspector,
  FL-14 encounter reference docking, and FL-15/16 kid spellbook work.
- Palette, typography, token-scale, API, database, seed, map geometry/navigation/selection, room semantics,
  authoring-operation, autosave, context-menu, and encounter-card changes.
- New utility content or new finder semantics. This pass contains presentations and preserves behavior.
- Treating the expected absent-session-state 404 as an application defect.

## Stop condition

> Stop when all four stages pass, the complete post-fix screenshot matrix is saved, and the user explicitly
> accepts the combined recovery and FL-08 result. Do not begin FL-09 or any later frontend-layout slice.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Recovered the shared shell's intrinsic operational-row sizing and true icon-only encounter play rail, and changed standard catalogs to sequential list/detail views at 768px and below while preserving browser state and Field Guide composition. Focused regressions passed. |
| 2 | Recomposed Map Lab editor chrome into two compact semantic command rows, moved connection resolution behind a counted labelled utility trigger with bounded internal scrolling, and preserved existing tools and resolution actions. Focused regressions passed. |
| 3 | Made the shared room finder closed by default, trigger-anchored and bounded on wide screens, sheeted at constrained widths with focus containment/restoration, and restored bounded Map Lab workspace/selection scroll ownership with transient-layer exclusivity. Focused regressions passed. |
| 4 | Ran the full frontend/backend/documentation gates and captured the post-fix visual matrix for Field Guide, Monsters, Map Lab editor/viewer, Loom, and encounter runner at the required widths. Evidence is in `artifacts/frontend-layout-audit-2026-08-12/`; human UX acceptance remains outstanding. |

## Touches

- `frontend/src/layout/**`
- `frontend/src/components/**`
- `frontend/src/features/dungeons/maplab/**`
- `frontend/src/features/monsters/**`
- `frontend/src/features/loom/**`
- `frontend/src/features/encounters/**`
- `docs/UX_PATTERNS.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/master-plans/frontend-layout-redesign.md`
- `docs/plans/active/frontend-layout-recovery/**`

## Compiler handoff

### Stage 1
- **Verified edit sites:** `frontend/src/layout/AppShell.tsx` and `frontend/src/layout/AppShell.css` — operational slots, 200px/64px rails, encounter `.app-nav--play`, fill layout, and 768px mobile switch; `frontend/src/components/PageHeader.tsx` and `.css` — portalled identity/actions and nonshrinking action group; `frontend/src/components/BrowserLayout.tsx`/`.css` and `SplitPane.tsx`/`.css` — `detailOpen`, pane visibility, and current 520px transformation; `frontend/src/features/monsters/MonsterBrowserPage.tsx` — existing detail selection and `Back to monsters` behavior.
- **Verified tests:** `frontend/src/layout/__tests__/AppShell.test.tsx`; `frontend/src/components/__tests__/PageHeader.test.tsx`; `frontend/src/components/__tests__/BrowserLayout.vw0.test.tsx`; `frontend/src/components/__tests__/SplitPane.test.tsx`; `frontend/src/features/monsters/__tests__/MonsterBrowserPage.test.tsx`; Loom/encounter headers are covered by their colocated page suites.
- **Settled contracts:** 768px is the constrained composition boundary for shell and browser route shape; browser state survives list/detail switching; encounter play rail is truly icon-only at wide widths; operational actions move to an intentional second row rather than overlap identity.
- **Constraints:** Preserve the Field Guide screenshots, persistent prep nav preference, labelled mobile drawer, all nine browser behavior, 48px controls, and DOM focus order.
- **Open questions:** none.

### Stage 2
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx` — current single toolbar composition; `MapLabToolbar.tsx` — `ToolbarTray`; `ConnectionsResolveList.tsx` — existing resolution body; `MapLabPage.css` `.maplab-toolbar*`; `MapLabEditor.css` `.maplab-connections-resolve-list`.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx`; `frontend/src/features/dungeons/maplab/__tests__/ConnectionsResolveList.test.tsx`.
- **Settled contracts:** exactly two compact semantic command rows on wide editor; intentional rows at constrained sizes; floor/tool rows may scroll horizontally; connection content is closed behind a labelled counted trigger and bounded panel; opening it closes Finder/View/Map.
- **Constraints:** Preserve all FL-06/FL-07 controls, tool armed state, floor model, resolution states/actions, labels, and touch/keyboard access. Do not change map or connection data.
- **Open questions:** none.

### Stage 3
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/ViewerRoomRail.tsx` — current `useState(true)` and dialog panel; `MapLabViewerCanvas.tsx` — viewer finder sibling before canvas area; `MapLabPage.css` `.maplab-viewer-finder`, `.maplab-canvas`, editor finder rules, sidebar/inspector and constrained sheet rules; `DungeonShell.tsx`/`.css` and `MapCanvas.css` — fill-shell and canvas sizing; `MapLabViewerOverlays.tsx` and `MapLabEditorSelection.tsx` — selected detail regions.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/ViewerRoomRail.test.tsx`; `MapLabPage.rendering.test.tsx`; `DungeonShell.test.tsx`; `MapLabEditorPage.chrome.test.tsx`.
- **Settled contracts:** Finder defaults closed; wide panel anchors to its trigger inside a positioned container; constrained panel is viewport-contained below identity; results own vertical overflow; selection closes Finder and focus returns; transient Map Lab layers are mutually exclusive; fill routes have no document scroll and selected details are bounded.
- **Constraints:** Preserve FL-05/FL-08 navigation, search, grouping, hints, off-map reachability, focus rules, MapCanvas geometry and gestures, and editor/viewer selection differences.
- **Open questions:** none.

### Stage 4
- **Verified edit sites:** live routes `/`, `/monsters`, `/dungeons/1/edit`, `/dungeons/1`, `/loom`, `/encounters/1/run`; before evidence is under `artifacts/frontend-layout-audit-2026-08-12/`.
- **Verified tests:** all focused suites named above plus strict frontend test, lint, build, and documentation checks.
- **Settled contracts:** capture initial states for every route, plus Finder-open and Great-Hall-selected states for editor/viewer at 1920×1080, 1280×900, 700×900, and 375×812; save post-fix evidence beside the before set with `fixed-` filenames.
- **Constraints:** Browser evidence does not mark human acceptance. Preserve unrelated worktree changes and do not mutate records while capturing.
- **Open questions:** none.
