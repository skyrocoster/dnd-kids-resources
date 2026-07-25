# AI Instructions — D&D Kids Resources

This is the single authoritative instruction file for AI work in this repository. Other AI instruction files only point here; if they conflict, this file wins.

## Start Here

1. Open the [documentation manifest](docs/README.md).
2. Select the row for the task you are performing and read its declared minimum context.
3. For area work, open the area guide it names, then open that guide's active execution plan at its linked current-stage anchor.
4. Read only that stage's **Read first** files before exploring source.
5. Make the plan and exact documentation-impact updates declared by the stage, then run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe scripts/check_docs.py --check` on Windows, `.venv/bin/python scripts/check_docs.py --check` on POSIX).

`scratch/` is a user-owned workspace for temporary notes and artifacts. Do not explore, read, index, or update anything under it unless the user explicitly names a path there.

Active documentation-maintenance plans are queued under the [Infra](docs/areas/repo-infra.md) area. The manifest and area guides, rather than this file, are the sources for active-plan status and task routing.

## Execution Workflow: Plan → Implement → Reconcile

Work is split across two roles so that expensive planning and cheap implementation stay separate.
The roles are defined by strength, not by vendor — any sufficiently capable model can hold either,
and which providers fill them is an open experiment:

- **The planner** — the more powerful model. It thinks, and it is the only role that reads the Plan
  and the wider codebase.
- **The executor** — the cheaper, weaker model. It runs one work order per fresh context window and
  writes the code.

- **PLAN (planner).** Thinks, writes the human-readable Plan, and compiles each stage into lean work
  orders. **The planner plans rather than implements** — the deliverable at this stage is guidance,
  not code.
- **IMPLEMENT (executor).** Executes **one work order per fresh context window**, exploring only the
  files the order names, and stops at the order's stop condition. It touches only code, tests, and
  its own order's STATUS line — never the docs.
- **RECONCILE (planner).** After a stage's orders finish, the planner collapses them into the Plan,
  updates any canonical reference whose contract changed, runs the checker, and deletes the spent
  orders.

The split is **cost discipline, not a prohibition**. Implementation and test output belong in the
executor's cheap, throwaway per-order contexts because that is where they are cheapest — not because
the planner is forbidden to type code. Where a dispatch round trip would plainly cost more than the
edit itself — a small, fully-determined fix needing no exploration — the planner makes it directly and
says so. `dispatch-orders` step 5 sets out that boundary; the rest of the time, the default holds.

Five skills in `.agents/skills/` drive this, read by whichever harness a role runs in (Claude Code
and opencode both load them today): `plan`,
`to-orders`, `dispatch-orders`, `implement-order`, and `reconcile`. The full formats and lifecycle live in
[docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md).

## Documentation Contract

- Implementation work flows through the Plan → Implement → Reconcile workflow above. Area guides route work and record durable ownership; they never authorize implementation. Create a focused Plan (via the `plan` skill) before changing code in an area that has no active Plan.
- Keep canonical references current: update the relevant reference document when an API contract, data model, architecture convention, design token, testing contract, setup instruction, or user-visible capability changes. The `reconcile` skill performs these updates after a stage's work orders ship — do not defer them indefinitely.
- Regenerate the auto-generated reference inventories whenever their source contracts change: `.venv\Scripts\python.exe scripts/check_docs.py --write-generated`.
- Archive a completed Plan to `docs/plans/done/`, updating its area guide and the manifest in the same change set; leave a redirect stub only when a known inbound link must survive. `MEMORY.md` is not a parallel plan-status registry.
- Run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe scripts/check_docs.py --check` on Windows, `.venv/bin/python scripts/check_docs.py --check` on POSIX). Use the `--base <base-ref>` flag to compare against a specific base ref. The repo-local virtualenv is the preferred route for Python-backed validation so the documentation checker imports the project's installed backend dependencies rather than whichever global interpreter happens to be first on `PATH`.
- The checker validates local links and anchors, active-Plan status lines and manifest completeness, area-guide↔Plan ownership, work-order structure, plan-redirect lifecycle, AI-entry precedence, configured test commands, banned legacy references, and generated reference inventories. It no longer couples per-diff code changes to a Plan edit, so work orders can land independently.
- Work-order linting lives in `scripts/check_orders.py` (invoked by the checker, and runnable on its own while compiling a stage). Every rule there is one dispatch-costing fault recorded in `docs/plans/telemetry-log.md`; run it before dispatching anything.
- GitHub Actions runs the `documentation-contract` check on every pull request and push to `main`; keep it enabled as a required branch-protection check in GitHub settings. The [PR template](.github/pull_request_template.md) requires each author to confirm that a fresh reader can route the change to its owning plan and minimum context.

## Stable Project Rules

- The backend is FastAPI with SQLite in `backend/`; the frontend is React, Vite, and TypeScript in `frontend/`.
- `data/seeds/` is canonical for seed-backed domains. The root SQLite database is generated and must not be committed. Dungeons and Map Lab layouts are authored through the API/UI but **are** seed-backed: export before any rebuild, because `scripts/init_database.py` drops them.
- Seed export column lists are generated from `scripts/init_database.py` by `scripts/generate_export_schema.py`; never hand-edit `data/generated/export_schema.json`.
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

Five skills in `.agents/skills/` implement the Plan → Implement → Reconcile workflow above: `plan`
(write the Plan), `to-orders` (compile a stage into work orders), `dispatch-orders` (send runnable
orders to the right-sized model), `implement-order` (executor runs one order), and `reconcile`
(close out finished orders). See [docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md).

### Issue tracker

Issues live in [GitHub Issues](https://github.com/skyrocoster/dnd-kids-resources/issues). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Scoped-context layout: root `CONTEXT.md` holds only shared repo vocabulary, area guides hold area-specific vocabulary and ownership facts, and `docs/adr/` records architecture decisions. See `docs/agents/domain.md`.
