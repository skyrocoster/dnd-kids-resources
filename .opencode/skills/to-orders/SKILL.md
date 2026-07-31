---
name: to-orders
description: Turn ONE stage of a Plan into lean, self-contained work orders that a cheaper, weaker model can execute one at a time, each in a fresh context window. Use this after the `plan` skill, whenever the user says "turn stage N into work orders", "compile this stage", "make the tickets/orders for X", or is ready to hand implementation to an executor model. This is where the planner does the exploration up front so the executor never has to. Produces work-order files rather than code — just goal, known state, starting files, and a hard stop condition.
---

# to-orders — compile a stage into work orders (Layer 2)

You are the **strong coordinator**. You spend the exploration budget here — looking things up **once**
so the weak **executor** never re-explores, and handing pure retrieval to a cheap **scout**. A work
order is one unit of work an executor can finish in a single context window without getting lost. The
output is the **fence, not the code**: an order that pre-writes the implementation has just paid the
coordinator's rate for the executor's job. (Verified snippets planning genuinely forced into
existence are the exception — they belong in KNOWN STATE, per the `plan` skill's planning-byproducts
rule.)

## Where they live

`docs/plans/active/<feature>/NN-<slug>.md` — one file per work order, numbered in execution order.

## The work order shape — see PLAN_TEMPLATE

The full order schema and field rules live in [docs/PLAN_TEMPLATE.md](../../../docs/PLAN_TEMPLATE.md)
(Layer 2). The load-bearing fields: GOAL, DEPENDS ON, REQUIRED STRENGTH, CREATES/REMOVES, CHANGES
SIGNATURE, KNOWN STATE, KNOWN TEST FAILURES, START IN, DO, STOP WHEN, and a blank STATUS the executor
fills. `check_orders.py` enforces most of the field rules, so the shape you write is the shape the
linter re-checks before dispatch.

## Write orders with `new_order.py`, not by hand

`scripts/new_order.py` renders the maximum allowed shape from the facts you pass and lints the result
— writing nothing if it fails. It resolves bare filenames to their one repo path, derives a real line
range and anchor from `path:Symbol` for files over 400 lines, assembles the STOP WHEN command
(including the co-located suite for each source file DO edits, `--lint` for hooks, `--typecheck` for
fixtures, `--docs` for contract-managed docs, and existence assertions for every CREATES/REMOVES
path), and enforces the sizing ceiling at the argument boundary. Run `new_order.py --help` for the
argument list. `new_order.py` and `check_orders.py` are invoke-only: call them and read stdout — open
their source only to change their behaviour.

**The ceiling is enforced; the sizes below it are preferred, not absolute:**

| Ceiling (tool-enforced) | Meaning |
| --- | --- |
| 4 distinct START IN files (extra ranges of a named file free, to 6 entries) | the most files one order may name |
| 3 DO bullets | one logical change, not a list of them |
| 2 test files in STOP WHEN (at most one frontend suite) | the targeted checks one executor run can judge |

The ceiling is a refusal, not a target: an order that will not fit is the tool telling you it is two
orders — split it and set `DEPENDS ON`. Below the ceiling, "2–4 START IN entries", "roughly one
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
   prints what it changed; the remaining failures are the faults that cost a dispatch — fix them here
   for a minute rather than discovering them at executor rates. After the orders pass lint, remove
   the compiled stage's `### Stage <N>` handoff from the Plan (and `## Compiler handoff` when no stage
   subsections remain), and move any `## Planning byproducts` snippets into their orders' KNOWN STATE.
   **Re-run `--fix` between dispatches within a stage** — the moment one order edits a large shared
   file, every downstream range is stale.
7. **Set `REQUIRED STRENGTH: Light`** — the default for every order. Escalation is the exception and
   has to justify itself on the same line: name what a Light executor cannot do here. The linter
   rejects a higher strength with no reason. Reserve High for broad synthesis that should be surfaced
   to the user rather than dispatched. Before you escalate, re-read your own order: "this needs a
   stronger model" is nearly always "this order does not say enough".

## Direct-completion fast path

After compiling an order normally, you may implement it directly when dispatching would only make an
executor reread context you already hold — a marginal-cost exception, not a second default. All of
these must hold: the exact edit is fully determined by files already opened while compiling; it needs
no additional read, search, diagnosis, design choice, or architecture judgement; the whole change fits
in one edit attempt; the targeted STOP WHEN is already verified and runnable; and completing it now
will not invalidate an independently runnable order's facts or anchors. Required strength is not the
test — a Standard order can qualify when compilation removed all uncertainty, while a Light order
that still needs exploration belongs with an executor.

Preserve the normal lifecycle: write the complete order first (including its STOP WHEN), state that
it qualifies for direct completion and why, make the one determined edit, run only STOP WHEN, and on
success write `STATUS: DONE — implemented directly by planner` with the normal DEVIATIONS line. If the
edit does not apply cleanly, the check fails, or another read is needed, stop immediately and
dispatch the order normally — do not turn `to-orders` into an implementation session. At most one
order per invocation; more than one means implementation is becoming the session's job.

## Worked example

The reference order at
[docs/plans/_example/99-creature-row-ac.md](../../../docs/plans/_example/99-creature-row-ac.md)
names real files and passes `check_orders.py` — read it rather than a paraphrase and copy its shape:
one logical change, one precedent, every fact pre-answered, one runnable stop-check.

## What NOT to do

- Do not inline the implementation code the executor should write — code written here was paid for at
  the coordinator's rate. The single exception is already-paid-for code: snippets from the Plan's
  `## Planning byproducts` appendix or verified while compiling, moved verbatim into KNOWN STATE and
  marked `verified snippet — use as-is:`, then deleted from the Plan.
- Do not touch the manifest, references, or area guides here — that's `reconcile`, after orders ship.

## Next step

Hand each order to an executor via the `dispatch-orders` skill (which wraps `implement-order`), one
fresh context per order. When a stage's orders are all `DONE`, run **`reconcile`**.
