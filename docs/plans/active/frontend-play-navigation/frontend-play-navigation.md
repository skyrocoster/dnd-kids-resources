# Frontend Play Navigation — compact global navigation for play surfaces

> **Status:** Stage 1 shipped; awaiting human UX acceptance for FL-03.

- **Areas:** design, encounters
- **Read trigger:** When implementing or reviewing FL-03 compact navigation for the DM encounter runner

## What we're building & why

Implement [FL-03](../../../master-plans/frontend-layout-redesign.md#slice-ledger) from the Frontend Layout
Redesign. The DM encounter runner is the first live-console route: on wide screens it starts with compact
global navigation so live content gets the attention, while the user's normal preparation navigation
preference remains unchanged when they leave play.

The compact presentation is shell-only. It must keep navigation reachable by keyboard, pointer, and touch,
must not alter encounter controls or reference-window behavior, and must not affect `/play` or preparation
routes.

## UX decisions — compact play navigation

Surface:      DM AppShell around `/encounters/:id/run`; Design owns framing and Encounters owns the play route
Mode:         play for the encounter runner; all other AppShell routes retain their declared mode and behavior
Operator:     DM
Focal:        the existing encounter live state and direct controls; compact navigation yields width without changing the board
Route shape:  existing routed AppShell surface; no route or data-model changes
Edit style:   unchanged; this slice changes only global shell navigation presentation
Save:         unchanged; the existing encounter persistence and live-state behavior remain in their current owners
Empty:        unchanged within the encounter runner
Filtered empty: unchanged within the encounter runner
No selection: unchanged within the encounter runner
Load failure: unchanged within the encounter runner's existing region
Action failure: unchanged beside the affected live control
Destructive:  unchanged; no destructive action moves or changes behavior
Keyboard:     the compact desktop rail remains in DOM/focus order and every nav link remains reachable; the constrained navigation trigger and dialog retain existing Escape and Enter/Space behavior
Touch:        constrained navigation retains the existing 48px control floor; no icon-only replacement removes labels from the reachable navigation drawer

## Before and after

Before, the encounter runner uses the same full-width desktop rail as preparation routes, and that rail's
collapse choice is the only shell presentation preference:

```text
+----------------------+------------------------------------------+
| full prep nav rail   | Encounter · live state                    |
|                      | live controls and references              |
+----------------------+------------------------------------------+
```

After, only the play route gets a temporary compact desktop presentation; leaving it restores the user's
preparation choice, while constrained layouts keep the existing reachable menu trigger:

```text
+----------+-----------------------------------------------+
| compact  | Encounter · live state                         |
| nav      | live controls and references                   |
+----------+-----------------------------------------------+

Constrained:
+-------------------------------------------------------------+
| [menu] Encounter · live state                               |
+-------------------------------------------------------------+
```

## Included

- Mark the routed encounter runner as the shell's play-mode presentation without changing its route shape.
- Present compact global navigation on the wide play route while preserving the persisted preparation rail preference.
- Keep the full navigation set, accessible names, keyboard reachability, and constrained navigation drawer available.
- Verify entering and leaving play does not write, clear, or reinterpret `dnd-kids-nav-collapsed`.
- Preserve the encounter runner's existing live controls, persistent workflow action, docks, and local errors.

## Explicitly excluded

- Any encounter board, round, roster, HP, direct-control, or reference-window redesign.
- Map Lab, Loom, catalog browsers, or future play routes beyond the encounter runner's shell presentation.
- Changes to `/play`, kid navigation, route definitions beyond the existing encounter-runner match, APIs, data, persistence, or navigation vocabulary.
- Replacing the user's prep preference with a new stored mode or adding a global navigation preference system.

## Prerequisite

FL-02 is accepted in the master-plan receipt and archived Plan [Frontend Operational Top Row](../../done/frontend-operational-top-row/frontend-operational-top-row.md).

## Human acceptance script

1. At a representative wide viewport, set the prep rail expanded, open a preparation route, and confirm the full labelled rail remains.
2. Enter `/encounters/:id/run` and confirm the rail is visibly compact while the encounter title, live controls, and workflow-advancing action remain usable.
3. Leave the runner for a preparation route and confirm the expanded prep rail returns; repeat with the prep rail collapsed and confirm that choice also survives.
4. Use keyboard-only navigation on the runner to reach the compact rail links and return to a prep route without losing reachability.
5. At a constrained viewport, open the navigation trigger, use a labelled drawer link, and confirm the runner remains reachable after dismissal.
6. Repeat the primary navigation path with touch; confirm no encounter content is obscured and no `/play` surface changes.

## Automated gate

- Focused `frontend/src/layout/__tests__/AppShell.test.tsx` regressions for route-aware compact presentation, preference preservation, and reachable navigation.
- `npm run test:check -- src/layout/__tests__/AppShell.test.tsx`, then full `scripts/stage_check.py` and documentation checks during reconcile.

## Stop condition

> Stop when the encounter runner alone uses compact global navigation on wide screens, preparation
> preference survives enter/leave, focused and full checks pass, and the human marks FL-03 accepted.
> Do not begin FL-04, FL-14, or any local encounter workspace redesign.

## Stages

1. Add and test the encounter-runner-only compact AppShell presentation, preserving preparation preference and all existing navigation paths.

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | AppShell now applies a temporary compact wide-screen navigation presentation only to `/encounters/:id/run`; the persisted preparation rail preference, constrained drawer, navigation links, and encounter workspace remain unchanged. Focused AppShell tests and frontend typecheck passed. |

## Touches
- `frontend/src/layout/AppShell.tsx`
- `frontend/src/layout/AppShell.css`
- `frontend/src/layout/__tests__/AppShell.test.tsx`
- `frontend/src/hooks/useNavCollapse.ts`
- `frontend/src/features/encounters/**`
- `docs/UX_PATTERNS.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/areas/design.md`
- `docs/areas/encounters.md`
- `docs/master-plans/frontend-layout-redesign.md`
