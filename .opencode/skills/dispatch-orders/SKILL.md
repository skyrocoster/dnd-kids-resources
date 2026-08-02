---
name: dispatch-orders
description: Send compiled work orders off to an executor — a cheaper, weaker model — one order per fresh context, and keep the batch moving. Use this after `to-orders`, whenever the user says "dispatch the orders", "send off the orders", "run the orders", or "hand these to the small model". Selects the next runnable orders by DEPENDS ON and STATUS, maps required strength to a model, hands each order over with a fixed minimal prompt (spawned subagent or paste-ready prompt for a direct executor session), and — when an order comes back FAILED or BLOCKED — triages the FAILURE REPORT immediately and takes the cheapest correct repair — resuming the failed executor, a narrow zero-exploration fix in place, or a corrected reissue — so dependent orders unblock.
---

# dispatch-orders — send work orders to the executor, keep the batch moving

You are the **strong coordinator**; the models you dispatch to are weak **executors**, deliberately
so, and a cheap **scout** handles retrieval. Dispatch is transport plus first response: the order
file *is* the context, so you hand it over with zero words added, in the right sequence, to the
right-sized model — and when an order fails you fix the *order* fast so the chain behind it doesn't
stall. A clean `DONE` needs nothing from you; a failure needs you now, not at reconcile time.

## 1. Select what is runnable, then validate it

If you were not given a feature, open
[docs/plans/active/INDEX.md](../../../docs/plans/active/INDEX.md): a row whose `Next` is
`dispatch-orders` has orders to run — `(triage)` on the row means the batch is stalled on a
FAILED/BLOCKED order, so start at step 5. Skip rows whose `State` is `blocked`: those wait on another
plan, not on you. One matching ready row is your answer; several means ask which, since nothing in
the repo ranks them.

Read every order in `docs/plans/active/<feature>/` and select:

- **Runnable** = STATUS is blank **and** every order in its `DEPENDS ON` line is `DONE`.
- Independent runnable orders **may run in parallel**; orders in a dependency chain **never** do —
  wait for the upstream STATUS before dispatching downstream.
- Never redispatch a FAILED/BLOCKED order as-is — triage it first (step 5) and reissue a corrected
  order.

**Validate the selected set before spawning.** By default, run
`.venv\Scripts\python.exe scripts/check_orders.py --fix` against only the selected runnable order
path(s) — not every active Plan. Relaxed validation reports all findings without blocking ordinary
dispatch. Add `--strict` only when the coordinator explicitly wants the legacy gate. `--fix` heals
the selected orders from their anchors where genuinely needed.

**Diagnostics are informational by default.** Do not rewrite an order merely to silence them. Record
useful categories in the dispatch report and continue with relaxed validation. Strict mode is an
opt-in review gate, not an automatic second pass.

**Re-run the selected-order check before every single dispatch in a stage**, not just once: the moment
one order lands an edit in a large shared file, every downstream line range is stale, and re-running on
the newly selected order heals it from its anchors automatically.

## 2. Pick the model from the order's required strength

Light is the default and carries every order unless the order argues its way out of it.

| Order says | opencode (preferred) | ChatGPT |
| --- | --- | --- |
| **Light** (default) | `implement-order-deepseek` (`opencode-go/deepseek-v4-flash`) | the fast/mini tier |
| Standard — `<reason>` | `implement-order-deepseek-pro` (`opencode-go/deepseek-v4-pro`) | the thinking tier |
| High — `<reason>` | do not dispatch — surface to the user to decide who runs it | |

**A higher strength with no stated reason is dispatched as Light** — `check_orders.py` rejects the
order before this point, so an unjustified Standard reaching you means the lint was skipped; send it
to Light and say so. Escalation has to name what a Light executor cannot do here; "it feels bigger"
is not that. **Not specified** also dispatches as Light — do not explore the order to judge what it
"really" needs; guessing upward here is how the default erodes.

**A Light run that comes back FAILED or BLOCKED is not grounds to re-dispatch at Standard.** Read the
FAILURE REPORT and fix the order (step 5).

opencode is the preferred transport at every strength: its subagents log as child sessions, so a run
is measurable. A ChatGPT run leaves no local record — use it only when the user asks, and expect to
reconstruct the run manually. If an order is so tiny that spawn overhead plainly exceeds the
executor's price advantage, say so and let the user choose rather than silently dispatching anyway.

## 3. Hand it over — the fixed prompt

Use this template verbatim, filling only the path. Do not add context, hints, code, or summaries of
the Plan — anything the executor needs is already in the order file, and extra words defeat the
fresh-context design:

```
Invoke the `implement-order` skill. Your work order file is:
docs/plans/active/<feature>/<NN>-<slug>.md
Read that file first and follow the skill exactly. Do not read the Plan, other orders, or docs.
```

Two transports, same prompt:

- **Spawn** — hand the template to the mapped executor, **one order per agent/session**, in the
  background (opencode: the Task tool against the strength's `implement-order-deepseek*` subagent).
  Default when the user says "dispatch" or "send off".
- **Emit** — print the prompt plus the model recommendation for the user to paste into a direct
  executor session. Use when the user asks for the prompt, or drives the executor themselves.

## 4. When results come back — classify first

For every order that reports back, read its STATUS and DEVIATIONS and classify it:

- **`DONE-CLEAN`** — `STATUS: DONE` with `DEVIATIONS: none`, and nothing about the result or worktree
  contradicts it. It's over: dispatch whatever it just unblocked. Do not review, re-verify, or polish
  — the STOP WHEN command already judged it, and the stage-level full-suite run at `reconcile` is the
  safety net.
- **`DONE-ANOMALOUS`** — `DONE`, but something is off: DEVIATIONS says a KNOWN STATE fact was wrong,
  a changed file sits outside the START IN / DO / CREATES / REMOVES authorization, or the result is
  plausible but unverified. This is not a failure yet — judge whether the deviation matters. If the
  order is genuinely done and the deviation is a fact-correction you can fold into a dependent
  order's KNOWN STATE, let it stand and fix the downstream orders. If it looks like unauthorized
  editing or a half-landed change, treat it as a failure and repair it (step 5).
- **`FAILED`** — doable as written, STOP WHEN wouldn't pass.
- **`BLOCKED`** — not executable as written: KNOWN STATE or DO was wrong (named file missing, facts
  contradict the code).

Then act. A `DONE-CLEAN` needs nothing. `FAILED`, `BLOCKED`, and a `DONE-ANOMALOUS` that matters need
the cheapest correct repair (step 5) — now, not at reconcile, because downstream orders are waiting.

## 5. Pick the cheapest correct repair

A fresh executor pays for a cold start: it re-reads every file the order names before it can touch
anything. That is the right price for real work and a bad price for a typo. Take the first of these
that applies.

**A. Resume the executor that failed.** If the transport can continue that session (opencode: a
follow-up message on the same child session) and it is still live, send the correction there — its
context already holds the files, so it fixes the code with no re-exploration. Trigger: the fix needs
any understanding of the code the executor just read. Send the missing fact, the corrected DO, and
the stop-check to rerun — nothing else.

**B. Fix it yourself, in the code.** Allowed only when every one of these holds — the narrow
direct-repair policy, shared with `reconcile`:

- the fix is **fully determined** by what is already in your context (the verbatim OUTPUT, the order
  file, files you have already read this session);
- it needs **zero exploration** — no searching for a definition, no reading a file to learn how
  something works, no "let me check the test first";
- it is **small and mechanical** — a wrong import path, a renamed prop, a missed rename, an
  off-by-one in an assertion. If you would need to think about the design, it is not this;
- the order's **STOP WHEN** is a command you can run yourself, and you run it.

Then make the edit, run STOP WHEN, and set the order's STATUS yourself to
`DONE — repaired by dispatcher` with a one-line note of what you changed. If the stop-check does not
go green on the first attempt, **stop editing** — you have left the narrow case; take route C.

**C. Reissue a corrected order.** The default, and the only route once exploration, design judgement,
or more than a couple of lines is involved. Two or more files in play, or a fix you cannot describe
in one sentence, means C. Fold the previous FAILURE REPORT's TRIED and SUSPECT lines into the new
order's KNOWN STATE as "already attempted, did not work: <approach>", and state the current worktree
as fact — which files are dirty, which tests now fail and why — rather than handing the next executor
an unknown state to rediscover.

**D. Escalate to the user.** Only when the Plan itself is wrong, the order needs a human (a real
table session), or a High-strength reissue is on the table.

Whatever the route, the diagnosis is the same: `BLOCKED` means KNOWN STATE or DO was wrong — verify
reality and correct the order's facts. `FAILED` means diagnose from the verbatim OUTPUT and the dirty
worktree files. **Diagnose before you escalate; never instead of.** Bump strength only once the
diagnosis genuinely names work beyond the model's reach — never because the order failed. Say which
route you took and why in one line, so the choice stays auditable. When every order is `DONE` (or
parked as needs-user), report the stage state and hand off to `reconcile` for the full-suite run and
doc closeout.

## Not your job

- Do **not** write implementation code for a fresh order, or review/polish code that came back
  `DONE`. You compile and repair orders; executors write the code. The single exception is repair
  route B, and only when all four of its conditions hold.
- Do **not** edit the Plan, canonical references, or any doc — that is `reconcile`'s closeout.
- Do **not** batch several orders into one executor context, or re-send a dispatched order that
  hasn't reported back.
