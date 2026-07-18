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

## Documentation Contract

- Every implementation change belongs to an active execution plan. Area guides route work and record durable ownership, but never authorize implementation. Create a focused plan before editing when an area has no active plan for the outcome.
- Every executable stage declares **Read first**, **Expected touch set**, **Documentation impact**, **Tests**, **Gate**, and **Completion edit**. Complete its expected touch set and exact documentation-impact requirements in the same change set as the implementation.
- Every stage consolidates important discoveries before it ships: update the active plan's durable context, every affected future stage, and any canonical reference whose contract changed. Scaffolding normally discovers the most because it prepares the broadest touch set, but this handoff is required for every stage. Answer, don't point: when a future stage's Build would otherwise tell its executor to derive a value from the codebase, survey it now and write the actual value into that stage's block — see [PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md)'s Discovery consolidation section.
- Before calling a stage done, re-read that stage's own **Discovery consolidation** line as a literal checklist and confirm each location it names was actually edited — do not rely on memory of intent, or on a different edit (e.g. a reference-doc update) standing in for a named target you skipped. A stage is not consolidated until every named target shows a diff.
- Update the relevant reference document when an API contract, data model, architecture, design system, testing contract, setup instruction, or user-visible capability changes.
- Collapse shipped stages and update their plan status as specified by [PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md). Archive every completed execution plan; leave a redirect stub only when a known link must survive. Update its area guide and the manifest in the same change set. `MEMORY.md` is not a parallel plan-status registry.
- Run the documentation checker through the repo-local virtualenv (`.venv\Scripts\python.exe scripts/check_docs.py --check` on Windows, `.venv/bin/python scripts/check_docs.py --check` on POSIX); before completion also run the corresponding `--base <base-ref>` command when a valid base ref is available.
- The checker validates active-document links and anchors, plan lifecycle and manifest entries, AI-entry precedence, configured test commands, legacy guidance, generated reference inventories, and base-diff documentation impact.
- GitHub Actions runs the `documentation-contract` check on every pull request and push to `main`; enable it as a required branch-protection check in GitHub settings. The PR template records the required fresh-reader routing validation.

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

### Issue tracker

Issues live in [GitHub Issues](https://github.com/skyrocoster/dnd-kids-resources/issues). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one root `CONTEXT.md` + `docs/adr/` for architecture decisions. See `docs/agents/domain.md`.
