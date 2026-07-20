# AI Instructions — D&D Kids Resources

This is the single authoritative instruction file for AI work in this repository. Other AI instruction files only point here; if they conflict, this file wins.

## Start Here

1. Open the [documentation manifest](docs/README.md).
2. Select the row for the task you are performing and read its declared minimum context.
3. For area work, open the area guide it names, then open that guide's active execution plan at its linked current-stage anchor.
4. Read only that stage's **Read first** files before exploring source.
5. Make the plan and exact documentation-impact updates declared by the stage, then run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe scripts/check_docs.py --check` on Windows, `.venv/bin/python scripts/check_docs.py --check` on POSIX).

`scratch/` is a user-owned workspace for temporary notes and artifacts. Do not explore, read, index, or update anything under it unless the user explicitly names a path there.

No documentation-maintenance plan is currently active; create a focused plan before new documentation-contract work. The manifest and area guides, rather than this file, are the sources for active-plan status and task routing.

## Execution Workflow: Plan → Implement → Reconcile

Work is split so that expensive planning and cheap implementation stay separate:

- **PLAN (Claude).** Claude thinks, writes the human-readable Plan, and compiles each stage into lean
  work orders. **Claude never writes implementation code** — only plans and work orders (guidance,
  not code).
- **IMPLEMENT (small model).** A smaller/cheaper model executes **one work order per fresh context
  window**, exploring only the files the order names, and stops at the order's stop condition. It
  touches only code, tests, and its own order's STATUS line — never the docs.
- **RECONCILE (Claude).** After a stage's orders finish, Claude collapses them into the Plan, updates
  any canonical reference whose contract changed, runs the checker, and deletes the spent orders.

Four skills in `.agents/skills/` drive this (read by both Claude Code and opencode): `plan`,
`to-orders`, `implement-order`, and `reconcile`. The full formats and lifecycle live in
[docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md).

## Documentation Contract

- Implementation work flows through the Plan → Implement → Reconcile workflow above. Area guides route work and record durable ownership; they never authorize implementation. Create a focused Plan (via the `plan` skill) before changing code in an area that has no active Plan.
- Keep canonical references current: update the relevant reference document when an API contract, data model, architecture convention, design token, testing contract, setup instruction, or user-visible capability changes. The `reconcile` skill performs these updates after a stage's work orders ship — do not defer them indefinitely.
- Regenerate the auto-generated reference inventories whenever their source contracts change: `.venv\Scripts\python.exe scripts/check_docs.py --write-generated`.
- Archive a completed Plan to `docs/complete/`, updating its area guide and the manifest in the same change set; leave a redirect stub only when a known inbound link must survive. `MEMORY.md` is not a parallel plan-status registry.
- Run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe scripts/check_docs.py --check` on Windows, `.venv/bin/python scripts/check_docs.py --check` on POSIX).
- The checker validates local links and anchors, active-Plan status lines and manifest completeness, area-guide↔Plan ownership, work-order structure, plan-redirect lifecycle, AI-entry precedence, configured test commands, banned legacy references, and generated reference inventories. It no longer couples per-diff code changes to a Plan edit, so work orders can land independently.
- GitHub Actions runs the `documentation-contract` check on every pull request and push to `main`; keep it enabled as a required branch-protection check in GitHub settings.

## Stable Project Rules

- The backend is FastAPI with SQLite in `backend/`; the frontend is React, Vite, and TypeScript in `frontend/`.
- `data/seeds/` is canonical for seed-backed domains. The root SQLite database is generated and must not be committed. Runtime-authored dungeons and Map Lab layouts are managed through the API/UI.
- Use the shared tokens in `frontend/src/theme.css`; do not introduce arbitrary colors.
- Backend tests use the real schema from `scripts/init_database.py`, never hand-copied fixture DDL.
- Do not drive a browser unless the user explicitly asks for browser automation in the current turn. Run applicable automated checks and report manual verification still needed.
- Do not commit databases, logs, PID files, `.env`, `node_modules/`, or `frontend/dist/`.

## Safety

- Preserve unrelated worktree changes.
- Prefer the smallest correct change and existing local patterns.
- Do not use destructive Git operations unless the user explicitly requests them.

## Agent skills

### Execution workflow

Four skills in `.agents/skills/` implement the Plan → Implement → Reconcile workflow above: `plan`
(write the Plan), `to-orders` (compile a stage into work orders), `implement-order` (small model
executes one order), and `reconcile` (close out finished orders). See [docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md).

### Issue tracker

Issues live in [GitHub Issues](https://github.com/skyrocoster/dnd-kids-resources/issues). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Scoped-context layout: root `CONTEXT.md` holds only shared repo vocabulary, area guides hold area-specific vocabulary and ownership facts, and `docs/adr/` records architecture decisions. See `docs/agents/domain.md`.
