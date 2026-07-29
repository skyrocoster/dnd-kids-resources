---
name: plan
description: Write the short, human-readable Plan for a feature or outcome in the D&D Kids Resources repo — the Layer 1 planning doc that explains what's being built and why, plus a temporary compiler handoff of verified specifics for `to-orders`. Use this whenever the user wants to plan a new feature, outcome, or cross-cutting change ("let's plan X", "I want to add Y", "how should we approach Z"), or start a fresh execution plan. Produces no implementation code. Follow up with the `to-orders` skill to turn a stage into work orders.
---

# plan — write the human Plan (Layer 1)

You are the **planner** here — the powerful model, whose job is to think. Implementation comes later
and cheaper, from an **executor** model taking one work order at a time. This skill produces the
*human-readable Plan*: the thing you read to understand the feature. Keep its main body short and
free of code. Preserve useful, verified planning discoveries in a temporary compiler handoff so
`to-orders` does not pay to discover them again.

## Where it lives

`docs/plans/active/<feature>/<feature>.md`, named for a concrete outcome (e.g. `loom-session-sharing/loom-session-sharing.md`),
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

- **Area guide:** [<Area>](../../../areas/<area>.md)

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
the executor. Without the block, a weaker model invents its own empty-state wording and error
placement, and the app drifts.

New or reshaped surfaces also need a row in their area guide's `## Surfaces` table — note that as
part of the relevant stage.

## How to write it

1. **Understand the outcome first.** Read the owning area guide and the minimum references it names
   (via `docs/README.md`) yourself. Do the hard thinking here — this is what the planner's tokens are
   for. Anything beyond those that is pure survey work can go to the explorer in one batch (see
   below) while you think.
2. **Break the outcome into stages.** Each stage should be a coherent step that becomes one or a few
   work orders. Order them so each builds on the last.
3. **State each stage as intent, in plain English.** "Show difficulty on the encounter tile", not a
   code recipe. Put exact files and verified facts in the compiler handoff, not in the stage list.
4. **Leave the Shipped table empty** — `reconcile` fills it in as stages complete.

## Delegate the survey, keep the design

Understanding an outcome usually means two separable things: **surveying what the repo currently
does**, and **deciding what should exist instead**. Only the second needs the planner. Sweeping a
feature directory to see which surfaces exist, finding out whether an endpoint already returns a
field, listing what a seed file actually contains — that is retrieval, and paying the planner's rate
for it fills the context you need for the design with file dumps.

**Prefer the explorer for the survey.** In opencode that is the `explore-deepseek` subagent; in Claude
Code it is the `Explore` agent. Both are read-only and cite `path:line`.

**Send at most four questions per dispatch, each one bounded.** The cost you are managing is the
explorer's context, and it grows with the *scope* of a question far faster than with the number of
them — a survey question is especially easy to phrase so wide that answering it means reading a
feature directory end to end. Name where to look and what shape the answer takes:

- "List every component under `frontend/src/player/` with its export name and line count."
- "Does the dungeon API return room notes anywhere? Quote the response model."
- "Which area guides name Map Lab in their Surfaces table? Quote the rows."

Not "how does the player app work" — that is not a question, it is a whole context window. Eight
questions means two dispatches, not one wide one; the second round aims better for having seen the
first. The explorer stops at its read budget and reports what it did not reach rather than widening a
question on its own, so a partial answer is working as intended — re-ask the gap more narrowly, or go
read it yourself.

Read it yourself when the answer feeds the design directly: the area guide and the minimum references
`docs/README.md` names, any canonical reference whose contract you are about to bend, and any file
whose *shape* is the thing you are reasoning about. Stage boundaries come from understanding how the
code hangs together, and a summary of a file is not that.

Never delegate the design questions themselves. Do not ask the explorer what the stages should be,
whether an approach is feasible, what is stale, or which of two options is better — its report is
evidence for you to judge, and a recommendation in it is unverified. That judgement is what this skill
is for.

**Delegated facts are "verified" only when quoted.** A cited quote establishes a discrete fact — a
path exists, a field is absent, a count, an exact string — and may go in the handoff's verified
sections as such. An explorer's *characterisation* of a file may not; if a fact matters enough to
shape a stage and you have only a paraphrase, open the file or put it under **Open questions**.

## Pass specifics to `to-orders`

Planning often resolves implementation-relevant facts while understanding feasibility and stage
boundaries. Do not discard those facts or make `to-orders` reread the same source to recover them.
After `## Shipped`, add a temporary handoff for each uncompiled stage where useful:

```md
## Compiler handoff

### Stage <N>
- **Verified edit sites:** `<repo-relative path>` — `<symbol or bounded section>`; <what is already true there>
- **Verified tests:** `<repo-relative path>` — <relevant suite, fixture, or harness fact>
- **Settled contracts:** <exact behavior, ownership boundary, data shape, copy, token, or dependency decision>
- **Constraints:** <invariant or canonical reference the orders must preserve>
- **Open questions:** <a *lookup* `to-orders` still must do before writing an order, or `none`>
```

**Open questions are lookups, never design decisions.** "Confirm the exact prop name on
`RoomDetailsPanel`" is a fair open question. "Decide where a room entry's stable id comes from",
"decide what the migration does to existing rows", "decide which layer owns the new helper" are not —
they set a contract every order in the stage inherits, and deferring one does not remove the work,
it moves it to the compile, where it costs a feature-wide exploration and lands in an order's KNOWN
STATE without the user ever seeing it. Settle those here, with the user, while the whole design is in
view. If you cannot settle one, that is a finding about the stage: say so in the Status line and let
the stage wait, rather than shipping a handoff that hides a decision inside a lookup.

Include only headings that carry useful information. Facts are **verified** only when planning opened
the named source or canonical reference; otherwise put them under **Open questions**, not edit sites
or contracts. Give exact paths and symbols when known, but do not spend tokens deriving volatile line
ranges or running prospective STOP WHEN commands here — `to-orders` owns those final checks.

This appendix is machine-facing and may be longer than one screen; the human-facing sections should
remain lean. It is not a discovery log: record answers that remove later exploration, not searches,
discarded ideas, or summaries of whole files. `to-orders` consumes and removes the compiled stage's
subsection; it removes the heading when no stage handoffs remain.

## What NOT to do

- Keep implementation out of the human-facing Plan — no exact diffs or prescriptive file-by-file edit
  lists. The compiler handoff may name verified edit sites and facts, but the *how* belongs in the
  work orders (`to-orders`) and, ultimately, the executor's commits.
- **Exception — code that planning already produced.** Sometimes settling a design question forces
  real code into existence: a snippet you ran to verify an approach, a tricky regex or SQL
  expression, an exact type signature. That code is already paid for — never discard it and never
  make the executor re-derive it. But it does not go in the Plan body either. Park it verbatim in
  a **`## Planning byproducts`** appendix at the bottom of the Plan (fenced code, one line each on
  what it is and how it was verified). `to-orders` moves each snippet into the relevant order's
  KNOWN STATE and deletes the appendix — it is a hand-off buffer, not documentation. Only relay code
  that planning genuinely forced; do not use the appendix as a licence to pre-write the
  implementation.
- Do not pad the human-facing sections with handoff essays or discovery logs. The compiler handoff is
  terse, structured, stage-scoped, and limited to verified answers that save `to-orders` work.

## Next step

Once the Plan is approved, run **`to-orders`** on stage 1 to compile it into lean work orders an
executor can run. Re-run `to-orders` per stage — you don't rewrite the Plan each time.
