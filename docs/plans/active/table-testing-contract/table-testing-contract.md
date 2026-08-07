# Table Testing Contract — focused questions become reusable evidence and ideas

> **Status:** Stage 3 shipped — the independent candidate ideas bank and evidence-linked card format are documented, and legacy table-test records are clearly marked as historical. Next is decoupling implementation workflow guidance from mandatory table tests.

- **Areas:** infra
- **Read trigger:** Designing, preparing, recording, reviewing, or organizing a focused table test without creating an implementation plan

## Touches

- `docs/TABLE_TESTING.md`
- `docs/table-tests/**`
- `docs/ideas/**`
- `docs/PLAN_TEMPLATE.md`
- `.opencode/skills/master-plan/SKILL.md`
- `.opencode/skills/to-orders/SKILL.md`
- `docs/README.md`
- `docs/INVENTORY.md`
- `scripts/check_docs.py`
- `docs/plans/active/table-testing-records/table-testing-records.md`

## What we're building & why

The current table-testing contract is too closely shaped around implementation Plans: it requires
plan-owned stages, standing questions, plan-shaped setup, and actions that point directly into plans
or issues. That makes a session record feel like an implementation artifact instead of a durable,
question-led account of what was expected and what happened.

The replacement is a standalone evidence workflow. An AI prepares a compact session sheet through a
grilling conversation; a human runs the focused session and records reality; a later AI conversation
compares expectation with observation, organizes meaning, and proposes small evidence-linked entries
in `docs/ideas/`. Ideas may later be selected for a separate contract → Plan → implementation →
reconcile workflow, but table testing never creates, blocks, edits, or prioritizes Plans.

## Stages

1. Replace the canonical table-testing reference and blank record with the question-led contract: one to five focused questions, expectation and confirmation/challenge signals, actual outcome, interpretation, and possible ideas; use `draft → recorded → reviewed`; remove required standing questions and plan-owned sections.
2. Create the `table-test` AI skill in grilling style for preparation and later review, with explicit human confirmation before writing records or idea entries and no invented evidence.
3. Add the lightweight `docs/ideas/` bank and its evidence-linked idea-card format, then update existing table-test records and the documentation routing/checks to the new independent lifecycle.
4. Decouple implementation workflow guidance from mandatory table tests: make Plan references optional and remove any session-run stop condition that treats a table record as Plan-owned work.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Replaced the plan-coupled table-testing reference and blank template with the independent `draft` → `recorded` → `reviewed` lifecycle. Each record now uses one to five focused questions comparing expected and actual outcomes, while keeping interpretation and possible ideas separate from implementation Plans. |
| 2 | Added the `table-test` AI skill with separate preparation and review modes. It uses grilling-style, one-question-at-a-time prompts, preserves human wording, requires explicit confirmation before writing records or ideas, and prohibits invented evidence or automatic Plan changes. |
| 3 | Added the independent candidate ideas bank and evidence-linked card template, with routing from the table-testing documentation. Preserved the two existing Plan-coupled records as explicitly historical evidence and clarified the superseded contract without rewriting their raw observations. |

## Compiler handoff

### Stage 4
- **Verified edit sites:** `docs/PLAN_TEMPLATE.md` — current mandatory table-test guidance; `.opencode/skills/to-orders/SKILL.md` — current session-run stop condition; `docs/plans/active/table-testing-records/table-testing-records.md` — superseded plan-coupled contract.
- **Verified tests:** `.venv\Scripts\python.exe scripts/check_docs.py --check` and the relevant documentation checker tests.
- **Settled contracts:** A Plan may optionally reference a table test, but a table test is valid without a Plan; no Plan stage is required to create or complete a test; the table-test workflow never changes Plan status or Shipped content.
- **Constraints:** Preserve unrelated implementation Plans and avoid touching their product scope; retire or clearly supersede the old table-testing plan rather than leaving two competing active contracts.
- **Open questions:** Decide whether the superseded active Plan is archived as part of this Plan's reconciliation or first marked as a redirect/supersession record.
