WORK ORDER 04 — Resolve list's remaining row types + incoming-links surface with one-click return
GOAL: the editor's "To resolve" list also surfaces (a) this dungeon's own gateways whose target
dungeon no longer exists, with `[repoint]`/`[remove]` actions, and (b) other dungeons' gateways
that point here but have no portal here pointing back, each with a one-click "Add the return
gateway" action that creates the missing portal in this dungeon only.
DEPENDS ON: 01 (incoming-gateways endpoint), 02 (`to.dungeon_id`, safe pairing), 03 (gateway picker
+ marker, so newly-created return portals render/edit consistently)

KNOWN STATE (already true — do NOT redo or re-derive):
- `ConnectionsResolveList.tsx` currently ships only row type 1 (portal with no destination):
  `layout.portals.filter((portal) => portal.to === undefined)`. Its own doc comment says as much:
  "Stage 2 ships only membership rule 1... the other two row types... are cross-dungeon concepts
  that arrive with Stage 2's gateways" (that comment now refers to what this order ships — update
  it). It renders inside `<section className="maplab-connections-resolve-list">` with a
  `<h3>To resolve</h3>`, an empty-state `<p>` ("Every connection has both ends. Nothing to
  resolve."), and a `<ul>` of `<li className="maplab-connections-resolve-list-item">` rows, each
  with a label `<span>` and one `maplab-pill-button` action. Follow this exact structure for the
  two new row types — same classes, same button style, per the Plan's UX decision "Focal: in the
  resolve list, the unfinished connection itself... its action button is the only emphasised
  control in the row."
- It is rendered from `MapLabEditorPage.tsx` (~line 849): `<ConnectionsResolveList layout={state.layout}
  onResolve={(portal) => { setActiveZ(portal.z); selectPortal(portal.portal_id) }} />`. That
  `onResolve` callback is exactly the `[repoint]` action for a broken gateway too — jump to its
  floor and open its inspector so the DM can pick a new destination via the Work-Order-03 picker.
- `GET /api/dungeons/{dungeon_id}/incoming-gateways` (Work Order 01) returns, for every OTHER
  dungeon's portal whose `to.dungeon_id` equals this dungeon, that portal's source dungeon id +
  title + portal id/title/z/cell. Add a client function in `frontend/src/api/client.ts` next to
  the other dungeon/layout calls, e.g. `listIncomingGateways(dungeonId) =>
  get<...>('/dungeons/${dungeonId}/incoming-gateways')` — add the matching type to
  `frontend/src/api/types.ts` next to `Dungeon`/`MapLayoutBlob`.
- `listDungeons()` (`frontend/src/api/client.ts:164`) returns all `Dungeon[]` — use it to check
  whether a gateway's `to.dungeon_id` still exists (row type 2: target dungeon deleted). A gateway
  here is any `layout.portals` entry with `to?.dungeon_id` set.
- "Two ends" test for an incoming gateway from source dungeon S: this dungeon has a return if
  `state.layout.portals.some((p) => p.to?.dungeon_id === S)` — it does not need to point at any
  specific portal in S, just at dungeon S at all (per the Plan: links are one-way data, the pairing
  is a UI/workflow concept, not a stored back-reference).
- Creating the return gateway re-uses the `addPortal` reducer action
  (`maplabEditor.ts` ~line 486), which takes a `cell: [number, number]` and drops the new portal on
  `state.activeZ` with no destination — then a follow-up `updateFixtureFlags` call (or an extended
  reducer action, your choice) sets its `to = { dungeon_id: <source dungeon id> }`. There is no
  existing helper that auto-picks a placement cell outside `FixturePropertiesForm.tsx`'s
  module-local `freeCellsInRoom`/`pickRandomCell` (lines 170-181) — for a one-click action with no
  user-clicked cell, pick the first room on `state.activeZ` (fall back to floor 0, then to cell
  `[0, 0]` if the dungeon has no rooms at all) and drop the portal on a free cell in it, same as the
  manual picker does today. Exact repositioning after that is already documented, deferred debt
  (see `FixturePropertiesForm.tsx` doc comment above `DestinationPickerField`) — don't build
  drag-to-reposition here.
- `[remove]` on a broken gateway is "the standard delete confirmation" per the Plan's UX decisions
  — find how `deletePortal` is invoked elsewhere with a delete confirmation (check
  `MapLabEditorPage.tsx`'s existing delete affordances, e.g. the room-delete button at ~line 838,
  and whether portals already have a `ConfirmDialog`-backed delete anywhere, e.g. via
  `FixturePropertiesForm`'s `deleteLabel`/`onDelete` props at ~line 1638). Reuse whatever pattern is
  already there rather than inventing a second confirmation style.
- Empty-state and copy are fixed by the Plan and must not be reworded:
  "Every connection has both ends. Nothing to resolve." (unchanged, still applies when all three
  row types are empty). Action failure copy: "inline beside the failing control, role=\"status\"...
  No toasts."
- Test file: `frontend/src/features/dungeons/maplab/__tests__/ConnectionsResolveList.test.tsx`
  already exists (currently covers only row type 1) — extend it.

START IN:
- frontend/src/features/dungeons/maplab/ConnectionsResolveList.tsx
- frontend/src/features/dungeons/maplab/__tests__/ConnectionsResolveList.test.tsx
- frontend/src/features/dungeons/maplab/MapLabEditorPage.tsx (where `ConnectionsResolveList` is
  rendered, ~line 849, and the `deletePortal`/`addPortal`/`updateFixtureFlags` actions from
  `useMapLabEditor.ts`)
- frontend/src/api/client.ts, frontend/src/api/types.ts

DO:
- `ConnectionsResolveList` needs `listDungeons()` and the new `listIncomingGateways(dungeonId)`
  result as additional props (fetched by `MapLabEditorPage`, not inside the list component itself,
  consistent with how the rest of Map Lab keeps data-fetching in the page and presentation in the
  component) plus the current dungeon id.
- Add row type 2 (target dungeon deleted): for each portal with `to?.dungeon_id` set that is not in
  the fetched dungeon list, render a row with `[repoint]` (same `onResolve` callback as row type 1)
  and `[remove]` (delete confirmation → `deletePortal`).
- Add row type 3 (incoming, no return): for each incoming gateway from the endpoint whose source
  dungeon has no matching return per the "two ends" test above, render a row naming the source
  dungeon and floor/cell (e.g. "The Castle links here, at square 2,9" — matches the Plan's own
  example row copy) with a single "Add the return gateway" action that creates the portal as
  described above.
- Handle the fetch/load failure case per the Plan's UX decision: "StatePanel error fills the
  resolve list region only; the canvas keeps its map." Reuse the existing `StatePanel` component
  (already imported in `MapLabPage.tsx`) for this region specifically.

STOP WHEN: `npm test ConnectionsResolveList` (run from `frontend/`) passes with tests for all three
row types (unresolved-destination, broken-gateway repoint/remove, incoming-no-return add-return).
Then stop.

STATUS: <-- DONE / FAILED - why
