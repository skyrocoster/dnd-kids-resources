WORK ORDER 99 — Show armour class on the collapsed creature row (EXAMPLE — never dispatch)
GOAL: a collapsed creature row card shows its AC beside the existing HP summary.
DEPENDS ON: none
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none

KNOWN STATE (already true — do NOT redo or re-derive):
- This is the reference example for `.agents/skills/to-orders/SKILL.md`. It names real files and
  passes `scripts/check_orders.py`, so it doubles as the fixture proving the linter accepts a
  well-formed order. It is not queued work; nobody dispatches order 99.
- `EncounterCreatureRow` already carries `ac: string`
  (frontend/src/features/encounters/encounterForm.ts line 16), populated from the monster at
  line 63. Nothing new is needed on the form model.
- The collapsed header renders `displayName` and `hpSummary` only
  (frontend/src/features/encounters/CreatureRowCard.tsx lines 32-34). `hpSummary` is the precedent
  for the empty case: it reads `'No HP set'` rather than rendering nothing.
- `Monster.ac` is `ArmorClass | null`, a domain type, not a number (frontend/src/api/types.ts
  line 237). A fixture that writes `ac: 12` passes vitest and fails `tsc -b`; the repo's idiom is
  minimal-plus-cast — `mockResolvedValue([{ id: 9, name: 'Goblin' }] as Monster[])`.
- UX decisions that apply here: AC sits after the HP summary on the same header line, separated by
  the existing `·` divider; when `row.ac` is empty the card reads `No AC set`; no new colour —
  reuse the `.creature-row-summary` token already on that line.

START IN:
- frontend/src/features/encounters/CreatureRowCard.tsx — the collapsed header block at lines 32-45, nothing else in this file
- frontend/src/features/encounters/__tests__/CreatureRowCard.test.tsx — the collapsed-row describe block
- frontend/src/api/types.ts — the `Monster` interface at line 229 only, for the `ArmorClass` shape

DO:
- Render `row.ac` after `hpSummary` in the collapsed header, falling back to `No AC set`.
- Add one test to frontend/src/features/encounters/__tests__/CreatureRowCard.test.tsx covering the
  set and the empty case.

STOP WHEN: `cd frontend && npm run test:check -- src/features/encounters/__tests__/CreatureRowCard.test.tsx && npm run typecheck` passes. Then stop — change nothing else.

STATUS: <-- executor writes DONE, or FAILED - reason

DEVIATIONS: <-- executor appends, always — exactly two lines
- opened beyond START IN: <files the order didn't name, or "none">
- KNOWN STATE re-verified or wrong: <one line, or "none">
