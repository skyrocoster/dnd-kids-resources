---
name: dispatch-orders
description: Send compiled work orders off to an executor — a cheaper, weaker model — one order per fresh context, and keep the batch moving. Use this after `to-orders`, whenever the user says "dispatch the orders", "send off the orders", "run the orders", or "hand these to the small model". Selects the next runnable orders by DEPENDS ON and STATUS, maps required strength to a model, hands each order over with a fixed minimal prompt (spawned subagent or paste-ready prompt for a direct executor session), and — when an order comes back FAILED or BLOCKED — triages the FAILURE REPORT immediately and takes the cheapest correct repair — resuming the failed executor, a narrow zero-exploration fix in place, or a corrected reissue — so dependent orders unblock.
---

# dispatch-orders — send work orders to the executor, keep the batch moving

You are the **planner** here; the models you dispatch to are **executors** — cheaper and weaker, and
deliberately so. Dispatch is transport plus first response. The order file **is** the context; your
job is to hand it over with zero words added, in the right sequence, to the right-sized executor —
and when an order fails, to fix the *order* fast so the chain behind it doesn't stall. A `DONE`
needs nothing from you; a failure needs you now, not at reconcile time.

## 1. Select what is runnable

Read every order in `docs/plans/active/<feature>/`:

- **Runnable** = STATUS is blank **and** every order in its `DEPENDS ON` line is `DONE`.
- Independent runnable orders **may run in parallel**. Orders in a dependency chain **never** do —
  wait for the upstream STATUS before dispatching downstream.
- Never redispatch a `FAILED`/`BLOCKED` order as-is — triage it first (step 4) and reissue a
  corrected order.

Then run `.venv\Scripts\python.exe scripts/check_orders.py --fix` (POSIX: `.venv/bin/python`) and fix
anything it still reports **before** spawning. It is the last cheap moment: every rule in it is a
fault that has already cost a dispatch, and an order that fails the lint will fail slowly and
expensively in an executor instead.

**Run it again before every single dispatch in a stage, not just once at the start.** The moment one
order lands an edit in a large shared file, every downstream order's line ranges are stale. `--fix`
re-heals them from their anchors automatically, which is the mechanised version of the manual
re-verification that cut locating re-reads from 6 to 1 in the Map Lab stage — except it costs a
command instead of a read of a 2,300-line file.

**Then snapshot every order you are about to dispatch**, once it is final:

```
.venv\Scripts\python.exe scripts/order_telemetry.py --snapshot --order docs/plans/active/<feature>/<NN>-<slug>.md
```

This freezes the order's compiled shape while it still exists. A reissue overwrites the order file
in place, so shape read at report time is the shape of whichever version happened to survive — that
is how the BLOCKED entry of 2026-07-26 lost its measurements and had to carry a caveat explaining
that its numbers belonged to the *next* run. The snapshot also gives the reissue diff, which is the
only direct evidence of what a re-dispatch actually changed.

It prints the shape it captured. Read the line: if it warns that a large START IN file has no
bounded range, fix that before dispatching. Every re-read loop the log has recorded so far came from
that one shape — an exact line number pointing into a file thousands of lines long, which the
executor then pays to re-locate on every return trip.

## 2. Pick the model from the order's required strength

**Light is the default and carries every order unless the order argues its way out of it.**

| Order says | opencode (preferred) | ChatGPT | Claude Code |
|---|---|---|---|
| **Light** (default) | `implement-order-deepseek` subagent (`opencode-go/deepseek-v4-flash`) | the fast/mini tier (e.g. `gpt-5.4-mini`, `gpt-5.6-terra-fast`) | haiku |
| Standard — `<reason>` | `implement-order-deepseek-pro` subagent (`opencode-go/deepseek-v4-pro`) | the thinking tier (e.g. `gpt-5.5`, `gpt-5.6-sol`) | sonnet |
| High — `<reason>` | do not dispatch — surface it to the user to decide who runs it | | |

**A higher strength with no stated reason is dispatched as Light.** `check_orders.py` rejects the
order before this point, so an unjustified `Standard` reaching you means the lint was skipped — send
it to Light and say so. Escalation has to name what a Light executor cannot do here; "it feels
bigger" is not that, and on the evidence it is usually an under-specified order rather than an
under-powered model.

**A Light run that comes back FAILED or BLOCKED is not grounds to re-dispatch at Standard.** Read
the FAILURE REPORT and fix the order (step 5). The one order in the log that was escalated after a
block stalled again at the higher strength and closed only when its actual defect was diagnosed —
paying twice for the same missing fact.

**opencode is the preferred transport at every strength**: its subagents are logged as child sessions
with their own model, cost, and token columns, so `order_telemetry.py` parses the run automatically.
A ChatGPT run leaves no local record and costs you every cost-driver metric — use it only when the
user asks for it, and expect a `--manual` telemetry entry.

**Not specified**: dispatch it as Light. Do not explore the order to judge what it "really" needs —
that is the planner's job at compile time, and guessing upward here is how the default erodes.

If an order is so tiny that spawn overhead plainly exceeds the executor's price advantage (a
one-line mechanical edit), say so and let the user choose rather than silently dispatching anyway.

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
  background. In opencode that is the Task tool against the strength's `implement-order-deepseek*`
  subagent; in Claude Code it is the Agent tool with the mapped model; other harnesses, their
  equivalent. Default when the user says "dispatch" or "send off".

  **Note the child session/task id the spawn returns, and pass it to the telemetry script.** Your own
  session names the order file too — you wrote the dispatch prompt into it — so auto-discovery has to
  exclude parents to avoid recording *your* model and tokens as the executor's. It now does, which
  means a child that left no record yields no entry at all rather than a wrong one. The id you
  already hold is what turns that miss back into a measurement.
- **Emit** — print the prompt plus the model recommendation for the user to paste into a direct
  executor session. Use when the user asks for the prompt, or drives the executor themselves.

## 4. When results come back

**First, log telemetry for every order that reports back** (DONE, FAILED, or BLOCKED alike),
before the order file can be deleted at reconcile:

- **Spawned agent (Claude Code) or opencode session:** run
  `.venv\Scripts\python.exe scripts/order_telemetry.py --order docs/plans/active/<feature>/<NN>-<slug>.md --fault <order|executor|mixed|none> --note "<your read of the run>"`
  (POSIX: `.venv/bin/python`), adding `--opencode-session <child id>` or `--transcript <path>` when
  you have it. It finds the executor's **child** record in both transports (a Claude subagent
  transcript or an opencode session with a parent), computes token totals and cost drivers
  (largest tool results, duplicate reads split into locating vs post-edit, reads outside START IN),
  reads the order's shape from its dispatch snapshot, and records the run in
  `docs/plans/telemetry.jsonl`, re-rendering `docs/plans/telemetry-log.md` from it. Do not
  estimate or invent numbers yourself — if the script errors, log with `--manual` and note the
  failure.

  **Never hand-edit `docs/plans/telemetry-log.md`.** It is generated from the sidecar and your
  edit will be overwritten on the next entry.

  **A run that wrote no STATUS line still gets an entry.** If it was cancelled or stalled, the
  script refuses to log a silent "not recorded" and asks for `--status "<what happened>"` — those
  are the runs worth reading later, and two of them have already lost their outcome that way.

- **`--fault` and `--note` are both required, on every entry, in every transport.** The script
  measures what happened; only you can say *why*, and only now — at reconcile the order file is
  deleted and the evidence goes with it.

  `--fault` is the verdict in one word — `order`, `executor`, `mixed`, or `none` — so it can be
  counted across a cycle instead of re-read as prose, and so the script can check it against the
  measured lines. Claim `none` and the entry will carry a `flag:` line if the transcript recorded
  reads outside START IN or post-edit re-reads; three notes in the first three cycles asserted a
  clean run while the lines directly above them said otherwise. If you have a longer diagnosis,
  put the one-sentence lesson in `--note` and the reasoning in `--note-detail`.

  Write a `--note` that a future compiler can act on:
  - **Attribute the cost drivers.** A big read, a duplicate read, a read outside START IN, a high
    turn count — was that the executor wandering, or did the order send it there? Name the
     specific line of the order at fault ("KNOWN STATE named `maplabModel.test.ts` without its
     directory, so it probed the wrong folder first"), not a vague "could be tighter".
  - **Reconcile measured and declared evidence.** The transcript's duplicate-read and
    outside-START-IN metrics are independent of the executor's DEVIATIONS block. Never write "no
    duplicate reads" because DEVIATIONS says `none`, and never write that an order stayed inside
    START IN when the measured paths or a declared out-of-scope section say otherwise. If a named
    path was opened outside its bounded symbol/range, call that a scope miss even though the path
    itself appears in START IN.
  - **Be just as explicit when the run was clean** — "no duplicate reads, nothing outside START
    IN; the verified-facts block held" is the signal that a compiling pattern is working and
    should be repeated.
  - **Judge the model choice.** Did Light suffice, or did it thrash? This is the record that
    tells the next dispatch whether to hold or escalate the strength.
  - **A declared deviation always gets a verdict**: in scope, or a real overreach.
  - Omitting the flag logs `compiler note: not recorded` — a visible hole in the record, not a
    silent one. Do not paper over it by writing the note from memory later.
- **Other transports (ChatGPT etc.):** no local record exists. Take the executor's `RUN SUMMARY`
  line from the order file if it wrote one, ask the user for whatever token totals their tool
  shows, then run the same script with `--manual "<in/out tokens as reported>"` plus
  `--model "<name>"` and `--turns <N>` when known — it still captures the order's STATUS and
  DEVIATIONS, and prints a `missing:` line for whatever is absent. If the user has no numbers,
  run it with `--manual "no usage figures available"`. Never estimate the numbers yourself.
  `--note` still applies here, and matters *more*: with the measured cost drivers unavailable,
  your read of the run is the only signal the entry carries.
- **Prefer a transport that keeps the record.** A run in a chat UI costs you every cost-driver
  metric. If the user is driving the executor themselves, point them at opencode rather than a
  browser chat: opencode logs spawned subagents as child sessions with their own model, cost, and
  token columns, so `order_telemetry.py` parses them automatically.

Then act on the STATUS:

- **`DONE`** — it's over; nothing else is needed for that order. Dispatch whatever it just
  unblocked. Do not review, re-verify, or polish DONE work — the STOP WHEN command already judged it,
  and the stage-level full-suite run at `reconcile` is the safety net.
- **`FAILED` / `BLOCKED`** — intervene now, because downstream orders are waiting on this one.
  Read the FAILURE REPORT, then pick the **cheapest repair that is still correct** (step 5).
  Whatever the route, the diagnosis is the same:
  - `BLOCKED`: KNOWN STATE or DO was wrong — verify reality, correct the order's facts.
  - `FAILED`: diagnose from the verbatim OUTPUT and the dirty worktree files. A reissued order
    folds the report's TRIED/SUSPECT lines into KNOWN STATE as "already attempted, did not work",
    and **states the current worktree as fact** — which files are dirty, which tests now fail and
    why — rather than handing the next executor an unknown state to rediscover.

  **Diagnose before you escalate; never instead of.** Strength may be bumped only once you have an
  actual root cause. The log ran this experiment: a stalled Light order was reissued at Standard
  with the same undiagnosed failing state, stalled again after thirty minutes, and closed only when
  someone reproduced the failure directly and found that two tests needed one settled state
  transition before mocking the next request rejection. The reverse case is just as clear — the
  cheapest, cleanest run in the whole log was a corrective order written from a complete diagnosis:
  exact file and line, the exact wrong values, the repo's correct idiom, a named fix. Eighteen tool
  calls, no deviations, at Light.

  So when an order comes back FAILED or stalls: reproduce it yourself first. If the diagnosis shows
  the order was under-specified, reissue at the same strength with the missing fact. Bump strength
  only when the diagnosis genuinely names work beyond the model's reach.
  - Escalate to the user only when the Plan itself is wrong, the order needs a human (e.g. a real
    table session), or a High-strength reissue is on the table.
- When every order is `DONE` (or parked as needs-user), report the stage state and hand off to
  `reconcile` for the full-suite run and doc closeout.

## 5. Pick the cheapest correct repair

A fresh executor pays for a cold start: it re-reads every file the order names before it can touch
anything. That is the right price for real work and a bad price for a typo. Take the first of these
that applies.

**A. Resume the executor that failed.** If the transport can continue that session (in Claude Code,
`SendMessage` to the agent's ID; in opencode, a follow-up message on the same child session) and the
session is still live, send the correction there. Its context already holds the files, so it fixes
the code with no re-exploration — and telemetry stays attached to one record. Prefer this whenever
the fix needs any understanding of the code the executor just read. Send the correction the same way
you'd write it into the order — the missing fact, the corrected DO, the stop-check to rerun — and
nothing else.

**B. Fix it yourself, in the code.** Allowed, narrowly. All four must hold:

- The fix is **fully determined** by what is already in your context — the verbatim OUTPUT, the
  order file, files you have already read this session.
- It needs **zero exploration**: no searching for a definition, no reading a file to find out how
  something works, no "let me check the test first".
- It is **small and mechanical** — a wrong import path, a renamed prop, a missed rename, an off-by-one
  in an assertion. If you would need to think about the design, it is not this.
- The order's **STOP WHEN** command is one you can run yourself, and you run it.

Then: make the edit, run STOP WHEN, and set the order's STATUS yourself to
`DONE — repaired by dispatcher` with a one-line note of what you changed. Log telemetry for the
failed run as usual, and say in `--note` that the dispatcher finished it and why the order let the
executor fail. If the stop-check does not go green on the first attempt, **stop editing** — you have
left the narrow case. Revert or leave the worktree as-is and take route C.

**C. Reissue a corrected order.** The default, and the only route once exploration, design judgement,
or more than a couple of lines is involved. Two or more files in play, or a fix you cannot describe
in one sentence, means C.

Say which route you took and why in one line, so the choice stays auditable.

## Not your job

- Do **not** write implementation code for a fresh order, or review/polish code that came back
  `DONE`. You compile and repair orders; executors write the code. The single exception is repair
  route B in step 5, and only when all four of its conditions hold.
- Do **not** edit the Plan, canonical references, or any doc — that is `reconcile`'s closeout.
- Do **not** batch several orders into one executor context, or re-send a dispatched order that
  hasn't reported back.
