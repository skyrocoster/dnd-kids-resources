# Frontend Standard Browser Actions — Consistent collection and selection actions

> **Status:** Completed and accepted 2026-08-07; FL-04 standard browser actions are shipped.

- **Areas:** design
- **Read trigger:** Implementing FL-04 of the frontend layout redesign: standard browser collection actions and selected-record actions.

## What we're building & why

Standard catalog browsers must make collection creation visible in the merged operational top row and keep actions for the selected record with its detail. FL-02 already provides the shared top-row host and eight browsers already follow the intended placement; this focused Plan closes the remaining Monster-browser gap and adds regression coverage for the shared nine-browser contract without changing editor behavior or autosave.

## Human-visible outcome

On every standard browser, Create is in the operational top row and the selected record's Edit/Delete actions are visibly with its detail, at both wide and narrow widths.

## Before

```text
top row:  [browser title]                                  [Create]
detail:   Monster detail                         [Edit]
```

## After

```text
top row:  [browser title]                                  [Create]
detail:   Monster detail                         [Edit] [Delete]
```

## Included

- Preserve the existing `BrowserLayout`/`PageHeader` path that places all collection Create actions in the FL-02 operational top row.
- Add the missing selected-Monster Delete action using the existing client capability and the established immediate selected-detail deletion pattern.
- Add focused regression coverage that keeps the nine standard browsers aligned on top-row collection actions and detail-local selected actions, including the Monster narrow list/detail path.
- Keep the existing route navigation, selection behavior, confirmation/safety behavior, and responsive composition intact.

## Explicitly excluded

- Editor form behavior, autosave, API/data-model changes, or deletion-policy redesign.
- Map Lab, Loom, encounter, kid surfaces, global search, contextual menus, inspectors, or toolbar relocation beyond the already-shipped FL-02 host.
- Visual token, typography, or arbitrary responsive-layout redesign.

## Prerequisite

FL-02 is accepted and archived in `docs/plans/done/frontend-operational-top-row/`; no active Plan dependency is required.

## Human acceptance script

1. Open representative Spells or Weapons and Monsters browsers at a wide viewport; confirm Create is in the merged operational top row and Edit/Delete sit with the selected detail.
2. Repeat at a constrained viewport; use the in-flow Back action and confirm the selected detail's actions remain attached to the record rather than becoming collection chrome.
3. Repeat the visual comparison across all standard browsers: spells, weapons, items, loot, monsters, NPCs, players, encounters, and dungeons.
4. With keyboard plus mouse, Tab through the top-row Create action and selected-detail actions; activate them without changing the surrounding layout.
5. On touch, open a selected record and activate its detail-local actions with touch-safe controls.

## Automated gate

- Focused Monster browser and shared standard-browser regression suites.
- Frontend typecheck, lint, build, bounded test check, full stage checks, and documentation checker.

## Stop condition

> Stop when every standard browser visibly has top-row Create and selected-detail Edit/Delete, focused and full checks pass, and the human marks FL-04 accepted. Do not begin FL-05, FL-06, or any other adjacent layout slice.

## Stages

1. Close the Monster-browser selected-action gap and codify the all-standard-browser placement contract in focused tests.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Added Monster selected-detail Delete with the existing confirmation/reload pattern and regression coverage for Create plus selected Edit/Delete across all nine standard browsers. Focused and full checks passed, and the user accepted the wide, constrained, keyboard, and touch layouts. |

## Touches

- `frontend/src/features/monsters/MonsterBrowserPage.tsx`
- `frontend/src/features/monsters/__tests__/MonsterBrowserPage.test.tsx`
- `frontend/src/components/__tests__/BrowserLayout.vw0.test.tsx`

## UX decisions

- **Focal element:** The selected record's detail remains the focal content; its Edit/Delete actions stay in that detail region.
- **Top-row action:** Create is a collection-level action supplied through the existing `BrowserLayout` → `PageHeader` → AppShell operational row.
- **Responsive behavior:** Wide browsers retain list/detail composition; constrained browsers expose list and detail sequentially with the existing in-flow Back action. Actions do not move into a new toolbar or global chrome.
- **Accessibility:** Native buttons remain in DOM/focus order, preserve visible focus, retain accessible labels, and meet the existing 48px DM control floor.
- **Feedback and safety:** Use the existing browser deletion behavior and local feedback; do not introduce confirmation, toast, or autosave changes.

## Compiler handoff

### Stage 1

- **Verified edit sites:** `frontend/src/features/monsters/MonsterBrowserPage.tsx` — `MonsterBrowserPage` detail block lines 66-75 currently renders Edit but no Delete; `actions` already supplies Add Monster at line 48. `frontend/src/features/monsters/__tests__/MonsterBrowserPage.test.tsx` — `MonsterBrowserPage` suites and skipped M3 delete placeholder lines 269-281. `frontend/src/components/__tests__/BrowserLayout.vw0.test.tsx` — `catalog browser rail adoption` matrix lines 288-386 renders all nine standard browsers.
- **Verified tests:** `frontend/src/features/monsters/__tests__/MonsterBrowserPage.test.tsx` — existing list, navigation, selection, and narrow-back coverage; `frontend/src/components/__tests__/BrowserLayout.vw0.test.tsx` — shared nine-browser render matrix. `frontend/src/api/client.ts` already exports `deleteMonster`; no API edit is authorized.
- **Settled contracts:** FL-04 requires collection-level Create in the top row and selected-record Edit/Delete with detail. Existing FL-02 portal composition is authoritative. Monster deletion must use the existing browser deletion pattern and remain a selected-record action; no editor or autosave behavior changes.
- **Constraints:** Preserve all nine browser routes, selection/detail behavior, 520px sequential list/detail behavior, shared theme tokens, native button accessibility, and unrelated worktree changes. Do not touch generated docs until reconcile.
- **Open questions:** none.
