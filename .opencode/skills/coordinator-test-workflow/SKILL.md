---
name: coordinator-test-workflow
description: Use ONLY as coordinatorTest's experimental single-entry workflow for free-form repository requests, resumable Luna cases, direct-route approval, and focused Plan review.
---

# Coordinator test workflow

Keep frontier context for decisions. Do not spend it on routine repository retrieval.

## Entry

Answer a purely informational/meta request directly only when no repository investigation is needed. For every
other request, spawn `coordinator-test-caseworker` with this handoff:

```text
PHASE: ASSESS
USER REQUEST: <verbatim request>
SIMULATION PATH: <explicit scratch path, or none>
Invoke `assess-case-test`. Do not edit.
```

Retain the returned task/session ID. All later case-worker work for this case resumes that same ID.

## Review the assessment

The case-worker returns `DIRECT-CANDIDATE`, `PLAN-CANDIDATE`, `MASTER-PLAN-CANDIDATE`, `QUESTION`,
`NO-PROBLEM`, or `BLOCKED`.

- Do not reread repository files to verify clean cited evidence.
- Ask only when the answer changes the route/core outcome, safety/destructive behavior, or an
  irreversible/external contract. Batch all known blocking questions once.
- For reversible Plan details, choose conservative defaults: repository precedent; lossless over lossy;
  accessible/readable over dense; temporary over persisted; smallest coherent scope.
- `MASTER-PLAN-CANDIDATE` is not implemented by this experiment. Explain the route and stop.

Before approving a Plan candidate, require explicit observable acceptance and exclusions. Frontier-settled
stages are recorded as `ORDERED` or `QUICK-CANDIDATE`, never `ORDERED-CANDIDATE`. A dirty generated index
pointing to a missing Plan is a repository-state contradiction to report, not automatically a product
blocker; continue from cited source/ownership evidence and let the frontier decide whether writing is safe.

## Direct candidate

Review the compact envelope for one atomic change, settled behavior, exact paths, structural evidence, one
focused proof contract, safe escalation, and no contract/design/data/migration decision. Reject an under-routed
candidate without exploring source yourself.

When approved, resume the same task ID:

```text
PHASE: EXECUTE DIRECT
ROUTE APPROVED: yes
GOAL: <approved outcome>
AUTHORIZED PATHS: <exact paths>
KNOWN FACTS: <approved cited facts>
CHANGE: <one logical change>
IN-SCOPE REPAIRS: <deterministic checker-reported repairs allowed within authorized paths, preserving intent and not expanding behavior, ownership, contracts, or production scope>
PROOF CONTRACT: <level, regression guard, focused commands, live requirement>
CLOSEOUT: <MINIMAL | FOCUSED | FULL>
ESCALATE IF: <exact boundaries>
Invoke `deliver-direct-test`.
```

Review an `ESCALATED` result against the original paths and intent before starting a new ASSESS round. If the
repair is already authorized and deterministic, resume the same case-worker with clarification and the remaining
verification attempt. Start a narrow ASSESS only when new facts, decisions, or scope are genuinely required.

After `FIXED-PENDING-VALIDATION`, a fresh `coordinator-test-validator` may receive only the observable proof packet
and diff/baseline facts, never implementation narrative. It runs the inert validator phase machine only when a
future handoff names the exact phase and approvals. Validation cannot repair product implementation. REVALIDATE
and later phases require retained-session handoffs plus explicit coordinator gates; closeout and COMMIT are never
implied by passing validation, and this route does not execute current lifecycle operations.

No direct route auto-commits. Present the implementation proof and an observable human-acceptance checklist.

## Experimental ordered implementation

The frontier may resume the retained case-worker for exactly one explicitly approved canonical work order. This is
distinct from direct delivery and order authoring; it does not dispatch, validate, reconcile, or perform lifecycle
closeout.

```text
PHASE: EXECUTE ORDER
ROUTE APPROVED: yes
ORDER PATH: docs/plans/active/<feature>/orders/<NN>-<slug>.md
ESCALATE IF: <exact boundaries>
Invoke `implement-order-test`.
```

The case-worker uses the order's packet as its immutable envelope, touches only packet-authorized paths, runs only
exact packet proof commands in order, permits one deterministic in-scope repair, and returns `DONE`, `FAILED`,
`BLOCKED`, or `ESCALATED` with proof, scope, guard, attempt, and deviation telemetry. It must stop without executing
the example browser-validation order unless that exact order is separately approved and handed off.

## Plan candidate

The ASSESS call should already contain a complete Plan proposal and compiler evidence. Review it for:

- one human-visible outcome;
- route size and coherent stages;
- conservative, non-lossy defaults;
- explicit exclusions;
- empty/error/cancel and relevant accessibility states;
- regression and live-proof quality;
- no deferred product, UX, architecture, data, or contract decisions; and
- compiler handoff that preserves paid-for symbols, state flow, tests, consumers, constraints, and absent
  precedents without discovery logs.

Require exact owning symbols/state flow and exact commands already known; unknowns are compact bounded
lookups, not broad rediscovery. Conditional implementation paths and verification-only files are not
unconditional `Touches` or authorization. If partial implementation is not a valid human-visible shipment,
keep one coherent stage and put internal sequencing in work orders.

State all minor corrections in one message. If correction needs new repository evidence or materially changes
the outcome, resume ASSESS narrowly instead of silently redesigning it. Otherwise resume the same task ID:

```text
PHASE: WRITE PLAN
PROPOSAL APPROVED: yes
TARGET PATH: <docs/plans/active/<feature>/<feature>.md or user-authorized scratch path>
FRONTIER CORRECTIONS: <all corrections, or none>
Invoke `write-focused-plan-test`.
```

Read the written Plan exactly once. Make minor in-scope corrections directly when needed. A material fault goes
back to the same case-worker. Present the reviewed Plan to the user. Experimental order authoring for a named
`ORDERED` stage may use the bounded Luna protocol below; ordered execution remains outside this experiment. One
explicitly selected planned quick stage may use the route below.

## Planned quick stage

This is distinct from a direct free-form fix. The Plan is durable context, and stage review must determine that
the selected stage is now one atomic edit with exact paths, verified facts, no remaining decisions, and one
focused proof contract. Decide this before creating any work order.

When every quick criterion is proven, spawn a fresh `coordinator-test-quick-executor` with only:

```text
Invoke `implement-quick-test`.
GOAL: <one outcome>
AUTHORIZED PATHS: <exact paths and bounds>
KNOWN FACTS: <verified answers>
CHANGE: <one atomic logical edit>
PROOF CONTRACT: <red/green guard, exact focused commands, live requirement and script>
ESCALATE IF: <exact boundaries>
```

Do not include the Plan or discovery narrative. On `DONE`, run the same independent validator rule used for a
visible direct change, then report evidence. Plan recording, closeout, reconciliation, and commit remain outside
this experiment. On `ESCALATED`, do not widen the brief; the stage becomes ordered and this experimental flow
stops. Direct free-form fixes never use this fresh executor; they resume their original case-worker task ID.

## Context discipline

Normal Plan handling uses two case-worker calls: `ASSESS + PLAN-DRAFT`, then resumed `WRITE PLAN`. Only a truly
blocking batched question adds a call. Do not request separate route, draft, audit, and write passes.

## Experimental order-authoring review

For one explicitly named `ORDERED` Plan stage, the frontier chooses a Luna context mode and invokes the shared
`coordinator-test-order-author` skill:

- **Warm:** resume the retained `coordinator-test-caseworker` session with `PHASE: AUTHOR ORDERS` so paid-for Plan and
  repository context can be reused.
- **Fresh:** launch a new `coordinator-test-caseworker` session with only `PHASE: AUTHOR ORDERS` and the complete
  frontier-reviewed compile packet. Do not include the retained transcript or discovery narrative.

The skill and protocol are identical in both modes; the host session alone determines whether context is warm or
fresh. Stronger-model order-author agents, model-specific compiler skills, strong defaults, and warm-Luna-versus-
strong-model comparisons are deferred and are not active routes.

The handoff contains the exact Plan path, named stage, frontier-reviewed compile envelope, canonical nested output
paths, invoke-only order tool, and checker command, then explicitly says `Invoke coordinator-test-order-author`. In `PROPOSE`, the Luna
case-worker reads the Plan exactly once and returns the skill's fixed compact proposal with `ZERO | ONE | MULTIPLE |
UNDER-CAPTURED`, exact boundaries, dependencies, strength, paths, context sufficiency, acceptance/proof coverage,
lookup classifications, expected tool interaction, telemetry, and issue. `ZERO` is already complete,
invalid/not implementable, or quick. `ONE` is valid when one executor boundary is sufficient, but must explain why
durable Plan state was warranted and quick execution is inappropriate. `MULTIPLE` requires genuine executor
boundaries and settled sequencing; never split artificially. `UNDER-CAPTURED` returns to Plan repair.

The frontier owns envelope/proposal/telemetry review and may issue one correction. Then there is one approved `WRITE`
and one deterministic generator/checker repair. No phase performs production discovery, execution, dispatch,
validation, reconcile, commit, or Plan-status work. Outcomes are `PROPOSAL PASS / MATERIALIZATION DEFERRED` and
`PROPOSAL+WRITE PASS`. `WRITE` supplies one lossless canonical JSON packet per approved order and uses
`new_order.py --packet`; it never uses repeated authoring flags or lets the generator infer the reviewed envelope.
Preserve proposal-to-write continuity and the invoke-only tool rules in the shared skill.
This experimental ordered implementation route is bounded to the retained case-worker and one approved order;
production dispatch and later lifecycle parts remain outside this workflow.
