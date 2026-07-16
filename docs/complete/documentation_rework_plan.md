# Documentation Rework Plan: AI Signposting and Continuous Upkeep

> **Status:** DOC0-DOC6 shipped. This plan is complete.

## Goal

Create a deterministic documentation path so every AI context can identify its authority, active plan, minimum context, expected touch set, documentation impact, and proof of synchronization.

## Decisions

- Preserve existing canonical documentation paths.
- Use `CLAUDE.md` as the single AI authority and `docs/README.md` as the task router.
- Keep stable prose handwritten, generate volatile inventories from source, and validate both locally and in CI.
- Archive completed plans while retaining redirect stubs where links may exist.

## Shipped Stages

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **DOC0** | Created `scripts/check_docs.py` with `--check`, `--write-generated`, and `--base` modes; 23 fixture-based tests in `backend/tests/test_docs_contract.py`; CLI help documents every mode. Gate ✅. |
| **DOC1** | Made `CLAUDE.md` the sole AI authority, converted all supported entry points into precedence pointers, and created the complete task-routing document manifest. Gate ✅. |
| **DOC2** | Reconciled current references with source/configuration, repaired the seed exporter, and archived completed plans behind redirects. Gate ✅. |
| **DOC3** | Added executable-stage reading, touch, documentation-impact, test, gate, and completion contracts to the template and active plans; enforced them with parser fixtures and manifest-anchor checks. Gate ✅. |
| **DOC4** | Completed the dependency-light checker for active-doc links and anchors, lifecycle, manifest, entry-point, configured-command, legacy-guidance, and base-diff contracts; added 35 fixture tests. Gate ✅. |
| **DOC5** | Added deterministic generated inventories for API, SQLite schema, registration, design tokens/variants, and test configuration, with drift checks and 40 fixture tests. Gate ✅. |
| **DOC6** | Added the `documentation-contract` GitHub Actions workflow and PR routing checklist; clean and deliberately drifted fixture validation plus fresh-reader routing passed. Gate ✅. |

## Verification

```bash
python scripts/check_docs.py --check
python scripts/check_docs.py --check --base <merge-base>
pytest
npm run test
npm run lint
npm run typecheck
npm run build
```

Enable `documentation-contract` as a required branch-protection check in GitHub repository settings.

## Known Limits

CI can guarantee documentation consistency within a submitted change set, not the order in which files were edited. Agents that ignore repository instructions entirely cannot be controlled before submission, but their changes will fail validation before merge.
