# Loom Beat Reorder Plan — Drag-to-Reorder Story Beats

> **Status:** BR1 shipped. BR2 (documentation update and archive) is next.

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

- **Native pointer-drag reorder pattern:** `frontend/src/features/encounters/EncounterRunnerBoard.tsx:41-78`
  — a `cardRefs` `Map<id, element>`, `findDropIndex(clientY)` that compares against each row's mid-point,
  a `dragState` ref (`{ id, fromIndex }`), and `startDrag`/`handlePointerMove`/`handlePointerUp` using
  `window` listeners. Mirror this for the beat rows. Its CSS conventions live in `EncounterRunnerBoard.css`.
- **Modal shell:** shared `Dialog` (`frontend/src/components/Dialog.tsx`) — props `open`, `title`,
  `description?`, `onClose`, `children?`, `footer?`, `pending?`, `role?`, `className?`. Handles focus trap,
  Escape/backdrop dismissal (suppressed while `pending`), and focus restoration. Loom modals already consume
  it (`LoomThreadManager.tsx`).
- **Loom modal styling:** `frontend/src/features/loom/LoomEditor.css` (imported by loom modals) — add the
  reorder-list styles here.
- **Buttons:** shared `Button` (`frontend/src/components/Button.tsx`), already used throughout the weaver
  panel with `variant`/`size="compact"`.
- **Reload-after-mutation pattern:** `LoomPage.tsx` mutations call `reload()` from `useLoomTapestry` and
  surface failures through `reportError` from `useLoomCanvasMutations` — reuse both.
- **BR1 reorder seam:** `beatReorderTarget(beats, fromIndex, toIndex)` returns
  `{ nodeId, position } | null`; `LoomBeatReorderDialog` takes `{ thread, nodes, onReordered, onError,
  onClose }` and owns the native pointer drag plus optimistic local order.

## Design system in force

`docs/DESIGN_SYSTEM.md` is canonical. This feature adds a modal built from the shared `Dialog` and `Button`
primitives and a small list style. Use only theme tokens (`--md-*`, foundation `--space-*`/`--radius-*`/
`--control-height`); no hand-picked hex (project rule). Interactive rows honor the 48px control-height floor
and visible focus.

## Known debt / deferred (NOT built)

- No backend/schema change: server-side enforcement of "beats after sessions" is explicitly out of scope
  (frontend-only enforcement was chosen). The reorder endpoint keeps clamping only against Start/End.
- No reordering of sessions (they are the locked past), no cross-thread beat moves (banking already covers
  relocating a beat), and no drag directly on the tapestry canvas.
- Keyboard reordering (Up/Down buttons) is optional polish, included only if cheap; pointer drag is the
  required interaction.

---

## Design Phase BR — Beat Reorder

Deliver the reorder modal and its position-computation helper in one implementation stage, then a closeout
stage for documentation. **Depends on:** nothing (backend endpoint already shipped). **Depended on by:** no
queued phase.

| Stage | Required strength | Summary | Deliverables |
|-------|-------------------|---------|--------------|
| **BR1 — Beat reorder modal** | Standard | Pure position helper + dedicated drag-reorder modal wired into the focused-thread flow. | Helper, modal, weaver-panel trigger, unit tests. |
| **BR2 — Documentation update** | Standard | Reconcile plan context and complete the documentation workflow. | Area guide, manifest, validation, archival. |

**Sequencing:** BR1 → BR2. BR2 is the final stage of the plan.

#### BR2 — Documentation update (next up)

This is the final stage of the plan.

> **Handoff facts** — BR1 shipped `beatReorder.ts`, `LoomBeatReorderDialog.tsx`, its four-case unit suite,
> the `LoomWeaverPanel.onReorderBeats(threadId)` callback, page state/render wiring, and token-based list
> styles. `beatReorderTarget(beats, fromIndex, toIndex)` returns `{ nodeId, position } | null`; the dialog
> props are `{ thread, nodes, onReordered, onError, onClose }`. `npm run test` passed 86 files / 990 tests
> (6 skipped); `npm run build` and both documentation checks passed. Interactive browser drag verification
> remains manual because browser automation was not requested.

- **Read first:** `CLAUDE.md`, `docs/README.md`, `docs/areas/loom.md`, this plan, `docs/PLAN_TEMPLATE.md`,
  `docs/TESTING.md`, `scripts/check_docs.py`, and no additional canonical reference (BR1 changed only the
  Loom area guide and manifest; its frontend contract has no API or schema impact).
- **Build:** Reconcile this plan's Key facts, reusable pieces, and shipped row with what shipped. Confirm the
  `docs/areas/loom.md` Source map/invariant edits from BR1 are complete and accurate, update area-guide and
  manifest routing, and prepare the plan archive.
- **Inherits:** BR1's `beatReorder.ts` helper, `LoomBeatReorderDialog.tsx`, focused-thread trigger/page wiring,
  and completed `docs/areas/loom.md` and `docs/README.md` routing edits; this stage verifies and closes them.
- **Expected touch set:** this plan, `docs/areas/loom.md`, `docs/README.md`, and the archive location
  (`docs/complete/loom-beat-reorder.md`).
- **Documentation impact:** `docs/areas/loom.md`, `docs/README.md`, and this plan; no
  `API_REFERENCE.md`, `DATA_MODEL.md`, or `TESTING.md` update is needed because BR1 added no backend/schema
  contract and the existing frontend-suite command already discovers its colocated test.
- **Tests:** run `.venv\Scripts\python.exe scripts/check_docs.py --check` (and
  `.venv\Scripts\python.exe scripts/check_docs.py --check --base <base-ref>` when a valid base ref is
  available).
- **Gate:** a fresh reader can route from `CLAUDE.md` → `docs/README.md` → `docs/areas/loom.md` → this plan
  without rediscovering essential facts; documentation checks pass.
- **Discovery consolidation:** promote any remaining durable facts to `docs/areas/loom.md` before archival; no
  unprocessed discovery remains only in a shipped-stage block or commit.
- **Completion edit:** collapse this stage, mark the outcome complete, archive the plan under
  `docs/complete/loom-beat-reorder.md`, reset `docs/areas/loom.md` **Active plan** to `None`, and update the
  manifest in the same change set.

---

## Shipped stages

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **BR1 — Beat reorder modal** | Added the focused-thread pointer-drag modal, pure reorder-position helper, UI wiring, token styles, and four helper tests. Automated gate: 86 frontend test files / 990 tests passed, production build and documentation checks passed; interactive browser verification remains manual. |

---

## Cross-references

- `docs/areas/loom.md` — durable Loom routing and active-plan pointer.
- `docs/API_REFERENCE.md` — the reorder endpoint this feature drives (unchanged by this plan).
- `docs/DESIGN_SYSTEM.md` — Dialog/Button primitives and token/accessibility floor.
- `docs/TESTING.md` — frontend gate requirements.

---

## Next:

**BR2 — Documentation update** is next and unblocked; it closes and archives the plan after reconciling BR1's documentation impact.
