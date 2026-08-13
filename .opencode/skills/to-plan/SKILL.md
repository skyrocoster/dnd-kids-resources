---
name: to-plan
description: Route exactly one selected slice from docs/master-plans/ to the smallest safe execution path. Use when the user selects a master-plan slice, says "to plan", or wants the next slice implemented. Autonomously chooses direct quick delivery or creates a focused Plan; never asks the user to choose the transport.
---

# To plan - route one master-plan slice

This skill runs in the dedicated `plan-router` subagent. That subagent owns repository retrieval,
routing judgment, Plan creation, and the handoff to the next workflow action. The coordinator
delegates here and consumes the compact result; it must not duplicate this method in its own context.

Turn one agreed destination slice into the smallest safe execution path without reopening the whole
master plan or combining neighboring slices. A focused Plan is durable coordination state, not a toll
every slice must pay.

## Input

Require one named master plan and one selected slice ID. If either is ambiguous, ask one short question.
Do not choose among multiple ready slices unless the user asks for a recommendation.

## Autonomous routing gate

Judge the route yourself after repository retrieval. Do not ask the user whether a Plan or work order
is needed, and do not create a Plan merely because the slice came from a master plan.

Route the slice directly through `quick-executor` only when every condition is proven:

- the user selected the slice for implementation, not planning-only review;
- its prerequisites are recorded as accepted in archived Plans or the master plan's direct-delivery
  receipts;
- product behavior, UX, exclusions, acceptance, and ownership are settled;
- implementation is one atomic logical change with no sequencing or independently useful substage;
- exact authorized paths, known facts, edit intent, and one focused check can be verified cheaply;
- no design, architecture, API, data, migration, compatibility, diagnosis, or contract decision remains;
- failure can safely escalate to a focused Plan without widening the direct brief; and
- the slice does not need durable coordination while queued, paused, delegated across contexts, or
  overlapped with other in-flight work.

File count alone is not the test. A small cross-file source/test/style edit may be atomic; one file
containing unresolved behavior is not. Human UX acceptance also does not force a Plan: direct delivery
may end in `implemented, awaiting human acceptance` and block dependants through its receipt.

If every condition holds, do not create `docs/plans/active/<feature>/`. Write a complete ephemeral
`implement-quick` brief with `GOAL`, `AUTHORIZED PATHS`, `KNOWN FACTS`, `CHANGE`, `CHECK`, and
`ESCALATE IF`, dispatch `quick-executor`, then invoke `quick-reconcile` automatically on success. If
the executor escalates or fails, preserve its evidence and create the focused Plan; never widen or
repair the brief in place.

If any condition is unproven, create the focused Plan without asking the user to approve that routing
choice. Explain the failed criterion in the Plan's compiler handoff so later review does not try the
same shortcut again.

## Method

1. Read `docs/README.md`, `docs/PLAN_TEMPLATE.md`, the selected master plan, its minimum canonical
   references, and active Plans directly from `docs/plans/active/`.
2. Confirm the slice's prerequisite acceptance. A prerequisite still represented by an active Plan
   becomes a `**Depends on:**` entry; an accepted and archived prerequisite needs no active dependency.
3. Confirm no active Plan already owns the slice and no source evidence makes the slice too broad. A
   slice may be narrowed further but never silently combined with another slice.
4. Apply the autonomous routing gate. For direct delivery, verify the brief, dispatch it, and hand the
   result to `quick-reconcile`; the remaining steps apply only to the focused-Plan route.
5. Create `docs/plans/active/<feature>/<feature>.md` using the Layer 1 format in
   `docs/PLAN_TEMPLATE.md` and the normal evidence discipline from `create-plan`.
6. Link the Plan back to the master plan and selected slice. Preserve, without weakening:
   - **Human can see** and **Human can do** outcomes;
   - before/after ASCII composition or equally concrete state description;
   - included and explicitly excluded behavior;
   - prerequisite and dependency meaning;
   - human acceptance script and automated gate; and
   - exact stop condition, including named adjacent slices that must not begin.
7. Narrow likely ownership paths from the master plan into verified `## Touches` globs. Referencing a
   master plan never grants its full expected source list.
8. For frontend slices, treat settled master-plan UX as binding. Run `ux-design` only for a genuine gap;
   settle that gap with the user and update the master plan before finalizing the focused Plan.
9. Add a temporary compiler handoff for verified edit sites, tests, contracts, and constraints that
   `to-orders` should not rediscover.
10. Run the documentation checker. Stop with the Plan ready for its routed first stage; write no code
    or work orders on the focused-Plan route.

## Subagent Handoff

Return only the following compact result to the coordinator. Do not include discovery logs or
unrequested source excerpts:

```text
RESULT: ROUTED | BLOCKED | ESCALATED | FAILED
ROUTE: DIRECT | FOCUSED-PLAN | NONE
ARTIFACT: <path or none>
NEXT: <single next workflow action>
CHECKS: <commands and pass/fail status>
ISSUE: <none, or exact blocker with path:line evidence>
```

`ROUTED` means the selected route and artifact are ready for `NEXT`. Use `BLOCKED` for missing or
contradictory repository facts, `ESCALATED` for unresolved product or human decisions, and `FAILED`
for an attempted route whose required check did not pass. The coordinator should need no additional
reads for a clean `ROUTED` result.

## Stage Shape

Stages may sequence technical delivery inside the selected visible slice, but every stage must converge
on that slice's one human outcome. If stages independently deliver different visible features, the input
slice is too broad and must be split in the master plan first.

## Boundaries

- Do not redesign the destination while translating it.
- Do not infer that merged code or green tests equal human acceptance.
- Do not start a dependent slice automatically.
- Do not create multiple Plans in one run.
- Do not proceed when the selected slice has an unaccepted prerequisite.
- Do not ask the user to choose direct delivery versus a Plan; that is coordinator cost and risk
  judgement.

## Next Step

Direct delivery continues automatically through `quick-reconcile`. A focused Plan continues through
its planned-quick, work-ordered, or human stage route. Every route stops at the slice's human acceptance
gate and never starts a dependent slice automatically.
