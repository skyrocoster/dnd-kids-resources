# Weapon Quick Reference — every weapon explains the exact roll before the long rules

> **Status:** Stage 1 complete (weapon rules contract shipped). Next: Stage 2 — Copy as New.

- **Area guide:** [Reference Catalogs](../../areas/reference-catalogs.md)

## What we're building & why

Weapons need the same playtime clarity as spells: a short, required instruction that says which dice
to roll and what success does. Existing weapon attack modifiers describe the weapon itself, not a
character's final sheet total, so this plan preserves those meanings and adds optional sheet-ready
totals for deliberately customized weapons.

Assigning an existing weapon continues to link the existing row. When exact values differ, Copy as
New opens a prefilled editor and creates an ordinary independent weapon record; copied weapons are
not private instances or a second catalog type. Player-side display and assignment remain for the
later Players plan.

## Settled contract

- Every weapon has validated quick_rules and uses the shared reference-text registry. Generic
  weapons may resolve absent totals to phrases such as "your attack bonus"; customized weapons may
  store and render exact authored attack totals and final damage expressions.
- Existing intrinsic modifiers such as a magic weapon's attack_mod and damage_mod keep their
  current meaning. No character values are calculated and no overrides live on player_weapons.
- Copy as New is available only from Weapon detail, copies all authored mechanics into a new draft,
  and saves through ordinary weapon creation. All weapons remain in one searchable catalog.
- The Weapons page does not show owners or manage player assignments.
- Deleting an assigned weapon names the affected characters in confirmation, then deletes the weapon
  and cascades its assignment links.

## UX decisions — weapon quick rules and copying

```
Surface:      Weapon browser and Weapon editor (existing rows in
              docs/areas/reference-catalogs.md ## Surfaces).
Mode:         prep.
Operator:     DM.
Focal:        quick rules lead Weapon detail before properties and long entries. Edit and Copy as
              New remain secondary authoring actions.
Route shape:  existing Browser at /weapons with the existing modal Editor.
Edit style:   modal. Copy as New opens the same editor with a new-record draft.
Save:         explicit Save on create, copy, and edit, matching the existing editor contract.
Empty:        SearchList empty state: "No weapons found."
Filtered empty: "No matches".
No selection: "Choose a weapon from the list to view its details."
Load failure: existing BrowserLayout page error and SearchList error state remain visible.
Action failure: inline in the Weapon editor status region with role="status"; invalid reference
              tokens identify the field and token.
Destructive:  unassigned weapon: 'Delete "<name>"? This cannot be undone.' Assigned weapon:
              confirmation additionally names every affected character and states that their
              assignments will be removed.
Keyboard:     DOM order. Copy as New is an ordinary button; Escape closes the editor unless pending.
Touch:        48px floor for detail actions and editor controls.
```

## Stages

1. **Weapon rules contract.** Extend the weapon attack and quick_rules data contracts without
   reinterpreting intrinsic modifiers. Carry required quick rules and optional sheet-ready totals
   through schema, database, API, seeds, and import/export with shared-token validation.
2. **Copy as New.** Add the detail action and prefilled new-record editor flow. Saving creates a
   normal catalog weapon and never changes or implicitly assigns the source.
3. **Quick-reference presentation and deletion safety.** Render quick rules before long weapon text
   through the shared renderer, support readable fallbacks for absent totals, and make assigned
   deletion confirmations accurately name their cascade impact.
4. **Canonical weapon seed pass.** Generate quick rules for every seeded weapon, validate explicit
   dice wording and structured attack/damage facts, report ambiguous entries for review, and require
   complete rebuild/export round-tripping before Players may consume the contract.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Weapon schema, DB columns, API fields, seed import/export, and frontend types carry required quick_rules and optional sheet-ready totals with shared-token validation, preserving intrinsic attack_mod/damage_mod. Real-data contract tests prove all 219 seeded weapons serialize and round-trip through init→seed→export.
