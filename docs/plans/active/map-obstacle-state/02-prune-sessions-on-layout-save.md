WORK ORDER 02 — Prune sessions on layout save
GOAL: every backend layout save removes only session overrides invalidated by fixture deletion, geometry changes, or authored state-leaf changes
DEPENDS ON: 01
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- backend/app/routers/layouts.py currently upserts the incoming layout verbatim and never reads map_session_state.
- Compare the previously stored layout to the incoming layout by kind and ID for doors, stairs, props, and portals. Deleted fixtures and geometry changes remove the complete fixture override; authored open/obstacle armed/shown changes remove only matching leaves; title, note, loot, NPC, encounter, kind and other descriptive changes preserve overrides.
- Geometry identity is door cell/side/z, stair from/to endpoints, prop cell/z, and portal cell/z/to. After pruning, remove empty fixture entries, kind maps, and the session row when no fixture overrides and no non-null partyRoomId remain.

START IN:
- backend/app/routers/layouts.py — save_dungeon_layout transaction
- backend/app/routers/session_state.py — reuse the order-01 normalizer
- backend/tests/routers/test_layouts.py — append layout-save pruning tests beside save upsert

DO:
- In backend/app/routers/layouts.py at save_dungeon_layout, load the prior layout and session row inside the save transaction and prune all four fixture-kind overrides by the settled deletion, geometry, authored-leaf, and descriptive-content rules.
- Reuse the normalizer from backend/app/routers/session_state.py to compact the pruned state and delete an empty session row while retaining partyRoomId.
- Extend backend/tests/routers/test_layouts.py at test_save_dungeon_layout_upserts_on_second_call with parameterized four-kind deletion/geometry coverage plus leaf-only invalidation, descriptive preservation, partyRoomId retention, and empty-row cleanup.

STOP WHEN: `python scripts/order_check.py --pytest backend/tests/routers/test_layouts.py` passes. Then stop — change nothing else.

STATUS: <-- executor writes DONE, FAILED - <reason>, or BLOCKED - <reason>

DEVIATIONS: <-- executor appends, always — exactly two lines
- opened beyond START IN: <files or sections outside the named path/symbol/range, or "none">
- KNOWN STATE re-verified or wrong: <one line, or "none">
