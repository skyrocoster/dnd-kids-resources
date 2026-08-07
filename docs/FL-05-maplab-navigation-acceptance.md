# FL-05 Map Lab Shared Navigation Acceptance

Human-run acceptance script for the shared navigation language in the Map Lab editor and
session viewer. Use a dungeon with multiple floors, visible rooms, stairs, a resolved portal,
and an unresolved portal. Perform the checks at both a wide desktop viewport and a constrained
tablet-sized viewport. Repeat the applicable checks in both `/dungeons/:dungeonId/edit` and
`/dungeons/:dungeonId`.

Right-click and Context Menu/Shift+F10 are in scope here only as FL-05 selection-without-travel
inputs. Opening a contextual menu, menu actions, and long-press behavior belong to FL-11 and are
not FL-05 acceptance requirements.

## Before you start

- Record the authored layout and obstacle/session state, or use a disposable local dungeon.
- Confirm that the browser is on the intended dungeon and that no layout or encounter data is
  being edited for this acceptance run.
- Use a mouse and keyboard for the desktop pass, then a touch device or touch emulation for the
  constrained pass.
- Treat browser session navigation state as temporary: the checks below must not create authored
  layout changes.

## Wide editor session

- [ ] **Floor and framing:** switch floors with the visible floor controls; pan and zoom the
  canvas with the mouse. Switch away and back, and confirm the current floor, pan, and zoom are
  restored for this dungeon.
- [ ] **Selection and focus:** select a visible room or fixture and confirm its framing is
  preserved. Select an off-screen target and confirm the target is centered. Click empty canvas
  space in Select mode and confirm the active selection clears.
- [ ] **Keyboard focus:** Tab through the navigation and canvas controls in DOM order. Confirm the
  focused control has a visible focus ring, and use Enter and Space on keyboard-operable controls.
- [ ] **Escape layers:** while an interaction has an active stroke or preview, press Escape and
  confirm it cancels that interaction first. Press Escape again to clear selection or return to
  Select as applicable; with no Map Lab interaction active, confirm only the highest open drawer,
  dialog, or other dismissible layer closes.
- [ ] **Editor connections:** primary-click a stair and a resolved portal and confirm each selects
  rather than travels. Double-click each connection and confirm its current connection is centered
  without changing floor or dungeon and without a second navigation. Right-click a connection and
  confirm it selects without travel.
- [ ] **Keyboard connection selection:** focus a connection and invoke Context Menu or Shift+F10.
  Confirm the target is selected without travel. Do not test or approve any menu action in this
  script.

## Wide viewer session

- [ ] **Restore and focus:** change floor, pan, and zoom; select an on-screen target and then an
  off-screen target. Confirm visible selection preserves framing and off-screen selection centers
  the target. Refresh the browser and switch between the dungeon route and another route, then
  return and confirm the dungeon's navigation context is restored.
- [ ] **Viewer travel:** primary-click a stair and a resolved portal. Confirm travel changes to the
  destination floor or dungeon and centers the destination. Confirm navigation happens once per
  activation.
- [ ] **No-travel interactions:** click empty canvas space in Select mode and confirm selection
  clears. Right-click and invoke Context Menu or Shift+F10 on a connection and confirm selection
  occurs without travel. Double-click a stair or portal and confirm it centers the current
  connection without travel; confirm the browser double-click sequence does not duplicate ordinary
  viewer navigation.
- [ ] **Unresolved portal:** activate an unresolved portal and confirm it remains on the current
  floor and in the current framing while a local unresolved-destination error or feedback message
  appears. Confirm the rest of the canvas remains usable.
- [ ] **Escape and focus:** verify the same layered Escape behavior and visible keyboard focus ring
  as in the editor session.

## Constrained touch sessions

- [ ] **Editor drawer and canvas:** at the constrained width, open and close the Floors/Rooms/
  Connections navigation drawer, switch floors, and confirm floor chips remain available outside
  the drawer. Pan and zoom by touch; select a visible and an off-screen target and confirm the
  framing behavior. Confirm the selected-item inspector opens as a peek-to-full bottom sheet when
  applicable.
- [ ] **Viewer drawer and context:** open and close room navigation, switch floors with floor chips
  still available, and pan/zoom the canvas by touch. Confirm selection, centering, and Escape or
  dismissal behavior without changing authored data.

## Preservation and data safety

- [ ] Refresh each route after navigation changes and switch away and back in the browser. Confirm
  floor, pan, zoom, selection, and focus context are restored for the dungeon's browser session.
- [ ] Verify that no authored layout, room, obstacle, or encounter session data changed during the
  checks. Navigation context must remain browser-session state only.
- [ ] Confirm there was no duplicate travel from mouse double-click, keyboard context invocation,
  or right-click selection.

## Explicit exclusions

Do not accept or evaluate FL-11 contextual menus, menu actions, or long-press behavior in this
script. FL-06, FL-08, and FL-10 are also excluded; this script covers only the shared editor/viewer
navigation behavior named above.

## Automated browser execution — 2026-08-07

A headless browser subagent executed every checkbox in the version of this script that existed at
the start of the run. A checked box below means **executed**, not accepted. Compound rows are marked
`PARTIAL` when at least one required behavior failed. This evidence does not replace the human UX
acceptance result.

| Executed | Check | Result | Observed evidence |
|---|---|---|---|
| [x] | Wide editor — Floor and framing | PARTIAL | Floor 1 pan/zoom survived a route round trip, but the restored floor reverted to floor 0 and overwrote the stored `activeZ`. |
| [x] | Wide editor — Selection and focus | FAIL | Selecting a visible room changed framing; selecting an off-screen room did not center it; an empty-canvas click did not clear the visible selection. |
| [x] | Wide editor — Keyboard focus | PASS | Tab order reached the shell, toolbar, canvas, and inspector; the focus ring was visible; Enter and Space operated floor tabs. |
| [x] | Wide editor — Escape layers | PARTIAL | Escape closed the Map popover, but the stroke/preview attempt did not prove that the first Escape cancelled only that interaction before clearing selection. |
| [x] | Wide editor — Editor connections | PARTIAL | Primary-click and right-click selected stairs and portals without travel; double-click did not center either connection. |
| [x] | Wide editor — Keyboard connection selection | PASS | Context Menu and Shift+F10 selected connections without changing floor or route; no menu action was tested. |
| [x] | Wide viewer — Restore and focus | PARTIAL | Visible selection preserved framing, but off-screen selection did not center; refresh/route return reverted the floor, produced conflicting stored and visible selections, and returned focus to `body`. |
| [x] | Wide viewer — Viewer travel | PARTIAL | Stair and portal activation traveled once, but the stair destination remained off-screen and cross-dungeon destination centering was not established. |
| [x] | Wide viewer — No-travel interactions | PARTIAL | Right-click, Context Menu, Shift+F10, and double-click did not travel, but empty canvas did not clear selection and double-click moved the portal away from center. |
| [x] | Wide viewer — Unresolved portal | PARTIAL | The route and framing stayed put and `This portal has no destination.` appeared, but a subsequent zoom action did not change framing, so continued canvas operation was not fully proved. |
| [x] | Wide viewer — Escape and focus | PARTIAL | The focus ring was visible and the first Escape closed the View menu; the next Escape did not clear selection. |
| [x] | Constrained touch — Editor drawer and canvas | PARTIAL | Drawer controls, floor chips, touch pan/pinch, selection, and the peek sheet operated; the selected off-screen room did not center. |
| [x] | Constrained touch — Viewer drawer and context | PARTIAL | Drawer controls, floor chips, touch pan, and selection operated; the off-screen room did not center and Escape did not clear selection. |
| [x] | Original long-press row | OUT OF SCOPE / NOT IMPLEMENTED | A 900 ms touch long-press did not select the stair or travel. This row was mis-scoped and has been removed from the rerunnable FL-05 checklist above; long-press belongs to FL-11. |
| [x] | Preservation — Refresh and route return | PARTIAL | Session storage survived byte-for-byte, but rendered floor, selection, inspector, and focus did not consistently match the stored context. |
| [x] | Preservation — Authored/session data unchanged | PASS | Before/after dungeon and layout API payloads for dungeons 1 and 2 were identical; no session-state row was created. |
| [x] | Preservation — No duplicate travel | PASS | Contextual inputs and double-click produced no route travel; cross-dungeon primary activation produced exactly one navigation. |

**Automated result:** FAILED — repair centering, restoration, empty-space clearing, and viewer Escape
before requesting human UX acceptance.

**Automation notes:** Widdershins Academy (`/dungeons/1` and `/dungeons/1/edit`) at 1440×1000 and
768×1024. No authored, layout, or session payload changed. The run produced no JavaScript exception or
HTTP 500; optional session-state 404s appeared in browser diagnostics.

## Human acceptance result

**Result:** ____________________

**Reviewer:** ____________________  **Date:** ____________________

**Notes / failed checks:**

________________________________________________________________________________

________________________________________________________________________________

STATUS: <-- human reviewer fills this field after performing the script -->
