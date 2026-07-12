# Phase E Recovery Plan — restore Map Lab zoom/unified-data after a commit accident

**Audience:** an executor (Sonnet) running one stage per context. This doc is **self-contained** — read
the "Shared context" section first every stage, then do exactly one stage. Do not skip ahead or combine
stages. Each stage ends with a **🚦 live gate**: stop and get explicit user sign-off before the next stage.

This complements `docs/dungeon_plan.md` (the authoritative feature plan). Where this doc references
"Stage E1/E2/E3", the matching spec lives under that doc's **"Design Phase E"** section — obey it; this
doc adds the recovery-specific facts it doesn't have.

---

## Why this exists (what happened)

Commits on `main` were reset and uncommitted work was lost. Most was recovered into the working tree, but
it's **inconsistent and no longer builds**. The loss is localized to **Phase E (Map Lab zoom + unified
data)** — the user was mid-flight on "Map zoom & improvements" when commits broke. This plan restores a
coherent, fully-building state and finishes E1→E2→E3.

## Verified state (checked 2026-07-12 — do not re-litigate)

**Intact — do NOT touch, no work needed:**
- **Backend is 100% real:** `map_layout` table (`scripts/init_database.py`), `MapLayoutBlob`
  (`backend/app/schemas.py`), `active_index` on encounter, real GET/PUT upsert router
  (`backend/app/routers/layouts.py`, prefix `/api`, wired in `main.py`), real `test_layouts.py`, conftest
  built from the real schema. `pytest` collects 110 tests, zero import errors. **Frontend-only work below.**
- **Frontend features intact:** dungeons, encounters, NPCs, Map Lab *viewer*, spells/weapons/monsters/
  players/quests. **`npm run test` (vitest): 370 passed / 19 skipped / 0 failed.**

**Broken — the real mess.** The project's "tsc clean" gate is a **FALSE GREEN**: root
`frontend/tsconfig.json` has `"files": []`, so `tsc --noEmit` checks *nothing*. The real typecheck is
`tsc -b` (what `npm run build` runs). It currently **fails** (~40 errors) in three groups:

### Group A — the lost Phase E code (actual data loss)
Three files are still Stage-0 `throw new Error('not implemented')` stubs:
- `useMapCanvasZoom.ts` — returns `{ zoom, zoomIn, zoomOut, reset, fitToBounds, handleWheel,
  handlePointerDown, MIN_SCALE, MAX_SCALE, BASE_PX_PER_UNIT }`; every callback throws.
  `MIN_SCALE=0.25`, `MAX_SCALE=3`, `BASE_PX_PER_UNIT=64`.
- `MapCanvas.tsx` — placeholder accepting only `{ viewBox, bounds, children, controlsSlot }`; static
  `<svg preserveAspectRatio="xMidYMid meet">`.
- `useMapLabLayout.ts` — effect body just `throw new Error('not implemented')` inside try/catch; imports
  `getDungeonLayout` and `mapLabLayout` but uses neither.

But the recovered (uncommitted) **`MapLabEditorPage.tsx` is a later E2-era consumer** that references a
finished zoom API these stubs no longer provide. Exact expectations (from `MapLabEditorPage.tsx`):
- imports `type ViewportSize` from `./useMapCanvasZoom` (no such export)
- `const zoomApi = useMapCanvasZoom()`, then uses `zoomApi.handleWheel`, `zoomApi.handlePointerDown`,
  `zoomApi.handlePointerMove`, `zoomApi.handlePointerUp`, `zoomApi.zoomIn`,
  `zoomApi.fitToBounds(bounds, viewportSize)` **(two args)**
- renders `<MapCanvas viewBox bounds zoom ariaLabel onWheelZoom={zoomApi.handleWheel}
  onPanStart={zoomApi.handlePointerDown} onPanMove={zoomApi.handlePointerMove} onPanEnd=…
  onViewportResize=… controlsSlot=… >…</MapCanvas>`
Also `maplabModel.ts` has **no `Bounds` type export** (only functions `layoutBounds`/`paddedBounds`
returning `{ minX, maxX, minY, maxY }`), yet `MapCanvas.tsx` and `useMapCanvasZoom.ts` do
`import type { Bounds } from './maplabModel'`.

→ **Rebuild E1/E2 to the API the editor already consumes** (Stages E1 + E2 below).

### Group B — pre-existing latent errors in *committed* shipped files
Predate the accident (from the "dungeons v1 complete" / "Stage 1" commits); never caught due to the
false-green gate. **vitest is green on these files — fix TYPES ONLY, do not change runtime behavior:**
- `dungeonModel.ts`: `TS2322` unknown[]→DungeonRoom[] (~234); `TS18046 'entry'/'e' unknown` (299, 319–321);
  `TS2345 unknown→DungeonEntry/number` (303, 352); dead `resolveLeadsTo` (`TS6133`, 328).
- `dungeonForm.ts`: `TS2339 .join` on `number | number[]` (81); unused `DungeonData` import (2).
- `DungeonViewPage.tsx`: `TS2365`/`TS2322` `{}` vs number/ReactNode (497–499); `room` possibly undefined
  `TS18048`/`TS2345` (540–554).

### Group C — minor test-file errors
Unused imports (`dungeonModel.test.ts` line 2 + expr at 502 expects 0 args; `DungeonViewPage.test.tsx`
263; `useMapCanvasZoom.test.ts` 1–3); `readonly [5,3]`→`MapCell` in `maplabModel.test.ts` (267/271/275);
`Object is of type 'unknown'` in `MapLabEditorPage.test.tsx` (205).

**Decisions locked in by the user:** fix Group B/C too (real green build), and run **stage-by-stage with
live 🚦 gates**.

## The 19 skipped tests (to be un-skipped by stage)
- `__tests__/MapLabPage.test.tsx` — 2 skips (viewer reads backend layout / 404 fallback) → **E1**
- `__tests__/useMapCanvasZoom.test.ts` — 6 skips (all zoom math) → **E2**
- `__tests__/MapLabEditorPage.test.tsx` — 11 skips (zoom/pan + regrouped toolbar/rails) → **E2 + E3**

---

## Guardrails (every stage)
- **`npm run test` (vitest) must stay green** (baseline 370 pass). Re-run after every change.
- The **real** typecheck is `tsc -b`, **not** `tsc --noEmit`. After R0, use `npm run typecheck`.
- Frontend-only. `pytest` (from repo root) must stay green and untouched — do not touch `backend/`,
  `data/seeds/`, the DB, or the live dungeon pages except as listed.
- Consume `frontend/src/theme.css` tokens + existing `maplabModel.ts` selectors. Never hand-pick colors
  or rebuild geometry. Zoom icons already exist: `ZoomInIcon`/`ZoomOutIcon`/`FitIcon` in
  `frontend/src/components/icons/index.ts`.
- Reuse (do NOT rebuild): `getDungeonLayout`/`saveDungeonLayout`/`MAP_LAB_DUNGEON_ID` (`api/client.ts`);
  the 404→fixture fallback rule already in `useMapLabEditor.ts`; `mapLabLayout` (`maplabData.ts`).

---

## Stage R0 — Checkpoint + kill the false-green + clear latent build errors
**Goal:** a genuinely green `npm run build`, leaving *only* Group A (Phase E) errors for E1/E2. No 🚦
(no visual surface) — sign off on green tests + typecheck.

1. **Safety checkpoint first.** On `main`; create a recovery branch and commit the current recovered
   working tree so nothing recovered is lost again:
   `git switch -c recover/phase-e && git add -A && git commit -m "checkpoint: recovered Phase D + E scaffold (pre-recovery)"`.
2. **Make the typecheck real.** Add `"typecheck": "tsc -b"` to `frontend/package.json` scripts. Update the
   verification wording in `docs/dungeon_plan.md` and `docs/TESTING.md` to use `npm run typecheck` /
   `npm run build` as the gate (not `tsc --noEmit`) and note the false-green cause so it can't recur.
3. **Fix Group B** (type-only; keep vitest green): `dungeonModel.ts`, `dungeonForm.ts`,
   `DungeonViewPage.tsx` at the lines listed above — narrow `unknown` with the existing parse
   helpers/guards, guard possibly-undefined `room`, guard `number | number[]` before `.join`, remove dead
   `resolveLeadsTo`.
4. **Fix Group C** (test files): remove unused imports; cast the `readonly` tuples to mutable `MapCell`;
   fix the `unknown` cast; fix the 0-arg call site.

**Verify:** `npm run test` green; `npm run typecheck` shows **only** the Phase-E (Group A) errors left;
`pytest` green. **Commit.**

## Stage E1 — Viewer reads the shared backend layout (see dungeon_plan.md "Stage E1")
1. Implement `frontend/src/features/dungeons/maplab/useMapLabLayout.ts`: on mount call
   `getDungeonLayout(dungeonId)` → `blob.data as MapLayout`; **404 → seed from `mapLabLayout`** imported
   from `maplabData.ts`; other errors → `error`. Return `{ layout, loading, error }`. Mirror the exact
   load/fallback already in `useMapLabEditor.ts` (single source of the 404 rule).
2. Rewire `MapLabPage.tsx` to consume `useMapLabLayout(MAP_LAB_DUNGEON_ID)` instead of importing
   `mapLabLayout` directly; derive `floors`/`rooms`/`doors`/`stairs`/`bounds` from the loaded layout; keep
   session toggles local (`useState`); handle `loading`. Tolerate `layout.floors` not matching the room
   `z` set (the editor never edits `floors`).
3. **Tests:** replace the 2 `it.skip` in `__tests__/MapLabPage.test.tsx` — mocked `getDungeonLayout`
   returning a layout with an extra door → door renders; 404 mock → fixture rooms render.

**Verify:** `npm run test` green (E1 tests active). Note: `tsc -b` still shows the E2 zoom errors in
`MapLabEditorPage.tsx` — expected; cleared in E2.
**🚦 Gate:** run `scripts/start_server.ps1`; in the editor (`/dungeons/map-lab/edit`) add a door + a room
(autosaves "Saved") → open `/dungeons/map-lab` → the new door/room appear. **Commit after sign-off.**

## Stage E2 — Canvas zoom & pan, both pages (see dungeon_plan.md "Stage E2")
Rebuild the destroyed code to the API `MapLabEditorPage.tsx` already consumes (see Group A above).
1. **Add a `Bounds` type export** to `maplabModel.ts`: `export type Bounds = { minX: number; maxX: number;
   minY: number; maxY: number }` and use it as the return type of `layoutBounds`/`paddedBounds`.
2. Implement `useMapCanvasZoom.ts`: export `interface ViewportSize { width: number; height: number }`;
   real `zoomIn`/`zoomOut`/`reset`/`fitToBounds(bounds, viewportSize)`; `handleWheel` (Ctrl/⌘+wheel, zoom
   toward cursor); `handlePointerDown`/`handlePointerMove`/`handlePointerUp` (drag-pan; pointer events;
   `touch-action:none`; don't begin a pan on room/door/paint-cell hits). Clamp to `MIN_SCALE`/`MAX_SCALE`;
   honor `prefers-reduced-motion`. Keep the returned constant names stable.
3. Rework `MapCanvas.tsx` to accept `{ viewBox, bounds, zoom, onWheelZoom, onPanStart, onPanMove, onPanEnd,
   onViewportResize, ariaLabel, controlsSlot, children }`; give the `<svg>` **explicit px `width`/`height`
   = viewBoxUnits × (BASE_PX_PER_UNIT × zoom.scale)** inside the `overflow:auto` `.maplab-canvas-viewport`;
   report size via `onViewportResize` (ResizeObserver). Use `import type { ReactNode }` (verbatimModuleSyntax).
4. **Remove** `.maplab-svg { width:100%; height:auto }` (`MapLabPage.css`) — move sizing onto explicit
   width/height. Adopt `MapCanvas` in **both** `MapLabPage.tsx` and `MapLabEditorPage.tsx`; keep
   paint/placement overlays and hit-testing aligned under zoom/pan; keep the viewer scale ruler consistent.
5. **Tests:** replace the 6 `it.skip` in `__tests__/useMapCanvasZoom.test.ts` (clamp + fit-to-bounds math)
   and the zoom-related skips in `__tests__/MapLabEditorPage.test.tsx` (SVG gets explicit px width/height
   that changes with zoom, not `width:100%`).

**Verify:** `npm run typecheck` now **fully green** (Group A cleared); `npm run test` green.
**🚦 Gate:** on a large floor, zoom in → cells grow and the viewport scrolls (map does *not* shrink);
Reset fits the floor; drag pans; Ctrl+wheel zooms; both pages; Surface-Pro touch. **Commit after sign-off.**

## Stage E3 — Front-end design pass (see dungeon_plan.md "Stage E3")
**Invoke the `frontend-design` skill before writing UI.** Reorganize using `theme.css` tokens + the MD3
type scale (no ad-hoc px/hex).
- Editor toolbar → labelled clusters (`.maplab-toolbar-group`): *Create* (Add room, Place door), *Canvas*
  (zoom +/−/Reset), *Session* (Reset to fixture), right-aligned save-status.
- Left nav rail (`.maplab-editor-nav-rail`): floor tabs + room list as one column.
- Right inspector rail (`.maplab-inspector-rail`): **persistent** with a resting placeholder; selecting a
  **room** (not only a door) populates it (title/meta + delete).
- Viewer: same grouping language; move the stray "Reset session state" out of the floor-tab row into a
  grouped controls cluster; dock zoom controls consistently. Consolidate pill styling
  (`.maplab-editor-toolbar-button` / `.maplab-floor-tab` / `.maplab-session-*-button` / `.maplab-zoom-button`)
  onto one system.
- **Tests:** replace the remaining `it.skip` in `__tests__/MapLabEditorPage.test.tsx` (toolbar groups
  present; room selection opens the inspector rail; controls reachable).

**🚦 Gate:** live design review at both routes — grouped, uncluttered, tokens-only, no console errors;
`npm run test` + `npm run typecheck` green; `pytest` unaffected. **Commit after sign-off.**

## Stage R-final — Reconcile & document
- Update `docs/dungeon_plan.md`: mark E1–E3 shipped (status block + "Shipped stages" table); record the
  false-green-tsc finding and the new `typecheck` gate.
- Merge `recover/phase-e` back into `main` when the user is satisfied.

---

## Full-run verification
`cd frontend && npm run build` succeeds (real `tsc -b` + vite build); `npm run test` + `pytest` (repo
root) green; both Map Lab routes render with no console errors; editor edits appear in the viewer; zoom/pan
works on both pages; design is grouped/tokens-only. `git status` shows `backend/`, `data/seeds/`, and the
live dungeon pages untouched by Phase E work.
