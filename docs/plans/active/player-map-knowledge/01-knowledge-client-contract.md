WORK ORDER 01 — Knowledge client contract
GOAL: the frontend has a typed read client for the sparse per-dungeon map knowledge document
DEPENDS ON: none
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- The approved sparse MapKnowledge shape has optional doors, stairs, props, portals, and roomEntries maps keyed by stable object identity; each object maps to optional exists, lock, and trap keys whose only stored value is true, and absence means unknown.
- The backend GET /api/dungeons/{dungeon_id}/knowledge returns MapKnowledgeBlob as { data: <knowledge document> } and returns 404 when no row exists.
- frontend/src/api/client.ts already passes AbortSignal to getDungeonLayout and getDungeonSessionState; getDungeonKnowledge follows that same GET helper pattern.
- The existing API client suite uses mockFetchOnce, then asserts the /api-prefixed path and request options.
- The repo's minimal-plus-cast idiom is createEmptyMapLayout(title) as unknown as Record<string, unknown> in frontend/src/player/__tests__/usePlayerMapData.test.ts line 9; use the same cast boundary rather than inventing extra domain fields.

START IN:
- frontend/src/api/types.ts — MapLayoutBlob and MapSessionStateBlob contract neighborhood: lines 568-591 @"export interface Dungeon {"
- frontend/src/api/client.ts — type imports and Map Lab GET clients: lines 1-35 @"import type {"
- frontend/src/api/client.ts — Map Lab layout and session-state clients: lines 168-189 @"// Dungeons"
- frontend/src/api/__tests__/client.test.ts — the api client describe block where the new GET assertion joins

DO:
- Add the approved MapKnowledge and MapKnowledgeBlob contracts beside MapLayoutBlob in frontend/src/api/types.ts at 'export interface MapLayoutBlob'.
- Add getDungeonKnowledge beside getDungeonLayout in frontend/src/api/client.ts at '// Map Lab layout', accepting an optional AbortSignal and returning MapKnowledgeBlob.
- Extend frontend/src/api/__tests__/client.test.ts at describe('api client') with one GET contract assertion for the knowledge endpoint and signal forwarding.

STOP WHEN: `python scripts/order_check.py --tests src/api/__tests__/client.test.ts --typecheck` passes. Then stop — change nothing else.

STATUS: <-- executor writes DONE, FAILED - <reason>, or BLOCKED - <reason>

DEVIATIONS: <-- executor appends, always — exactly two lines
- opened beyond START IN: <files or sections outside the named path/symbol/range, or "none">
- KNOWN STATE re-verified or wrong: <one line, or "none">
