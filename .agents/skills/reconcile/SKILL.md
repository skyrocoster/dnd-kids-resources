---
name: reconcile
description: Close out finished work orders for a feature — collapse completed orders into the Plan's Shipped table, update any canonical references/manifest/area guide whose contract changed, run the documentation checker, and delete the spent order files. Use this after a stage's work orders are all marked DONE (or when some are FAILED and need re-planning), whenever the user says "reconcile", "close out the orders", "the stage is done", or "update the docs for what shipped". Claude writes no implementation code here.
---

# reconcile — close out shipped work orders

After the small model has run a stage's work orders, this skill reconciles what actually shipped back
into the durable docs and clears the spent orders. Claude does bookkeeping and documentation here —
**no implementation code**.

## Steps

1. **Read every work order in `docs/plans/active/orders/<feature>/` and check its STATUS.**

2. **For each `DONE` order:** confirm it really landed (skim the changed files / run the order's STOP
   WHEN command if in doubt), then **collapse it into the Plan's Shipped table** as one ≤2-sentence
   row. Rewrite the Plan's **Status line** to show progress and name what's next.

3. **For each `FAILED` order:** read the reason. Fix the order (tighten KNOWN STATE, correct START IN,
   split it if it was too big) so it can be re-run, or escalate to the user if the Plan itself was
   wrong. A FAILED order is a planning signal, not an executor failure to paper over.

4. **Update canonical references only when a real contract changed.** If shipped work changed an API,
   data model, architecture convention, design token, testing contract, or user-visible capability,
   update the matching reference (`API_REFERENCE.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`,
   `DESIGN_SYSTEM.md`, `TESTING.md`) and the area guide/manifest routing. If nothing durable changed,
   record that — don't invent updates.

5. **Run the documentation checker** from the repo root via the repo-local virtualenv:
   - Windows: `.venv\Scripts\python.exe scripts/check_docs.py --check`
   - POSIX: `.venv/bin/python scripts/check_docs.py --check`
   - Also run the `--base <base-ref>` form when a valid base ref is available.

6. **Delete the spent (`DONE`) order files.** When every order in the stage is done, the
   `orders/<feature>/` directory should be empty of that stage's files. Leftover DONE files are clutter.

7. **When the whole feature is complete:** move the Plan to `docs/complete/<feature>.md`, set the area
   guide back to "no active plan" (or its next plan), and update `docs/README.md` in the same change
   set. Leave a redirect stub only if a known inbound link must survive.

## What NOT to do

- Do not write feature code or re-run implementation — that already happened via `implement-order`.
- Do not keep a running diary in the Plan. The commit history is the record of *how* things were
  built; the Plan records *what exists* and *what's next*.

## Reference

The full lifecycle and collapse discipline live in `docs/PLAN_TEMPLATE.md`. Read it if a closeout case
here isn't covered.
