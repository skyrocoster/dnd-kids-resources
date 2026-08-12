# Map Lab Inspector Presentation — selection-only responsive inspector

> **Status:** Stages 1–2 shipped; focused automated checks passed 42/42, Luna browser diagnostics found no console errors or confirmed failed requests but did not complete the full scripted matrix, and the user explicitly accepted FL-09 on 2026-08-12.

- **Areas:** dungeons, design
- **Read trigger:** When changing Map Lab inspector space reservation or its responsive drawer/sheet presentation.

## What we're building & why

Map Lab's selected-object inspector will be selection-only in both editor and viewer: with no target,
the workspace receives all available space; with a target, the inspector appears in the least
disruptive presentation supported by the available shape. A wide workspace may use a docked right
inspector, while constrained space uses an overlaid responsive sheet/drawer without permanently
shrinking the map. The selected target, property values, and obstacle state remain continuous while
the viewport changes presentation.

This is the next focused layout slice after the accepted shell and command-band work. It preserves
the existing inspector content and persistence adapters while making the space and responsive
presentation contract explicit and verifiable.

## Stages

1. Implement the selection-only inspector composition and wide/constrained drawer-or-sheet
   transformation for Map Lab editor and viewer, preserving target and state continuity.
2. Add focused regression coverage for no-selection space, select/clear/reselect, responsive
   presentation, resize continuity, keyboard and touch-relevant paths; perform the required live
   browser validation and capture evidence at representative wide and constrained viewports.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Implemented selection-only inspector composition for the Map Lab editor and viewer, with wide right-side reservation and constrained overlay presentation while preserving existing inspector content and state. |
| 2 | Focused Map Lab regression coverage passed 42/42, and browser evidence was captured for wide and constrained editor/viewer states. Luna validation did not complete the full scripted matrix; the user subsequently manually tested the explicit FL-09 expected-result checklist and accepted the result on 2026-08-12. |

## Touches
- `frontend/src/features/dungeons/maplab/MapLabEditorSelection.tsx`
- `frontend/src/features/dungeons/maplab/MapLabViewerOverlays.tsx`
- `frontend/src/features/dungeons/maplab/MapLabPage.tsx`
- `frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx`
- `frontend/src/features/dungeons/maplab/MapLabPage.css`
- `frontend/src/features/dungeons/maplab/MapLabEditor.css`
- `frontend/src/features/dungeons/maplab/__tests__/**`

## Compiler handoff

### Stage 1
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabEditorSelection.tsx` — `MapLabEditorSelection`; it conditionally mounts the editor inspector and currently exposes the selected-item peek/content structure.
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabViewerOverlays.tsx` — `MapLabViewerOverlays`; the viewer conditionally mounts selected details and the existing `InspectorPanel`/`RoomDetailsPanel` content.
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabPage.css` — inspector rules around `.maplab-inspector-panel-container`, `.maplab-inspector-rail`, and `.maplab-selection-sheet`; responsive rules already define the relevant contained presentation.
- **Verified edit sites:** `frontend/src/features/dungeons/maplab/MapLabEditor.css` — shared editor inspector layout boundary; its comment identifies shared inspector-rail rules in `MapLabPage.css`.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabEditorPage.chrome.test.tsx` — existing no-selection, selected-rail, and tablet peek/expand coverage.
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.inspector.test.tsx`, `MapLabPage.navigation.test.tsx`, and `MapLabPage.rendering.test.tsx` — viewer inspector content, selection clearing, and selected-target continuity coverage.
- **Settled contracts:** FL-09 from `docs/master-plans/frontend-layout-redesign.md`: no inspector space without selection; selected inspector adapts between usable wide right-drawer/dock and constrained bottom-sheet/overlay by available shape; a collapsed constrained sheet retains a labelled selected-target peek; presentation changes preserve target, content, and operation state.
- **Settled contracts:** Do not redesign property fields, obstacle Armed/Shown/DC state, inspector adapters, map geometry/model, authoring operations, finder behavior, or contextual menus. Preserve DOM-order keyboard access, visible focus, native Enter/Space activation, Escape layer behavior, and 48px ordinary controls.
- **Open questions:** none for product behavior; `to-orders` must verify the exact CSS breakpoint/measurement mechanism and the live-browser harness route/data setup before issuing orders.

### Stage 2
- **Verified tests:** `frontend/src/features/dungeons/maplab/__tests__/` is the colocated Map Lab suite; use `npm run test:check -- <matching test paths>` for focused checks, then the repository full gates at reconciliation.
- **Settled contracts:** Automated coverage must exercise editor and viewer select, clear, reselect, resize, target/property/obstacle-state continuity, keyboard paths, and touch-relevant interactions. Live browser coverage must run at representative wide and constrained viewports, inspect console errors and relevant failed network requests, and save screenshot/artifact evidence under `artifacts/frontend-maplab-inspector/`.
- **Constraints:** Browser evidence is required in addition to automated tests; a green unit suite is not sufficient. The acceptance run must confirm that no-selection map width/height is restored, the constrained sheet overlays rather than creates a competing page scroll owner, and resizing does not lose the selected target or its state.
- **Open questions:** `to-orders` must identify the configured live browser startup/fixture path and exact artifact naming without widening the slice.

## Human-visible outcome

> In Map Lab, the map fills the released space when nothing is selected; selecting an object reveals
> its existing inspector in a usable wide dock or constrained sheet, and resizing never loses the
> selected target or its current state.

## Before

```text
Wide:  +--------------------+------------------+
       | map workspace      | inspector       |
       +--------------------+------------------+
Narrow: map + inspector presentation can reserve or disrupt workspace space
```

## After

```text
Wide, none:       +------------------------------------------+
                  |              full map workspace          |
                  +------------------------------------------+
Wide, selected:   +------------------------------+-----------+
                  | map workspace                | inspector |
                  +------------------------------+-----------+
Constrained:      +------------------------------------------+
                  | map workspace (inspector overlays)       |
                  +------------------------------------------+
                  | [Selected target]       [Edit/Expand]    |
                  +------------------------------------------+
```

## Included

- Selection-only inspector mounting in both Map Lab editor and viewer.
- Wide presentation that reserves a right-side inspector only when selection exists.
- Constrained presentation that uses a labelled drawer/sheet or peek without crushing the map.
- Select, clear, reselect, viewport resize, and continuity of target, fields, and obstacle state.
- Keyboard and touch-relevant access paths, with screenshot and browser diagnostics evidence.

## Explicitly excluded

- Property-field redesign or obstacle-state/Armed/Shown/DC redesign.
- Map geometry, renderer, selection semantics, authoring tools, Smart Room, room finder, or
  contextual-menu work.
- Inspector content, persistence adapters, API/data/schema changes, and adjacent FL-10/FL-11 work.

## Human acceptance script

1. Open the Map Lab editor and viewer at a representative wide viewport with a map containing a room
   and at least one obstacle/fixture; confirm no inspector space is reserved before selection.
2. Select a room and a fixture; confirm the existing inspector appears beside the map without changing
   its property fields or obstacle-state controls.
3. Clear selection with empty-space Select-mode interaction and Escape where applicable; confirm the
   inspector disappears and the map reclaims the released space.
4. Reselect the same target, change viewport between wide and constrained sizes, and confirm the
   target, visible property values, and obstacle state remain continuous while presentation changes.
5. Use Tab plus Enter/Space and the existing Escape path; repeat the primary constrained interaction
   with touch-sized targets and a tap/drag-relevant gesture. Confirm visible focus remains present.
6. Confirm there are no console errors or relevant failed network requests and review the saved
   screenshots/artifacts for both viewport classes.

## Automated gate

- Focused Map Lab editor/viewer tests covering no-selection layout, select/clear/reselect, responsive
  presentation, resize continuity, keyboard activation/Escape, touch-relevant controls, and existing
  property/obstacle-state continuity.
- `cd frontend && npm run test:check -- <focused Map Lab test paths>`
- `cd frontend && npm run typecheck && npm run lint && npm run build`
- `.venv\Scripts\python.exe scripts/check_docs.py --check`
- Live browser test at representative wide and constrained viewports with console/network inspection
  and screenshot/artifact evidence under `artifacts/frontend-maplab-inspector/`.
- Full reconciliation gate: `.venv\Scripts\python.exe scripts/stage_check.py --timeout 900`.

## Stop condition

> Stop when the selection-only inspector and shape-adaptive presentation are implemented in both Map
> Lab surfaces, automated and live browser checks pass with diagnostic/screenshot evidence, and the
> human marks FL-09 accepted. Do not begin FL-10 Smart Room or FL-11 contextual menus.
