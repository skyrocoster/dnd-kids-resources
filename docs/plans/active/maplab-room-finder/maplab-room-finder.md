# Map Lab Room Finder — replace permanent room navigation

> **Status:** Stage 1 shipped — the shared Room Finder presentation and regression contract are in place; next, compile Stage 2 for editor integration.

- **Areas:** design, dungeons
- **Read trigger:** When implementing FL-08 of the Frontend Layout Redesign master plan.

## What we're building & why

Map Lab currently spends permanent workspace on room-list navigation and keeps a tablet Rooms drawer. FL-08 replaces both presentations with one labelled `Find room…` command-band control in the editor and viewer, while preserving room selection, cross-floor navigation, off-screen focus, off-map reachability, and concise viewer hints.

This is a composition and navigation change only. Existing map geometry, focus rules, room semantics, authoring behavior, inspector behavior, contextual menus, persistence, and kid-map rendering remain authoritative.

## Stages

1. Build the shared Room Finder result/search presentation and regression contract for current-floor prioritization, all-floor filtering, off-map labels, keyboard dismissal/focus restoration, and touch-safe rows.
2. Replace editor room-rail/drawer navigation with the finder, keeping floor controls, New room workflow, selection, and existing room authoring behavior in their accepted homes.
3. Replace viewer desktop rail/tablet Rooms drawer with the finder, preserving visible/off-screen/cross-floor/off-map selection and viewer threat/NPC hints; remove obsolete rail presentation and run the full acceptance gate.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Adapted the shared viewer room-navigation presentation into a labelled `Find room…` finder with useful grouped results, current-floor prioritization, number/title/floor filtering, off-map labels, selection dismissal, focus restoration, and touch-safe controls. Extended `ViewerRoomRail` regression coverage for these behaviors while preserving room selection and viewer hints. |

## Touches
- `frontend/src/features/dungeons/maplab/ViewerRoomRail.tsx`
- `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx`
- `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx`
- `frontend/src/features/dungeons/maplab/MapLabPage.tsx`
- `frontend/src/features/dungeons/maplab/MapLabViewerCanvas.tsx`
- `frontend/src/features/dungeons/maplab/MapLabPage.css`
- `frontend/src/features/dungeons/maplab/MapLabEditor.css`
- `frontend/src/features/dungeons/maplab/__tests__/ViewerRoomRail.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.shell.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.layout-controls.test.tsx`
- `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.rendering.test.tsx`

## Compiler handoff

### Stage 1
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/ViewerRoomRail.tsx` — current floor-grouped room rows, viewer threat/NPC hints, and active-row scrolling; `frontend/src/features/dungeons/maplab/useActiveRoom.ts` — accepted cross-floor selection callback and active-room state; `frontend/src/features/dungeons/maplab/MapLabPage.tsx` — viewer active-room selection and focus state are already wired above the canvas. The shared finder may replace/rename the rail implementation rather than alter map geometry.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/ViewerRoomRail.test.tsx` — current grouping, labels, selection, cross-floor IDs, hints, off-map/layout-only fallback, and active scrolling; `frontend/src/features/dungeons/maplab/__tests__/useActiveRoom.test.tsx` — cross-floor active-room behavior.
- **Settled contracts:** Finder is labelled `Find room…`, shows useful results before typing, searches room number/title/floor, prioritizes current floor, labels off-map rooms, preserves concise viewer threat/NPC hints, supports all floors, closes after selection, and preserves pointer, keyboard Tab/Enter/Escape, focus restoration, and touch-safe rows.
- **Constraints:** Use existing theme tokens and native controls; no global search or command palette; preserve DOM order, visible focus, 48px ordinary controls, no hue-alone meaning, and the existing selection/focus callbacks. Do not change shared map/model or kid-facing code.
- **Open questions:** none about product behavior; `to-orders` should verify whether the existing rail test is adapted or split and the smallest finder extraction point.

### Stage 2
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx` — `MapLabEditorNavigation` currently renders the tablet trigger, floor-navigation placeholder, New room action, and current-floor room list; `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx` — navigation is mounted beside `MapLabEditorCanvas`, and `selectRoom`/`centerSelection` are existing editor paths; `frontend/src/features/dungeons/maplab/MapLabEditor.css` — current room rail and constrained navigation styles are local.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx` and `MapLabEditorPage.shell.test.tsx` — accepted FL-06/FL-07 command-band, floor-control, navigation, and responsive composition coverage.
- **Settled contracts:** Floor creation remains in labelled command-band floor controls; New room remains with the Room workflow; selected-room deletion remains in the inspector; connection resolution remains the separate labelled utility. The editor finder must reach rooms on every floor and off-map rooms without changing room authoring semantics.
- **Constraints:** Remove the permanent room list and responsive Rooms/navigation drawer from the editor; do not remove floor selection or the New room workflow; do not redesign the canvas, inspector fields, Smart Room, contextual menus, or persistence.
- **Open questions:** none about product behavior; `to-orders` should verify the editor's final command-band insertion point and whether the existing tablet backdrop/state can be deleted or repurposed without a second scroll owner.

### Stage 3
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabViewerCanvas.tsx` — current rail container, Rooms toggle, desktop seam, backdrop, and canvas composition; `frontend/src/features/dungeons/maplab/MapLabPage.tsx` — current `roomsDrawerOpen`/`desktopRailCollapsed` state and selection close behavior; `frontend/src/features/dungeons/maplab/MapLabPage.css` — current permanent rail, seam, drawer/backdrop, and room-row presentation.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx`, `MapLabPage.layout-controls.test.tsx`, `MapLabPage.rendering.test.tsx`, and `ViewerRoomRail.test.tsx` — viewer navigation, canvas controls, room selection, hints, and responsive rail behavior.
- **Settled contracts:** The viewer uses the same finder behavior as the editor. Selecting a visible room preserves framing; selecting an off-screen room focuses it; selecting a cross-floor room changes floor and focuses it; off-map rooms remain selectable without invented geometry; viewer threat/NPC hints remain concise; the finder closes after selection.
- **Constraints:** No permanent desktop room rail, seam, or responsive Rooms drawer remains; the map remains focal and owns pan/zoom; constrained finder presentation overlays rather than adding page scrolling; preserve kid map behavior and all FL-05 navigation contracts.
- **Open questions:** none about product behavior; `to-orders` should verify the final responsive overlay/focus-restoration implementation and update/remove obsolete rail-only assertions.

## Master-plan slice contract

**Master plan:** [Frontend Layout Redesign](../../../master-plans/frontend-layout-redesign.md) — FL-08.

**Human-visible outcome:** The permanent room sidebar and tablet Rooms drawer are gone; `Find room…` appears in Map Lab's command row on both editor and viewer.

**Before:**
```text
[command band]                         [room rail / tablet Rooms drawer]
[focal map]                             [room rows]
```

**After:**
```text
[command band: Floor controls | Find room… | Fit | Focus selected]
[focal map with no permanent room navigation]
```

**Included:** both Map Lab surfaces, useful pre-typed results, number/title/floor filtering, current-floor prioritization, off-map labels, viewer hints, selection/floor/focus preservation, pointer/keyboard/touch operation, dismissal, focus restoration, and touch-safe rows.

**Explicitly excluded:** canvas geometry, pan/zoom implementation, authoring and Smart Room behavior, contextual menus, inspector redesign or fields, shared kid map behavior, global search, API/data/persistence changes, and unrelated toolbar cleanup.

**Prerequisite:** FL-05 and FL-07 are accepted in the master-plan receipt (`Accepted 2026-08-09` and `Accepted 2026-08-11`); no active dependency is required.

**Human acceptance script:**
1. Open a dungeon with titled, untitled, cross-floor, off-screen, and off-map rooms; verify no rail or constrained Rooms drawer consumes workspace.
2. Open `Find room…` without typing and verify current/other-floor grouping, then filter by title and number.
3. Select visible, off-screen, cross-floor, and off-map rooms and verify framing, floor change, focus, and off-map identification.
4. Repeat opening, filtering, selection, dismissal, and focus restoration with keyboard-only Tab/Enter/Escape and with touch at wide and constrained widths.
5. Confirm the kid map still renders and navigates unchanged.

**Automated gate:** focused Map Lab finder/editor/viewer Vitest suites (including the existing `ViewerRoomRail.test.tsx`, adapted or renamed as the implementation dictates); `cd frontend && npm run test:check -- src/features/dungeons/maplab/__tests__/ViewerRoomRail.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx src/features/dungeons/maplab/__tests__/MapLabEditorPage.shell.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx`; `cd frontend && npm run typecheck && npm run lint && npm run build`; `.venv\\Scripts\\python.exe scripts/check_docs.py --check`.

**Stop condition:** Stop when Room Finder replaces room-list navigation in both Map Lab surfaces, automated and full checks pass, and the human marks FL-08 accepted. Do not begin FL-09 inspector, FL-10 Smart Room, or FL-11 contextual-menu changes.
