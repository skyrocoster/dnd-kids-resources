# Design Area Guide

- **Read trigger:** Shared UI, tokens, shell, or accessibility

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
| Tokens and styles | `frontend/src/theme.css`<br>`frontend/src/index.css`<br>`scripts/generate-md3-tokens.mjs`<br>`scripts/derive-kid-palette.mjs`<br>`scripts/derive-kid-palette.test.mjs` |
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

<!-- GENERATED:AREA_PLANS:design:START -->
| Plan | State | Status |
| --- | --- | --- |
| [Glossary term tooltips](../plans/active/glossary-term-tooltips/glossary-term-tooltips.md) | ready | Stages 1-4 shipped. |
<!-- GENERATED:AREA_PLANS:design:END -->

What the table cannot derive:

Three items with no plan yet, raised by
[Kid Map Viewer](../plans/active/kid-map-viewer/kid-map-viewer.md) planning and deliberately kept out
of it:

- **Prune the 26 identity tints.** Every one lands at 10.0-10.1:1 against `--md-surface` because they
  were each generated to the same tone, so lightness carries zero information and hue does all the
  work; six read as "orange" to a child. `--md-boss` and `--md-loom-thread-1` are the same hex, and
  `--md-passage-locked` `#C5C0FF` differs from `--md-loom-thread-5` `#C4C0FF` by one unit. The cause is
  `scripts/generate-md3-tokens.mjs`: one role per invocation, so it cannot see the palette it is adding
  to. These stay DM-side authoring aesthetics — never spoken, never on a kid surface — and the kid map
  gets its own solved four-colour palette instead.
- **Terrain redesign.** `river` and `trees` (`#004B71`, `#005143`, both L\* 30.0) stop rendering on the
  kid surface pending a rethink of their whole implementation. Data, the Map Lab tool, and the DM map
  are untouched.
- **Wall-kind redesign.** `natural` and `open` stop rendering on the kid surface. Note the live
  collision to fix: `--wall-natural-stroke` is `--md-nature` `#86D5C1` at L\* 79.9, a mint-green wall
  sitting at **1.001:1 against the default wall** and distinguishable only by its dasharray. Note also
  that `wallKind` is a property of the room, not of an edge — `open` restyles a whole perimeter and has
  never marked a passable gap.

## Cross-references

`../DESIGN_SYSTEM.md`, `../ARCHITECTURE.md`, `../plans/done/visual-consistency/visual-consistency.md`, and all feature area guides.
