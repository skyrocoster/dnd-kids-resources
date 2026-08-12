# coordinatorTest Workflow Rebuild

## 1. Status, purpose, and authority

**Status:** Experimental design and handoff. The coordinatorTest assessment, direct, Plan, validator, and
planned-quick surfaces are implemented experimentally. Ordered compilation, ordered execution, reconciliation,
and lifecycle closeout are not implemented in coordinatorTest.

This document is authoritative only for this experimental rebuild. `AGENTS.md`, canonical documentation,
production Plans, production skills and agents, repository templates, and scripts retain authority. This file
does not authorize production changes, order execution, reconciliation, commits, or work outside explicitly
approved experimental paths.

## 2. Design principles

- Reserve frontier context for product coherence, route approval, scope, exclusions, proof, and acceptance.
- Delegate bounded repository retrieval; retain a session when its paid-for context is useful.
- Use stronger independent review when the current step is reasoning-limited.
- Treat the Plan as durable source of truth; envelopes and capsules must reconcile against it.
- Stages are coherent human-visible shipments. Work orders are internal executor boundaries.
- Require acceptance and exclusions before Plan approval.
- Use settled stage labels `QUICK-CANDIDATE` or `ORDERED`, never `ORDERED-CANDIDATE`.
- Conditional implementation paths and verification-only files are not unconditional `Touches`.
- A missing Plan in a dirty generated index is a repository contradiction, not automatically a product blocker.
- coordinatorTest does not auto-commit small fixes. Production reconcile's auto-commit policy is not adopted here.
- Experimental claims require observable benchmark evidence.

## 3. Actors, models, and responsibilities

- **`coordinatorTest`** — frontier primary. Owns outcome, routing, scope, exclusions, Plan/stage review,
  proposal approval, proof sufficiency, acceptance handoff, telemetry review, and user communication.
- **`coordinator-test-caseworker`** — retained Luna session. Owns bounded assessment, structural diagnosis,
  Plan proposal/writing, and approved direct implementation and bounded repair.
- **`coordinator-test-validator`** — fresh, read-only Luna validator. Owns independent automated/live
  observable proof.
- **`coordinator-test-quick-executor`** — fresh Luna executor for one fully settled planned quick stage.
- **Order authoring:** one model-neutral experimental skill is invoked by Luna in either a retained warm
  case-worker session or a fresh case-worker session. The session determines context; the skill defines the same
  frontier-gated protocol. Stronger-model variants and comparisons are deferred. Production `work-order-author`,
  `to-orders`, dispatch, executors, and reconcile remain separate production components.

## 4. End-to-end state machine

```text
USER REQUEST
  -> informational/meta answer
  -> otherwise retained Luna ASSESS
       -> QUESTION / NO-PROBLEM / BLOCKED
       -> DIRECT-CANDIDATE
       -> PLAN-CANDIDATE
       -> MASTER-PLAN-CANDIDATE (stop)
DIRECT-CANDIDATE
  -> frontier approval
  -> same retained case-worker EXECUTE DIRECT
  -> focused proof
  -> fresh validator when visible/live proof is required
  -> human acceptance handoff
PLAN-CANDIDATE
  -> frontier review
  -> retained case-worker WRITE PLAN
  -> frontier reads Plan once
  -> stage review: QUICK-CANDIDATE or ORDERED
QUICK-CANDIDATE
  -> fresh quick executor
  -> focused proof
  -> fresh validator when required
  -> acceptance handoff
ORDERED
  -> retained or fresh Luna invokes shared order-authoring skill
  -> frontier reviews proposal and approves bounded materialization
  -> STOP: coordinatorTest does not dispatch or execute orders
ACCEPTANCE
  -> reported to the user; persistence and reconciliation remain unresolved
```

## 5. Route contracts

### Triage and questions

Pure information is answered directly. Repository-dependent requests start one retained Luna case-worker in
`ASSESS`. Ask only a batched question that changes route, core outcome, safety, or an irreversible contract.

### Structural bug verification

The case-worker verifies the reported gap structurally across equivalent sites, not by a literal single read.
`NO-PROBLEM`, a different surface, or an unresolved diagnosis stops the route rather than fabricating a fix.

### Direct route

The case-worker returns a compact direct candidate with exact paths, one logical change, proof, and closeout.
After frontier approval, the same session executes only that authorization, runs focused proof, and does not
commit. A visible result requiring live evidence goes to the fresh read-only validator.

### Focused Plan route

The retained case-worker returns the complete Plan proposal and compiler evidence in assessment, then writes the
approved Plan in the same session. The frontier reads it once. Acceptance, exclusions, ownership, and proof must
be explicit before approval.

### Stage route

Review each settled stage as `QUICK-CANDIDATE` or `ORDERED`. A stage is a coherent shipment; internal file or
executor boundaries do not create product stages. A stage that is not fully quick-eligible must be ordered, but
coordinatorTest currently stops before order compilation.

### Order authoring

Both candidates use a compact proposal and the same limits: one proposal, one frontier correction, one approved
write, and at most one deterministic repair.

**Warm Luna:** resume the retained case-worker in an explicit author phase with the exact Plan/stage and compiler
handoff already held.

**Fresh Luna:** launch a new case-worker session with only the exact Plan/stage and frontier-reviewed compile packet;
exclude the retained transcript and discovery narrative.

Both invoke `.opencode/skills/coordinator-test-order-author/SKILL.md`, propose zero/one/multiple orders, and write
only after frontier approval without widening Plan scope. A skill does not create fresh context.

Zero orders must be classified as already complete, invalid/not implementable, or quick. Missing behavior,
ownership, acceptance, split, dependency, or proof facts are `UNDER-CAPTURED` and return to Plan repair.
Exact paths, symbols, anchors, tests, commands, and tool facts are `LEGITIMATE COMPILER LOOKUP` only when bounded.

### Planned quick route

A fresh quick executor receives only the settled brief, exact paths, known facts, proof, and escalation boundary;
it does not receive the Plan or discovery narrative. It makes one atomic change and stops after focused proof.
Direct fixes never use this fresh executor; they resume the retained case-worker.

### Validation and ordered boundary

Independent live validation is fresh and read-only. The current experimental limit is one in-scope repair cycle.
Ordered execution, dependency scheduling, status/evidence handling, and dispatch are unsupported and stop here.

## 6. Proof, testing, and failure repair

Automated behavior proof belongs in implementation orders' STOP WHEN fields. Live browser proof belongs to the
fresh validator/coordinator acceptance gate unless an existing supported command explicitly handles it.

| Situation | Candidate policy | Status |
|---|---|---|
| Failure before edit / red test | Establish deterministic red evidence when cheap; never manufacture a brittle source assertion | Settled for direct/quick guidance |
| Executor focused-check failure caused by its own edit | One bounded repair attempt, preserving failure evidence and scope | Ordered lifecycle unresolved |
| Deterministic lint/type/docs repair in authorized paths | Smallest in-scope repair, then rerun the exact check | Direct guidance settled; order lifecycle unresolved |
| Pre-existing unrelated failure | Record exact failure; do not repair or call success | Principle settled; full routing unresolved |
| Failed independent live validation within approved paths | Resume original case-worker for at most one in-scope repair, then revalidate | Current experimental limit |
| Failure requiring new diagnosis/path/contract | Stop and return to frontier/Plan; never widen authorization | Settled |
| Flaky/non-deterministic failure | Preserve repeated evidence and classify unresolved; do not claim proof | Final policy unresolved |
| Full-stage suite failure during closeout | Do not silently repair; route to frontier/reconcile decision | Unresolved |

## 7. Closeout, reconciliation, documentation, and commit

Current coordinatorTest behavior is no commit, no reconcile, no Plan `Status`/`Shipped` persistence after
implementation, and a human acceptance checklist or handoff. Focused documentation checks run when the approved
route requires them. Planned quick execution stops before canonical Plan closeout.

Unresolved lifecycle questions include acceptance persistence, Plan status and Shipped updates, generated
inventory refresh, experimental reconcile, full-stage suite ownership, ordered evidence folding, archive and
dependency unblocking, and any future commit policy. The default remains no auto-commit. Current closeout tiers
(`MINIMAL`, `FOCUSED`, `FULL`) are provisional and may conflict with existing repository contracts until tested.

## 8. Context budgets, envelopes, and telemetry

Assessment targets bounded reads/searches and roughly 25k input tokens. Plan handling targets one ASSESS+PLAN-DRAFT
call and one resumed WRITE PLAN call. Direct work resumes the same case-worker. Planned quick work uses a fresh
executor without Plan/discovery narrative. Order authoring uses the same Luna skill in either a retained warm
session or an isolated fresh session.

Fixed envelopes must name exact paths, facts, proof, exclusions, and escalation. Order proposals must contain
`RESULT`, `PLAN/STAGE`, envelope contradictions, zero/one/multiple count and rationale, lean boundaries/dependencies/
strength/paths/context sufficiency, acceptance/proof coverage, missing-fact classifications, expected tool
interaction, and telemetry—not full order bodies.

Record model identity, task/session IDs and reuse, input/output tokens when available, Plan reads, other reads and
searches, proposal revisions, order-count rationale, lookup classifications, checker commands/results, repairs,
frontier reads, and acceptance decisions.

## 9. Implemented experimental files and conceptual components

Implemented experimental files:

- `.opencode/agents/coordinatorTest.md`
- `.opencode/agents/coordinator-test-caseworker.md`
- `.opencode/agents/coordinator-test-validator.md`
- `.opencode/agents/coordinator-test-quick-executor.md`
- `.opencode/skills/coordinator-test-workflow/SKILL.md`
- `.opencode/skills/assess-case-test/SKILL.md`
- `.opencode/skills/deliver-direct-test/SKILL.md`
- `.opencode/skills/write-focused-plan-test/SKILL.md`
- `.opencode/skills/implement-quick-test/SKILL.md`
- `.opencode/skills/coordinator-test-order-author/SKILL.md` (shared warm/fresh Luna protocol)
- Luna-only order authoring was implemented directly; no active experimental-order-authoring Plan remains.

Conceptual and unimplemented: ordered dispatch, execution and repair; stage
acceptance persistence; validator repair beyond one cycle; experimental reconcile; generated-document closeout;
archive/dependency policy; and commit policy.

## 10. Decisions settled by roleplay

- Direct free-form fixes resume the retained case-worker.
- Planned quick stages use a fresh quick executor.
- Stages are coherent shipments; work orders are internal boundaries.
- Acceptance and exclusions precede Plan approval.
- Settled labels are `ORDERED` and `QUICK-CANDIDATE`.
- Plans are durable source of truth; envelopes supplement, not replace, them.
- Conditional and verification-only paths are not unconditional `Touches`.
- Independent live validation is fresh/read-only with at most one in-scope repair.
- Missing Plan in a dirty generated index is a repository contradiction, not automatically a product blocker.
- coordinatorTest does not adopt small-fix auto-commit.
- Ordered execution and reconciliation remain outside the experiment.
- Order authoring uses one shared skill in retained or fresh Luna sessions; stronger-model variants are deferred.

## 11. Unresolved decisions and benchmark register

1. **Stronger-model variants (deferred):** stronger order-author agents, model-specific skills, defaults, and
   warm-Luna-versus-strong-model comparisons require a separately approved experiment with explicit routing,
   isolation, telemetry, acceptance, and cost/quality boundaries. They are not active routes in this pass.
2. **Warm versus fresh Luna context:** compare the same skill in retained and isolated Luna sessions only if useful.
   Measure context savings, under-capture detection, checker success, reads, turns, repairs, and frontier burden.
3. **Scratch-safe materialization:** probe supported `new_order.py --stdout` and explicit `check_orders.py <paths>`.
   Pass requires no adapter, script change, or production order creation.
4. **Proposal-to-write contract:** test contradiction reporting, zero-order classification, and no-discovery WRITE.
   Pass requires fixed fields and truthful telemetry.
5. **Testing contract:** run direct, quick, validation, and order-author scenarios with injected failures. Pass
   requires deterministic classification and bounded retry behavior.
6. **Test-failure authority:** exercise own-edit, pre-existing, deterministic metadata, flaky, and new-diagnosis
   failures. Pass requires no widening and preserved failure evidence.
7. **Ordered execution/dependencies:** test one order, independent orders, and dependent orders. Pass requires
   correct selection, fresh contexts, sequencing, status/evidence, and stopping.
8. **Stage acceptance:** test empty/error/cancel, visible/live, and human handoffs. Pass requires explicit evidence
   without falsely marking shipped.
9. **Reconciliation/docs closeout:** run a completed stage through generated docs, status, Shipped, active index,
   archive, and dependency behavior. Pass requires no stale state or ownership drift.
10. **Commit policy:** compare no-commit closeout with a separately authorized commit route. Current pass condition
    is preservation of no auto-commit.
11. **Full-stage suite failure:** inject focused-pass/full-suite-fail. Pass requires clear ownership and no silent
    acceptance.
12. **Flakiness:** repeat identical proof runs. Pass requires reproducible classification or explicit unresolved state.

## 12. Next-session test sequence

1. Restart OpenCode and verify experimental agent loading.
2. Run a baseline retained Luna assessment/direct or Plan scenario.
3. Run a named order proposal through the fresh Luna route without retained-case context.
4. Run the same stage through the warm Luna case-worker route once separately authorized.
5. Capture telemetry and compare quality-adjusted total cost.
6. Probe scratch-safe generator/checker materialization.
7. Inject the categorized failures and record repair routing.
8. Stop before ordered execution or reconcile unless separately authorized by a new design decision.
9. Record findings here; do not treat benchmark output as settled production policy.
