# Visual Design Area Guide

> **Active plan:** [Visual Consistency](../plans/active/visual-consistency.md#vt3-map-lab-editor-next-up).

## Scope

Owns shared frontend visual language, tokens, shared components, navigation shell, and cross-route accessibility. It does not own feature data, APIs, or game rules.

## Read first

`../DESIGN_SYSTEM.md`, `../ARCHITECTURE.md`, `../TESTING.md`, and the active plan.

## Source map

- Shared UI: `frontend/src/components/`, `frontend/src/layout/`, `frontend/src/theme.css`, and `frontend/src/index.css`.
- Routed surfaces: `frontend/src/pages/` and `frontend/src/features/`.
- Tests: colocated Vitest/React Testing Library suites.

## Invariants

- Use semantic theme tokens; do not introduce arbitrary component colors.
- Preserve domain-specific feature signatures while standardizing shared framing and accessibility.

## Work queue

- The active visual-consistency plan owns all currently scheduled remediation work.

## Cross-references

`../DESIGN_SYSTEM.md`, `../ARCHITECTURE.md`, `../plans/active/visual-consistency.md`, and all feature area guides.
