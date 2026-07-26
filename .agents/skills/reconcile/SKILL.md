---
name: reconcile
description: Close out finished work orders for a feature — collapse completed orders into the Plan's Shipped table, update any canonical references/manifest/area guide whose contract changed, run the documentation checker, and delete the spent order files. Use this after a stage's work orders are all marked DONE (or when some are FAILED and need re-planning), whenever the user says "reconcile", "close out the orders", "the stage is done", or "update the docs for what shipped". This is documentation closeout, not an implementation pass.
---

# reconcile — close out shipped work orders

After the executors have run a stage's work orders, this skill reconciles what actually shipped back
into the durable docs and clears the spent orders. The job here is **bookkeeping and documentation**:
you record what shipped, you don't extend it.

## Steps

1. **Read every work order in `docs/plans/active/<feature>/` and check its STATUS.**

2. **For each `DONE` order:** confirm it really landed (skim the changed files / run the order's STOP
   WHEN command if in doubt), then **collapse it into the Plan's Shipped table** as one ≤2-sentence
   row. Rewrite the Plan's **Status line** to show progress and name what's next.

3. **Triage any order still non-DONE.** Failures are normally triaged mid-flight by
   `dispatch-orders` — the moment they come back, because dependent orders stall behind them. So by
   closeout, a lingering FAILED/BLOCKED order usually means it needs the user (a human-only step, a
   Plan-level decision) or the batch was abandoned mid-stage. Read its FAILURE REPORT before
   anything else: the executor left its partial changes in the worktree and captured the verbatim
   failing output; start from that evidence, don't re-run the work from cold. The two statuses route
   differently:
   - **`FAILED`** (order was doable, test wouldn't pass): diagnose from the report's OUTPUT and the
     dirty files. If the fix is genuinely small and obvious, note it in a corrected work order and
     reissue; if the report shows the order was mis-scoped, split or rewrite it. Decide explicitly
     whether the partial worktree changes should be kept as the starting point for the re-run or
     reverted — say which in the reissued order's KNOWN STATE.

     Every reissued order must carry the failure knowledge forward so no work is repeated: fold the
     old FAILURE REPORT's TRIED and SUSPECT lines into the new KNOWN STATE as "already attempted,
     did not work: <approach>", and re-run the test command yourself to fill an up-to-date **KNOWN
     TEST FAILURES** section (pre-existing failures the executor must ignore, listed verbatim).
   - **`BLOCKED`** (order couldn't be executed as written): KNOWN STATE or DO was wrong. No
     debugging needed — verify reality, fix the order's facts, and reissue.
   Escalate to the user only if the Plan itself is wrong. A FAILED or BLOCKED order is a planning
   signal, not an executor failure to paper over.

4. **Run the full suites once for the whole stage.** Executors only ran targeted STOP WHEN commands;
   this is where cross-cutting regressions from the batch get caught, in a context that can afford
   the output:
   - `pytest` from the repo root (full suite + the coverage gate)
   - `npm run test:check -- --strict`, `npm run lint` and `npm run build` in `frontend/` (`build`
     includes `tsc -b`, the only real typecheck; `test:check` is the full vitest run judged against
     `frontend/known-test-failures.json`; `lint` is where the `src/model/` layering rule is
     enforced, and CI does not run it)
   Triage any failure here yourself or reissue an order for it.

   `--strict` is what keeps the known-failure list from rotting: it fails when a listed test now
   passes, so the stage that fixed it prunes the entry. Refreshing that list is a one-file edit
   here, not a block copied by hand into every order of the next batch — and it is what lets an
   executor's targeted stop-check be a single command with a trustworthy verdict.

   **Then log the stage-level result to the telemetry log, every stage, pass or fail:**

   ```
   .venv\Scripts\python.exe scripts/order_telemetry.py --reconcile "<feature> stage <N>" \
     --checks "<pytest / npm run test:check --strict / npm run build / check_docs results>" \
     --missed "<a defect that passed an order's STOP WHEN but failed here>" \
     --note "<what to change in to-orders so it cannot happen again>"
   ```

   Anything caught at this step is by definition something the orders' targeted STOP WHEN
   commands could not catch — a stage-level regression, a typecheck break, an architecture-rule
   violation, a contract the docs checker rejects. **That escape is the single most valuable
   signal this workflow produces**, and it is invisible in the per-order entries: each order
   honestly reports DONE against a check that was the wrong shape. Record it here or it is lost
   when the order files are deleted in step 7.
   - Pass `--missed` once per defect. Say what broke, which order it traces to, and **whether it
     has happened before** — a repeat means the fix belongs in the `to-orders` template or the
     order template's STOP WHEN rules, not in another one-off note.
   - Attribute honestly. Most escapes are order-authoring faults (a stop-check that ran only
     `npm test` when the risk was types; a START IN that never mentioned the contract the change
     would break), not executor faults.
   - **Log the clean case too.** Omit `--missed` entirely and the entry records that nothing
     escaped — that is how the log shows a tightened rule actually working, rather than silence.

5. **Update canonical references only when a real contract changed.** If shipped work changed an API,
   data model, architecture convention, design token, testing contract, or user-visible capability,
   update the matching reference (`API_REFERENCE.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`,
   `DESIGN_SYSTEM.md`, `TESTING.md`) and the area guide/manifest routing. If nothing durable changed,
   record that — don't invent updates.

6. **Run the documentation checker** from the repo root via the repo-local virtualenv:
   - Windows: `.venv\Scripts\python.exe scripts/check_docs.py --check`
   - POSIX: `.venv/bin/python scripts/check_docs.py --check`
   - Also run the `--base <base-ref>` form when a valid base ref is available.

7. **Delete the spent (`DONE`) order files — but only after telemetry is captured.** Deleting an
   order destroys its STATUS/DEVIATIONS record, so first check `docs/plans/telemetry-log.md` has an
   entry for each order about to be deleted. For any missing one, run
   `.venv\Scripts\python.exe scripts/order_telemetry.py --order <order-path> --note "backfilled at reconcile; compiler judgement unavailable"` (POSIX:
   `.venv/bin/python`) — it auto-finds Claude Code transcripts and opencode sessions; if neither exists
   (ChatGPT transport, or the record is gone), log it with
   `--manual "backfilled at reconcile, no usage figures"`. Then delete: when every order in
   the stage is done, the feature directory should be empty of that stage's order files.
   Leftover DONE files are clutter.

   Every ~10-15 logged entries, tell the user the telemetry log has enough data for a review pass —
   the log exists so an AI can analyse recurring cost drivers (large reads, duplicate reads, reads
   outside START IN, executor deviations) and tighten the `plan`/`to-orders`/`implement-order`
   rules. Don't run that analysis unprompted; just flag that it's due. When that pass runs, the
   `escaped targeted checks` lines from the reconcile entries are the first thing to read: a defect
   class that shows up in two stages has already proven a one-off note won't hold it.

8. **When the whole feature is complete:** move the Plan to `docs/plans/done/<feature>/`, set the area
   guide back to "no active plan" (or its next plan), and update `docs/README.md` in the same change
   set. Leave a redirect stub only if a known inbound link must survive.

## What NOT to do

- Do not re-open shipped work or extend the stage's scope — implementation already happened via
  `implement-order`, and closeout is not a second pass at it. The one place you touch code here is
  step 4: a full-suite failure you can fix on the spot, from the evidence in front of you and without
  exploring. Anything larger becomes a reissued order.
- Do not keep a running diary in the Plan. The commit history is the record of *how* things were
  built; the Plan records *what exists* and *what's next*.

## Reference

The full lifecycle and collapse discipline live in `docs/PLAN_TEMPLATE.md`. Read it if a closeout case
here isn't covered.
