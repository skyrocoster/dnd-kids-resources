WORK ORDER 02 — Knowledge-aware Curtain
GOAL: the player-view transform reveals each passage fact independently and omits undiscovered hidden objects without leaking DM-only fields
DEPENDS ON: 01
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Order 01 exports MapKnowledge from frontend/src/api/types.ts. The approved document is kind-qualified: optional doors, stairs, props, portals, and roomEntries maps keyed by stringified stable ids; each object has optional exists, lock, and trap keys whose only stored value is true, and absence means unknown.
- Field-to-fact mapping is hidden -> exists, locked -> lock, and trapped -> trap. A hidden object with unknown exists is absent from its result array; a non-hidden object remains present without exists knowledge. Each known field carries its current boolean value, including false, while unknown fields are omitted.
- Use effectivePassageState(flags, session) from frontend/src/model/maplabModel.ts for current lock/trap values. Its existing signature accepts PassageFlags plus optional PassageSessionState; session is grouped by doors, stairs, and portals, while props have no live override map.
- Keep the knowledge/session input optional: callers without it mean no facts known and authored-default passage state. This preserves the current playerViewTransform(layout) call while order 03 wires live polling and gives the later DM preview the same transform seam.
- Encounter props remain excluded regardless of knowledge. breakDc, pickDc, hiddenDc, searchDc, note, encounter_id, and npc_id remain never-visible; features remain absent; rooms including titles and descriptions remain always-present until Fog.
- Kid-map UX that applies: the kid map is read-only; disclosed cues add no focus targets; room titles and descriptions remain unchanged; poll failures retain the last good player-view result and retry silently.
- The repo's minimal-plus-cast idiom is createEmptyMapLayout(title) as unknown as Record<string, unknown> in frontend/src/player/__tests__/usePlayerMapData.test.ts line 9; keep test objects minimal and use an explicit cast boundary rather than inventing fields.

START IN:
- frontend/src/player/curtain.ts — the visibility declarations, derived kid types, pick helper, and playerViewTransform
- frontend/src/player/__tests__/curtain.test.ts — describe('curtain (player-view transform)') where the disclosure tests join

DO:
- Extend playerViewTransform in frontend/src/player/curtain.ts at 'export function playerViewTransform' with an optional MapKnowledge plus grouped passage-session input, filtering unknown authored-hidden objects and resolving each whenKnown field from its corresponding fact.
- Keep pickAlways's never-field guarantee while making known hidden/locked/trapped values optional in KidMapLayout at 'type KidField'.
- Replace the no-knowledge-only case in frontend/src/player/__tests__/curtain.test.ts at describe('curtain (player-view transform)') with focused cases proving kind-qualified existence filtering, independent current lock/trap disclosure across passage kinds, no mechanics/notes leakage, and input immutability.

STOP WHEN: `python scripts/order_check.py --tests src/player/__tests__/curtain.test.ts --typecheck` passes. Then stop — change nothing else.

STATUS: <-- executor writes DONE, FAILED - <reason>, or BLOCKED - <reason>

DEVIATIONS: <-- executor appends, always — exactly two lines
- opened beyond START IN: <files or sections outside the named path/symbol/range, or "none">
- KNOWN STATE re-verified or wrong: <one line, or "none">
