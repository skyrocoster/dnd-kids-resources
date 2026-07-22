WORK ORDER 02 — `MapPortal.to` gains `dungeon_id`; auto-pairing never crosses dungeons
GOAL: a portal's `to` can name a destination dungeon (a "gateway"), and the existing
in-dungeon auto-pairing logic in the editor reducer is provably never triggered for a gateway —
it must never write into another dungeon's layout document (that document is not loaded here and
might be open, unsaved, in another tab).
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `MapPortal` is defined in `frontend/src/features/dungeons/maplab/maplabModel.ts:112-118`:
  ```
  export interface MapPortal extends PassageFlags {
    portal_id: number
    cell: MapCell
    z: number
    title?: string
    to?: { z: number; cell: MapCell }
  }
  ```
  `to` today always means "the paired portal, same dungeon, at this floor+cell."
- The auto-pairing logic lives in `frontend/src/features/dungeons/maplab/maplabEditor.ts`, inside
  the reducer's `updateFixtureFlags` handler, `fixtureType === 'portal'` branch (currently lines
  ~257-330). Today, whenever `flags.to` changes on the source portal, it:
  1. finds `oldPair` — the portal that used to point back at the source (by matching
     `to.z`/`to.cell` against the source's *old* z/cell),
  2. finds `targetPortal` — an existing independent portal already sitting at the new `to.z`/
     `to.cell`,
  3. either re-links `targetPortal` to point back at the source, moves `oldPair` to the new
     location, or auto-creates a brand-new portal at the target (via `nextPortalId(state.layout)`)
     — always mutating `state.layout.portals`, i.e. the *current* dungeon's own portals array.
  This is safe today only because "the target" is always a location inside the same layout. A
  gateway's target is a different dungeon's layout, which this reducer has no access to and must
  not touch.
- `ConnectionsResolveList.tsx` filters on `portal.to === undefined` to find unresolved portals —
  a gateway with only `{ dungeon_id }` and no `z`/`cell` must NOT look "resolved" by that rule if
  it doesn't have both ends either, but ends-detection is handled in Work Order 04, not here — this
  order does not need to touch `ConnectionsResolveList.tsx`.
- The settled design decision (see `docs/plans/active/dungeon-connections.md`, "Links are one-way
  in the data, paired in the UI"): a gateway to another dungeon stores only which dungeon it leads
  to — not a specific floor/cell in that dungeon, since this document was never given permission to
  read or write that dungeon's layout. The receiving dungeon's editor (Work Order 04) is what
  places the actual return portal, when a human opens that dungeon and clicks the one-click action.
- `frontend/src/features/dungeons/maplab/__tests__/maplabEditor.test.ts` and
  `frontend/src/features/dungeons/maplab/__tests__/maplabModel.test.ts` are the existing test files
  for these two modules.

START IN:
- frontend/src/features/dungeons/maplab/maplabModel.ts (MapPortal interface, ~line 112)
- frontend/src/features/dungeons/maplab/maplabEditor.ts (the `fixtureType === 'portal'` branch of
  `updateFixtureFlags`, ~lines 257-330)
- frontend/src/features/dungeons/maplab/__tests__/maplabEditor.test.ts

DO:
- Change `MapPortal.to` to `{ z: number; cell: MapCell; dungeon_id?: number } | { dungeon_id: number }`
  — in practice, simplest as `to?: { z?: number; cell?: MapCell; dungeon_id?: number }`, with the
  invariant documented in a comment: a gateway sets `dungeon_id` and omits `z`/`cell`; an in-dungeon
  portal sets `z`/`cell` and omits `dungeon_id`.
- In the `updateFixtureFlags` portal branch: as soon as `updatedSource.to?.dungeon_id` is set,
  skip the entire find-`oldPair`/find-`targetPortal`/auto-create block — just replace the source
  portal in `state.layout.portals` with `updatedSource` and return. No other portal in this layout
  is read or mutated.
- If a portal is retargeted *from* a gateway *to* an in-dungeon destination (or vice versa), the
  existing same-dungeon pairing logic should resume correctly for the new state — reason about
  `oldPair` lookup, which matches on the *previous* `z`/`cell`: a portal that was a gateway has no
  `z`/`cell` on its `to`, so no in-dungeon portal would have matched it as a pair anyway; that's
  already the correct behavior, just verify it with a test.
- Add tests: retargeting a portal's `to` to `{ dungeon_id: N }` does not create or modify any other
  portal in the layout; retargeting a gateway portal back to an in-dungeon cell resumes normal
  pairing/auto-create.

STOP WHEN: `npm test maplabEditor` and `npm test maplabModel` (run from `frontend/`) both pass.
Then stop — do not touch the picker UI, the marker rendering, or the resolve list; those are later
orders.

STATUS: <-- DONE / FAILED - why
