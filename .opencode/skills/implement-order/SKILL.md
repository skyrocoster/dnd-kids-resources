---
name: implement-order
description: Execute exactly ONE work order from a feature directory under docs/plans/active/. Use this whenever you are handed a single work-order file and asked to implement it. Explore only the files the order names, make only the change it asks for, run its stop-check, and write the STATUS line. Designed for a cheaper, weaker executor model doing one order per fresh context window without wandering.
---

# implement-order — do one work order, then stop

You are implementing **exactly one work order**. Your goal is to finish this single order and stop —
not to improve the wider codebase. Staying inside the fence below is what makes you reliable. The
order's schema and field rules live in [docs/PLAN_TEMPLATE.md](../../../docs/PLAN_TEMPLATE.md)
(Layer 2); the steps here tell you what to do with them.

## Steps

1. **Read the work order file once** and keep its fields in context: GOAL, KNOWN STATE, KNOWN TEST
   FAILURES, START IN, CREATES/REMOVES, CHANGES SIGNATURE, DO, STOP WHEN. Do not reopen the order
   later to remind yourself what it said.

2. **Trust KNOWN STATE.** Everything listed there is already confirmed true. Do **not** re-verify it,
   re-explore it, or second-guess it — it was checked for you so you don't spend your context on it.
   A fact written as "already attempted, did not work" is true: do not try that approach again. A
   `verified snippet — use as-is:` was already tested — paste it exactly, do not rewrite or "improve"
   it. A **descriptive** conditional ("if order 03 landed, the helper is shared; otherwise each file
   has its own copy") describes reality — trust whichever branch is true when you read the files.

   If the order has a **KNOWN TEST FAILURES** section, those tests were already failing before you
   started. They are **not yours to fix and not caused by you** — do not touch them, do not
   investigate them, and do not count them when judging STOP WHEN. A STOP WHEN built on
   `npm run test:check` does this for you: it knows which tests already fail and reports only the
   ones you caused, so trust its verdict rather than reading past it into the raw output. If a test
   fails that is *not* on that list, that one is yours.

3. **Explore only the paths and sections in START IN.** Treat each named symbol or line range as a
   boundary, not as permission to read the whole file. For a large file, grep once for the order's
   named anchor when necessary, then read one bounded range around the match. Do **not** grep the
   whole repo or open unrelated areas — that is the wandering this skill exists to prevent.
   `CREATES` and `REMOVES` authorize lifecycle changes; they are not extra exploration targets. A
   file listed in REMOVES may also appear in START IN when you must read it before removing it.

   Read each needed range once and retain it in context. Do not reopen the same range after a
   successful edit merely to inspect your work; trust the edit result and let STOP WHEN judge it.
   Re-read only when an edit failed to apply or STOP WHEN points to that section. If the named scope
   is insufficient, open only the smallest additional section needed.

   **This one is enforced, not advised.** `scripts/read_guard.py` runs in both harnesses and will
   deny a read of a file you have already edited in this session. It is not a bug in your tools: it
   is the rule above, applied by the harness because wording alone never removed the behaviour. A
   failing check unlocks every file automatically, so if STOP WHEN goes red you can read freely. To
   override deliberately, run `python scripts/read_guard.py --unlock <path> --reason "<why>"`, which
   is logged.

4. **Do exactly what DO says — nothing more.** Make the smallest change that meets the GOAL. Do not
   refactor nearby code, rename things, add extra features, or "improve" things you weren't asked to.
   Match the style of the code already in the file.

5. **Run the STOP WHEN command — and only that command, exactly as written.** Never run the full
   test suite (`pytest` or `npm test` with no file arguments), `tsc -b`, or any "just to be safe"
   verification the order didn't ask for. Whole-repo verification happens later, once per stage, in
   `reconcile` — it is not your job, and a full run only fills your context with unrelated output.
   When STOP WHEN's condition is met (the test passes, the build is clean, the stated `X = Y`
   holds), you are **done — stop immediately.** Do not keep polishing.

   If verification fails, make one distinct repair and run STOP WHEN once more. After **two failed
   verification runs total**, stop and write a failure report (step 9). Do not keep cycling — the
   harness blocks further implementation and checks at that point. A clear failure report is a
   **successful outcome** of this order; the coordinator picks it up from there.

   If the order's STOP WHEN names `scripts/order_check.py`, run it as written. It runs the same
   checks and prints pass/fail plus the failing test names instead of the whole runner output, which
   is otherwise the largest single result in your context — and repeats on every fix attempt.

   `scripts/check_docs.py`, `scripts/check_orders.py`, `scripts/order_check.py`,
   `scripts/stage_check.py`, `scripts/new_order.py`, and `scripts/order_telemetry.py` are
   invoke-only tools — call them (e.g. `.venv\Scripts\python.exe scripts/check_docs.py --check`) and
   read their stdout/exit code. Do **not** open their source to see how they work; that's wasted
   context for a check that only needs its output.

6. **Write the STATUS line** at the bottom of the work order file:
   - `STATUS: DONE` if STOP WHEN passed.
   - `STATUS: FAILED - <one short reason>` if the order was doable as written but you could not make
     STOP WHEN pass.
   - `STATUS: BLOCKED - <one short reason>` if the order could not be executed as written — KNOWN
     STATE turned out to be wrong, a named file doesn't exist, or DO contradicts what's in the START
     IN files. Do not improvise a different change.

7. **Write the DEVIATIONS block** directly under the STATUS line — always, even on DONE. You cannot
   see your own token usage, and the harness measures what you opened; what only you know is whether
   the order's facts were true. Exactly one line:

   ```
   DEVIATIONS:
   - KNOWN STATE re-verified or wrong: <one line, or "none">
   ```

   Write "wrong" whenever a KNOWN STATE fact did not match what you found, even if you worked around
   it — a wrong premise that produced a DONE order is the most useful thing in this workflow, because
   it is the fault that will repeat. "none" is the ideal report. Do not pad this with narrative.

8. **Write the EVIDENCE ENVELOPE** — directly under the DEVIATIONS block, always, even on DONE. This
   is how you return a compact, structured account of the run so the coordinator can judge it without
   re-deriving anything:

   ```
   EVIDENCE ENVELOPE:
   - COMMAND: <the exact STOP WHEN command you ran>
   - RESULT: pass | fail
   - CHECKS: <what passed and what failed — one line per check>
   - DIRTY PATHS: <every file your edits left changed in the worktree, or "none">
   - AUTHORIZATION: <the files you edited, matched to the START IN / DO / CREATES / REMOVES entries
     that authorize each>
   - GUARD: <read-guard denials or `--unlock` overrides, or "none">
   - ATTEMPTS: <0 if STOP WHEN passed first try, else the number of fix attempts>
   ```

   Be honest, not clever. "none" is the ideal for DIRTY PATHS on a test-only change and for GUARD. If
   you edited a file that no START IN / DO / CREATES / REMOVES entry authorizes, say so under
   AUTHORIZATION — that is a deviation the coordinator must hear about.

9. **If FAILED or BLOCKED, append a FAILURE REPORT** below the envelope so the coordinator never has
   to re-derive what you saw. Keep its exact structure (also documented in PLAN_TEMPLATE):

   ```
   FAILURE REPORT:
   - TRIED: <2-4 lines: what changes you made, in which files>
   - FAILING COMMAND: <the exact STOP WHEN command you ran>
   - OUTPUT: <last ~20 lines of the failing output, verbatim, in a code fence>
   - SUSPECT: <one line: your best guess at why — it is fine to be wrong>
   - WORKTREE: <"changes left in place" plus the list of dirty files>
   ```

   **Leave your partial changes in the worktree — do not revert them.** The half-finished diff plus
   the verbatim output is exactly what the coordinator needs. Cleaning up destroys the evidence.

## Stay inside the fence

- Touch only files explicitly authorized by START IN, CREATES, REMOVES, and DO, plus this order's
  **STATUS** line, its **DEVIATIONS** block, its **EVIDENCE ENVELOPE** block, and (on failure) its
  **FAILURE REPORT** block.
- Do **not** edit other work orders or any Plan, manifest, area guide, or reference document that the
  order did not explicitly authorize. Reconcile bookkeeping remains the coordinator's job.
- Do **not** start the next work order. One order per context window. When the envelope is written,
  you're finished.

If the order is unclear, contradicts what you find in the START IN files, or can't be done as written,
stop and write `STATUS: BLOCKED - <what's wrong>` plus a FAILURE REPORT rather than improvising a
different change.
