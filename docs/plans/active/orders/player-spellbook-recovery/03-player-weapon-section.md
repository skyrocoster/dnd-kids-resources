WORK ORDER 03 — Alphabetical Weapons section with quick rules
GOAL: a `PlayerWeaponSection` component that lists a player's assigned weapons alphabetically, each
row always showing its resolved quick rule, with the full weapon detail expandable in place.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Plan UX decision: "Weapons are secondary" to Spells, "then Full Profile." Same expand-in-place and
  48px-floor rules as Spells apply (see order 02's KNOWN STATE for the exact copy).
- Quick-rules + full-detail rendering for weapons already ships in
  `frontend/src/features/weapons/WeaponBrowserPage.tsx` lines 158-210:
  - meta `dl`: Category (`weapon_category`), Weight (`weight` + " lb."), Attunement (`req_attune`),
    Properties (`property.join(', ')`), Spellcasting Focus (`focus.join(', ')`) — each only rendered
    when present.
  - quick rules: `<ReferenceText text={selected.quick_rules} registry={weaponValueReferenceRegistry}
    context={{ weapon_attack_bonus: selected.weapon_attack_bonus, weapon_damage_bonus:
    selected.weapon_damage_bonus }} />` — note the context values come from the **weapon itself**, not
    the player (weapons are customized per-catalog-record, per the settled contract).
  - attacks: `selected.attack.map((attack, i) => <DiceText text={describeAttack(attack)} />)`.
    `describeAttack` (line 31 of WeaponBrowserPage.tsx) is a local, non-exported function — add
    `export` to its declaration so it can be imported, and import `WeaponAttackEntry` from
    `../../api/types` if the new file needs the type.
- `Weapon` (frontend/src/api/types.ts line 392) has `name, base_weapon, rarity, weapon_category,
  weight, req_attune, property, focus, attack, quick_rules, weapon_attack_bonus,
  weapon_damage_bonus`.
- The disclosure toggle pattern (aria-expanded/aria-controls, chevron swap) is in
  `frontend/src/features/encounters/CreatureRowCard.tsx` lines 39-48; `ChevronDownIcon`/
  `ChevronUpIcon` import from `../../components/icons`.
- No component currently exists for this in `frontend/src/features/players/`.

START IN:
- frontend/src/features/weapons/WeaponBrowserPage.tsx (quick-rules + full detail rendering, and the
  `describeAttack` function to export)
- frontend/src/features/encounters/CreatureRowCard.tsx (disclosure toggle pattern to mirror)
- frontend/src/components/referenceText.ts (ReferenceText, weaponValueReferenceRegistry)

DO:
- In `frontend/src/features/weapons/WeaponBrowserPage.tsx`, add `export` to the `describeAttack`
  function declaration (no other change to that file).
- Create `frontend/src/features/players/PlayerWeaponSection.tsx` accepting `{ weapons: Weapon[] }`,
  sorted alphabetically by name. Each row always shows the weapon name and its resolved quick rule
  (context from the weapon's own `weapon_attack_bonus`/`weapon_damage_bonus`); a disclosure button
  expands the row to show category/weight/attunement/properties/focus and attacks, mirroring
  WeaponBrowserPage's rendering. When `weapons` is empty render the existing empty copy "No weapons
  assigned." (reuse the exact string).
- Add `frontend/src/features/players/PlayerWeaponSection.css` matching existing player CSS naming
  conventions.
- Add `frontend/src/features/players/__tests__/PlayerWeaponSection.test.tsx` covering: alphabetical
  order, quick rules always visible, expand-in-place reveals full detail, empty state text.

STOP WHEN: `npm test PlayerWeaponSection` passes. Then stop — do not wire this into
PlayerBrowserPage.tsx.

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
