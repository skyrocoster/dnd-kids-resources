---
name: plan
description: Write the short, human-readable Plan for a feature or outcome in the D&D Kids Resources repo — the Layer 1 planning doc that explains what's being built and why, plus a temporary compiler handoff of verified specifics for `to-orders`. Use this whenever the user wants to plan a new feature, outcome, or cross-cutting change ("let's plan X", "I want to add Y", "how should we approach Z"), or start a fresh execution plan. Produces no implementation code. Follow up with the `to-orders` skill to turn a stage into work orders.
---

# plan — write the human Plan (Layer 1)

You are the **strong coordinator** (the planner). Your job is to think: decide what gets built and
why, and settle the contracts stages will be compiled against. Implementation is deliberately
outsourced — a cheap **scout** handles retrieval and a weak **executor** model writes the code, one
work order at a time. This skill produces only the human-readable Plan; it writes no implementation
code.

## Where it lives

`docs/plans/active/<feature>/<feature>.md`, named for a concrete outcome, not a whole domain. Many
Plans may be active at once; nothing queues or ranks them. A Plan that cannot start until another
ships declares `- **Depends on:** [Other Plan](../other-plan/other-plan.md)` in its `## Touches`
section — that licenses the two plans to touch the same files and marks it blocked in
[docs/plans/active/INDEX.md](../../../docs/plans/active/INDEX.md). No dependency line means ready.

## The Plan format — see PLAN_TEMPLATE

The exact schema lives in [docs/PLAN_TEMPLATE.md](../../../docs/PLAN_TEMPLATE.md) (Layer 1). Do not
reproduce it here; write it once and keep the whole doc to roughly one screen, free of code. The
fields the checker enforces, each written once and generated outward:

- `> **Status:**` — one line, rewritten each stage. This is the single place a stage's progress is
  recorded; the manifest and the plan index are generated from it.
- `**Areas:**` and `**Read trigger:**` — both required; the checker fails without them. `**Areas:**`
  is a comma-separated list of stable area-guide IDs. A read trigger names the *questions* a reader
  arrives with, not what the plan does.
- `## Touches` — required, a repo-root-relative glob per line, plus a `**Depends on:**` line for each
  plan that must ship first.

## If the feature touches the frontend

Run the **`ux-design`** skill before finalising the stages and include its **UX decisions** block in
the Plan. That block is the only way those decisions reach the executor, so a frontend stage without
it lets a weak model invent empty-state copy and error placement. New or reshaped surfaces also need
a row in their area guide's `## Surfaces` table — note it in the relevant stage.

## How to write it

1. **Understand the outcome first** — read the owning area guide and the minimum references
   `docs/README.md` names yourself. This is the strong-model work; don't delegate it.
2. **Break the outcome into stages** — coherent steps that each become one or a few work orders,
   ordered so each builds on the last. State each as intent in plain English, never as a code recipe.
3. **Leave the Shipped table empty** — `reconcile` fills it as stages complete.

## Delegate the survey, keep the design

Understanding an outcome splits into **surveying what the repo does** and **deciding what should
exist instead**. Only the second needs you. Sweeping a directory, confirming an endpoint field, or
listing a seed file's contents is retrieval — hand it to the cheap **scout** (opencode's
`explore-deepseek` subagent; read-only, cites `path:line`) while you think.

Send **at most four bounded questions per dispatch**, each naming where to look and the shape of the
answer ("List every component under `frontend/src/player/` with its export name and line count", not
"how does the player app work"). The scout stops at its read budget and reports what it did not
reach — a partial answer is working as intended; re-ask the gap more narrowly. A fact is **verified
only when quoted**; an explorer's characterisation of a file is not a verified fact, so put
paraphrases under Open questions.

Read it yourself when the answer feeds the design directly: the area guide and the minimum references,
any canonical reference whose contract you are about to bend, and any file whose *shape* is what you
are reasoning about. Never delegate the design decisions — stages, feasibility, staleness, or which
option is better are yours, and a recommendation from a scout is unverified.

## Optional: the contract-readiness handoff

Planning resolves implementation-relevant facts while settling feasibility and stage boundaries.
When a stage's contracts are settled — behavior, data shape, ownership boundary, copy, tokens — park
the verified specifics in the temporary `## Compiler handoff` appendix so `to-orders` does not pay to
discover them again. This is the **optional contract-readiness handoff**: include it only for stages
whose contracts are settled and whose facts save real compilation work. The shape is in PLAN_TEMPLATE
(Layer 1) — one `### Stage <N>` subsection per compiled stage with **Verified edit sites**,
**Verified tests**, **Settled contracts**, **Constraints**, and **Open questions**.

Two rules keep the handoff honest:

- **Open questions are lookups, never design decisions.** "Confirm the exact prop name on
  `RoomDetailsPanel`" is fair; "decide where a room entry's stable id comes from" is not — a deferred
  contract lands in an order's KNOWN STATE where the user never reviews it. Settle design decisions
  here, with the user. If one cannot be settled, say so in the Status line and let the stage wait.
- **Verified means opened.** A fact is verified only when planning opened the named source or
  canonical reference; otherwise it goes under Open questions. Give exact paths and symbols, not
  volatile line ranges — `to-orders` owns the final range derivation.

This appendix is machine-facing and may exceed one screen; the human-facing sections stay lean. It is
not a discovery log — record answers that remove later exploration, not searches or discarded ideas.
`to-orders` consumes and deletes each compiled stage's subsection.

## What NOT to do

- Keep implementation out of the human-facing Plan — no exact diffs or prescriptive edit lists. The
  *how* belongs in the work orders (`to-orders`) and, ultimately, the executor's commits.
- **Exception — code planning already produced.** A snippet you ran to verify an approach, a tricky
  regex or SQL expression, an exact type signature: that code is paid for — never discard it, never
  make the executor re-derive it. Park it verbatim in a `## Planning byproducts` appendix (fenced
  code, one line each on what it is and how it was verified); `to-orders` moves each snippet into the
  relevant order's KNOWN STATE and deletes the appendix. This is a hand-off buffer, not a licence to
  pre-write the implementation.
- Do not pad the human-facing sections with handoff essays or discovery logs.

## Next step

Once the Plan is approved, run **`to-orders`** on stage 1 to compile it into lean work orders an
executor can run. Re-run `to-orders` per stage — you don't rewrite the Plan each time.
