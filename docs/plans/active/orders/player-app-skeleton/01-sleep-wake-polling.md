WORK ORDER 01 — Fix map polling to survive device sleep/wake
GOAL: The kid map keeps polling after a tablet sleeps and wakes, without stale data or interval pile-up.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Polling lives in `usePlayerMapData()` at `frontend/src/player/usePlayerMapData.ts`.
- Current mechanism: `window.setInterval(() => void poll(), 5000)` in a `useEffect` on mount. Cleanup clears the interval and aborts in-flight requests.
- The hook has no awareness of `document.visibilityState` or `visibilitychange` / `pagehide` events.
- When a tablet sleeps, the browser may pause or batch `setInterval` firings. On wake it can fire many queued callbacks in a row (interval pile-up) or resume at the next scheduled tick (stale data for up to 5s after the device wakes).
- The poll function (`async poll()`) is closed over `cancelled`, `activeRequest`, and `lastGoodFrame`. It already handles cancellation correctly (checks `cancelled || request.signal.aborted` after each await).
- All 16 player/ tests pass (5 test files: importRule, curtain, PlayerShell, PlayerMapRenderer, usePlayerMapData).
- Suite overall: 1245 passed, 6 skipped, 1 failed (unrelated — `features/players/PlayerBrowserPage`).

START IN:
- frontend/src/player/usePlayerMapData.ts
- frontend/src/player/__tests__/usePlayerMapData.test.ts

DO:
- Add a `visibilitychange` listener inside the `useEffect` that triggers `poll()` immediately when `document.visibilityState === 'visible'`.
- Switch from `setInterval` to recursive `setTimeout` chaining so that a wake-triggered poll resets the timer cleanly, preventing interval pile-up. The first call still fires on mount.
- Add one test: simulate a visibility change and verify a fresh poll fires.

STOP WHEN: `npx vitest run src/player/__tests__/usePlayerMapData.test.ts` passes with the new test. Then stop — change nothing else.

STATUS: DONE
