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
- <exact test name/path that already fails, verbatim; omit the section if the suite is green>

START IN: <2–4 exact files/folders to begin exploring from>

DO:
- <1–3 terse lines: what to change and where to look — no code>

STOP WHEN: <a single runnable command that must pass, or "if X = Y, stop">

STATUS: <-- executor writes DONE, FAILED - <one-line reason>, or BLOCKED - <one-line reason>
```

## Why each field exists — get these right and a weak model can't wander

- **KNOWN STATE** — the focus leash's memory. Write the *actual answers* here (the value, the file, the
  count), not a pointer like "check the API". If you tell the executor to "go find out", you've just
  moved the exploration cost onto the model that's worst at paying it. Answer, don't point.

  **Never write a conditional here.** "If order 03 left that inline, lift it into a shared function",
  "if the helper doesn't exist yet, create one" — each of these hands the executor an architecture
  decision, which is exactly what it is worst at and exactly what this skill was supposed to have
  settled. If dependent orders share code, decide *while compiling* where it lives and say so flatly,
  including which layers it may import from. (A real case: a conditional like the one above put a
  `features/` import into `src/model/`, which `ARCHITECTURE.md` forbids and no test enforces.)
- **START IN** — bounded exploration. The executor explores *these* files, not the whole repo. Name
  real, verified paths — open them yourself while compiling to be sure they're right.
- **DO** — the intent in 1–3 lines. Trust the model to write the code; don't write it for them.
- **STOP WHEN** — the leash that ends wandering and gold-plating. It must be a **targeted** command
  naming exact test files — the tests for the files the order touches plus any test the order adds —
  never a bare `pytest`, `npm test`, or `tsc -b`. Full-suite runs and the typecheck are `reconcile`'s
  job, once per stage, not the executor's. The command shapes:
  - Backend: `pytest backend/tests/<file>.py --no-cov` — the `--no-cov` is required; without it the
    97% coverage gate fails every subset run regardless of the tests.
  - Frontend: `npm test -- <path/to/File.test.tsx>` (paths after `--` go straight to vitest).

  **`npm test` does not typecheck.** Vitest strips types, so a test fixture with the wrong shape
  passes green and breaks `tsc -b` at reconcile — this has now cost two separate stages. Whenever an
  order writes or edits a fixture for a domain-typed object (an `api/types.ts` interface, a
  domain-typed union, anything with branded scalar types), do both of these:
  - put the repo's minimal-plus-cast idiom in KNOWN STATE with a real example from a sibling test
    (`mockResolvedValue([{ id: 9, name: 'Mira' }] as NPC[])`) — an executor told to "mock the NPC
    list" will otherwise invent plausible statblock fields that do not typecheck; and
  - append `&& npm run build` to that order's STOP WHEN. It is the only real typecheck, and it is
    the one case where a stage-level command belongs in a single order.
- **STATUS** — left blank; the executor fills it (`DONE`, `FAILED`, or `BLOCKED`, plus a two-line
  DEVIATIONS block always, and a FAILURE REPORT block on failure — see `docs/PLAN_TEMPLATE.md`).
  That's the only thing they write outside code/tests.

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
4. **Run the order's test command yourself and record pre-existing failures.** Before writing STOP
   WHEN, run the relevant suite. Any test that already fails goes verbatim into **KNOWN TEST
   FAILURES**, and STOP WHEN must be satisfiable with those failures still present (scope the command
   to the touched tests, or say "passes except the KNOWN TEST FAILURES"). An executor that discovers
   an unexplained red suite will waste its whole context deciding whether it broke something.
5. **Name exact START IN files** you actually opened, and a **runnable STOP WHEN**.
6. **Leave STATUS blank.** Number the files in dependency order and set each `DEPENDS ON`.

## Worked example (note: facts and fences, no implementation)

```
WORK ORDER 03 — Show difficulty on the encounter tile
GOAL: each encounter tile shows its Easy/Medium/Hard label.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo):
- The API already returns `difficulty` on each encounter (see API_REFERENCE.md).
- The tile currently renders name + monster count; no difficulty is shown.
- The suite is green at 231 tests.

START IN:
- frontend/src/components/EncounterTile.tsx
- frontend/src/components/EncounterTile.test.tsx

DO:
- Render the existing `difficulty` value next to the tile title, using theme tokens.
- Add one test that the label renders.

STOP WHEN: `npm test -- EncounterTile` passes with the new test. Then stop — change nothing else.

STATUS: <-- DONE / FAILED - why / BLOCKED - why
```

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
