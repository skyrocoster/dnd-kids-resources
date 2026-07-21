# Plan & Work-Order Template

This repo splits planning from implementation so that **Claude plans and never writes implementation
code**, and a **smaller/cheaper model implements one work order at a time** in a fresh context window.
The workflow is driven by four skills in `.agents/skills/` (read by both Claude Code and opencode):

| Skill | Runs in | Job |
|---|---|---|
| `plan` | Claude | Write the short human **Plan** (Layer 1). No code. |
| `to-orders` | Claude | Turn one Plan stage into lean **work orders** (Layer 2). No code. |
| `implement-order` | small model | Execute **one** work order, then stop. Writes the code. |
| `reconcile` | Claude | Close out finished orders: collapse the Plan, update docs, run the checker. No code. |

The three jobs: **PLAN** (Claude thinks) → **IMPLEMENT** (small model does one order per context) →
**RECONCILE** (Claude reconciles docs). Claude's context never fills with implementation code or test
output — that lives in the small model's cheap, throwaway per-order contexts.

---

## Layer 1 — the Plan (human-readable)

Lives at `docs/plans/active/<feature>.md`, named for a concrete outcome. An area may hold more than
one active plan, but exactly one of them is **next up** — see *Lifecycle* below. Short, no code — you
read it to understand *what* and *why*.

```md
# <Feature> — <one-line outcome>

> **Status:** <what's done, what's next — one line, rewritten each stage>

- **Area guide:** [<Area>](../../areas/<area>.md)

## What we're building & why
<1–2 short paragraphs.>

## Stages
1. <plain-English intent of stage 1>
2. <plain-English intent of stage 2>

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
```

## Layer 2 — the Work Order (one focused task)

Lives at `docs/plans/active/orders/<feature>/NN-<slug>.md`. One work order = one logical change,
roughly one screen. Claude fills KNOWN STATE and START IN with verified facts so the executor never
re-explores; the executor writes the code and the STATUS line.

```
WORK ORDER <NN> — <short title>
GOAL: <one sentence — what "done" looks like>
DEPENDS ON: <order NN that must be DONE first, or "none">

KNOWN STATE (already true — do NOT redo or re-derive):
- <verified fact: real value, real file location, current test count>

START IN: <2–4 exact files/folders to begin from>

DO:
- <1–3 terse lines: what to change and where to look — no code>

STOP WHEN: <a single runnable command that must pass, or "if X = Y, stop">

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
```

The focus leash: **KNOWN STATE** (answers, not pointers) + **START IN** (bounded exploration) +
**STOP WHEN** (a hard stop that ends wandering). See `.agents/skills/to-orders/SKILL.md` for the full
authoring guidance and a worked example.

---

## Lifecycle

1. **Active** — the Plan carries a Status line and a plain-English Stages list, and lives under
   `plans/active/`. An area may have several: a design can be fully settled and written up long
   before there is capacity to build it, and writing it down is how the reasoning survives.

   Exactly one active plan per area is **next up** — the one work should start from. The area
   guide's `Active plan` line lists every active plan it owns, in order, marking the first
   `(next up)`. Only the next-up plan may have work orders under `orders/<feature>/`; the others
   carry a Status line stating plainly that they are not next and what unblocks them. When the
   next-up plan completes, the following one inherits the slot and the guide's line is reordered.
2. **Shipped** — as each stage's orders finish, `reconcile` collapses them into the Plan's **Shipped**
   table (one ≤2-sentence row per stage) and deletes the spent order files. The commit history is the
   record of *how* each thing was built — never duplicate that prose into the Plan.
3. **Complete** — when the whole feature ships, move the Plan to `docs/complete/<feature>.md`, set the
   area guide back to "no active plan" (or its next plan), and update `docs/README.md` in the same
   change set. Leave a redirect stub only if a known inbound link must survive.

## Required model strength (per work order)

State a capability, not a model name. **Light**: bounded/mechanical (rename, stub, narrow test).
**Standard**: ordinary implementation across a small touch set. **High**: broad synthesis, contract
decisions, tricky migration. `to-orders` picks the lowest strength that can safely execute the order
after reading only what it names.

---

## The documentation checker

`scripts/check_docs.py` is aligned with this workflow. For an active Plan it requires only a
`> **Status:**` line (stages are plain-English list items, not `(next up)` execution blocks). It lints
work orders under `plans/active/orders/<feature>/` for their load-bearing fields (`GOAL:`, `START IN:`,
`STOP WHEN:`, `STATUS:`), validates area-guide↔Plan ownership — every active plan must be linked
from its owning guide's `Active plan` line, which may list several (a stage anchor is optional) — and keeps
the workflow-agnostic safety net: local links/anchors, manifest completeness, plan-redirect lifecycle,
AI-entry precedence, configured test commands, banned legacy references, and the auto-generated
reference inventories. It no longer couples a per-diff code change to a Plan edit, so a small model's
work-order commits pass without touching the Plan; the Plan is updated in batches by `reconcile`.

An earlier plan format (a `(next up)` heading with eight labeled fields) is no longer enforced. The
last plan still written that way may remain until it is naturally retired; it validates fine because
only the Status line is required.
