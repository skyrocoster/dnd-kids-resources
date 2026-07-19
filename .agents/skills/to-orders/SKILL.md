---
name: to-orders
description: Turn ONE stage of a Plan into lean, self-contained work orders that a small/cheap model can execute one at a time, each in a fresh context window. Use this after the `plan` skill, whenever the user says "turn stage N into work orders", "compile this stage", "make the tickets/orders for X", or is ready to hand implementation to a smaller model. This is where Claude does the exploration up front so the executor never has to. Produces work-order files with no implementation code — just goal, known state, starting files, and a hard stop condition.
---

# to-orders — compile a stage into work orders (Layer 2)

A **work order** is one unit of work a small model can finish in a single context window without
getting lost. This is where Claude spends its exploration budget: you look things up **once** so the
executor never re-explores. You still write **no implementation code** — you write the fence that
keeps a cheap model focused.

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

START IN: <2–4 exact files/folders to begin exploring from>

DO:
- <1–3 terse lines: what to change and where to look — no code>

STOP WHEN: <a single runnable command that must pass, or "if X = Y, stop">

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
```

## Why each field exists — get these right and a weak model can't wander

- **KNOWN STATE** — the focus leash's memory. Write the *actual answers* here (the value, the file, the
  count), not a pointer like "check the API". If you tell the executor to "go find out", you've just
  moved the exploration cost onto a model that's bad at it. Answer, don't point.
- **START IN** — bounded exploration. The executor explores *these* files, not the whole repo. Name
  real, verified paths — open them yourself while compiling to be sure they're right.
- **DO** — the intent in 1–3 lines. Trust the model to write the code; don't write it for them.
- **STOP WHEN** — the leash that ends wandering and gold-plating. Prefer a real command
  (`npm test <name>`, `tsc -b`, a pytest path) so "done" is objective and the model knows to stop.
- **STATUS** — left blank; the executor fills it. It's the only thing they write outside code/tests.

## How to compile a stage

1. **Read the Plan stage and the files it implies.** Explore now — this is the paid-once step.
2. **Split the stage into logical changes.** If a change needs a paragraph of judgement, it's too big:
   split it into smaller orders.
3. **For each order, fill KNOWN STATE with verified facts** you discovered — so the executor starts
   from truth, not a blank slate.
4. **Name exact START IN files** you actually opened, and a **runnable STOP WHEN**.
5. **Leave STATUS blank.** Number the files in dependency order and set each `DEPENDS ON`.

## Worked example (note: zero code written by Claude)

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

STOP WHEN: `npm test EncounterTile` passes with the new test. Then stop — change nothing else.

STATUS: <-- DONE / FAILED - why
```

## What NOT to do

- Do not inline the actual code the executor should write. If Claude writes the code, Claude paid for
  it — the whole point is that the small model does the implementation.
- Do not touch the manifest, references, or area guides here — that's `reconcile`, after orders ship.

## Next step

Hand each order to the small model via the `implement-order` skill, one fresh context per order.
When a stage's orders are all `DONE`, run **`reconcile`**.
