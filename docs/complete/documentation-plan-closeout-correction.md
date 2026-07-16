# Plan Closeout Correction

> **Status:** Complete. DC0-DC1 shipped; archived 2026-07-16.

- **Area guide:** [Documentation Governance](../areas/documentation.md).

---

## What this outcome is

Corrected the plan template so delivery phases collapse independently and one final Plan Closeout phase contains the
documentation-update stage that archives the entire execution plan.

## Key facts

- An active execution plan owns one outcome and is archived when that outcome is complete.
- Every delivery stage completes its declared documentation impact and consolidates discoveries as it ships.
- Delivery phases contain delivery work only; the sole final Plan Closeout phase reconciles documentation, validates
  routing, and archives the plan.

---

## Shipped stages

| Stage | What shipped (<=2 sentences) |
|-------|------------------------------|
| **DC0** | Separated delivery phases from one final Plan Closeout phase, so only the latter's documentation-update stage archives the execution plan. |
| **DC1** | Validated the documentation contract and focused checker tests, then archived this correction plan. |

---

## Verification

Run `python scripts/check_docs.py --check`, `python scripts/check_docs.py --check --base <base-ref>` when a valid
base ref is available, and `pytest backend/tests/test_docs_contract.py --no-cov`.
