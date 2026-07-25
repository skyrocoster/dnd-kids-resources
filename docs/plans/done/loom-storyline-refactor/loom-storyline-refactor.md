# Loom Storyline Refactor — From Flat DAG to Ordered Threads

> **Status:** Complete.

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **PA0** | Schema rewrite (new kind CHECK, position, provenance, origin_node_id; dropped loom_edges), promoted v2 seed fixture (3 threads, 15 nodes, 15 memberships), idempotent migration script with backup+report, updated export/seed/conftest wiring. Suite compiles, migrator 13 tests pass. Gate ✅. |
| **PA1** | Rewrote `loom.py`/`schemas.py` for Thread CRUD with auto Start/End, beat/session node CRUD, and ordered-membership endpoints; deleted edge/bridge endpoints and acyclicity code. Rewrote `test_loom.py` (35 tests); API_REFERENCE reconciled. Full backend suite green, 91% coverage. Gate ✅. |
| **PA2** | Added `POST /loom/nodes/{id}/fulfil`, `POST /loom/nodes/{id}/bank`, restore via items insert, `origin_node_id` session-kind spawn check, and fulfil-undo `PUT` transition. 13 new tests (48 total); API_REFERENCE reconciled. Full backend suite green, 91% coverage. Gate ✅. |
| **PB0** | New loom TS types; removed edge/bridge types. Client methods for PA1/PA2 endpoints. Rewrote `loomGraph.ts`, `loomFlow.ts`, `LoomPage.tsx`, `LoomWeaverPanel.tsx`, `LoomNodeEditor.tsx`. Added `it.skip` seams. 85 files, 969 tests (12 skipped). Gate ✅. |
| **PB2** | Beat Bank restore controls; fulfil, bank, restore, replace-at-position, spawn-thread, change-ending, and fulfil-undo commands wired. Removed `LoomBridgeDialog.tsx`. Frontend suite: 977 passed, 6 skipped; typecheck/build ✅. |
| **PC0** | Removed dead DAG CSS, deprecated `vaultNodes` alias, old theme tokens. Replaced with kind-based node styling. Added invariant + migration tests. Grep gate clean. Frontend: 976 passed, 6 skipped; typecheck/build/lint ✅. Backend: 348 passed, 91% coverage ✅. |
| **PD0** | Documentation reconciled and archived: area guide rewritten for ordered-thread model, manifest routing updated, DESIGN_SYSTEM.md props reference refreshed, plan archived. Documentation checks pass. |

---

## What this plan did

Transformed the Loom from a flat directed-acyclic **tapestry** (nodes connected by user-drawn `loom_edges`,
narrative order inferred from edge direction) into a lightweight **storyline planner and session recorder**: each
**Thread** is one linear, explicitly-ordered path (`Start → … → End`), planned **Story Beats** are kept soft
and mutable, recorded **Session Nodes** are kept durable and shareable, and the generic node-and-edge graph is
retired. The guiding philosophy: **future planning is flexible; historical play is durable.**

---

## Domain model (as shipped)

**`loom_threads`**: `id, name UNIQUE, color DEFAULT 'thread-1', description, origin_node_id INTEGER NULL
REFERENCES loom_nodes(id) ON DELETE SET NULL, timestamps`.

**`loom_nodes`**: `id, kind CHECK IN ('start','end','beat','session'), title, body, session_tag, x, y,
fulfilled_planned_title TEXT NULL, fulfilled_at DATETIME NULL, banked_from_thread_id INTEGER NULL REFERENCES
loom_threads(id) ON DELETE SET NULL, timestamps`.

**`loom_node_threads`**: `id, node_id, thread_id, position INTEGER NOT NULL, UNIQUE(node_id,thread_id)`,
both FKs `ON DELETE CASCADE`.

```text
loom_threads 1───* loom_node_threads *───1 loom_nodes
     │ origin_node_id (NULL|→ a 'session' node)         kind ∈ {start,end,beat,session}
     │                          position (per membership)
     └── exactly one 'start' member + one 'end' member per thread (API invariant)
```

---

## Ordering model

- Integer `position` on `loom_node_threads`, sorted ascending. Start pinned to front (min position), End
  pinned to back (max position). O(n) renumber on every structural write.
- Canvas `x,y` are presentation-only fallback coordinates; never read for order.

---

## State transitions (allowed)

| Transition | User action | Data change |
|---|---|---|
| Beat → Session | "Fulfil beat" | `kind='session'`, stamp provenance; memberships untouched |
| Placed beat → Banked | "Bank beat" | Delete membership; set `banked_from_thread_id` |
| Banked beat → Placed | "Restore beat" | Insert membership; clear `banked_from_thread_id` |
| Session → origin of Thread | "Spawn thread" | `POST /loom/threads` with `origin_node_id` |
| Session on multiple Threads | "Add to thread" | Independent membership per thread |
| Thread created | "Create thread" | Auto `start` (pos 0) + `end` (pos 10) |
| Thread deleted | "Delete thread" | Cascade exclusive `start`/`end`/`beat`; shared `session` survives |

---

## Backend API (final shape)

`backend/app/routers/loom.py` + `backend/app/schemas.py`. Full shapes in `docs/API_REFERENCE.md`.

- `GET /loom/tapestry` — all threads with ordered items + all node identities
- `GET/POST /loom/threads` — list/create (auto Start+End)
- `PUT/DELETE /loom/threads/{id}` — update/delete thread
- `POST /loom/nodes` — create beat/session (unplaced)
- `PUT/DELETE /loom/nodes/{id}` — update/delete node (422 on start/end delete)
- `PATCH /loom/nodes/{id}/position` — canvas drag (presentation only)
- `POST /loom/nodes/{id}/fulfil` — beat→session in place
- `POST /loom/nodes/{id}/bank` — unplace beat + record provenance
- `POST /loom/threads/{id}/items` — place node on thread / restore banked beat
- `PATCH/DELETE /loom/threads/{id}/items/{node_id}` — reorder / remove membership

---

## Verification

```bash
# Backend
.venv\Scripts\python.exe -m pytest

# Frontend
cd frontend && npm run test && npm run lint && npm run typecheck && npm run build

# Documentation
.venv\Scripts\python.exe scripts/check_docs.py --check
```

Backend: 348 tests, 91% coverage. Frontend: 976 passed, 6 skipped. Documentation checks pass.

---

## Known debt / deferred work

- Drop `loom_nodes.x,y` entirely (kept for optional free-canvas view; never read for order).
- `PATCH /loom/nodes/{id}/position` retention — remove if no canvas view ships.
- `loom_end_history` append-only table for prior endings.
- A `real_world_sessions` entity beyond `session_tag` free-text.
- Server-side undo log (client re-issue covers common cases).
- Node links to NPCs/dungeons/encounters (deferred until after playtesting).

## Cross-references

- Area guide: [The Loom](../../areas/loom.md).
- Canonical references: [DATA_MODEL.md](../../DATA_MODEL.md), [API_REFERENCE.md](../../API_REFERENCE.md).
- Source prompt: `scratch/ReworkLoom.md` (user-owned).
