---
name: assess-case-test
description: Use ONLY in coordinatorTest's Luna case-worker ASSESS phase to route one free-form request and return either a direct proof envelope or a complete focused Plan proposal without editing.
---

# Assess one case

Assess and, when Plan-sized, draft the proposal in one bounded pass. Never edit files in this phase.

## Minimum method

1. Follow `AGENTS.md` and `docs/README.md`; never inspect `scratch/` unless the handoff explicitly names a path.
2. Triage informational/meta versus bug, feature, or refactor. Check active Plans and relevant master-plan
   coverage.
3. Read the owning minimum context, primary surface, focused tests/styles, equivalent consumers, and at most two
   repository-wide precedent searches. For bugs, compare every equivalent rendering/computation site and use a
   bounded history check when contract/comment/sibling evidence contradicts implementation.
4. Target at most 12 file reads, 4 searches, and roughly 25k input tokens. Search large/generated documents and
   read bounded sections. Stop when route, outcome, scope, proof, and compiler-saving evidence are known.
5. Ask only for route/core-outcome, safety/destructive, or irreversible/external-contract decisions. Batch all
   known blockers. After route and core outcome settle, choose conservative defaults for reversible paper-size,
   count, and presentation details.
6. Repository scripts named by the workflow are invoke-only. Use their documented command or `--help` and read
   stdout/exit status; do not open checker, generator, order, or stage-script source unless changing its behavior.

## Direct gate

Return `DIRECT-CANDIDATE` only when all are proven: one atomic logical change; behavior/UX/exclusions settled;
exact paths, facts, edit intent, and focused proof known; no design/architecture/API/data/migration/compatibility/
diagnosis/contract decision; no durable coordination need; safe Plan escalation.

The proof level is the smallest that catches a plausible regression:

- Mechanical: diff audit plus narrow deterministic assertion.
- Local behavior: red/green regression guard plus affected focused suite.
- Visible UI: focused suite plus independent live browser script at relevant states/viewports.
- Contract/shared infrastructure: normally `PLAN-CANDIDATE`.

Return:

```text
RESULT: DIRECT-CANDIDATE
TARGET: <surface>
PROBLEM: <verified gap>
STRUCTURAL SCOPE: <equivalent sites checked>
EVIDENCE: <short path:line facts, including history if relevant>
PROPOSED PATHS: <exact paths>
CHANGE: <one logical change>
PROOF CONTRACT: <level; regression guard; commands; live script requirement>
CLOSEOUT: MINIMAL | FOCUSED | FULL
WHY: <every direct criterion satisfied>
ISSUE: none
```

Do not edit after returning the candidate. Wait for resumed authorization.

## Focused Plan gate

When one coherent outcome needs durable decisions, stages, or coordination, return a complete proposal in the
 same call. Include human outcome, decisions/defaults, coherent stages with `ORDERED` or `QUICK-CANDIDATE`
 routes, explicit observable acceptance, automated/live gates, ownership globs, explicit exclusions, review
 flags, and stage-grouped compiler evidence.

The compiler evidence preserves exact owning symbols and state/data flow, precedents, focused test behaviors,
shared consumer defaults, CSS/shell constraints, useful absent-precedent results, exact known commands,
settled contracts, and escalation boundaries. Name missing facts as compact bounded lookups, not broad
rediscovery. Conditional paths and verification-only files stay out of unconditional Touches. If a dirty
generated index points to a missing Plan, report the repository contradiction and continue routing from
source/ownership evidence rather than treating it as an automatic product blocker. Omit discovery logs.

Return:

```text
RESULT: PLAN-CANDIDATE
TARGET: <outcome>
WHY PLAN: <failed direct criteria and why not master-plan sized>
HUMAN OUTCOME: <observable outcome>
PLAN DECISIONS: <concise bullets>
STAGES: <coherent numbered stages with QUICK-CANDIDATE or ORDERED>
ACCEPTANCE: <observable script including empty/error/cancel states>
AUTOMATED GATES: <focused and live proof>
TOUCHES: <bounded globs>
EXCLUSIONS: <explicit list>
REVIEW FLAGS: <reversible defaults, not questions>
COMPILER EVIDENCE: <stage-grouped verified sites/tests/contracts/constraints/open questions>
ASSESSMENT USE: <reads/searches used; useful absent precedents; budget overruns>
ISSUE: none
```

Use `QUESTION`, `MASTER-PLAN-CANDIDATE`, `NO-PROBLEM`, or `BLOCKED` with cited evidence when applicable. Do
not create a Plan or implementation in ASSESS.
