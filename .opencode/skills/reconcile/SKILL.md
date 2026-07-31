---
name: reconcile
description: Close out finished work orders for a feature — collapse completed orders into the Plan's Shipped table, update any canonical references/manifest/area guide whose contract changed, run the documentation checker, delete the spent order files, and commit the whole repo once every check is green. Use this after a stage's work orders are all marked DONE (or when some are FAILED and need re-planning), whenever the user says "reconcile", "close out the orders", "the stage is done", or "update the docs for what shipped". This is documentation closeout, not an implementation pass.
---

# reconcile — close out shipped work orders

After the executors have run a stage's work orders, this skill reconciles what actually shipped back
into the durable docs and clears the spent orders. You are the **strong coordinator** here; the job is
**bookkeeping and documentation** — you record what shipped, you don't extend it.

## When you were not told which feature

[docs/plans/active/INDEX.md](../../../docs/plans/active/INDEX.md) lists every in-flight plan with its
order counts and the skill each is waiting for. A row whose `Next` is `reconcile` has every order
`DONE` and is ready for this skill. One such row is your answer; several means ask which, since
nothing in the repo ranks them.

## Send the evidence-gathering out first

Closeout asks the same questions every stage — what each order says it did, what git says actually
changed, and where the docs describe the contracts that moved. That is retrieval: hand it to the cheap
**scout** in one dispatch, before step 1 (opencode: the `reconcile-scout-deepseek` subagent). Hand it
the feature directory and a base ref if you have one; it returns ORDERS, GIT, EXPORTED SURFACES, DOC
MENTIONS, and NOT FOUND / UNCERTAIN, all quoted with `path:line`.

Its report is evidence for steps 1, 2 and 5. **Every judgement stays here**, and the scout is
instructed to refuse all of them: whether a `DONE` order actually landed, whether a changed export is
a real *contract* change, how a Shipped row and Status line should read, why a FAILED/BLOCKED order
failed, and what a doc update should say. Read files yourself whenever the answer feeds one of those
directly — a FAILURE REPORT and the dirty files behind it are diagnosis, not retrieval, and step 3 is
always your own reading. If the scout comes back partial, re-ask the gap narrowly rather than
treating the report as complete.

## Steps

1. **Read every work order in `docs/plans/active/<feature>/` and check its STATUS.** The scout's
   ORDERS section quotes these verbatim; open an order yourself when you need more than it quoted, and
   always for one that is not `DONE`.

2. **For each `DONE` order:** confirm it really landed (skim the changed files / run the order's STOP
   WHEN command if in doubt), then **collapse it into the Plan's Shipped table** as one ≤2-sentence
   row and rewrite the Plan's **Status line** to show progress and name what's next. A `DONE` whose
   DEVIATIONS says a KNOWN STATE fact was wrong is not a clean order: fold that fact-correction into
   any dependent order's KNOWN STATE, and decide whether the deviation changed what actually shipped —
   if it did, treat it as a failure and go to step 3.

3. **Triage any order still non-DONE.** Failures are normally triaged mid-flight by `dispatch-orders`
   — the moment they come back, because dependent orders stall behind them. So by closeout a lingering
   FAILED/BLOCKED order usually means it needs the user (a human-only step, a Plan-level decision) or
   the batch was abandoned mid-stage. Read its FAILURE REPORT before anything else: the executor left
   its partial changes in the worktree and captured the verbatim failing output; start from that
   evidence, don't re-run the work from cold. The two statuses route differently:
   - **`FAILED`** (order was doable, test wouldn't pass): diagnose from the report's OUTPUT and the
     dirty files. If the fix is genuinely small and obvious, note it in a corrected work order and
     reissue; if the report shows the order was mis-scoped, split or rewrite it. Say explicitly
     whether the partial worktree changes are kept as the re-run's starting point or reverted.
   - **`BLOCKED`** (order couldn't be executed as written): KNOWN STATE or DO was wrong. No debugging
     needed — verify reality, fix the order's facts, and reissue.
   Every reissued order must carry the failure knowledge forward so no work is repeated: fold the old
   FAILURE REPORT's TRIED and SUSPECT lines into the new KNOWN STATE as "already attempted, did not
   work: <approach>", and re-run the test command yourself to fill an up-to-date **KNOWN TEST
   FAILURES** section (pre-existing failures the executor must ignore, listed verbatim). Escalate to
   the user only if the Plan itself is wrong. A FAILED or BLOCKED order is a planning signal, not an
   executor failure to paper over.

4. **Run the full suites once for the whole stage** with one command:

   ```
   .venv\Scripts\python.exe scripts/stage_check.py
   ```

   It runs all five checks — `pytest` from the repo root (full suite + coverage gate),
   `npm run test:check -- --strict`, `npm run lint` and `npm run build` in `frontend/`, and
   `check_docs.py --check` — and prints about ten lines. Only a failing check prints its output;
   `--full-output` gives you the rest when you need to triage. `--strict` is what keeps the
   known-failure list from rotting: it fails when a listed test now passes, so the stage that fixed
   it prunes the entry — a one-file edit here.

   **Triage a failure here with the same narrow direct-repair policy `dispatch-orders` uses.** You
   may fix it in the code yourself only when every one of these holds: the fix is **fully determined**
   by evidence already in your context; it needs **zero exploration**; it is **small and mechanical**
   (a wrong import path, a missed rename, a stale assertion — no design thinking); and the check that
   failed is one you can re-run yourself, and you run it. If any of those fails — the failure needs
   exploration, spans two or more files, or is more than a couple of lines — do not keep editing:
   write a corrective work order and run it through `dispatch-orders`.

   Anything caught at this step is by definition something the orders' targeted STOP WHEN commands
   could not catch — a stage-level regression, a typecheck break, an architecture-rule violation, a
   contract the docs checker rejects. **That escape is the single most valuable signal this workflow
   produces**, and it is invisible in the per-order records: each order honestly reported DONE against
   a check that was the wrong shape. Name which order it traces to in your report, and whether it has
   happened before — a repeat means the fix belongs in the `to-orders` rules, not in a one-off note.

5. **Update canonical references only when a real contract changed.** If shipped work changed an API,
   data model, architecture convention, design token, testing contract, or user-visible capability,
   update the matching reference (`API_REFERENCE.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`,
   `DESIGN_SYSTEM.md`, `TESTING.md`) and the area guide/manifest routing. If nothing durable changed,
   record that — don't invent updates. The scout's EXPORTED SURFACES and DOC MENTIONS give you the two
   halves: what moved, and what the docs say about it today. Deciding whether a moved export is a
   *contract* is yours — a new internal helper is not one, a changed response shape is. A symbol the
   scout reports with no doc mentions is the interesting case, not an empty one: either it needs a
   first entry, or it was never a documented contract.

   **Do not hand-edit what a command derives.** Run
   `.venv\Scripts\python.exe scripts/check_docs.py --write-generated` once. It refreshes every
   generated block — the per-router endpoint tables and schema inventory in `API_REFERENCE.md`, the
   area-guide and plan rows in `docs/INVENTORY.md`, both plan indexes (the global
   `docs/plans/active/INDEX.md` — the sole queue/status view — and the archive index), and the
   script/test/schema/token inventories. Because the manifest and the plan indexes derive
   from the Plan itself, **the Plan's Status line is the single place a stage's progress is
   recorded** — get it right and three documents follow. What stays yours: the Status line and Shipped
   rows, the hand-written prose around each generated block, the Task Router rows in `docs/README.md`,
   and every canonical-reference edit in this step.

6. **Run the documentation checker** from the repo root via the repo-local virtualenv:
   - Windows: `.venv\Scripts\python.exe scripts/check_docs.py --check`
   - POSIX: `.venv/bin/python scripts/check_docs.py --check`
   - Also run the `--base <base-ref>` form when a valid base ref is available.

7. **Delete the spent (`DONE`) order files.** Deleting an order destroys its STATUS/DEVIATIONS record,
   so if telemetry collection is on (see [PLAN_TEMPLATE.md](../../../docs/PLAN_TEMPLATE.md), §
   Telemetry), make sure each order has an entry first; backfill any missing ones with
   `scripts/order_telemetry.py` before deleting. When every order in the stage is done, the feature
   directory should be empty of that stage's order files — leftover DONE files are clutter. Every
   ~10-15 logged entries, tell the user the telemetry log has enough data for a review pass; don't run
   that analysis unprompted.

8. **When the whole feature is complete:** move the Plan to `docs/plans/done/<feature>/` and update
   `docs/README.md` in the same change set. Then regenerate the index (`--write-generated`):
   archiving is what flips every Plan that declared a `**Depends on:**` this feature from `blocked`
   to `ready`, so a stale index leaves real work looking unavailable. Leave a redirect stub only if a
   known inbound link must survive.

9. **Commit everything.** A reconcile that ends green leaves the whole repo consistent — the
   executors' source changes, the Plan collapse, the regenerated inventories, the deleted order files
   — and that state is what gets committed, in one commit, across the whole worktree. **Only on
   green:** `stage_check.py` (step 4) and `check_docs.py --check` (step 6) must both pass first. A red
   check means the stage is not reconciled yet; fix it or reissue an order, and commit after. Never
   commit to make the tree tidy.

   Before staging, read `git status --porcelain` and check two things: everything expected is there
   (deleted `NN-*.md` orders, the Plan, the regenerated `docs/plans/active/INDEX.md` and any other
   `GENERATED:` inventory, plus the source and test files the orders touched — an order you believe
   shipped but whose files are absent means it did not land; go back to step 2), and nothing that must
   never be committed is (a database, `*.log`, `.pid`, `.env`, `node_modules/`, `frontend/dist/` —
   one appearing as untracked is a `.gitignore` gap: stop, say so, and do not add it). Then commit
   the worktree in one commit:

   ```
   git add -A
   git commit -m "feat(<feature>): stage <N> — <what now works>"
   ```

   Follow the repo's existing commit-message conventions, including any trailers the harness
   requires. **Do not push**, and do not create a branch or tag, unless the user asks — this step
   closes the stage locally, and where it goes next is theirs to decide.

## What NOT to do

- Do not re-open shipped work or extend the stage's scope — implementation already happened via
  `implement-order`, and closeout is not a second pass at it. The one place you touch code here is
  step 4's narrow direct-repair case, under the same conditions `dispatch-orders` uses; anything
  larger becomes a corrective order.
- Do not keep a running diary in the Plan. The commit history is the record of *how* things were
  built; the Plan records *what exists* and *what's next*.

## Reference

The full lifecycle, order schema, and failure formats live in
[docs/PLAN_TEMPLATE.md](../../../docs/PLAN_TEMPLATE.md). Read it if a closeout case here isn't
covered.
