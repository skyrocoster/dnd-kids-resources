---
name: create-plan
description: Create a new focused execution Plan directly under docs/plans/active/ for one concrete feature or outcome. Use when the user says "create a plan", "plan this feature", or wants a bounded implementation Plan that is not being derived from a master-plan slice. Produces no implementation code. Follow with `to-orders`.
---

# Create plan - write the human Plan (Layer 1)

You are the strong planning agent. Decide what gets built and why, settle the contracts stages
compile against, and write only the human-readable Plan. Do not write implementation code. The
coordinator delegates this work and consumes the resulting Plan or issue report.

If the requested work comes from a slice under `docs/master-plans/`, stop and use `to-plan` instead.

## Where It Lives

Write `docs/plans/active/<feature>/<feature>.md`, named for one concrete outcome rather than a domain.
Many Plans may be active at once; nothing ranks them. A Plan blocked by another declares
`- **Depends on:** [Other Plan](../other-plan/other-plan.md)` in `## Touches`. No dependency means ready.

## Format

Use the exact Layer 1 schema in `docs/PLAN_TEMPLATE.md`. Keep the human-facing Plan roughly one screen
and free of code. The checker requires each fact once at its source:

- `> **Status:**` is the one-line progress source.
- `**Areas:**` and `**Read trigger:**` are required routing facts.
- `## Touches` contains repo-root-relative globs and any active-Plan dependencies.

## Method

1. Read `docs/README.md`, the owning area guides, `docs/plans/active/INDEX.md`, and the minimum canonical
   references they name. Read any contract the Plan will change.
2. Understand one concrete human outcome. If the request is broad enough to require several focused
   Plans or cross-cutting destination decisions, stop and use `master-plan` first.
3. For frontend work, run `ux-design` before finalizing stages and include its UX decisions block.
4. Break the outcome into coherent stages, each suitable for one or a few work orders. Describe intent,
   not code recipes.
5. Leave `## Shipped` empty. `reconcile` fills it.
6. Route each settled stage as planned quick, work-ordered through `to-orders`, or human-decision work.
7. Add a temporary `## Compiler handoff` only when verified edit sites, tests, settled contracts, or
   constraints will save real compilation work.

## Evidence Discipline

Delegate bounded repository retrieval to `explore-deepseek`, at most four specific questions per
dispatch. Keep product and architecture decisions yourself. A fact is verified only when the source is
opened or quoted. Unverified facts remain open questions; design decisions never do.

Planning byproducts such as verified snippets, regexes, SQL, or type signatures go verbatim in a
temporary `## Planning byproducts` appendix so `to-orders` can preserve them.

## Boundaries

- Do not create a domain roadmap, master plan, implementation code, or work orders here.
- Do not defer product, data-shape, ownership, copy, token, or architecture decisions to an executor.
- Do not pad the human Plan with discovery logs or prescriptive diffs.
- Do not create a Plan if an active Plan already covers the outcome; update or continue that Plan.

## Next Step

Once the Plan is approved, run `to-orders` for its first work-ordered stage. Re-run `to-orders` for each
later stage.
