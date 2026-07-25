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

`docs/plans/active/orders/<feature>/NN-<slug>.md` — one file per work order, numbered in execution
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

KNOWN STATE (already true — do NOT redo or re-derive):
- <a fact the executor would otherwise waste a context window discovering>
- <another fact — real values, real file locations, current test count, etc.>

KNOWN TEST FAILURES (pre-existing — NOT yours to fix, NOT caused by you):
- <backend only: exact pytest node id that already fails; frontend runs use npm run test:check,
  which reads the checked-in list itself. Omit the section when there is nothing to say.>

START IN:
- <exact path> — <the symbol or line range needed, and nothing else in this file>
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

  **Scope every entry, not just name it.** A file in START IN gets read *whole*, so a 1000-line file
  named for a one-line change costs ~9.7k tokens instead of ~200. Write what the executor actually
  needs and nothing else:

  ```
  - frontend/src/features/dungeons/maplab/MapLabPage.tsx — the <RoomDetailsPanel> render at line 873, nothing else in this file
  ```

  The linter requires a scope on any entry over 400 lines and rejects paths that don't resolve.
- **DO** — the intent in 1–3 lines. Trust the model to write the code; don't write it for them.

  **If DO says touch a file, START IN must list it** — otherwise the executor edits files it was
  never told to open, and the telemetry "reads outside START IN" column blames it for your omission.
  Give each edit site the **anchor text to match**, too: an executor that knows the exact string to
  edit can change it without reading the file back. The runs that re-read one page component six to
  eleven times were all orders that said *what* to change without saying *where* to land.
- **STOP WHEN** — the leash that ends wandering and gold-plating. It must be a **targeted** command
  naming exact test files — the tests for the files the order touches plus any test the order adds —
  never a bare `pytest`, `npm test`, or `tsc -b`. Full-suite runs are `reconcile`'s job, once per
  stage, not the executor's. The command shapes:
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
1. **Read the Plan stage and the files it implies.** Explore now — this is the paid-once step.
2. **Split the stage into logical changes.** If a change needs a paragraph of judgement, it's too big:
   split it into smaller orders.
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
   a **runnable STOP WHEN**.
6. **Leave STATUS blank.** Number the files in dependency order and set each `DEPENDS ON`.
7. **Run the linter before you dispatch:** `.venv\Scripts\python.exe scripts/check_orders.py`. It
   fails on the faults that cost the most in the log — a path that doesn't resolve, a file named in
   DO but missing from START IN, a bare filename, a conditional instruction, an unscoped large file,
   a fixture without the cast idiom and a typecheck, several behaviours against a big suite. Fixing
   them here costs a minute; discovering them costs a dispatch.

## Worked example

The reference order lives at
[docs/plans/active/orders/_example/99-creature-row-ac.md](../../../docs/plans/active/orders/_example/99-creature-row-ac.md).
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
