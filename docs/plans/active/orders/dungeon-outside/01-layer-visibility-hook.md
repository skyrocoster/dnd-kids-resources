WORK ORDER 01 — Layer-visibility hook (shared)
GOAL: a reusable, localStorage-persisted hook that tracks which of four map layers — Outside,
Props, Passages, Labels — are visible, defaulting all four to visible.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `frontend/src/features/dungeons/maplab/MapLabPage.tsx` already has this exact pattern for a
  different concern (toolbar-tray collapse), at lines 89-120:
  - `TOOLBAR_TRAY_STORAGE_PREFIX = 'dnd-kids-maplab-tray-collapsed:'`
  - `readStoredTrayCollapsed(groupKey)` reads `window.localStorage.getItem(prefix + groupKey) === 'true'`, wrapped in try/catch returning `false` on failure.
  - `useToolbarTrayCollapse(groupKey)` — `useState` seeded from the reader, a `toggle` callback that flips state and writes to `localStorage` inside its own try/catch (private-mode/unavailable storage just doesn't persist).
- The four layer keys are exactly: `'outside' | 'props' | 'passages' | 'labels'`.
- This is the same file `MapLabPage.tsx` already imports `useCallback`, `useState` from React (line 1).
- Frontend suite is currently green: 89 test files, 1111 passed / 6 skipped (1117 total) via `npx vitest run` in `frontend/`.

START IN:
- frontend/src/features/dungeons/maplab/MapLabPage.tsx (lines 89-157 for the pattern to mirror; add the new hook near it, e.g. directly below `useToolbarTrayCollapse`)

DO:
- Add a `MapLayerKey` type: `'outside' | 'props' | 'passages' | 'labels'`.
- Add a storage prefix constant `LAYER_VISIBILITY_STORAGE_PREFIX = 'dnd-kids-maplab-layer-visible:'`.
- Add `useMapLayerVisibility()`: returns `{ visible: Record<MapLayerKey, boolean>, toggleLayer: (key: MapLayerKey) => void }`. Each key defaults to `true` when nothing is stored (missing key ≠ `'false'`, so treat absence as visible — this is the inverse default of the tray-collapse hook, which defaults to `false`/expanded-equivalent). Persist per-key under `LAYER_VISIBILITY_STORAGE_PREFIX + key`, same try/catch-and-ignore behavior as the existing hook.
- Export both the type and the hook so `MapLabEditorPage.tsx` can import and share the exact same visibility state shape (actual wiring happens in later orders — this order only adds the hook, no callers yet).
- Add a unit test file `frontend/src/features/dungeons/maplab/__tests__/useMapLayerVisibility.test.tsx` (or add cases to an existing hook test file if one already covers `useToolbarTrayCollapse` — check `__tests__/MapLabPage.test.tsx` and `__tests__/useMapLabEditor.test.tsx` first) covering: default-all-visible, toggle flips one key without affecting others, and persistence round-trip through a mocked/real `localStorage`.

STOP WHEN: `npx vitest run <the new or updated test file>` passes. Then stop — do not wire the hook into any page yet.

STATUS: DONE
