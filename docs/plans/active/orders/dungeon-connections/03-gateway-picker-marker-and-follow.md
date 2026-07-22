WORK ORDER 03 — Pick a gateway's destination dungeon, render it distinctly, and follow it
GOAL: in the editor, a portal's destination picker can choose "this dungeon" (existing floor+room
flow) or "another dungeon" (a dungeon picker), producing a gateway (`to: { dungeon_id }`); in the
session view, a gateway portal renders visibly differently from an in-dungeon portal, its inspector
names the destination dungeon, and clicking it navigates to that dungeon's route instead of just
changing floor.
DEPENDS ON: 02 (MapPortal.to.dungeon_id and safe pairing must exist first)

KNOWN STATE (already true — do NOT redo or re-derive):
- Destination picking today is `DestinationPickerField` in
  `frontend/src/features/dungeons/maplab/FixturePropertiesForm.tsx:189-263`. It renders a Floor
  `<select>` (from `floorsInLayout(layout)`) and a Room `<select>` (from `roomsOnZ(layout, pickerZ)`),
  and on room selection calls `onChange(field.key, { z: pickerZ, cell })` where `cell` is a random
  free cell in that room (`pickRandomCell(freeCellsInRoom(...))`). It receives `layout` as an
  optional prop, threaded down from `FixturePropertiesForm`'s own `layout` prop.
  `isDestinationValue` (line 160) currently only recognizes `{ z, cell }` shapes — it will need to
  also recognize/accept `{ dungeon_id }` shapes, or the two cases need separate handling in the
  field.
- `PORTAL_FIELDS` in `frontend/src/features/dungeons/maplab/fixtureTypes.ts` has one `to` field:
  `{ key: 'to', label: 'Destination', type: 'destinationPicker' }`. `FieldSpec.type` is a union
  (`fixtureTypes.ts` top of file) that currently does not include a dungeon-list variant.
- `frontend/src/api/client.ts` already exports `listDungeons = () => get<Dungeon[]>('/dungeons')`
  and `type Dungeon = { id: number; title: string; data: Record<string, unknown> }`
  (`frontend/src/api/types.ts:498`). No client function fetches dungeons excluding one id — filter
  client-side after calling `listDungeons()`.
- `FixturePropertiesForm` is rendered from `MapLabEditorPage.tsx` around line 1632:
  `<FixturePropertiesForm spec={FIXTURE_TYPES.portal} values={selectedPortal as unknown as
  Record<string, unknown>} onChange={...} layout={state.layout} />`. `MapLabEditorPage` has the
  current dungeon id via `route.dungeonId` (from `useDungeonShellContext()` /
  `dungeonRouteContext.ts` — confirm the exact accessor by reading the top of
  `MapLabEditorPage.tsx`, it is already using `route` for the dungeon in the reset-dialog message
  around line 826: `` `Reset "${route.dungeon?.title}"?` ``). `FixturePropertiesForm` and
  `DestinationPickerField` do not currently receive a "current dungeon id" prop — add one, since
  the destination dungeon `<select>` must exclude the dungeon you're already in.
- Portal rendering: `frontend/src/features/dungeons/maplab/PortalMarker.tsx` uses a single
  `PortalIcon` (`Sparkles` from lucide, aliased in `frontend/src/components/icons/index.ts:65`) at
  a fixed `PORTAL_IDENTITY_TOKEN = '--md-primary'` regardless of destination. There is no existing
  icon alias for "leaves the dungeon" — `frontend/src/components/icons/index.ts:470` has
  `Link as LinkIcon`; lucide also exports `ExternalLink`, not yet aliased.
- `inspectableDescriptor`'s `'portal'` case in `maplabModel.ts` (~line 749-762) always renders a
  "Leads to"/"Destination" line using `portal.to.cell`/`portal.to.z` — it has no branch for
  `to.dungeon_id` and will need one. It has no access to a dungeon title (it's a pure function of
  `Inspectable`) — thread the title in via a small optional param, e.g. an extra argument to
  `inspectableDescriptor(target, context?)` where `context.dungeonTitle` is a already-resolved
  string the caller looked up (from `MapLabEditorPage`'s `listDungeons()` call in this same order,
  or `MapLabPage`'s — see next bullet).
- Click-to-navigate lives in `frontend/src/features/dungeons/maplab/MapLabPage.tsx:769`:
  `onClick={() => portal.to && setActiveZ(portal.to.z)}`. `MapLabPage.tsx` does not import
  `react-router-dom` today; `DungeonShell.tsx:1` shows the pattern
  (`import { ... useNavigate ... } from 'react-router-dom'`) already used elsewhere in this feature.
  Dungeon routes are `/dungeons/:dungeonId` and `/dungeons/:dungeonId/edit` (`frontend/src/router.tsx:41-48`).
- Test files to extend: `frontend/src/features/dungeons/maplab/__tests__/maplabModel.test.ts`,
  `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.test.tsx`, and (if one exists for the
  editor's fixture form) a matching test file — check for
  `frontend/src/features/dungeons/maplab/__tests__/` before assuming one doesn't exist.

START IN:
- frontend/src/features/dungeons/maplab/FixturePropertiesForm.tsx
- frontend/src/features/dungeons/maplab/fixtureTypes.ts
- frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx
- frontend/src/features/dungeons/maplab/maplabModel.ts (inspectableDescriptor, 'portal' case)
- frontend/src/features/dungeons/maplab/PortalMarker.tsx
- frontend/src/features/dungeons/maplab/MapLabPage.tsx (portal onClick, ~line 769)
- frontend/src/components/icons/index.ts

DO:
- Extend the portal destination picker so it first asks "this dungeon" vs "another dungeon" (radio
  or a small toggle — reuse existing form patterns, no new component library); "this dungeon" keeps
  today's floor+room flow producing `{ z, cell }`; "another dungeon" shows a dungeon `<select>`
  (from `listDungeons()`, excluding the current dungeon id) producing `{ dungeon_id }`.
  UX decisions from the Plan apply here: "Edit style: inline panel... a pick-from-a-list action in
  the inspector, never a typed coordinate and never a modal."
  Thread the current dungeon id down through `FixturePropertiesForm` to the picker field.
  Empty-state / no-selection copy from the Plan: "This portal has no destination yet. Choose where
  it leads." — this is the existing no-selection state; keep it when neither this-dungeon nor
  another-dungeon has been picked yet.
- In `inspectableDescriptor`'s portal case: when `to.dungeon_id` is set, the line reads something
  like "Leaves to <dungeon title>" (fall back to "another dungeon" if the title isn't available
  yet, e.g. mid-load) instead of the `cell`/`z` line. Wire the title through from the caller.
- Give a gateway portal a visually distinct marker (different icon and/or a small badge) from an
  in-dungeon portal in both `PortalMarker.tsx` (viewer) and wherever the editor renders portal
  markers on the canvas (`MapLabEditorPage.tsx` ~line 1128) — reuse or add one icon alias
  consistently, don't invent a second one for editor vs viewer.
- In `MapLabPage.tsx`, change the portal `onClick` so that when `portal.to?.dungeon_id` is set it
  navigates (`useNavigate()`) to `/dungeons/${portal.to.dungeon_id}`, in the same tab (per the
  Plan's "Route shape" UX decision); otherwise keep today's `setActiveZ(portal.to.z)` behavior for
  in-dungeon portals.

STOP WHEN: `npm test maplabModel MapLabPage` (run from `frontend/`) passes, and `npx tsc -b`
(NOT `tsc --noEmit`, which checks nothing in this repo) reports no new errors. Then stop — the
resolve-list's new row types and the "incoming links" surface are Work Order 04.

STATUS: <-- DONE / FAILED - why
