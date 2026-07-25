# Encounters Feature — Expansion Plan

This document is the single reference for expanding the **encounter** feature beyond what shipped in
`dungeon_plan.md`'s Design Phase A (the live Encounter Runner, E1–E6). It follows the same staged
methodology as `dungeon_plan.md` (scaffold → implementation → design pass) and inherits that project's
design system, component anatomy, and reusable pieces — build on them rather than re-deriving.

> **Status:** Phases 1–3 and Phase 4 shipped. See the Shipped-stages table for the collapsed
> record.

---

## What the feature is

The **Encounter Runner** runs combat live at the table: a scrollable list of combatant cards, each with
HP steppers, a status-pill row, a condition chip row + inline picker, drag-reorder, and "set active"/
"next turn" turn tracking. It runs in two hosts that share one engine (`useEncounterRunner`): a standalone
route (`/encounters/:id/run`) and a **draggable pop-out dock** (`FloatingWindow` + `EncounterDock`) that
floats over the dungeon and Map Lab session viewers. The separate **Encounter Editor** (creation/authoring)
is where an encounter is built before it is ever run.

Phase 4's signature affordance: the pop-out runner becomes a **resizable** window, and the DM can add
**player characters** to a live encounter — name + conditions only, no HP tracking — so the party and the
monsters share one turn list.

---

## Key facts (assume no other repo knowledge)

**The runner engine is a pure reducer + a hook.**
- `frontend/src/features/encounters/encounterRunner.ts` — headless `encounterRunnerReducer(state, action)`,
  `RunnerAction` union, `RunnerState` (`{ combatants: RunnerCombatant[]; activeClientId; round }`), and the
  serializers `combatantsToCreatures` / `runnerStateToEncounterInput`. `RunnerCombatant` = the wire
  `EncounterCreature` plus a session-only `clientId`. `combatantFromMonster(monster)` derives a fresh
  combatant (HP/AC via `deriveCreatureStats`). Tests: `__tests__/encounterRunner.test.ts`.
- `frontend/src/features/encounters/useEncounterRunner.ts` — loads the encounter, drives the reducer,
  debounced-autosaves (`SAVE_DEBOUNCE_MS = 600`) via `updateEncounter`, and fetches the canonical
  `Condition[]`. Exposes one bound callback per action. Both hosts consume this hook.

**The wire model is HP + AC + status + conditions, and it's an opaque blob server-side.**
- `EncounterCreature` (`api/types.ts:174`): `{ monster_id?, original_name?, name?, hp_current?, hp_max?,
  ac?, status?, conditions?[] }` — every field optional/nullable. There is **no** initiative, CR, or
  per-creature "kind" field today.
- Backend stores `creatures` as `List[Dict[str, Any]]` (`backend/app/schemas.py:286`) → JSON blob in the
  `units` column; the router does no field-picking. **A new per-creature field (e.g. `kind`) round-trips
  with no backend/seed change** — the same pattern Phase 3 used for `encounter_id` on a prop. Prefer this
  to inferring a player from null HP.

**The pop-out is a generic FloatingWindow.**
- `frontend/src/components/FloatingWindow.tsx` (+ `.css`) — `position: fixed`, drag by a fat grip header,
  minimize/close, position persisted to `sessionStorage` under `storageKey`. Size is currently **fixed**
  in CSS (`width: min(380px, 92vw)`, `max-height: min(70vh, 640px)`); there is no resize handle and no size
  persistence. It hosts arbitrary `children` — the encounter dock is one caller (`EncounterDock.tsx`),
  which renders `EncounterRunnerBoard compact`.

**The board and the card.**
- `EncounterRunnerBoard.tsx` — header (round, next-turn, sync status, **Add monster** toggle → `AddMonsterPanel`),
  then the combatant list with drag-reorder. `compact` prop tightens spacing for the ~310px dock.
- `CombatantCard.tsx` — renders, in order: header (drag handle, reorder ↑↓, name input, AC, active toggle,
  duplicate, remove), a **status-pill** row (`alive/unconscious/dead/fled`), a **condition** row
  (chips + `ConditionPicker`), an **HP meter**, and a **stepper rail** (−10/−2/−1, +1/+2/+10, Set…). A
  player card must suppress the HP meter, stepper rail, AC, and status pills, keeping only name + conditions
  (and reorder/active/remove for turn order).

---

## Design system in force

Inherit the project design system exactly as documented in `dungeon_plan.md`'s "Design system in force"
section. Load-bearing points for this phase:
- **Tokens only.** Consume `--md-*` / `--type-*` from `frontend/src/theme.css`. Encounters/monsters are the
  **tertiary/teal** content role; players should read as a distinct-but-related role (use an existing token
  such as the primary/secondary container for the player accent — never hand-picked hex).
- **Icons:** local Lucide inline-SVG components in `components/icons/`. No emoji, no icon font, no CDN.
- **Accessibility floor:** visible focus rings; never hue-alone (a player card must be labeled/iconed, not
  just tinted); `prefers-reduced-motion` honored; **≥48px touch targets** — the primary device is a Surface
  Pro and the runner is touch-first. The resize handle must be a finger-sized, keyboard-operable control,
  not a 6px corner nub.

---

## Reusable pieces (do not rebuild)

- **`encounterRunnerReducer` + `RunnerAction`** — add new actions here (mirror `setStatus`/`addFromMonster`);
  do not fork the engine.
- **`combatantFromMonster`** — the model for a `combatantFromPlayer` factory (same `clientId` minting, but
  null HP/AC and `kind: 'player'`).
- **`AddMonsterPanel`** — the exact pattern for an `AddPlayerPanel` (toggle in the board header → panel →
  `onAdd`/`onClose`).
- **`ConditionPicker`** + `encounterForm.ts` helpers (`mergeConditionOptions`/`isConditionSelected`/
  `toggleCondition`) — the condition editor, already used by both the editor and the card.
- **`FloatingWindow`'s drag machinery** — the pointer-move/pointer-up window-listener pattern for the drag
  header is the exact template for the resize-handle pointer logic; `loadPosition`/`savePosition` are the
  template for `loadSize`/`saveSize`.
- **`getConditions()`** (`api/client.ts`) — condition source of truth.

---

## Phase 4 — Runner Field Ops

Make the pop-out runner usable as a live combat surface: **resizable** so the DM can size it to the table,
and able to hold **player characters** (name + conditions, no HP) alongside monsters in one turn list.
Both are pure-frontend — no backend/seed change (`FloatingWindow` size persists to `sessionStorage`; the
player `kind` field round-trips through the opaque `units` blob).

**Depends on:** Phases 1–3 shipped (uses `ConditionPicker`, the shared `EncounterDock`, `useEncounterRunner`).
**Depended on by:** nothing queued.

| Stage | Model | Summary | Deliverables |
|-------|-------|---------|--------------|
| **P0 — Scaffolding** | Haiku | Types/stubs/placeholder CSS/`it.skip` tests, no implementation. One context. | `Size` type + `size` state/`loadSize`/`saveSize` stubs + resize-handle element (inert) in `FloatingWindow`; `kind?: 'monster' \| 'player'` on `EncounterCreature`; `{ type:'addPlayer'; name; conditions? }` in `RunnerAction` (no-op case) + `combatantFromPlayer` stub + `addPlayer` on the hook; `AddPlayerPanel.tsx` stub + board toggle stub; `CombatantCard` `isPlayer` branch stub; placeholder CSS; skipped test stubs. Stubs compile; app renders unchanged. |
| **P1 — Resizable window** | Sonnet | Drag a corner handle to resize the pop-out; size persists. | Resize-handle pointer-drag in `FloatingWindow` (mirrors the header-drag pattern) writing `width`/`height` with min/max clamps; size persisted to `sessionStorage` per `storageKey`; CSS switches from fixed `width`/`max-height` to state-driven; keyboard-resizable handle. Tests: clamp util + persistence round-trip + handle renders/operates. |
| **P2 — Add players** | ✅ shipped | Add a PC to a live encounter: name + conditions only. | See shipped row below. |
| **P3 — Design pass** | ✅ shipped | `/frontend-design` review, MD3/a11y, zero-bug. | See shipped row below. |

**Sequencing:** P0 → P1 → P2 → P3 (P1 and P2 were independent; P3 is last).

---

## Shipped stages (collapsed record)

Implementation narrative lives in each stage's git commit; these rows answer *what exists*, not *how it was built*.

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| **C0** | Scaffolding for Creation Overhaul: `deriveCreatureStats` stub, `conditions: string[]` on the creature row, `getConditions()` wired, test stubs. Gate ✅. |
| **C1** | Shared `deriveCreatureStats` (`encounterStats.ts`); editor auto-fills HP/AC on monster pick (overwrite semantics); `combatantFromMonster` refactored onto it. Runner unchanged; live-verified 2026-07-13. |
| **C2** | Comma-text condition field → checkbox group from canonical conditions; `mergeConditionOptions`/`isConditionSelected`/`toggleCondition` in `encounterForm.ts`; legacy/unknown names preserved. 438 tests. |
| **C3** | Creation design pass: `CreatureRowCard` (collapsible) + `ConditionPicker` (popover) components; MD3 tokens, Lucide icons, ≥2.75rem targets, `aria-modal` intact. 447 tests, live-verified 2026-07-13. |
| **R0** | Runner-Conditions scaffolding: `setConditions` action (no-op case), `onSetConditions`/`conditions` props threaded to `CombatantCard`, placeholder CSS, `it.skip` stubs. Gate ✅. |
| **R1** | `setConditions` reducer case (immutable replace by `clientId`); canonical `Condition[]` fetched in `useEncounterRunner` and exposed as `runner.conditions`; round-trip preserved. 453 tests, build clean. |
| **R2** | Condition chip row + inline `ConditionPicker` on `CombatantCard` (teal/tertiary role); toggles dispatch `setConditions` and persist through debounce-save; legacy names preserved. 456 tests. |
| **R3** | Runner design pass: status-chip target raised to 2.75rem; `.compact` dock spacing overrides; picker panel `role="group"`. 464 tests, live-verified 2026-07-13. |
| **D0** | Dungeon-Link scaffolding: `encounter_id?` on `MapProp`, `'encounter'` prop kind, **inline `EncounterDock` extracted to shared `EncounterDock.tsx`**, `PROP_FIELDS` stub, `it.skip` stubs. Gate ✅. |
| **D1** | Confirmed `encounter_id` round-trips through the opaque `map_layout` blob (no backend change); `EncounterDock` rendered on the Map Lab session viewer via `activeEncounterId`. 460 tests. |
| **D2** | Session-viewer `'encounter'` marker (teal `PropMarker`, state tokens take precedence) opens the dock on click/Enter; a marker without `encounter_id` is inert; editor prop-click still only selects. 462 tests. |
| **D3** | Editor authoring: new `encounterPicker` field (`EncounterPickerField`, `<select>` from `listEncounters()` by title) writes `encounter_id` through the existing autosave path; only shown for `kind==='encounter'`. 464 tests. |
| **D4** | Dungeon design pass: styled `.maplab-field-row select` to match text inputs; removed stale TODO; confirmed marker focus/sizing precedent. 464 tests, live-verified 2026-07-13. |
| **P0** | Phase 4 scaffolding: `Size` type + stubs, `kind` on `EncounterCreature`, `addPlayer` action/`combatantFromPlayer` stub/`AddPlayerPanel` stub/board toggle/`isPlayer` derivation, `it.skip` test stubs. Gate ✅. |
| **P1** | Resizable `FloatingWindow`: `clampSize` util, `loadSize`/`saveSize` + `sessionStorage`, pointer-drag resize handle (mirrors header-drag), keyboard arrow-key resize (step 16px), `min-width`/`min-height` CSS floors, body user-select guard during resize. 602 tests, build clean. |
| **P2** | Player characters in the runner: `addPlayer` reducer case, `combatantFromPlayer` factory, `AddPlayerPanel` (name field + `ConditionPicker`), `CombatantCard` player variant (no HP/stepper/AC/status), board-header toggle, `kind` round-trips through save/hydrate. 623 tests, build clean. Live-verified 2026-07-14. |
| **P3** | Phase 4 design pass: player cards now have a semantic Player badge + secondary-token treatment, the Add-player panel uses icon-only local Lucide chrome, and the floating resize handle has a visible 48px keyboard-focusable affordance with reduced-motion handling. 623 tests, lint/build clean aside from existing warnings; manual browser verification remains user-performed per `CLAUDE.md`. |

---

## Known debt / deferred work (NOT yet built)

- **Wider stat propagation** (initiative, CR, speed, ability scores) — requires extending the
  `EncounterCreature` wire model + backend; a model-change phase of its own.
- **Encounter templates / difficulty budgeting** — party-size/CR-based XP budget, "build me an encounter"
  helpers.
- **Quick-add-by-quantity** — "add 4× Goblin" in the editor in one action.
- **Player HP/initiative tracking** — Phase 4 adds players as name + conditions only by design; giving
  players optional HP or initiative is a later, explicitly-scoped extension.

---

## Cross-references

- Sibling plan: `docs/dungeon_plan.md` (Design Phase A shipped the runner E1–E6; Map Lab + props).
- Reference docs: `docs/API_REFERENCE.md` (encounters router), `docs/DATA_MODEL.md` (`units`/`creatures`
  JSON blob), `docs/DESIGN_SYSTEM.md` (tokens, icons, a11y floor), `docs/TESTING.md`.

## Next:

No encounter expansion stage is currently queued.
