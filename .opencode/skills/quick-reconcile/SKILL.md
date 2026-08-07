---
name: quick-reconcile
description: Close out one directly delivered master-plan slice that intentionally has no focused Plan or work orders. Use automatically after a master-plan quick brief passes, or when cleaning up a redundant Plan created for an already implemented atomic slice. Updates canonical docs and the master-plan slice receipt, runs full checks, and removes temporary workflow artifacts.
---

# Quick reconcile - close a direct master-plan slice

Close one atomic master-plan slice delivered by `quick-executor` without inventing a focused Plan after
the fact. This is the direct route's mandatory closeout, not optional documentation polish.

## Inputs

Require the master-plan path, slice ID, quick brief, executor report, changed paths, and focused-check
result. A redundant active Plan may also be named for cleanup. If evidence is missing, recover it from
the brief, report, and git diff; do not ask the user to choose a workflow route.

## Receipt contract

The selected master plan owns a route-independent `## Slice delivery receipts` table:

```md
| Slice | Route | State | Evidence |
|---|---|---|---|
| MP-01 | Direct | Implemented; awaiting human acceptance | `<focused check>`; <short shipped outcome> |
```

This is delivery and acceptance evidence, not active queue status. `quick-reconcile` writes `Direct`;
full `reconcile` writes `Plan`. Use exactly:

- `Implemented; awaiting human acceptance` after checks pass but before explicit human acceptance.
- `Accepted YYYY-MM-DD` only after the human explicitly accepts the slice's UX gate.

Automated checks never write `Accepted`. A dependent slice treats only `Accepted YYYY-MM-DD` or an
accepted archived Plan as satisfying its prerequisite.

## Steps

1. Compare the quick brief, executor report, and git diff. Confirm every implementation edit is inside
   `AUTHORIZED PATHS`, the change stayed atomic, and the focused check passed. Preserve unrelated
   worktree changes. If scope widened or evidence is incomplete, stop and create a focused Plan rather
   than laundering the work through quick reconcile.
2. Update canonical references when the slice changed a user-visible capability, API, data model,
   architecture convention, design token, testing contract, or setup instruction. Do not invent a
   documentation change for an internal-only edit.
3. Add or update exactly one receipt row in the selected master plan. Record what shipped and the
   focused check. Preserve `awaiting human acceptance` unless explicit acceptance evidence already
   exists.
4. Run `.venv\Scripts\python.exe scripts/check_docs.py --write-generated`; never hand-edit generated
   indexes or inventories.
5. Run `.venv\Scripts\python.exe scripts/stage_check.py`. Apply `reconcile`'s bounded regression-repair
   policy if a full gate fails; never weaken a check or broaden the delivered slice.
6. Run `.venv\Scripts\python.exe scripts/check_docs.py --check` after all closeout edits.
7. Remove temporary workflow artifacts for this direct slice. Normally none exist. If an active Plan
   was redundantly created for the same atomic slice and has no independent shipped history, delete its
   directory rather than archiving fiction; the master-plan receipt replaces it. Never delete a Plan
   that records other stages, decisions, dependencies, failures, or shipped work.
8. Regenerate and re-check docs after artifact removal. Report the receipt state, files changed, checks,
   removed artifacts, and any remaining human acceptance gate.

## Commit boundary

Do not commit automatically. Unlike full `reconcile`, this route may run amid unrelated user work and
has no Plan boundary from which to justify committing the whole worktree. Commit only when the user
explicitly asks; stage only the direct slice and closeout paths.

## Failure routing

- Failed or escalated quick implementation: create a focused Plan carrying the report's evidence.
- Full checks reveal a non-atomic repair: create a focused Plan for the repair.
- Human rejects the result: create or reuse a focused Plan for redesign/repair; keep the receipt as
  `Implemented; awaiting human acceptance` until the accepted replacement ships.
- A prerequisite lacks durable acceptance evidence: stop as blocked; do not ask whether to ignore it.
