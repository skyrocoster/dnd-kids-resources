WORK ORDER 03 — Poll knowledge into player map
GOAL: the kid map polls knowledge with layout and session state, feeds one complete frame through the Curtain, and retains the last good frame on knowledge failures
DEPENDS ON: 02
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Order 01 exports getDungeonKnowledge(dungeonId, signal) and MapKnowledge; order 02 accepts optional knowledge plus grouped doors/stairs/portals session maps in playerViewTransform.
- The existing poll order is at-the-table pointer, layout, then session. A 404 knowledge response means no saved row and therefore an empty knowledge document, not an empty map or load error. A non-404 knowledge failure is a frame failure: initial failure reports error, while later failure retains lastGoodFrame and retries silently.
- The session blob shape already used by the DM hook is { doors?, stairs?, portals?, partyRoomId? }, with each passage map keyed by id and values shaped as PassageSessionState. Preserve the existing rule that any session request failure falls back to empty maps and null partyRoomId.
- Pass the same parsed session doors map to playerOpenDoorIds and pass all three grouped maps to playerViewTransform; locked and trapped values may cross only through the knowledge-aware Curtain result, never directly from PlayerMapData.
- The exact async polling seam is the existing fake-timer idiom: renderHook, await act(async () => {}), then advance PLAYER_MAP_POLL_INTERVAL_MS inside act. Establish one ready frame before rejecting the next knowledge request when testing last-good-frame retention.
- Kid-map UX that applies: poll failures retain the last good player-view result and retry silently; the kid map remains read-only; disclosed cues add no focus targets; room titles/descriptions remain unchanged.
- The repo's minimal-plus-cast idiom is createEmptyMapLayout(title) as unknown as Record<string, unknown> in frontend/src/player/__tests__/usePlayerMapData.test.ts line 9; API response data should use the same explicit cast boundary rather than invented fields.

START IN:
- frontend/src/player/usePlayerMapData.ts — the poll function, session parsing, Curtain call, and lastGoodFrame failure path
- frontend/src/player/__tests__/usePlayerMapData.test.ts — vi.mock setup, beforeEach resets, successful transform test, and retained-last-frame polling test
- frontend/src/api/client.ts — getDungeonKnowledge emitted by order 01 beside the existing layout/session clients
- frontend/src/player/curtain.ts — the optional knowledge/session playerViewTransform seam emitted by order 02

DO:
- Fetch getDungeonKnowledge in frontend/src/player/usePlayerMapData.ts inside 'const poll = async () =>', treating only ApiError 404 as empty knowledge and passing other failures to the existing frame catch path.
- Parse doors, stairs, portals, and partyRoomId at 'const session = await getDungeonSessionState', then call playerViewTransform with normalized layout, knowledge, and all grouped session maps while preserving playerOpenDoorIds.
- Extend frontend/src/player/__tests__/usePlayerMapData.test.ts at describe('usePlayerMapData') to verify knowledge reaches the Curtain, missing knowledge is empty, current grouped sessions are forwarded, and a later knowledge failure retains the settled last frame.

STOP WHEN: `python scripts/order_check.py --tests src/player/__tests__/usePlayerMapData.test.ts --typecheck --lint` passes. Then stop — change nothing else.

STATUS: <-- executor writes DONE, FAILED - <reason>, or BLOCKED - <reason>

DEVIATIONS: <-- executor appends, always — exactly two lines
- opened beyond START IN: <files or sections outside the named path/symbol/range, or "none">
- KNOWN STATE re-verified or wrong: <one line, or "none">
