# AI Instructions — D&D Kids Resources

This is the single authoritative instruction file for AI work in this repository. Other AI
instruction files only point here; if they conflict, this file wins.

## Start Here

1. Open the [documentation manifest](docs/README.md).
2. Select the row for the task you are performing and read its declared minimum context.
3. For area work, open the area guide it names for ownership and invariants, then open
   [docs/plans/active/INDEX.md](docs/plans/active/INDEX.md) — the sole queue/status view — to find the
   Plan covering the work and whether it is ready or blocked.
4. Read only that stage's **Read first** files before exploring source.
5. Run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe
   scripts/check_docs.py --check` on Windows, `.venv/bin/python scripts/check_docs.py --check` on
   POSIX) after any documentation-impacting work.

`scratch/` is a user-owned workspace for temporary notes and artifacts. Do not explore, read, index,
or update anything under it unless the user explicitly names a path there.

Detailed cross-cutting destinations use the `master-plan` skill and
[docs/MASTER_PLAN_TEMPLATE.md](docs/MASTER_PLAN_TEMPLATE.md). Master plans define desired behavior and
small human-visible slices, but never authorize implementation; each selected slice still enters the
normal focused Plan workflow.

## Two working modes

- **Structured workflow (default for planned work):** the Plan → Implement → Reconcile split across
  two roles by model strength — the planner thinks, writes the human-readable Plan, and compiles each
  stage into lean work orders; the executor runs one work order per fresh context window. The workflow
  skills in `.opencode/skills/` are `plan`, `to-orders`, `dispatch-orders`, `implement-order`,
  `implement-quick`, and `reconcile`. The split is **cost discipline, not a prohibition**: where a dispatch round trip would
  plainly cost more than the edit itself, the planner may complete a fully-determined change directly
  and say so. Formats and lifecycle are normative in [docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md).
- **Planned quick stage:** during Plan review, the coordinator may route one atomic stage directly to
  `quick-executor` without compiling a work order. This is allowed only when the exact edit, authorized
  paths, known facts, and focused check are already settled; there may be no remaining design,
  architecture, diagnosis, or contract decision. Use the existing `implement-quick` brief, keep the
  Plan as the durable record, and update its Status/Shipped row only after the brief passes. If the
  brief escalates, compile that stage normally with `to-orders`; never widen the quick brief in place.
- **Bounded quick mode (when the user requests direct implementation):** proceed without a Plan or
  work orders. Touch only the files the user names; keep the change small, structured, and local;
  run the applicable focused tests and the documentation checker; preserve unrelated worktree
  changes; and report the files changed, tests run, and any remaining risk. Direct-mode work still
  honors this file's authority, routing, and safety rules — the checker no longer couples per-diff
  code changes to a Plan edit, so unplanned work can land independently.

## Documentation Contract

- Area guides own code — routers, routes, invariants, the change map — and never authorize
  implementation and never list Plans. Create a focused Plan (via the `plan` skill) before changing
  code no active Plan covers.
- A Plan that cannot start until another ships declares `- **Depends on:** [Other Plan](path)` in its
  `## Touches` section. That dependency is the only ordering signal in the repo: it licenses file
  overlap between in-flight Plans, and it is what marks a Plan blocked or ready in the generated
  index. Nothing ranks the ready Plans — choosing between them is the user's call.
- Keep canonical references current: update the relevant reference document when an API contract,
  data model, architecture convention, design token, testing contract, setup instruction, or
  user-visible capability changes. The `reconcile` skill performs these updates after a stage's work
  orders ship — do not defer them indefinitely.
- **Write the fact where it is authored, not where it is displayed.** A plan's routing facts are its
  `**Areas:**` (stable area-guide IDs) and `**Read trigger:**` header lines; a plan's progress is its
  Status line. Each is then rendered into the documents that need it. Editing a generated table by
  hand is always wrong — regenerate with
  `.venv\Scripts\python.exe scripts/check_docs.py --write-generated`.
- Regenerate the auto-generated reference inventories whenever their source contracts change. A
  document may carry any number of generated blocks, each addressed by a `GENERATED:<marker>`
  comment pair and staleness-checked on its own. What generates today: API endpoint and schema
  inventories; the area-guide and plan rows in `docs/INVENTORY.md`; script, test, data-model, and
  design-token inventories; and both plan indexes, including
  [docs/plans/active/INDEX.md](docs/plans/active/INDEX.md).
- Archive a completed Plan to `docs/plans/done/`, updating the manifest in the same change set and
  regenerating the index, which is what unblocks its dependents; leave a redirect stub only when a
  known inbound link must survive. Redirect stubs are excluded from the active index and the manifest
  inventory, so an archived plan never reads as active. `MEMORY.md` is not a parallel plan-status
  registry.
- Run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe
  scripts/check_docs.py --check`), and use `--base <base-ref>` to compare against a specific base
  ref. The checker validates local links and anchors, active-Plan status lines and manifest
  completeness, area-guide code ownership (routers, routes, change-map coverage), Plan
  dependency/touch overlap, work-order structure, plan-redirect lifecycle, AI-entry precedence,
  configured test commands, banned legacy references, generated reference inventories, a docstring on
  every `/api/` route, an API-reference section for every router, and an `**Areas:**` and
  `**Read trigger:**` line on every Plan.
- Work orders are written by `scripts/new_order.py`, linted by `scripts/check_orders.py` (prefer
  `--fix`), run one at a time by `scripts/order_check.py`, and closed out by `scripts/stage_check.py` —
  the wrappers print pass/fail rather than full runner output. `scripts/read_guard.py` (wired through
  `.opencode/plugin/read-guard.js`) enforces the executor's no-re-read rule in the harness.
- **Every script named above is invoke-only, for every role.** `new_order.py`, `check_docs.py`,
  `check_orders.py`, `order_check.py`, `stage_check.py`, `generate_export_schema.py`: call them and
  read stdout and the exit code. To learn what arguments
  one takes, run `--help`. Open one of these files for exactly one reason: you are changing its
  behaviour.
- GitHub Actions runs the `documentation-contract` check on every pull request and push to `main`;
  keep it enabled as a required branch-protection check in GitHub settings. The
  [PR template](.github/pull_request_template.md) requires each author to confirm that a fresh reader
  can route the change to its owning plan and minimum context.

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
- A successful `reconcile` ends by committing the whole worktree in one commit — that is the one
  place in this workflow authorized to commit without being asked each time, and only when
  `stage_check.py` and `check_docs.py --check` are both green. It never pushes.
- Prefer the smallest correct change and existing local patterns.
- Do not use destructive Git operations unless the user explicitly requests them.

## Agent skills

### Execution workflow

The `master-plan` skill defines broad product destinations before execution planning when needed. The
remaining skills in `.opencode/skills/` implement the Plan → Implement → Reconcile workflow: `plan`
(write the Plan), `to-orders` (compile a stage into work orders), `dispatch-orders` (send runnable
orders to the right-sized model), `implement-order` (executor runs one order), `implement-quick`
(executor runs one planned quick stage), and `reconcile` (close out finished work). See
[docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md).

### Issue tracker

Issues live in [GitHub Issues](https://github.com/skyrocoster/dnd-kids-resources/issues). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Scoped-context layout: root `CONTEXT.md` holds only shared repo vocabulary, area guides hold area-specific vocabulary and ownership facts, and `docs/adr/` records architecture decisions. See `docs/agents/domain.md`.
