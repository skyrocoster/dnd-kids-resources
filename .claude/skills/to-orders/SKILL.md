---
name: to-orders
description: Turn ONE stage of a Plan into lean, self-contained work orders that a cheaper, weaker model can execute one at a time, each in a fresh context window. Use this after the `plan` skill, whenever the user says "turn stage N into work orders", "compile this stage", "make the tickets/orders for X", or is ready to hand implementation to an executor model. This is where the planner does the exploration up front so the executor never has to. Produces work-order files rather than code — just goal, known state, starting files, and a hard stop condition.
---

# to-orders — compile a stage into work orders (Layer 2)

A **work order** is one unit of work an executor model can finish in a single context window without
getting lost. This is where the planner spends its exploration budget: you look things up **once** so
the executor never re-explores. The output here is still **the fence, not the code** — an order that
pre-writes the implementation has just paid the planner's rate for the executor's job. (Verified
snippets that exploration genuinely forced into existence are the exception: they belong in KNOWN
STATE, per the `plan` skill's planning-byproducts rule.)

## Where they live

`docs/plans/active/<feature>/NN-<slug>.md` — one file per work order, numbered in execution
order. `<feature>` matches the Plan's filename.

## What to optimise

**First-pass success, not executor tokens.** An executor run costs cents; the telemetry log's cheap
and expensive *successful* orders differ by a few pence. A re-dispatch costs a cold start, the
planner's attention, and a stalled dependency chain behind it — and the one order that had to be
abandoned and reissued cost more than every token difference in its batch combined. Read the token
columns as a diagnosis of *why* an order thrashed; aim at getting it right the first time.

Escalating strength does not buy that. The abandoned order stalled at Light and stalled again at
Standard, and closed only once someone diagnosed the actual failure. Order shape is the lever.

## The work order template

Keep each order to **roughly one screen**. One work order = **one logical change** (it may touch
2–3 related files, e.g. a component and its test).

```
WORK ORDER <NN> — <short title>
GOAL: <one sentence — what "done" looks like>
DEPENDS ON: <order NN that must be DONE first, or "none">
REQUIRED STRENGTH: Light   <-- the default for every order; Standard/High need "— <reason>"
CREATES: <repo-relative paths this order creates, one bullet each, or "none">
REMOVES: <repo-relative paths this order removes, one bullet each, or "none">
CHANGES SIGNATURE: <`symbol` in <path> for each exported signature this order changes, or "none">

KNOWN STATE (already true — do NOT redo or re-derive):
- <a fact the executor would otherwise waste a context window discovering>
- <another fact — real values, real file locations, current test count, etc.>

KNOWN TEST FAILURES (pre-existing — NOT yours to fix, NOT caused by you):
- <backend only: exact pytest node id that already fails; frontend runs use npm run test:check,
  which reads the checked-in list itself. Omit the section when there is nothing to say.>

START IN:
- <exact path> — lines <A>-<B> @"<line A, verbatim>"   <-- required for files over 400 lines
- <exact path> — <what's needed>                        <-- under 400 lines: reading it whole IS the scope
- <2–4 entries, each verified by opening it while compiling>

DO:
- <1–3 terse lines: what to change and where, with the anchor text to match — no code>

STOP WHEN: <a single runnable command that must pass, or "if X = Y, stop">

STATUS: <-- executor writes DONE, FAILED - <one-line reason>, or BLOCKED - <one-line reason>
```

`scripts/check_orders.py` enforces most of what follows. Run it on the stage before you dispatch
anything (`.venv\Scripts\python.exe scripts/check_orders.py`); it is the same lint the documentation
gate runs, and every rule in it is one fault the telemetry log already paid for.

## Why each field exists — get these right and a weak model can't wander

- **KNOWN STATE** — the focus leash's memory. Write the *actual answers* here (the value, the file, the
  count), not a pointer like "check the API". If you tell the executor to "go find out", you've just
  moved the exploration cost onto the model that's worst at paying it. Answer, don't point.

  **Never write a conditional here.** "If order 03 left that inline, lift it into a shared function",
  "if the helper doesn't exist yet, create one" — each of these hands the executor an architecture
  decision, which is exactly what it is worst at and exactly what this skill was supposed to have
  settled. If dependent orders share code, decide *while compiling* where it lives and say so flatly,
  including which layers it may import from. (A real case: a conditional like the one above put a
  `features/` import into `src/model/`, which `ARCHITECTURE.md` forbids. `oxlint` now catches that
  particular breach; the conditional that caused it would find a different one.) The linter rejects
  a conditional paired with an imperative verb in KNOWN STATE or DO.
- **START IN** — bounded exploration. The executor explores *these* files, not the whole repo. Name
  real, verified paths — open them yourself while compiling to be sure they're right. A bare
  filename is a search instruction: an order that said `maplabModel.test.ts` with no directory sent
  its executor probing the wrong folder first. The same goes for a symbol with no home — naming
  `UserIcon` without `frontend/src/components/icons/index.ts` bought a ~4.3k-token barrel read to
  find one export.

  **Every entry over 400 lines needs a range and an anchor.** An unbounded START IN file gets read
  *whole*, so a 1000-line file named for a one-line change costs ~9.7k tokens instead of ~200:

  ```
  - frontend/src/features/dungeons/maplab/MapLabPage.tsx — the <RoomDetailsPanel> render: lines 860-905 @"function RoomDetailsPanel({"
  ```

  **A bare line number is not a bound, and a symbol name is not either.** "at line 873" says where
  to start and nothing about where to stop. A symbol name says what to find but makes the executor
  pay to find it — four consecutive orders in one stage spent their only measurable waste on exactly
  that, one re-locating read per symbol per visit. Both are now rejected by the linter for files over
  400 lines. Under 400 lines, reading the file whole *is* the scope; say what's needed in prose.

  **You do not have to derive ranges by hand.** Write the symbol in backticks and run
  `.venv\Scripts\python.exe scripts/check_orders.py --fix`: it resolves the symbol to its real line
  range and writes the anchor for you. Reopening a 2,300-line file to count lines is exactly the cost
  this workflow exists to avoid, and it applies to the compiler too.

  **The anchor is what keeps the range true.** `@"<verbatim first line of the range>"` lets the
  linter re-check the range and lets `--fix` repair it. This matters most within a stage: when order
  04 edits a large file, every line number orders 05 and 06 cite shifts silently. That happened, cost
  6 locating re-reads, and is now a lint error plus a one-command fix. Re-run `--fix` after each
  order in a stage lands.

  Scope is a real boundary: if the executor needs a second symbol, helper, setup block, or assertion
  elsewhere in the same file, name that section too. A path listed once does not silently authorize
  unrelated ranges.

  **For a new test, anchor the block it joins** — not the fixture it reuses. Naming only the fixture
  left one executor hunting a 2,000-line suite for the right `describe`, at 6 locating reads;
  anchoring the insertion point on the next order brought that to 1. The linter checks that a new
  test's anchor lands on a `describe`/`it`/`test` line.
- **CHANGES SIGNATURE** — every exported symbol whose signature this order changes, or `none`.
  Declaring it makes the linter grep the repo for call sites and fail the order if any of them is
  missing from START IN, and require the changed module's *own* test suite in STOP WHEN. Both rules
  come from one order that made a shared hook parameter required while STOP WHEN ran only the
  caller's tests: it blocked once, then leaked a stale assertion and a missing `useCallback`
  dependency past every targeted check to reconcile.
- **CREATES / REMOVES** — artifact lifecycle, separate from exploration. A future-created path cannot
  resolve in START IN, while a deleted source path cannot survive the final documentation check.
  Declare every created and removed file here, name the same full path in DO, and put an explicit
  existence or non-existence assertion for each path in STOP WHEN. The linter validates the final
  state when STATUS is DONE. An existing file that will be removed may still be read from START IN.
- **DO** — the intent in 1–3 lines. Trust the model to write the code; don't write it for them.

  **If DO says touch a file, START IN must list it** — otherwise the executor edits files it was
  never told to open, and the telemetry "reads outside START IN" column blames it for your omission.
  Give each edit site the **anchor text to match**, too: an executor that knows the exact string to
  edit can change it without reading the file back. The runs that re-read one page component six to
  eleven times were all orders that said *what* to change without saying *where* to land.
- **STOP WHEN** — the leash that ends wandering and gold-plating. It must be a **targeted** command
  naming exact test files — the tests for the files the order touches plus any test the order adds —
  never a bare `pytest`, `npm test`, or `tsc -b`. Full-suite runs are `reconcile`'s job, once per
  stage, not the executor's.

  Two rules the linter now enforces, both learned from the same escape: **every source file DO edits
  must have its own co-located suite in STOP WHEN** (running only the caller's tests is how a stale
  hook assertion reached reconcile), and **any order touching a React hook or a dependency array
  must include `npm run lint`** — neither vitest nor `tsc` can see a missing `useCallback`
  dependency, and one shipped as a latent stale-closure bug.

  Prefer `python scripts/order_check.py --tests <path> --typecheck --lint` to a raw chain: it runs
  the same checks but prints pass/fail and the failing test names instead of the full runner output,
  which is otherwise the largest single result in the executor's context and repeats on every fix
  attempt. The raw command shapes, when you need them:
  - Backend: `pytest backend/tests/<file>.py --no-cov` — the `--no-cov` is required; without it the
    97% coverage gate fails every subset run regardless of the tests.
  - Frontend: `cd frontend && npm run test:check -- <path/to/File.test.tsx>`. This is vitest plus the
    checked-in known-failure list in `frontend/known-test-failures.json`: it passes when every
    failure is already known and fails the moment a *new* one appears. Prefer it to `npm test --` —
    the executor gets a clean pass/fail with no list of pre-existing failures to reason about, and a
    regression is caught by the tool rather than by a human diff at reconcile.

  **vitest does not typecheck.** It strips types, so a test fixture with the wrong shape passes
  green and breaks `tsc -b` at reconcile — this has now cost two separate stages. Whenever an order
  writes or edits a fixture for a domain-typed object (an `frontend/src/api/types.ts` interface, a
  domain-typed union, anything with branded scalar types), do both of these:
  - put the repo's minimal-plus-cast idiom in KNOWN STATE with a real example from a sibling test
    (`mockResolvedValue([{ id: 9, name: 'Mira' }] as NPC[])`) — an executor told to "mock the NPC
    list" will otherwise invent plausible statblock fields that do not typecheck; and
  - append `&& npm run typecheck` to that order's STOP WHEN. It is `tsc -b` without the bundle step,
    so it is the cheapest command that is a real typecheck, and it is the one case where a
    stage-level check belongs in a single order.

  The linter enforces both halves whenever an order names a frontend test file and mentions a mock
  or fixture.

  **Structural documentation orders run the real checker.** If an order creates, removes, moves, or
  edits a contract-managed file under `docs/`, append
  `.venv\Scripts\python.exe scripts/check_docs.py --check` to STOP WHEN after the direct artifact
  assertions. Targeted parser tests do not catch stale links, missing files, or real-tree routing.
- **STATUS** — left blank; the executor fills it (`DONE`, `FAILED`, or `BLOCKED`, plus a two-line
  DEVIATIONS block always, and a FAILURE REPORT block on failure — see `docs/PLAN_TEMPLATE.md`).
  That's the only thing they write outside code/tests.

## Sizing an order against a big test file

One order adds tests to **at most one test file**, and against a large integrated suite (over ~800
lines) it gets **one behaviour**. This is the sizing rule the log paid most for: an order asking for
seven integrated async behaviours through a 1,700-line page suite stalled at Light, stalled again at
Standard after a reissue, and closed only when the failure was finally diagnosed directly. Splitting
hook behaviour from page placement would have made both halves ordinary orders.

When the behaviour turns on a non-obvious **test seam**, name it in KNOWN STATE. In that same case
the deciding fact — that a save-error test must establish one settled state transition before
mocking the next request rejection, because the hook suppresses its initial-load save — was never
written down, and no amount of model strength recovered it.

The latest clean cycle exposed the same issue in smaller form: a route-mode assertion used a
`MemoryRouter` rerender even though rerender does not change its history, forcing the executor to
open route-context files outside the named test scope. Whenever a test depends on routing, provider
state, timers, async settling, or another harness transition, verify the exact transition idiom while
compiling and state it as an answer in KNOWN STATE. Include the relevant helper/setup section in
START IN if the executor must use it; do not make the executor diagnose the harness to implement the
product behavior.

## Frontend orders carry the UX decisions

If an order touches `frontend/src/`, copy the lines of the Plan's **UX decisions** block that apply to
the files it names into that order's `KNOWN STATE` — the literal copy strings, the empty-state status,
the confirmation message, the focal element, the touch floor. The executor never reads the `ux-design`
skill or `docs/UX_PATTERNS.md`; the order is how those decisions reach it. An order that says "add an
empty state" without giving the exact string is an order that invents one.

If the Plan has no UX decisions block and the stage touches the frontend, stop and run `ux-design`
before compiling.

## How to compile a stage

0. **Read the recent `compiler note:` lines in [docs/plans/telemetry-log.md](../../../docs/plans/telemetry-log.md)**
   — the tail is enough. Each one is a past dispatcher's post-mortem of an order *you or a
   predecessor compiled*: which orders ran clean, and which sent an executor down a hole. The
   recurring faults are cheap to avoid and expensive to repeat — vague file references, conditional
   instructions that force the executor to go and decide something, a STOP WHEN that pulls in a
   file the order never touches. This is the only feedback loop this workflow has; skipping it
   means re-learning the same lesson at the executor's expense.
1. **Read the Plan stage and, when present, its `### Stage <N>` compiler handoff.** Treat verified
   edit sites, tests, contracts, and constraints as paid-for planning results: carry them into KNOWN
   STATE and START IN rather than rediscovering them. Resolve every listed open question before
   writing an order. Explore only the gaps needed to make orders self-contained; do not reopen a
   named file just to reconfirm a stable fact already recorded by `plan`.
2. **Split the stage into logical changes.** If a change needs a paragraph of judgement, it's too big:
   split it into smaller orders.
   Before allowing independent orders to run in parallel, compare their edit sites: when one order
   edits or removes a file another consumes, add an explicit dependency. The linter rejects mutable
   overlap between independently runnable orders.
3. **For each order, fill KNOWN STATE with verified facts** you discovered — so the executor starts
   from truth, not a blank slate.
4. **Run the order's test command yourself before writing STOP WHEN.** On the frontend,
   `npm run test:check -- <file>` already judges the run against `frontend/known-test-failures.json`,
   so a green result means the executor will get one too and the order needs no KNOWN TEST FAILURES
   block. If it reports a *new* failure, that failure is pre-existing on your branch: fix it, or add
   it to the list with a reason and a date — never leave it for the executor to trip over. On the
   backend there is no such list, so any already-failing pytest node id goes verbatim into **KNOWN
   TEST FAILURES**. An executor that meets an unexplained red suite spends its whole context deciding
   whether it broke something.
5. **Name exact START IN files** you actually opened, each **scoped** to what the executor needs, and
   declare every created/removed artifact. For validator changes, include the validator's direct test
   module, representative real documents for every accepted grammar shape, and one fixture for every
   rejected target class stated in KNOWN STATE. Name a **runnable STOP WHEN** that runs the direct
   test module and, for structural docs, the real documentation checker.
   For tests driven by routing, providers, timers, or async settling, also verify and record the
   exact harness transition that makes the requested assertion valid.
6. **Leave STATUS blank.** Number the files in dependency order and set each `DEPENDS ON`.
7. **Run the linter before you dispatch:** `.venv\Scripts\python.exe scripts/check_orders.py --fix`.
   `--fix` repairs everything mechanical and prints what it changed: a bare filename becomes its full
   repo-relative path (whenever the repo has exactly one file by that name), a backticked symbol
   becomes a real line range with an anchor, and a range whose anchor has drifted is moved to where
   the anchor actually is. It leaves anything ambiguous for you to resolve, since a guess there would
   misdirect an executor silently instead of loudly. The remaining lint still fails on the faults
   that cost the most in the log — a path that doesn't resolve, a file named in DO but missing from
   START IN, a conditional instruction, an unscoped large file, a signature change with unlisted call
   sites, an edited module whose suite STOP WHEN never runs, a hook change with no lint, a new test
   with no insertion anchor, a fixture without the cast idiom and a typecheck, several behaviours
   against a big suite. Fixing them here costs a minute; discovering them costs a dispatch.

   After the orders pass lint, remove the compiled stage's `### Stage <N>` compiler handoff from the
   Plan. Remove `## Compiler handoff` too when it has no stage subsections left. Do not remove future
   stages' handoffs. Planning byproducts follow their separate move-to-KNOWN-STATE rule below.

   **Re-run `--fix` between dispatches within a stage.** As soon as one order edits a large shared
   file, every downstream order's line numbers are stale. This is the single most repeated
   order-shape fault in the log, and it is now one command rather than a re-read.
8. **Set REQUIRED STRENGTH: Light.** Light is the default for **every** order, not just for
   bounded mechanical ones. Write `REQUIRED STRENGTH: Light` and move on.

   **Escalation is the exception, and it has to justify itself.** To ask for more, name what a
   Light executor cannot do here, on the same line:

   ```
   REQUIRED STRENGTH: Standard — the fixture shape must be derived from three call sites that
   disagree, and KNOWN STATE cannot pre-answer which one is canonical
   ```

   `check_orders.py` rejects a higher strength with no reason. Reserve High for broad synthesis
   that should be surfaced to the user rather than dispatched automatically.

   **Before you escalate, re-read your own order.** "This needs a stronger model" is nearly always
   "this order does not say enough". Every Light order in the telemetry log finished on its first
   pass; the only order that ever needed a re-dispatch was Standard, and its own compiler note put
   the block on a contradiction in KNOWN STATE, not on the executor. Escalating strength has never
   rescued an under-specified order in this repo — the abandoned order stalled at Light and stalled
   again at Standard, and closed only once someone diagnosed the real failure. A Standard run also
   costs roughly three times a Light one, so the wrong answer is expensive twice.

   If you find yourself reaching for Standard, spend that effort on KNOWN STATE and bounded START
   IN ranges instead, then set Light.

## Direct-completion fast path

After compiling an order normally, you may implement it directly when dispatching would only make
an executor reread context you already hold. This is a marginal-cost exception, not a second default.
Use it only when **all** of these are true:

- the exact edit is fully determined by files already opened while compiling;
- it needs no additional read, search, diagnosis, design choice, or architecture judgement;
- the whole change can be described in one sentence and completed in one edit attempt;
- the targeted STOP WHEN is already verified and runnable; and
- completing it now will not invalidate an independently runnable order's KNOWN STATE or anchors.

Required strength is not the test. A Standard order can qualify when compilation removed all
remaining uncertainty, while a Light order that still needs exploration belongs with an executor.

Preserve the normal lifecycle when taking the fast path:

1. Write the complete order first, including its authorization and STOP WHEN.
2. State that it qualifies for direct completion and why.
3. Make the one determined edit and run only STOP WHEN. If the edit does not apply cleanly, the check
   fails, or you discover that another read is needed, stop immediately and dispatch the order
   normally; do not turn `to-orders` into an implementation/debugging session.
4. On success, write `STATUS: DONE — implemented directly by planner` and the normal two-line
   DEVIATIONS block.
5. Snapshot the order (`--snapshot --order <order-path>`) before you touch anything, then log it with
   `.venv\Scripts\python.exe scripts/order_telemetry.py --order <order-path> --planner-run --manual
   "direct planner implementation, no executor usage figures" --fault none --note "<why direct
   completion was cheaper>"` (or the POSIX virtualenv path). `--planner-run` is what lets the fast
   path be compared against dispatched runs later; without it the cheapest route in the workflow is
   also the one the log cannot measure.
6. Compile dependent or overlapping orders from the resulting state. If they were already written,
   re-verify and update any KNOWN STATE facts or anchors the direct change affected before linting.

At most one order per `to-orders` invocation should take this path. More than one means implementation
is becoming the session's job; dispatch the rest so planning context does not fill with edits and test
output.

## Worked example

The reference order lives at
[docs/plans/_example/99-creature-row-ac.md](../../../docs/plans/_example/99-creature-row-ac.md).
It names real files and passes `scripts/check_orders.py`, so it is also the fixture that keeps the
linter honest — read it rather than a paraphrase, and copy its shape:

- every path resolves, and the large one carries a line range with "nothing else in this file";
- the empty-state string, the divider and the token are given literally, so nothing is invented;
- the domain type's trap (`ac` is `ArmorClass`, not a number) is pre-answered with the repo's cast
  idiom, and STOP WHEN carries the typecheck that would catch it anyway;
- one behaviour, one test file, one runnable stop-check.

The cheapest real run in the telemetry log had exactly this shape — 33 turns, 5k output, no
duplicate reads, nothing opened outside START IN — because it described the precedent component's
*shape* in prose instead of pointing at it, and pre-answered the two facts most likely to be got
wrong. One logical change, one precedent, every fact answered.

## What NOT to do

- Do not inline the actual code the executor should write. Code written here was paid for at the
  planner's rate — the whole point is that the cheaper model does the implementation. **One exception:** code that
  planning already produced. If the Plan has a `## Planning byproducts` appendix (verified snippets
  that fell out of settling the design), move each snippet verbatim into the KNOWN STATE of the order
  it belongs to, marked `verified snippet — use as-is:`, and delete the appendix from the Plan. The
  same applies to any snippet you verify while compiling orders. Relaying already-paid-for code is
  not writing implementation — making the executor re-derive a tricky regex it will get wrong is the
  real waste.
- Do not touch the manifest, references, or area guides here — that's `reconcile`, after orders ship.

## Next step

Hand each order to an executor via the `dispatch-orders` skill (which wraps `implement-order`),
one fresh context per order.
When a stage's orders are all `DONE`, run **`reconcile`**.
