# Plan Template Workflow Update

> **Status:** Complete. DG0-DG1 shipped; archived 2026-07-16.

- **Area guide:** [Documentation Governance](../areas/documentation.md).

---

## What this outcome is

Updated the execution-plan template and documentation workflow so active plans preserve important discoveries for
later contexts, express required model capability without naming providers, and end with a documentation-update
stage that completes the repository documentation contract.

## Key facts

- `docs/PLAN_TEMPLATE.md` defines the required execution-plan lifecycle.
- `CLAUDE.md`, `docs/README.md`, and `scripts/check_docs.py` define and validate the documentation contract.
- Implementation stages complete their declared documentation impact in the same change set; the final
  documentation stage reconciles and validates that work rather than deferring it.
- Discovery consolidation is a required stage behavior and template field. The existing validator intentionally
  continues to require its established eight execution fields so active plans do not need a mechanical rewrite.

## Reusable pieces (do not rebuild)

- `scripts/check_docs.py` provides the documentation validation entry point.
- `backend/tests/test_docs_contract.py` covers its parser and contract behavior.

---

## Shipped stages

| Stage | What shipped (<=2 sentences) |
|-------|------------------------------|
| **DG0** | Replaced provider-named model labels with capability tiers, required every stage to consolidate discoveries for later contexts, and made documentation update the final plan stage. |
| **DG1** | Reconciled documentation routing, validated the contract and focused checker tests, and archived this completed plan. |

---

## Verification

Run `python scripts/check_docs.py --check`, `python scripts/check_docs.py --check --base <base-ref>` when a valid
base ref is available, and `pytest backend/tests/test_docs_contract.py --no-cov`.
