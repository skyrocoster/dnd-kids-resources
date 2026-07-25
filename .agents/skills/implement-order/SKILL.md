---
name: implement-order
description: Execute exactly ONE work order from a feature directory under docs/plans/active/. Use this whenever you are handed a single work-order file and asked to implement it. Explore only the files the order names, make only the change it asks for, run its stop-check, and write the STATUS line. Designed for a cheaper, weaker executor model doing one order per fresh context window without wandering.
---

# implement-order — do one work order, then stop

You are implementing **exactly one work order**. Your goal is to finish this single order and stop —
not to improve the wider codebase. Staying inside the fence below is what makes you reliable.

## Steps

1. **Read the work order file** you were given. It has: GOAL, KNOWN STATE, START IN, DO, STOP WHEN,
   STATUS.

2. **Trust KNOWN STATE.** Everything listed there is already confirmed true. Do **not** re-verify it,
   re-explore it, or second-guess it. It was checked for you so you don't spend your context on it.

   If the order has a **KNOWN TEST FAILURES** section, those tests were already failing before you
   started. They are **not yours to fix and not caused by you** — do not touch them, do not
   investigate them, and do not count them when judging STOP WHEN. A STOP WHEN built on
   `npm run test:check` does this for you: it knows which tests already fail on main and reports
   only the ones you caused, so trust its verdict rather than reading past it into the raw output. If a test fails that is *not* on
   that list, that one is yours. If KNOWN STATE says an approach was "already attempted, did not
   work", do not try that approach again. If KNOWN STATE contains a `verified snippet — use as-is`,
   paste it exactly — it was already tested; do not rewrite or "improve" it.

3. **Explore only the files in START IN.** Open those, and only files they directly lead you to for
   this change. Do **not** grep the whole repo or open unrelated areas — that's the wandering this
   skill exists to prevent.

4. **Do exactly what DO says — nothing more.** Make the smallest change that meets the GOAL. Do not
   refactor nearby code, rename things, add extra features, or "improve" things you weren't asked to.
   Match the style of the code already in the file.

5. **Run the STOP WHEN command — and only that command, exactly as written.** Never run the full
   test suite (`pytest` or `npm test` with no file arguments), `tsc -b`, or any "just to be safe"
   verification the order didn't ask for. Whole-repo verification happens later, once per stage, in
   `reconcile` — it is not your job, and a full run only fills your context with unrelated output.
   When STOP WHEN's condition is met (the test passes, the build is clean, the stated `X = Y`
   holds), you are **done — stop immediately.** Do not keep polishing.

   If it fails, you may make up to **two distinct fix attempts**. After the second failed attempt,
   stop and write a failure report (below). Do not keep cycling — a clear failure report is a
   **successful outcome** of this order; the planner picks it up from there.

   `scripts/check_docs.py`, `scripts/check_orders.py`, and `scripts/order_telemetry.py` are
   invoke-only tools — call them (e.g. `.venv\Scripts\python.exe scripts/check_docs.py --check`)
   and read their stdout/exit code. Do **not** open their source to see how they work; that's
   wasted context for a check that only needs its output.

6. **Write the STATUS line** at the bottom of the work order file:
   - `STATUS: DONE` if STOP WHEN passed.
   - `STATUS: FAILED - <one short reason>` if the order was doable as written but you could not make
     STOP WHEN pass.
   - `STATUS: BLOCKED - <one short reason>` if the order could not be executed as written — KNOWN
     STATE turned out to be wrong, a named file doesn't exist, or DO contradicts what's in the
     START IN files. Do not improvise a different change.

7. **Append a DEVIATIONS block** directly under the STATUS line — always, even on DONE. You cannot
   see your own token usage (the harness measures that separately); what only you know is where the
   order's map didn't match the territory. Exactly two lines, no more:

   ```
   DEVIATIONS:
   - opened beyond START IN: <repo source/test/doc files you had to open that the order didn't name, or "none">
   - KNOWN STATE re-verified or wrong: <one line, or "none">
   ```

   Do **not** list `CLAUDE.md`, this skill file, or the order file itself — every executor opens
   those by construction, so naming them buries the real signal. Only repo source, test, and doc
   files the order failed to name count as "beyond START IN".

   "none / none" is the ideal report. Do not pad this with narrative — it feeds a telemetry log
   used to tighten future orders, and two honest lines are worth more than a paragraph.

   **If your harness does not report your token usage to the dispatcher** (you are running in a
   chat UI rather than a spawned agent, i.e. nobody can read your usage counters but you or the
   user), add one more line so the telemetry entry is not hollow:

   ```
   - RUN SUMMARY: model <name as your UI shows it>; ~<N> turns; <"no retries" or "N fix attempts">
   ```

   Report only what you can actually see. Never estimate token counts — a missing number is fine,
   an invented one poisons the log.

8. **If FAILED or BLOCKED, append a FAILURE REPORT** below the STATUS line so the planner never has
   to re-derive what you saw:

   ```
   FAILURE REPORT:
   - TRIED: <2-4 lines: what changes you made, in which files>
   - FAILING COMMAND: <the exact STOP WHEN command you ran>
   - OUTPUT: <last ~20 lines of the failing output, verbatim, in a code fence>
   - SUSPECT: <one line: your best guess at why — it is fine to be wrong>
   - WORKTREE: <"changes left in place" plus the list of dirty files>
   ```

   **Leave your partial changes in the worktree — do not revert them.** The half-finished diff plus
   the verbatim output is exactly what the planner needs. Cleaning up destroys the evidence.

## Stay inside the fence

- Touch only **code and test files** for this change, plus this order's **STATUS** line, its
  **DEVIATIONS** block, and (on failure) its **FAILURE REPORT** block.
- Do **not** edit other work orders, the Plan, the docs manifest, area guides, or any reference doc.
  Those are a planner's job, not yours.
- Do **not** start the next work order. One order per context window. When STATUS is written, you're
  finished.

If the order is unclear, contradicts what you find in the START IN files, or can't be done as written,
stop and write `STATUS: BLOCKED - <what's wrong>` plus a FAILURE REPORT rather than improvising a
different change.
