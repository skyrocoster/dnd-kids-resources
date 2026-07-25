# Loom Beat Reorder Plan — Drag-to-Reorder Story Beats

> **Status:** BR1–BR2 shipped. Plan complete.

- **Area guide:** [The Loom](../../areas/loom.md).

---

## What this feature is

Each Loom thread is one linear, explicitly-ordered path (`Start → sessions → beats → End`). Sessions are
played/past events; beats are the upcoming, unplayed plan. Playing a beat fulfils it into a session, so beats
always sit after every session in a thread. Today there is no way to change the order of those upcoming beats
once they are placed.

This feature adds a **dedicated "Reorder Beats" modal**, opened from the focused thread, that lists that
thread's beats in narrative order and lets the user drag them up and down to re-sequence them. The
"beats always come after sessions" rule is enforced **client-side**: the modal only lists beats and only moves
them among themselves, so a beat can never be dropped ahead of a session.

---

## Key facts / data facts

- **The backend already supports reorder — no backend or schema change is in scope.** The endpoint is
  `PATCH /loom/threads/{thread_id}/items/{node_id}` (`reorder_thread_item`, `backend/app/routers/loom.py:459`).
  It removes the moved node from the thread's member list, inserts it before the first member whose `position`
  is `>= requested_position` (strict `<` in `_clamped_index`, `loom.py:71`), clamps to never precede Start or
  follow End, then renumbers every member to `index * 10` (`_renumber_thread`, `loom.py:63`). Start/End are
  rejected (422).
- **Reorder API client already exists:** `reorderLoomThreadItem(threadId, nodeId, { position })` —
  `frontend/src/api/client.ts:192`, returning the updated `LoomTapestryThread`.
- **Ordered-beat derivation already exists:** `threadOrdered(thread, nodes)` —
  `frontend/src/features/loom/loomGraph.ts:16` returns the thread's `LoomNode`s sorted by `position`; filter to
  `kind === 'beat'`. Beat positions come from `thread.items` (`{ node_id, position }`, `api/types.ts:530`).
- **Reorder position math (the one subtle part):** to move a beat into a new slot among the beats, send the
  **current `position` of the beat that will follow it in the new order**; if it becomes the last beat, send a
  large sentinel (`Number.MAX_SAFE_INTEGER` — the backend clamps it to just-before-End). Because the backend
  removes the moved node before indexing and compares with strict `<`, this lands the beat immediately before
  its intended follower for both up and down moves. Verified by hand against `_clamped_index` for both
  directions.
- **No DnD library is installed** (`@xyflow/react`, `lucide-react`, `react`, `react-dom`, `react-router-dom`
  only). The repo's reorder interaction is hand-rolled native pointer drag — reuse that pattern.
- **`beat` reorder is inherently thread-scoped:** a beat is thread-exclusive (at most one membership row), so
  the modal always operates on exactly one thread — the focused one.

## Reusable pieces (do not rebuild)

- **Pure position helper:** `beatReorderTarget(beats, fromIndex, toIndex)` returns
  `{ nodeId, position } | null` — `frontend/src/features/loom/beatReorder.ts`.
- **Reorder dialog:** `LoomBeatReorderDialog` takes `{ thread, nodes, onReordered, onError, onClose }` and
  owns the native pointer drag plus optimistic local order —
  `frontend/src/features/loom/LoomBeatReorderDialog.tsx`.
- **Native pointer-drag reorder pattern:** `frontend/src/features/encounters/EncounterRunnerBoard.tsx:41-78`
  — a `cardRefs` `Map<id, element>`, `findDropIndex(clientY)` that compares against each row's mid-point,
  a `dragState` ref (`{ id, fromIndex }`), and `startDrag`/`handlePointerMove`/`handlePointerUp` using
  `window` listeners.
- **Modal shell:** shared `Dialog` (`frontend/src/components/Dialog.tsx`).
- **Loom modal styling:** `frontend/src/features/loom/LoomEditor.css`.
- **Buttons:** shared `Button` (`frontend/src/components/Button.tsx`).
- **Reload-after-mutation pattern:** `LoomPage.tsx` mutations call `reload()` from `useLoomTapestry` and
  surface failures through `reportError` from `useLoomCanvasMutations`.

## Verification

- Automated gate: 86 frontend test files / 990 tests passed; production build and documentation checks passed.
- Interactive browser drag verification remains manual (browser automation was not requested).
