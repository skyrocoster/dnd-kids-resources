WORK ORDER 01 — Backend endpoint: incoming gateways for a dungeon
GOAL: `GET /api/dungeons/{dungeon_id}/incoming-gateways` returns every portal, in every *other*
dungeon's layout, whose `to.dungeon_id` equals `dungeon_id` — so a dungeon's editor can show
"The Castle links here, at square 2,9" without the frontend fetching every other dungeon's full
layout itself.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Layouts are opaque JSON blobs: table `map_layout(dungeon_id INTEGER PRIMARY KEY, data TEXT)`,
  one row per dungeon, read today by `backend/app/routers/layouts.py::get_dungeon_layout`
  (`SELECT data FROM map_layout WHERE dungeon_id = ?`, then `parse_json_value`).
- The JSON blob's shape is `MapLayout` (frontend type in
  `frontend/src/features/dungeons/maplab/maplabModel.ts`): a `portals` array of objects shaped
  `{ portal_id, cell: [x, y], z, title?, to? }`. `to` is currently `{ z, cell }`; a later,
  already-shipped order adds an optional `dungeon_id` to `to` — so filter on `to.get("dungeon_id")`
  defensively (it may be absent on older/unrelated portals).
- `dungeons` table has columns `id, title, data` (see `backend/app/routers/dungeons.py`,
  `list_dungeons`/`get_dungeon`). Title is what the resolve list will display, e.g.
  "The Castle links here, at square 2,9".
- `backend/app/db.py` exposes `get_db()` (context-managed connection) and `parse_json_value`.
- `backend/app/schemas.py` has no schema for a portal or layout — layouts are untyped `Dict[str, Any]`
  (see `MapLayoutBlob` at schemas.py:637). Follow that precedent: define a small typed response
  model for this endpoint rather than reusing `Dict[str, Any]`.
- Existing router file naming: dungeon-related endpoints live in `dungeons.py` (CRUD) and
  `layouts.py` (layout blob). This endpoint is about layouts across dungeons scoped by dungeon id —
  add it to `layouts.py` alongside `get_dungeon_layout`/`save_dungeon_layout`, same router
  (`prefix="/api"`).
- `backend/tests/routers/test_layouts.py` is the existing test file for this router; it currently
  has 14 passing tests together with `test_session_state.py` — verified via
  `../.venv/Scripts/python.exe -m pytest tests/routers/test_layouts.py tests/routers/test_session_state.py -q --no-cov`.
- Unrelated to this order: several other test files in the repo currently fail/error on an
  unrelated, pre-existing issue (spells/weapons schema drift). Do not investigate or fix those —
  they are out of scope.

START IN:
- backend/app/routers/layouts.py
- backend/app/schemas.py (add the response model near `MapLayoutBlob`)
- backend/tests/routers/test_layouts.py

DO:
- Add a Pydantic response model for one incoming-gateway row: source dungeon id, source dungeon
  title, the source portal's id, title (may be absent), floor (`z`), and cell (`[x, y]`).
- Add `GET /dungeons/{dungeon_id}/incoming-gateways` returning `List[<that model>]`: query all
  `map_layout` rows except the one for `dungeon_id`, joined (in Python, after parsing JSON — no
  need for SQL JSON functions) against `dungeons.title` for each row's `dungeon_id`; parse each
  row's `data`, iterate its `portals`, and keep the ones whose `to.dungeon_id == dungeon_id`. 404 if
  `dungeon_id` itself does not exist in `dungeons` (mirror the existing 404 pattern in
  `get_dungeon_layout`).
- Add tests: two dungeons, a portal in dungeon A with `to: {dungeon_id: B}`, assert dungeon B's
  incoming-gateways list contains it with A's title; assert a dungeon with none returns `[]`;
  assert 404 for a nonexistent dungeon id.

STOP WHEN: `../.venv/Scripts/python.exe -m pytest tests/routers/test_layouts.py -q --no-cov` (run
from `backend/`) passes, including the new tests. Then stop — do not touch the frontend or any
other router.

STATUS: <-- DONE / FAILED - why
