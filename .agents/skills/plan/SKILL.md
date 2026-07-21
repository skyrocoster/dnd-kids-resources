---
name: plan
description: Write the short, human-readable Plan for a feature or outcome in the D&D Kids Resources repo — the Layer 1 planning doc that a person reads to understand what's being built and why, before any code is written. Use this whenever the user wants to plan a new feature, outcome, or cross-cutting change ("let's plan X", "I want to add Y", "how should we approach Z"), or start a fresh execution plan. Produces a plan with no implementation code. Follow up with the `to-orders` skill to turn a stage into work orders.
---

# plan — write the human Plan (Layer 1)

Claude's job in this repo is to **think and plan**. Claude does **not** write implementation
code — a smaller model does that later, one work order at a time. This skill produces the
*human-readable Plan*: the thing you read to understand the feature. Keep it short and free of code.

## Where it lives

`docs/plans/active/<feature>.md`, named for a concrete outcome (e.g. `loom-session-sharing.md`),
not a whole domain. An area may hold **several active plans, exactly one of which is next up** (see
the area guides in `docs/areas/` and `docs/PLAN_TEMPLATE.md` §Lifecycle). Write a plan whenever its
design is settled; if the area already has a next-up plan, say plainly in the Status line that this
one is not next and what unblocks it, and add it to the guide's `Active plan` line after the
next-up plan.
If the owning area guide currently says "no active plan", this is the plan that changes that.

## The Plan format

Keep the whole doc to roughly one screen. No code — describe intent, not implementation.

```md
# <Feature> — <one-line outcome>

> **Status:** <what's done, what's next — one line, rewritten each stage>

- **Area guide:** [<Area>](../areas/<area>.md)

## What we're building & why
<1–2 short paragraphs: the user-facing shape and the reason it matters.>

## Stages
1. <plain-English intent of stage 1>
2. <plain-English intent of stage 2>
3. ...

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
```

## If the feature touches the frontend

Run the **`ux-design`** skill before finalising the stages, and include the **UX decisions** block it
produces in the Plan (after `## What we're building & why`). It settles mode, focal element, save
model, empty-state copy, error placement, destructive actions, keyboard, and touch for each surface
involved. `to-orders` carries those decisions into the work orders, which is the only way they reach
the small model. Without the block, a cheap model invents its own empty-state wording and error
placement, and the app drifts.

New or reshaped surfaces also need a row in their area guide's `## Surfaces` table — note that as
part of the relevant stage.

## How to write it

1. **Understand the outcome first.** Read the owning area guide and the minimum references it names
   (via `docs/README.md`). Do the hard thinking here — this is what Claude's tokens are for.
2. **Break the outcome into stages.** Each stage should be a coherent step that becomes one or a few
   work orders. Order them so each builds on the last.
3. **State each stage as intent, in plain English.** "Show difficulty on the encounter tile", not a
   code recipe. The exact files and facts get worked out later, in `to-orders`.
4. **Leave the Shipped table empty** — `reconcile` fills it in as stages complete.

## What NOT to do

- Do not write implementation code, exact diffs, or file-by-file edit lists. That belongs in the
  work orders (`to-orders`) and, ultimately, the small model's commits.
- Do not pad the doc with handoff essays or discovery logs. The old template did that to pass state
  between exploring agents; we don't chain agents that way anymore. Lean is the point.

## Next step

Once the Plan is approved, run **`to-orders`** on stage 1 to compile it into lean work orders a small
model can execute. Re-run `to-orders` per stage — you don't rewrite the Plan each time.
