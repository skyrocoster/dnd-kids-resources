# Design Area Guide

> **Plan queue:**
> 1. [Glossary Term Tooltips](../plans/active/glossary-term-tooltips/glossary-term-tooltips.md) (next up)

## Scope

Owns shared frontend visual language, tokens, shared components, navigation shell, and cross-route accessibility. It does not own feature data, APIs, or game rules.

## Read first

`../DESIGN_SYSTEM.md`, `../ARCHITECTURE.md`, and `../TESTING.md`.

## Source map

- Shared UI: `frontend/src/components/`, `frontend/src/layout/`, `frontend/src/theme.css`, and `frontend/src/index.css`.
- Routed surfaces: `frontend/src/pages/` and `frontend/src/features/`.
- Tests: colocated Vitest/React Testing Library suites.

## Change map

| Change type | Source globs |
|---|---|
| Shared components | `frontend/src/components/**`<br>`frontend/src/layout/**` |
| Shell and routing | `frontend/src/pages/**`<br>`frontend/src/router.tsx`<br>`frontend/src/main.tsx` |
| Frontend test plumbing | `frontend/src/__tests__/**`<br>`frontend/scripts/test-check.mjs` |
| Hooks and utilities | `frontend/src/hooks/**`<br>`frontend/src/utils/**` |
| Tokens and styles | `frontend/src/theme.css`<br>`frontend/src/index.css`<br>`scripts/generate-md3-tokens.mjs` |
| Rendered reference text | `backend/app/reference_text.py`<br>`frontend/src/components/referenceText.ts` |
| Backend test plumbing | `backend/tests/test_main.py`<br>`backend/tests/test_docs_contract.py`<br>`backend/tests/test_check_orders.py`<br>`backend/tests/routers/test_crud_completeness.py`<br>`backend/tests/routers/test_resources.py` |
| Loom seed data | `data/seeds/seed_loom_nodes.json`<br>`data/seeds/seed_loom_sessions.json`<br>`data/seeds/seed_loom_threads.json` |

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| App shell and nav rail | all routes | both | DM |
| Field Guide home | `/` | prep | DM |
| Glossary term tooltip | inline in rendered rule text (spells, weapons, quick rules) | both | DM |

## Invariants

- Use semantic theme tokens; do not introduce arbitrary component colors.
- Preserve domain-specific feature signatures while standardizing shared framing and accessibility.

## Work queue

[Glossary Term Tooltips](../plans/active/glossary-term-tooltips/glossary-term-tooltips.md) — Stage 1 next.

## Cross-references

`../DESIGN_SYSTEM.md`, `../ARCHITECTURE.md`, `../plans/done/visual-consistency/visual-consistency.md`, and all feature area guides.
