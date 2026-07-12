# CLAUDE.md — D&D Kids Resources

Guidance for AI assistants working in this repo. Read this first.

## Current stage: post-rebuild feature work

The v2 ground-up rebuild (Flask+vanilla-JS → **FastAPI + SQLite** backend, **React + Vite + TypeScript**
frontend) is **complete**. This project is an online D&D 5e resource site for kids, designed for **running
games** (live at the table) rather than exclusively pre-session prep.

**The authoritative source for all feature work is [`docs/dungeon_plan.md`](docs/dungeon_plan.md)**, which
documents the dungeon room-navigation feature and all follow-on design phases. Original build (Stages 1–11),
Design Phase A–B (Encounter & NPC, E1–E6 & N1–N6), Design Phase C–E (Map Lab: Foundation, Authoring, Unified
Data & Zoom), and Design Phase F (Room Props) are **all shipped**. New design phases are appended under
`dungeon_plan.md`'s "Next: front-end design planning" section.

**When asked to "do the next step":** read the current/next stage in `dungeon_plan.md`, follow its specification
exactly, and verify it against the gates listed. Each stage specifies what to build, what it inherits, required
tests, and end-to-end verification. Do not skip ahead, combine stages, or deviate from the spec.

## Planning & Staging Methodology

Each design phase is broken into self-contained stages, sequenced so later ones build on earlier ones without
re-deriving prior work. **Use `dungeon_plan.md` as the model for all feature planning — structure all new phases
the same way.**

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

**Between stages:** Update the plan doc with the "What shipped" section, commit it with the code, then proceed
to the next stage. This keeps the plan synchronized with reality.

### The stack
- **Data:** FINAL and frozen. `data/seeds/*.json` is the canonical source of truth. The SQLite DB (`dnd_kids_resources.db`, gitignored) is **rebuilt from seeds** via `scripts/init_database.py` + `scripts/seed_database.py`. Never hand-edit the DB as a source of truth; edit seeds and rebuild.
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

- Many DB columns are JSON-encoded text (e.g. spells' `damage`/`components`/`classes`, monsters' `ac`/`hp`/`action`) — `json.loads` on read, `json.dumps` on write.
- Ingestion/parsing scripts are archived under `archive/ingestion/` and must stay out of the running app.
- This is a Windows machine; the primary shell is PowerShell (a Bash tool is also available).
- After each stage of an implementation, update the persistent plan doc and commit changes together (code +
  updated stage reference).

## Browser Automation

- **Do not drive the Chrome browser in verification passes by default.** Test suite (`npm run test` + `pytest`)
  is sufficient to catch logic bugs.
- **Only use browser automation when:**
  - The user explicitly asks to verify a feature in a browser ("does the UI look right", "try the new button").
  - A stage's verification gate specifically requires live visual/interaction confirmation (e.g., "confirm the
    marker is clickable and doesn't get swallowed by the overlay").
  - End-to-end user flow validation is needed (flow requires cross-component interaction or visual feedback
    that tests cannot capture).
- **When you do automate:** Record GIF traces for complex interactions; verify touch-target sizing, z-order,
  focus visibility, `prefers-reduced-motion`, and no emoji/flat-text issues alongside functional correctness.
  Skip routine interaction unless the stage spec explicitly asks for it.
