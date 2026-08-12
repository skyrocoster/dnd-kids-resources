# WORK ORDER 99 — Show armour class on the collapsed creature row (EXAMPLE — never dispatch)

This is a human-readable illustration of the canonical packet shape. Active executable orders live
under `docs/plans/active/<feature>/orders/` and embed the full JSON packet rendered by `new_order.py`.

## Authorization

### Creates
- none

### Edits
- `frontend/src/features/encounters/CreatureRowCard.tsx`
- `frontend/src/features/encounters/__tests__/CreatureRowCard.test.tsx`

### Removes
- none

## Context inputs

1. `frontend/src/features/encounters/CreatureRowCard.tsx` — anchor `function CreatureRowCard`
   - Purpose: collapsed-row rendering seam.
2. `frontend/src/features/encounters/__tests__/CreatureRowCard.test.tsx` — whole file
   - Purpose: focused behavior suite.
3. `frontend/src/api/types.ts` — lines 229-256, anchor `export interface Monster {`
   - Purpose: trusted ArmorClass context; read-only and not edit authorization.

## Known facts

- The row already carries `ac`; no model change is required.
- AC follows the HP summary and uses `No AC set` when empty.

## Ordered actions

1. **file** (`frontend/src/features/encounters/CreatureRowCard.tsx`) — Render AC after HP.
2. **file** (`frontend/src/features/encounters/__tests__/CreatureRowCard.test.tsx`) — Cover set and empty states.

## Exact proof commands

### Proof 1 — Focused behavior
Working directory: `frontend`

```text
npm run test:check -- src/features/encounters/__tests__/CreatureRowCard.test.tsx
```

### Proof 2 — Type safety
Working directory: `frontend`

```text
npm run typecheck
```

## Acceptance handoff

### Coordinator
- Confirm the collapsed row shows the reviewed set and empty copy.

### Validator
- none

## Exclusions
- No model, API, or style-token change.

## Escalate if
- The row does not already carry AC or the existing summary seam is absent.

STATUS: PENDING

EXECUTOR RESULT:
- DEVIATIONS: none
- PROOF RESULTS: pending
- DIRTY PATHS: pending
- AUTHORIZATION AUDIT: pending
- GUARD EVENTS: none
- ATTEMPTS: 0
- ESCALATION: none
