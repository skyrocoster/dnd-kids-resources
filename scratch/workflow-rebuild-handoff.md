# Workflow Rebuild Handoff

Updated: 2026-07-31

## Goal

Finish and validate the direct rebuild of the AI workflow. The intended shape is:

- Optional conversational contract/grilling stage for ambiguous work.
- Strong coordinator owns decisions, delegation, anomaly triage, and reconciliation.
- Cheap DeepSeek Flash scouts retrieve evidence and cheap executors implement bounded changes.
- Structured mode uses Plan -> orders -> dispatch/implement -> reconcile.
- Quick mode uses an ephemeral bounded brief and no Plan/order artifacts.
- Order authoring is permissive; dispatch is strict.
- The global active Plan index is the sole queue/status view.
- Area guides own durable code routing, not Plan queues.
- Executor repair loops are stopped by a harness guard after two failed verification runs.

## What Changed

The worktree contains uncommitted changes from several parallel agents. Do not revert unrelated work.

### Agents and skills

- `opencode.jsonc`
  - Added a strong `coordinator` primary agent.
  - Added bounded `quick-executor` using DeepSeek V4 Flash.
  - Kept Flash and Pro work-order executors as Light and Standard profiles.
  - Tightened scout permissions; the general scout has no Bash, and the reconcile scout has read-only Git commands.
- Added `.opencode/skills/contract/SKILL.md`.
- Added `.opencode/skills/implement-quick/SKILL.md`.
- Shortened the five existing workflow skills substantially.
- Added clean/anomalous completion classification and stronger intervention guidance.

### Order tooling

- `scripts/new_order.py` and `scripts/check_orders.py` now distinguish permissive authoring from strict dispatch validation.
- Shape caps and prose-sensitive heuristics are warnings by default and errors under `--strict`.
- Order checks can target selected order paths.
- Related tests in `test_new_order.py` and `test_check_orders.py` were updated.

### Documentation and indexing

- `AGENTS.md` was reduced toward global policy, routing, safety, and authority.
- `docs/PLAN_TEMPLATE.md` was shortened.
- Active/new Plans use `**Areas:**` IDs rather than an `**Area guide:**` link.
- Per-area generated Plan queues were removed.
- `docs/plans/active/INDEX.md` is the sole generated queue/status view and includes Areas.
- Redirect stubs are excluded from active discovery.
- Archived Plans retain legacy area-guide metadata during migration.
- `scripts/check_docs.py`, generated docs, active Plan headers, and docs-contract tests were updated.

### Repair-loop guard

- Extended `scripts/read_guard.py` and `.opencode/plugin/read-guard.js`.
- Both `implement-order` and `implement-quick` arm the guard.
- It counts failed verification commands, ignoring unrelated shell failures.
- After two failed verification runs it blocks further reads, searches, source edits, and shell commands.
- A structured executor may still edit its numbered work-order file to write STATUS/evidence/failure details.
- Quick executors must stop and report through their final response.
- Updated both executor skills and `backend/tests/test_read_guard.py`.

## Confirmed Checks

These passed in the current worktree:

```powershell
.venv\Scripts\python.exe -m pytest backend/tests/test_new_order.py backend/tests/test_check_orders.py backend/tests/test_docs_contract.py backend/tests/test_read_guard.py --no-cov -q
```

Result: 209 tests passed.

```powershell
.venv\Scripts\python.exe scripts/check_docs.py --check
```

Result: all documentation checks passed.

`git diff --check` also passed for the repair-loop guard files. Line-ending warnings are present but no whitespace errors were reported.

## Known Remaining Work

### 1. Fix the Plan skill's stale Plan header contract

`.opencode/skills/plan/SKILL.md` still says new Plans require:

```md
- **Area guide:** ...
```

The checker and `docs/PLAN_TEMPLATE.md` now require:

```md
- **Areas:** <comma-separated area IDs>
```

Update the skill so a newly generated Plan passes the current checker. Search all workflow skills for other stale references to area-guide Plan headers or per-area work queues.

### 2. Wire strict selected-order validation into dispatch

`.opencode/skills/dispatch-orders/SKILL.md` still instructs:

```powershell
.venv\Scripts\python.exe scripts/check_orders.py --fix
```

It also says to scan/revalidate every order before every dispatch. This does not use the newly implemented relaxed/strict split.

Update dispatch to validate only the selected runnable order(s), using the new strict mode and the exact CLI shape exposed by:

```powershell
.venv\Scripts\python.exe scripts/check_orders.py --help
```

Keep dependency and shared-anchor healing where genuinely needed, but do not rescan every active Plan.

### 3. Align the normative order format with executor evidence

`implement-order` now writes an `EVIDENCE ENVELOPE`, and dispatch classifies `DONE-CLEAN` versus `DONE-ANOMALOUS`. `docs/PLAN_TEMPLATE.md` does not currently appear to define the evidence envelope.

Decide whether the envelope is normative work-order state. Recommended: document its compact shape in `PLAN_TEMPLATE.md`, while keeping actual `STATUS` values as `DONE`, `FAILED`, and `BLOCKED`; clean/anomalous are coordinator classifications, not persisted statuses.

Then ensure `check_orders.py` accepts and, where useful, validates the envelope without making prose fields brittle again.

### 4. Review attempt semantics end to end

The guard enforces two failed verification runs total:

1. Initial verification fails.
2. One repair is made and verification fails again.
3. Further implementation/check tools are blocked and the executor reports.

Confirm all skills, examples, templates, and agent prompts use this exact meaning. Remove any remaining wording that permits two repairs after the initial failure, which would imply three failed runs.

### 5. Decide whether to add an edit-scope guard

The new attempt guard prevents loops, but executor path authorization is still primarily prompt-level. The quick executor says it may edit only `AUTHORIZED PATHS`; the work-order executor uses START IN/DO/CREATES/REMOVES. OpenCode permissions do not enforce those paths dynamically.

Possible follow-up:

- Extend the existing guard or add a scope guard that loads the active work order/quick brief.
- Deny edits outside the authorized set.
- Record an override as anomalous rather than silently allowing scope growth.

Do this only if the enforcement value justifies the extra state/transport complexity.

### 6. Review config and skill integration

Run the installed OpenCode diagnostics after restarting OpenCode:

```powershell
opencode debug config
opencode debug agent
opencode debug skill
```

Confirm:

- `coordinator`, `quick-executor`, both work-order executors, and both scouts resolve.
- New `contract` and `implement-quick` skills load.
- Scout Bash restrictions resolve as intended.
- The coordinator can dispatch the renamed agents.
- No stale prompt refers to removed agent names or the old Plan-area contract.

OpenCode does not hot-reload config, plugins, agents, or skills. Quit and restart it before testing behavior.

### 7. Run broader repository validation

Only focused workflow/docs/guard tests have been run together. Run the full stage gate:

```powershell
.venv\Scripts\python.exe scripts/stage_check.py
```

If it fails, distinguish workflow-rebuild regressions from unrelated pre-existing failures. Do not loop on failures: diagnose once, make one repair, rerun once, then stop and report.

Also run:

```powershell
.venv\Scripts\python.exe scripts/check_docs.py --check
git diff --check
git status --short
```

### 8. Review the complete diff for cross-agent contradictions

The agents edited overlapping concepts but mostly non-overlapping files. Review the final diff as one system, especially:

- `AGENTS.md` versus `docs/README.md` versus `docs/PLAN_TEMPLATE.md`.
- `plan` and `to-orders` versus the new Areas/checker contract.
- `to-orders` and `dispatch-orders` versus permissive/strict order checking.
- `implement-order` versus the order schema and read/attempt guard.
- `reconcile` versus the simplified generated indexes and removed area queues.
- `opencode.jsonc` agent names versus skill dispatch instructions.

Do not assume a focused test catches semantic contradictions in prose.

### 9. Consider a small end-to-end harness test

After the contract mismatches are fixed, exercise both paths with disposable fixtures:

- Generate a deliberately over-preferred-size order: authoring warns, strict dispatch rejects.
- Dispatch/execute a minimal passing order: result is classifiable as clean.
- Execute a failing fixture twice: the guard blocks a third repair/check and permits the order failure report.
- Run a quick brief with two failed checks: the guard blocks further tool work and the executor reports.
- Generate docs and confirm no per-area Plan queues reappear.

Avoid using real active feature work as the first harness test.

## Worktree State

There is no commit. Modified/untracked files include:

- `.opencode/plugin/read-guard.js`
- `.opencode/skills/{plan,to-orders,dispatch-orders,implement-order,reconcile}/SKILL.md`
- `.opencode/skills/contract/` (new)
- `.opencode/skills/implement-quick/` (new)
- `opencode.jsonc`
- `AGENTS.md`
- `scripts/{new_order,check_orders,check_docs,read_guard}.py`
- workflow/checker/guard test files under `backend/tests/`
- `docs/README.md`, `docs/PLAN_TEMPLATE.md`, `docs/TESTING.md`, and generated inventory/index files
- all area guides and active Plan main files migrated by the indexing change

Run `git status --short` for the exact current list. Preserve every unrelated user change.

## Suggested Pickup Order

1. Read this handoff, `AGENTS.md`, and `docs/README.md`.
2. Fix the stale `plan` Areas contract.
3. Wire strict selected-order validation into `dispatch-orders`.
4. Align the evidence envelope and two-failure semantics across the template, skills, and linter.
5. Restart OpenCode and validate resolved config/skills/agents.
6. Run focused tests, then `stage_check.py` once.
7. Fix at most one diagnosed verification failure before reporting back rather than looping.
8. Review the complete diff and decide whether an edit-scope guard belongs in this rebuild.
