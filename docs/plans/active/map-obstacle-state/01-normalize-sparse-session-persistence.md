WORK ORDER 01 — Normalize sparse session persistence
GOAL: session-state PUTs retain only valid sparse runtime leaves, preserve explicit false and partyRoomId, and delete empty rows
DEPENDS ON: none
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- The current PUT in backend/app/routers/session_state.py stores blob.data verbatim; GET returns 404 when no row exists and DELETE is already idempotent.
- The valid runtime shape is doors/stairs/props/portals keyed by fixture ID plus partyRoomId; fixture entries may contain only open and obstacle armed/shown leaves. DCs, geometry, identity, descriptive fields, and unknown keys are invalid.
- Explicit false is an intentional override and must survive normalization. Empty obstacle parents, fixture entries, kind maps, and a final state with no fixture overrides and no non-null partyRoomId are removed; an empty PUT returns the normalized empty data but leaves subsequent GET at 404.

START IN:
- backend/app/routers/session_state.py — save normalization and empty-row persistence
- backend/tests/routers/test_session_state.py — append normalization cases beside PUT round-trip tests

DO:
- Add a reusable session-state normalizer in backend/app/routers/session_state.py at save_dungeon_session_state that handles all four fixture kinds, strips invalid/DC leaves, preserves false and partyRoomId, and prunes empty parents.
- Make save_dungeon_session_state upsert normalized non-empty data or delete the row for normalized empty data, returning the normalized payload in either case.
- Extend backend/tests/routers/test_session_state.py at test_save_and_get_dungeon_session_state with four-kind false-preservation, invalid/DC pruning, and empty-row deletion coverage.

STOP WHEN: `python scripts/order_check.py --pytest backend/tests/routers/test_session_state.py` passes. Then stop — change nothing else.

STATUS: <-- executor writes DONE, FAILED - <reason>, or BLOCKED - <reason>

DEVIATIONS: <-- executor appends, always — exactly two lines
- opened beyond START IN: <files or sections outside the named path/symbol/range, or "none">
- KNOWN STATE re-verified or wrong: <one line, or "none">
