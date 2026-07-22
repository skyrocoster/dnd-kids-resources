WORK ORDER 02 — Level-grouped Spells section with always-visible quick rules
GOAL: a `PlayerSpellSection` component that lists a player's assigned spells grouped by level
(alphabetical within level), each row always showing its resolved quick rule, with the full
description expandable in place.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Plan UX decision (docs/plans/active/player-spellbook-recovery.md, "UX decisions" block): "Focal:
  assigned Spells, grouped by level. Every collapsed row leads with name and resolved quick rules;
  full explanation expands in place." Keyboard: "spell/weapon disclosure buttons activate with
  Enter/Space." Touch: "48px floor for roster entries, disclosure controls, and dialog actions."
- `frontend/src/theme.css` defines `--control-height: 48px` (line 273) as the documented touch-target
  floor token — use it (or a class that already applies it) for the disclosure button's min height.
- Quick-rules resolution pattern (already shipped for the Spell browser) is in
  `frontend/src/features/spells/SpellBrowserPage.tsx` lines 265-273:
  ```
  <ReferenceText text={selected.quick_rules} registry={spellValueReferenceRegistry} context={{}} />
  ```
  `ReferenceText` and `spellValueReferenceRegistry` come from `../../components/referenceText`.
  `spellValueReferenceRegistry`'s context shape is `{ spell_attack_bonus?, spell_save_dc? }` — for a
  player-owned spell this must be populated from the Player, e.g.
  `{ spell_attack_bonus: player.spell_attack_bonus, spell_save_dc: player.spell_save_dc }`.
- `Spell` (frontend/src/api/types.ts line 42) has `name, level, quick_rules, description,
  alternate_description, higher_levels: { text, damage_by_slot }`. `level` is a plain number (0 =
  cantrip); `frontend/src/features/spells/constants.ts` exports `levelLabel(level)` for the heading
  text ("Cantrip", "1st Level", etc.) — reuse it, do not reimplement.
- The disclosure toggle button pattern (aria-expanded/aria-controls, chevron icon swap, parent owns
  collapsed state per row id) already exists in
  `frontend/src/features/encounters/CreatureRowCard.tsx` lines 39-48. `ChevronDownIcon`/`ChevronUpIcon`
  import from `../../components/icons`.
- `DiceText` (`../../components/DiceText`) renders inline dice-formatted text; use it for the expanded
  description/higher_levels text, same as `SpellBrowserPage.tsx` lines 274-285.
- No component currently exists for this in `frontend/src/features/players/`.

START IN:
- frontend/src/features/spells/SpellBrowserPage.tsx (quick-rules + description rendering to mirror)
- frontend/src/features/encounters/CreatureRowCard.tsx (disclosure toggle pattern to mirror)
- frontend/src/components/referenceText.ts (ReferenceText, spellValueReferenceRegistry)
- frontend/src/features/spells/constants.ts (levelLabel)

DO:
- Create `frontend/src/features/players/PlayerSpellSection.tsx` accepting `{ player: Player, spells:
  Spell[] }`. Group spells by `level`, sort groups ascending, sort spells alphabetically within a
  group, render a heading per group via `levelLabel`. Each row always shows the spell name and its
  resolved quick rule (when `quick_rules` is set); a disclosure button expands the row to show
  `description`, `alternate_description`, and `higher_levels.text` via `DiceText`. When `spells` is
  empty render the existing empty copy "No spells assigned." (reuse the exact string; do not invent a
  new one).
- Add `frontend/src/features/players/PlayerSpellSection.css` for level-group and row layout, matching
  existing player CSS conventions (see `PlayerAssignments.css` for naming style).
- Add `frontend/src/features/players/__tests__/PlayerSpellSection.test.tsx` covering: level grouping
  order, quick-rules always visible without expanding, expand-in-place reveals description, empty
  state text.

STOP WHEN: `npm test PlayerSpellSection` passes. Then stop — do not wire this into PlayerBrowserPage.tsx.

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
