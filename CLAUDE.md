# CLAUDE.md — D&D Kids Resources

Guidance for AI assistants working in this repo. Read this first.

## Current stage: post-rebuild feature work

The v2 ground-up rebuild (Flask+vanilla-JS → **FastAPI + SQLite** backend, **React + Vite + TypeScript**
frontend) is **complete**. This project is an online D&D 5e resource site for kids, designed for **running
games** (live at the table) rather than exclusively pre-session prep.

**Feature work is organized as sequential design phases, each broken into self-contained stages.** The authoritative
source for the dungeon room-navigation feature is [`docs/dungeon_plan.md`](docs/dungeon_plan.md) (Stages 1–11,
Encounter/NPC, Map Lab Foundation/Authoring/Unified Data/Zoom, and Room Props are **all shipped**). Other features
follow the same pattern — their own `docs/*_plan.md` files (e.g., `encounters_plan.md`, `loot_plan.md`) document
their phases and stages.

**When asked to "do the next step":** find the appropriate plan doc, read the current/next stage, follow its
specification exactly, and verify against its gates. Each stage specifies what to build, what it inherits, required
tests, and end-to-end verification. Do not skip ahead, combine stages, or deviate from the spec.

## Reference Docs (read before exploring the codebase)

Before diving into the code or spawning exploration agents, read the appropriate reference doc. These describe stable structure (folders, conventions, API surface, data model) that rarely changes — much faster than exploring from scratch.

| Need to know... | Read |
|---|---|
| Folder structure, backend/frontend conventions, request flow | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Endpoint inventory (method, path, schema names) per router | [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) |
| Seed files, table relationships, JSON-encoded columns | [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) |
| Test commands, coverage gate, where test files live | [`docs/TESTING.md`](docs/TESTING.md) |
| Current stage of a feature, next steps to implement | `docs/<feature>_plan.md` (e.g., `dungeon_plan.md`) |

**Use reference docs before exploration agents.** Exploration agents are for open-ended questions ("what patterns exist across the codebase?", "find all places where X is used") or when you cannot find the answer in the reference docs. Starting with a grep/Explore agent for facts in these docs wastes tokens.

## Planning & Staging Methodology

Each feature is documented in its own `docs/*_plan.md` file, broken into design phases, each broken into
self-contained stages. Stages are sequenced so later ones build on earlier ones without re-deriving prior work.
**Copy [`docs/PLAN_TEMPLATE.md`](docs/PLAN_TEMPLATE.md) to start any new plan doc — it defines the required
sections, the per-stage completion ritual, and the collapse discipline that keeps a plan from growing unbounded.**
`design_plan.md` is the reference for how a healthy, lean plan doc reads; `dungeon_plan.md` (933 lines, every
shipped stage still carrying its full authoring paragraph) is the bloat failure mode the template exists to
prevent — mine it for the *content* pattern, not the length.

**Stage structure (copying the dungeon_plan.md pattern):**
1. **Scaffolding stage (e.g., "F0"):** Type declarations, stubs, placeholder CSS, test stubs (`it.skip`), no
   implementation. Done **upfront by Haiku 4.5** in a single context, explicitly labeled. Scaffolding stages
   are cheap and unlock later, larger stages for Sonnet.
2. **Implementation stages (e.g., "F1", "F2", "F3"):** Concrete algorithms, reducers, components, tests.
   Each stage is **self-contained, independently committable, and independently verifiable**. Stages are
   assigned to **Sonnet** (or higher models for complex multi-file orchestration).
3. **Design pass (e.g., "F4"):** Front-end visual review, component cohesion, accessibility, performance,
   zero-bug discovery and fixes. Assigns to **Sonnet** (or higher).

**Per-stage output:**
- **What shipped:** Precise bullet list of deliverables (model fields, reducer actions, components, tests).
- **Tests:** Unit tests (reducer logic, selectors, component renders) + integration tests (full feature flow).
- **Verification gate (🚦):** Live end-to-end confirmation in the running app, not just test-green. Browser
  automation only when verification requires it; do not drive the browser for routine testing.
- **Commit message:** Reference the stage ID and list key deliverables; include test counts.

**Between stages:** Update the plan doc, commit it with the code, then proceed to the next stage. This keeps
the plan synchronized with reality. **Follow the collapse discipline in [`docs/PLAN_TEMPLATE.md`](docs/PLAN_TEMPLATE.md):**
a shipped stage's verbose spec block is *deleted* and replaced by one ≤2-sentence row in the Shipped-stages
table (the how-it-was-built narrative lives in the git commit, not the doc); rewrite the Status line rather than
appending; and when a phase's last stage ships, fold the phase to a short `(shipped)` summary and promote any
durable structure to a reference doc. **If the stage added/removed a router, an endpoint, a seed domain/table, or a top-level folder/convention, update the matching reference doc (`ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`) in the same commit — treat this as part of the stage's deliverables, not a follow-up.** This keeps reference docs synchronized with code.

### The stack
- **Data:** `data/seeds/*.json` is canonical for seed-backed reference and campaign domains. Dungeon records and Map Lab layouts are runtime-authored in SQLite; a full rebuild via `scripts/init_database.py` + `scripts/seed_database.py` intentionally starts with no dungeons. Never hand-edit the DB; use the API/UI for dungeons and edit seeds only for seed-backed domains.
- **Backend:** **FastAPI + SQLite** in `backend/`.
- **Frontend:** **React + Vite + TypeScript** in `frontend/`. Design tokens live in `frontend/src/theme.css`
  (`--md-*`/`--type-*`, Material Design 3 dark theme) — consume them, never hand-pick colors; see
  `docs/dungeon_plan.md`'s "Design system in force" section for the full contract (palette, type scale, icons,
  accessibility floor).

### v1 preservation
- v1 is archived on the **`v1-archive`** git branch. `main` is the v2 workspace.
- v1 does **not** need to remain runnable. Delete v1 app/server code as the plan directs (it stays recoverable on the branch).

### Kept vs dropped features
- **Keep (rebuild):** content browsers (spells, monsters, weapons), campaign CRUD (players, NPCs, quests, encounters), dungeons.
- **Dropped:** all trackers (HP, spell slots, turn order, character sheet); the donjon dungeon-HTML parser (`lib/parse_dungeon.py`) — v2 has **custom dungeons only**, no upload/parse.

## Testing

**All feature code must include tests.** This is not optional. See [`docs/TESTING.md`](docs/TESTING.md) for the full pass/fail contract (commands, layers, coverage gate).

**Backend test DBs are built from the real `scripts/init_database.py` schema + `data/seeds/*.json` — never a hand-written schema in `conftest.py`.** Two hand-copied schemas previously drifted from production and hid live 500s. Run backend tests with `pytest` **from the repo root**; it enforces a coverage gate (≥85%). If you're editing a `CREATE TABLE` inside `conftest.py`, stop — that's the anti-pattern this rule exists to kill.

- **Backend (FastAPI):** pytest. Use fixtures from `backend/tests/conftest.py` (seeded test DB, connection mocking). Every API endpoint gets a smoke test; routers with business logic get unit tests.
- **Frontend (React):** vitest + React Testing Library. Components get render tests; hooks/utilities get unit tests.
- **Run tests before committing:** `pytest` (backend) and `npm run test` (frontend, when task 7+).
- **Coverage:** aim for >80% on new code. Coverage reports are checked locally (CI can enforce this later).

Test files live alongside code: `backend/app/routers/spells.py` → `backend/tests/routers/test_spells.py`; `frontend/src/components/Card.tsx` → `frontend/src/components/__tests__/Card.test.tsx`.

Task 4.5 set up pytest infrastructure and fixtures. Tasks 5+ inherit these patterns and are expected to add tests as they write endpoints/components.

## Conventions

- Many DB columns are JSON-encoded text (e.g. spells' `damage`/`components`/`classes`, monsters' `ac`/`hp`/`action`) — `json.loads` on read, `json.dumps` on write. See `docs/DATA_MODEL.md` for the full list.
- Ingestion/parsing scripts are archived under `archive/ingestion/` and must stay out of the running app.
- This is a Windows machine; the primary shell is PowerShell (a Bash tool is also available).
- Reference docs (`ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`) describe stable structure, not feature status — they should change rarely and only when the structure itself changes (new router, new table, new folder convention). Feature status lives only in `*_plan.md`.
- After each stage of an implementation, update the persistent plan doc and commit changes together (code + updated stage reference). See "Between stages" above for reference-doc updates.

## Browser Automation

- **Do not drive the Chrome browser unless the user explicitly asks for browser automation in the current
  turn.** The user performs manual browser/UI verification. This overrides plan-stage language that says a
  live visual/interaction gate is required.
- **Default verification:** run automated suites (`npm run test`, `npm run typecheck`, `npm run build`,
  `pytest` as applicable) and report any manual browser checks the user needs to perform. Do not open,
  control, or inspect Chrome/Playwright just because a stage has a live gate or because visual confidence
  would be useful.
- **If the user explicitly asks you to automate the browser:** keep the pass scoped to the requested flow.
  For complex interactions, record traces/GIFs when useful; verify touch-target sizing, z-order, focus
  visibility, `prefers-reduced-motion`, and no emoji/flat-text issues alongside functional correctness.
