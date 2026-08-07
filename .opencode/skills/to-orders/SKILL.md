---
name: to-orders
description: Turn ONE stage of a Plan into lean, self-contained work orders and implement a single emitted order in the current context. Use this after `create-plan` or `to-plan`, whenever the user says "turn stage N into work orders", "compile this stage", "make the tickets/orders for X", or is ready to hand implementation to an executor model. This is where the planner does the exploration up front so the executor never has to. Multiple emitted orders go to dispatch; a single emitted order is implemented by the creating agent.
---

# to-orders — compile a stage into work orders (Layer 2)

You are the **strong coordinator**. You spend the exploration budget here — looking things up **once**
so the weak **executor** never re-explores, and handing pure retrieval to a cheap **scout**. A work
order is one unit of work an executor can finish in a single context window without getting lost. The
output is the **fence, not the code**: an order that pre-writes the implementation has just paid the
coordinator's rate for the executor's job. (Verified snippets planning genuinely forced into
existence are the exception — they belong in KNOWN STATE, per the plan-creation skills' planning-byproducts
rule.)

## Delegated authoring

When order authoring is delegated to the `work-order-author` subagent, the coordinator still owns the
judgment. Give the subagent an explicit handoff containing the Plan and stage, order intent, decisions
already made, dependencies, and authorized scope. The subagent may locate symbols, tests, anchors, and
line ranges, then emit and lint the order with `new_order.py` and `check_orders.py --fix`. Authoring is
permissive: deterministic errors must be repaired, while heuristic warnings and shape caps are advisory.
The authoring subagent must explicitly approve remaining warnings, and the coordinator may let them pass
only when both conditions hold: the subagent approved the named warning categories, and the coordinator's
own review finds no concrete risk that the order or its resulting change will actively break the application.
The coordinator's review is a safety check, not a second strict linter pass: check for deterministic errors,
misleading facts or anchors, unauthorized scope, an unsafe stop condition, and any obvious application-breaking
impact. If either condition is missing, repair or block the order. Record the accepted warning categories and
the coordinator's no-breakage judgment in the report; do not rewrite an order solely to silence an accepted warning.
The normal workflow remains non-strict; do not add a second strict validation pass.
The explicit decision format is `ACCEPT WARNINGS: <order path> — <warning categories>`.
Use `ACCEPT WARNINGS` only after the authoring subagent has supplied the same approval and the coordinator
has confirmed `NO ACTIVE BREAKAGE: <order path> — <brief reason>`. A warning is not a work-order failure
merely because it remains in relaxed checker output.

The subagent must not choose behavior, architecture, order boundaries, dependencies, or required
strength, and it must not edit the Plan or implementation files. After it returns, the coordinator must
review every order for semantic correctness, scope, verified KNOWN STATE, START IN authorization, DO
anchors, dependencies, and STOP WHEN before dispatching any executor. A passing order linter is a
mechanical gate, not a substitute for that review.

## Where they live

`docs/plans/active/<feature>/NN-<slug>.md` — one file per work order, numbered in execution order.

## The work order shape — see PLAN_TEMPLATE

The full order schema and field rules live in [docs/PLAN_TEMPLATE.md](../../../docs/PLAN_TEMPLATE.md)
(Layer 2). The load-bearing fields: GOAL, DEPENDS ON, REQUIRED STRENGTH, CREATES/REMOVES, CHANGES
SIGNATURE, KNOWN STATE, KNOWN TEST FAILURES, START IN, DO, STOP WHEN, and a blank STATUS the executor
fills. `check_orders.py` enforces most of the field rules, so the shape you write is the shape the
linter re-checks before dispatch.

## Write orders with `new_order.py`, not by hand

`scripts/new_order.py` renders the maximum allowed shape from the facts you pass and reports lint
diagnostics; relaxed authoring writes the order even when diagnostics remain. Pass `--strict` when
you intentionally want the old refusal gate. It resolves bare filenames to their one repo path, derives a real line
range and anchor from `path:Symbol` for files over 400 lines, assembles the STOP WHEN command
(including the co-located suite for each source file DO edits, `--lint` for hooks, `--typecheck` for
fixtures, `--docs` for contract-managed docs, and existence assertions for every CREATES/REMOVES
path), and enforces the sizing ceiling at the argument boundary. Run `new_order.py --help` for the
argument list. `new_order.py` and `check_orders.py` are invoke-only: call them and read stdout — open
their source only to change their behaviour.

**PowerShell quoting:** when a `--start-in` value contains prose, quotes, or an em dash, do not fight
the shell. Build a JSON object in a PowerShell hashtable, pipe it through `ConvertTo-Json -Depth 3`,
and invoke `scripts/new_order.py --json -`; repeatable fields are arrays (`known`, `start_in`, `do`,
`tests`, and so on), booleans are `$true`/`$false`, and keys use underscores (`start_in`, `depends_on`).
This is still the invoke-only generator path; the JSON is input data, not a hand-written order.

**The ceiling is enforced; the sizes below it are preferred, not absolute:**

| Ceiling (tool-enforced) | Meaning |
| --- | --- |
| 4 distinct START IN files (extra ranges of a named file free, to 6 entries) | the most files one order may name |
| 3 DO bullets | one logical change, not a list of them |
| 2 test files in STOP WHEN (at most one frontend suite) | the targeted checks one executor run can judge |

The ceiling is guidance in relaxed mode, not a target: an order that will not fit may still be written,
but the tool tells you it is probably two orders — split it and set `DEPENDS ON`. Below the ceiling, "2–4 START IN entries", "roughly one
screen", and "2–3 related files" describe the *preferred* size for a weak model, not a quota to fill.
Hand-write an order only when it needs a shape the tool cannot express; the fields and the ceiling are
identical either way.

## Get these right and a weak model can't wander

- **KNOWN STATE** — answers, not pointers. Write the actual values (the path, the count, the current
  text), not "check the API". A fact already recorded in the Plan's compiler handoff is paid for —
  carry it over rather than rediscovering it. A **descriptive** conditional is fine: "If order 03
  landed, the helper is shared; otherwise each file has its own copy." What the linter rejects, and
  what hands the executor a decision it is worst at, is an **imperative** conditional — "if the
  helper doesn't exist, create one". Decide that while compiling and state it flatly.
- **START IN** — bounded exploration. Name real, verified paths; open them yourself while compiling.
  A bare filename is a search instruction, and a symbol with no home costs a locating read. Every
  file over 400 lines needs a range plus an anchor: `lines 860-905 @"function RoomDetailsPanel({"`.
  A bare line number is not a bound (it says where to start, not where to stop), and an unanchored
  symbol makes the executor pay to find it. You do not derive ranges by hand — write the symbol in
  backticks and run `check_orders.py --fix`, which resolves it and keeps the range true against its
  anchor. Under 400 lines, reading the file whole *is* the scope; say what's needed in prose. When an
  entry names a range, that range is the authorization — opening unrelated sections of the same file
  is a deviation. For a new test, anchor the block it joins (a `describe`/`it`/`test` line), not the
  fixture it reuses.
- **DO** — the intent in 1–3 lines, with the **anchor text to match** at each edit site. If DO says
  touch a file, START IN must list it. Trust the executor to write the code; don't write it for them.
- **CREATES / REMOVES** — artifact lifecycle, declared separately from exploration. Name the same
  full path in DO, and let the tool add the existence/non-existence assertions to STOP WHEN.
- **CHANGES SIGNATURE** — every exported symbol whose signature this order changes, or `none` — a
  type is a signature too. Declaring it makes the linter grep for call sites and require the changed
  module's own suite in STOP WHEN.
- **STOP WHEN** — the leash. A **targeted** command naming exact test files — never a bare `pytest`,
  `npm test`, or `tsc -b`; full-suite runs are `reconcile`'s job. Prefer
  `python scripts/order_check.py --tests <path> --typecheck --lint` to a raw chain: same checks,
  pass/fail plus the failing names, none of the runner noise. Raw shapes when needed: backend
  `pytest backend/tests/<file>.py --no-cov` (the `--no-cov` is required — without it the coverage
  gate fails every subset), frontend `cd frontend && npm run test:check -- <path/to/File.test.tsx>`
  (vitest judged against `frontend/known-test-failures.json` — a clean pass/fail that fails only on
  *new* failures). Two additions the linter enforces: every source file DO edits needs its own
  co-located suite in STOP WHEN, and any order touching a hook or dependency array includes
  `npm run lint`. Whenever an order writes a fixture for a domain-typed object, put the repo's cast
  idiom in KNOWN STATE with a real sibling example and append `&& npm run typecheck`. Structural docs
  orders append `.venv\Scripts\python.exe scripts/check_docs.py --check`. Session-run orders stop at a
  record, not a command — see [docs/TABLE_TESTING.md](../../../docs/TABLE_TESTING.md).
- **STATUS / DEVIATIONS / FAILURE REPORT** — left blank; the executor fills them. Their exact format
  is in PLAN_TEMPLATE.

## Sizing an order against a big test file

One order adds tests to **at most one test file**, and against a large integrated suite (over ~800
lines) it gets **one behaviour** — a request for seven integrated async behaviours through a 1,700-line
page suite is how orders stall. When the behaviour turns on a non-obvious **test seam** (routing,
provider state, timers, async settling — e.g. "the hook suppresses its initial-load save, so a
save-error test must settle one transition before mocking the next rejection"), verify the exact
transition idiom while compiling and state it as an answer in KNOWN STATE. Do not make the executor
diagnose the harness to implement the behaviour.

## Frontend orders carry the UX decisions

If an order touches `frontend/src/`, copy the lines of the Plan's **UX decisions** block that apply to
its files into KNOWN STATE — literal copy strings, empty-state status, confirmation message, focal
element, touch floor. The executor never reads the `ux-design` skill; the order is how those
decisions reach it. If the Plan has no UX decisions block and the stage touches the frontend, stop
and run `ux-design` before compiling.

## Delegate the fact-finding, keep the judgement

Compiling is two jobs: **finding out what is true** (retrieval — hand it to the cheap **scout**,
opencode's `explore-deepseek`) and **deciding what the order should say** (yours). Your own-read
budget is about **2,000 lines per invocation** — the same context `dispatch-orders` and `reconcile`
still need for the stage, so spend it as you would money. Small files (≤400 lines, the START IN
threshold) are safe to read whole; large files only by range; past roughly ten files or 2,000 lines
on one question, the question was never the problem.

In delegated authoring mode, `work-order-author` performs the retrieval and mechanical emission from
your handoff. You still review its output as described above; do not treat its linter result as a
semantic approval.

Delegate what you do not already know and can get as a quote: "Which files import
`useMapLabSessionState`, at what lines?", "Find a test that mocks the NPC list endpoint and quote its
`mockResolvedValue` line", "How many tests are in `PlayerMapRenderer.test.tsx` and what are the
`describe` names?". Read it yourself when you need the file anyway to decide the order's shape and it
is small, when the question is judgement wearing a question mark ("is this the right seam", "is this
order too big"), or for at most three small files you can name without searching.

Four rules keep delegation honest: bound every question and send at most four per dispatch ("How does
session state work?" is a whole context window, not a question); expect a partial answer sometimes —
the scout stops at its read budget and reports what it did not reach; ask for quotes, not conclusions
— its report is evidence you judge, and a recommendation in it is unverified; and a cited `path:line`
is not a verification for a file whose contents shape the order — START IN still means a file you
opened.

## When you were not told which plan

[docs/plans/active/INDEX.md](../../../docs/plans/active/INDEX.md) lists every in-flight plan and, in
its `Next` column, which skill it is waiting for. A row whose `Next` is `to-orders` is one you can
pick up. Skip `blocked` rows. If exactly one `ready` row says `to-orders`, that is the plan; if
several do, say which and ask — choosing between ready plans is the user's call.

## How to compile a stage

1. **Resolve the handoff first.** Read the Plan stage and, when present, its `### Stage <N>`
   contract-readiness handoff — carry verified edit sites, tests, contracts, and constraints into
   KNOWN STATE and START IN rather than rediscovering them. Resolve every **Open question** that is a
   lookup. If one turns out to be a design decision (identity source, migration semantics, layer
   ownership), it is not yours to settle mid-compile: stop, put it to the user with the two or three
   facts it turns on, record the decision in the Plan, then resume.
2. **Split the stage into logical changes.** One change per order. When independent orders touch the
   same files, add explicit `DEPENDS ON` so they never run against each other's edits.
3. **Fill KNOWN STATE with verified facts** and name exact START IN files you actually opened, each
   scoped to what the executor needs. Declare every created/removed artifact.
4. **Verify the stop-check yourself before writing STOP WHEN.** Run the test command; on the frontend
   a green `test:check` result means the executor gets one too. If a test already fails that is not
   on `frontend/known-test-failures.json`, fix it or add it — never leave the executor to trip over
   it. On the backend, put already-failing pytest node ids verbatim into **KNOWN TEST FAILURES**.
5. **Emit each order with `scripts/new_order.py`** — number in dependency order, set `DEPENDS ON`. A
   refusal is a sizing verdict: split and emit two. Leave STATUS blank.
6. **Run the linter before you dispatch:** `.venv\Scripts\python.exe scripts/check_orders.py --fix`.
   `--fix` repairs the mechanical faults (bare filenames, stale ranges, symbol-scoped entries) and
   prints what it changed. Deterministic failures are dispatch blockers and must be fixed here. The
   command may still print heuristic warnings or shape-cap guidance. Apply the two-part approval gate above:
   repair or block warnings without subagent approval or with any active-breakage risk; otherwise record
   `ACCEPT WARNINGS` and `NO ACTIVE BREAKAGE` and continue. Do not split or rewrite an order just to make
   an accepted warning disappear. After the orders pass lint, remove
   the compiled stage's `### Stage <N>` handoff from the Plan (and `## Compiler handoff` when no stage
   subsections remain), and move any `## Planning byproducts` snippets into their orders' KNOWN STATE.
   **Re-run `--fix` between dispatches within a stage** — the moment one order edits a large shared
   file, every downstream range is stale.
7. **Set `REQUIRED STRENGTH: Light`** — the default for every order. Escalation is the exception and
   has to justify itself on the same line: name what a Light executor cannot do here. The linter
   rejects a higher strength with no reason. Reserve High for broad synthesis that should be surfaced
   to the user rather than dispatched. Before you escalate, re-read your own order: "this needs a
   stronger model" is nearly always "this order does not say enough".

## Single-order completion

When compilation produces exactly one order, the creating coordinator implements that order in the
same context instead of dispatching it to a fresh executor. This is the normal single-order route,
not an optional optimization: use the files and facts already gathered while compiling, and do not
throw away that context merely to have the executor reread it. Additional narrow reads are allowed
when needed to execute the already-settled order; do not make new design, architecture, contract, or
scope decisions during implementation.

Preserve the normal lifecycle: write and lint the complete order first (including its STOP WHEN),
then implement only that order, run only STOP WHEN, and on success write `STATUS: DONE — implemented
directly by planner` with the normal DEVIATIONS and EVIDENCE ENVELOPE. If the order exposes an
unsettled design, architecture, contract, diagnosis, or scope question, stop and surface it rather
than widening the work. If the edit or check fails, record the failure in the order and triage it in
the current context; do not silently hand the single order to `dispatch-orders` after compilation.

If compilation produces two or more orders, do not implement any of them in this context. Leave every
order complete and linted, then hand the stage to `dispatch-orders`, one fresh executor context per
order, in dependency order.

## Planned quick stages are decided before `to-orders`

If Plan review identifies a stage as a planned quick stage, do not invoke this skill merely to create a
small order. Route it to `quick-executor` with the existing `implement-quick` brief instead. The brief
must contain exact `GOAL`, `AUTHORIZED PATHS`, `KNOWN FACTS`, `CHANGE`, `CHECK`, and `ESCALATE IF`
sections, and the coordinator must already have verified every fact it supplies.

This exception is narrower than normal work-order compilation: one atomic edit, no remaining design,
architecture, contract, or diagnosis decision, and one focused check. The quick executor does not edit
the Plan or create bookkeeping. On success, the coordinator records the stage in the Plan and explicitly
invokes `reconcile` for that Plan for normal stage-level closeout. On escalation or failed verification,
stop the quick route and compile a normal work order with the settled facts; do not repair by widening
the brief.

## Worked example

The reference order at
[docs/plans/_example/99-creature-row-ac.md](../../../docs/plans/_example/99-creature-row-ac.md)
names real files and passes `check_orders.py` — read it rather than a paraphrase and copy its shape:
one logical change, one precedent, every fact pre-answered, one runnable stop-check.

## What NOT to do

- Do not implement any order when the stage produced two or more orders; those belong to fresh
  executors through `dispatch-orders`. For a single emitted order, implementation in this context is
  explicitly required after the complete order is written and linted. Do not inline implementation
  code in the order itself — code written here was paid for at the coordinator's rate. The exception
  is already-paid-for code: snippets from the Plan's `## Planning byproducts` appendix or verified
  while compiling, moved verbatim into KNOWN STATE (marked `verified snippet — use as-is:`), then
  deleted from the Plan.
- Do not touch the manifest, references, or area guides here — that's `reconcile`, after orders ship.

## Next step

For one emitted order, finish its implementation and STOP WHEN in this context. For two or more
orders, hand each order to an executor via the `dispatch-orders` skill (which wraps
`implement-order`), one fresh context per order. When a stage's orders are all `DONE`, run
**`reconcile`**.
