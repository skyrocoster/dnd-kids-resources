# AI Instructions — D&D Kids Resources

This is the single authoritative instruction file for AI work in this repository. Other AI
instruction files only point here; if they conflict, this file wins.

## Start Here

1. Open the [documentation manifest](docs/README.md).
2. Select the row for the task you are performing and read its declared minimum context.
3. Open the relevant canonical reference and locate Plans directly under `docs/plans/active/`.
4. Read only that stage's **Read first** files before exploring source.
5. Run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe
   scripts/check_docs.py --check` on Windows, `.venv/bin/python scripts/check_docs.py --check` on
   POSIX) after any documentation-impacting work.

`scratch/` is a user-owned workspace for temporary notes and artifacts. Do not explore, read, index,
or update anything under it unless the user explicitly names a path there.

Detailed cross-cutting destinations use the `master-plan` skill and
[docs/MASTER_PLAN_TEMPLATE.md](docs/MASTER_PLAN_TEMPLATE.md). Master plans define desired behavior and
small human-visible slices, but never authorize implementation by themselves. When the user selects a
slice for implementation, `to-plan` autonomously routes it to direct quick delivery or a focused Plan;
the user is not asked to choose workflow transport.

## Two working modes

- **Structured workflow (default for planned work):** the Plan → Implement → Reconcile split across
  two roles by model strength — the planner thinks, writes the human-readable Plan, and compiles each
  stage into lean work orders; the executor runs one work order per fresh context window. The workflow
  skills in `.opencode/skills/` are `create-plan`, `to-plan`, `to-orders`, `dispatch-orders`, `implement-order`,
  `implement-quick`, `quick-reconcile`, and `reconcile`. The split is **cost discipline, not a prohibition**: where a dispatch round trip would
  plainly cost more than the edit itself, the planner may complete a fully-determined change directly
  and say so. Formats and lifecycle are normative in [docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md).
- **Planned quick stage:** during Plan review, the coordinator may route one atomic stage directly to
  `quick-executor` without compiling a work order. This is allowed only when the exact edit, authorized
  paths, known facts, and focused check are already settled; there may be no remaining design,
  architecture, diagnosis, or contract decision. Use the existing `implement-quick` brief, keep the
  Plan as the durable record, and update its Status/Shipped row only after the brief passes. If the
  brief escalates, compile that stage normally with `to-orders`; never widen the quick brief in place.
- **Direct master-plan slice:** when a selected slice is fully settled, atomic, immediately executable,
  and needs no durable coordination state, `to-plan` must skip both the focused Plan and work orders,
  dispatch a verified `implement-quick` brief, and invoke `quick-reconcile` on success. The coordinator
  judges this from evidence without asking the user. `quick-reconcile` updates canonical docs and the
  master plan's route-independent slice receipt, runs full checks, and removes any redundant temporary
  workflow artifacts. A failed or widened brief falls back to a focused Plan.
- **Bounded quick mode (when the user requests direct implementation):** proceed without a Plan or
  work orders. Touch only the files the user names; keep the change small, structured, and local;
  run the applicable focused tests and the documentation checker; preserve unrelated worktree
  changes; and report the files changed, tests run, and any remaining risk. Direct-mode work still
  honors this file's authority, routing, and safety rules — the checker no longer couples per-diff
  code changes to a Plan edit, so unplanned work can land independently.

## Documentation Contract

- Canonical references own current contracts and never authorize
  implementation and never list Plans. Create a focused Plan via `create-plan`, or route one selected
  master-plan slice via `to-plan`, before changing code no active Plan covers. `to-plan` may authorize
  only the bounded direct-slice route defined above; the master plan alone never does.
- A Plan that cannot start until another ships declares `- **Depends on:** [Other Plan](path)` in its
  `## Touches` section. That dependency is the only ordering signal in the repo: it licenses file
  overlap between in-flight Plans, and it is what marks a Plan blocked or ready in the generated
  index. Nothing ranks the ready Plans — choosing between them is the user's call.
- Keep canonical references current: update the relevant reference document when an API contract,
  data model, architecture convention, design token, testing contract, setup instruction, or
  user-visible capability changes. `reconcile` performs these updates after a Plan stage ships and
  `quick-reconcile` performs them after direct slice delivery — do not defer them indefinitely. Both
  update any linked master-plan slice receipt; automated checks never record human acceptance.
- **Write the fact where it is authored, not where it is displayed.** A Plan's routing facts are its
  location, `**Read trigger:**`, Status, Touches, dependencies, and local order metadata; a plan's progress is its
  Status line. Each is then rendered into the documents that need it. Editing a generated table by
  hand is always wrong — regenerate with
  `.venv\Scripts\python.exe scripts/check_docs.py --write-generated`.
- Regenerate the auto-generated reference inventories whenever their source contracts change. A
  document may carry any number of generated blocks, each addressed by a `GENERATED:<marker>`
  comment pair and staleness-checked on its own. What generates today: API endpoint and schema,
  script, test, data-model, and design-token inventories. Plans and orders are discovered directly
  from their folders and local metadata.
- Archive a completed Plan to `docs/plans/done/`; folder-local metadata is sufficient and Git history is
  the archive. Do not create redirects or historical documentation registries.
- Run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe
  scripts/check_docs.py --check`), and use `--base <base-ref>` to compare against a specific base
  ref. The checker validates local links and anchors, Plan status/read-trigger metadata, Plan
  dependency/touch overlap, work-order structure, plan-redirect lifecycle, AI-entry precedence,
  configured test commands, banned legacy references, generated reference inventories, a docstring on
  every `/api/` route, and an API-reference section for every router.
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
- Browser verification is available through the configured `browser-automation-luna` subagent and
  Playwright MCP server. Use it when the task or acceptance brief requires live UI evidence; otherwise
  run applicable automated checks and report any live verification that remains.
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

The `master-plan` skill defines broad product destinations before execution planning when needed.
`create-plan` writes a focused Plan directly; `to-plan` routes one selected master-plan slice to direct
quick delivery or a focused Plan. The remaining skills implement the Plan → Implement → Reconcile workflow: `to-orders` (compile a stage into work orders), `dispatch-orders` (send runnable
orders to the right-sized model), `implement-order` (executor runs one order), `implement-quick`
(executor runs one atomic brief), `quick-reconcile` (close out a direct slice), and `reconcile` (close
out Plan-backed work). See
[docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md).

### Issue tracker

Issues live in [GitHub Issues](https://github.com/skyrocoster/dnd-kids-resources/issues). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Scoped-context layout: root `CONTEXT.md` holds only shared repo vocabulary, area guides hold area-specific vocabulary and ownership facts, and `docs/adr/` records architecture decisions. See `docs/agents/domain.md`.
