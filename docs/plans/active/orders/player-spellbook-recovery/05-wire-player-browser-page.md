WORK ORDER 05 — Wire the spell-first play reference into the Player browser
GOAL: `PlayerBrowserPage`'s detail pane shows `PlayerCombatSummary`, `PlayerSpellSection`, and
`PlayerWeaponSection` in that order — Spells focal, Weapons secondary, Full Profile last — replacing
the current plain read-only lists, with every existing behavior (Edit/Delete, Manage Spells/Weapons,
error/empty/loading states) unchanged.
DEPENDS ON: 02, 03, 04 (needs PlayerSpellSection, PlayerWeaponSection, PlayerCombatSummary)

KNOWN STATE (already true — do NOT redo or re-derive):
- Current file: `frontend/src/features/players/PlayerBrowserPage.tsx`. The detail pane (lines 115-178)
  currently renders a `Card` with a plain sorted `<ul>` of spell/weapon names and "Manage Spells"/
  "Manage Weapons" buttons in each section header. This whole inner content (lines 130-173, the
  contents of the `Card`) is what gets replaced — the `Card` wrapper, its `title`/`subtitle`/`tag`/
  `footer` (Edit/Delete buttons), the "Back to players" button, and everything outside the `Card`'s
  children stays exactly as-is.
- `detail` (a `PlayerDetail`) is only available once `detailRemote.status === 'success'`; the existing
  loading/error branches at lines 131-135 must stay untouched — only the success branch (currently
  lines 136-172) changes.
- New components to compose, all under `frontend/src/features/players/`:
  `PlayerCombatSummary` (`{ player: Player }`), `PlayerSpellSection` (`{ player: Player, spells:
  Spell[] }`), `PlayerWeaponSection` (`{ weapons: Weapon[] }`). `selected` (the `Player`) and `detail`
  (the `PlayerDetail`, which extends `Player` and adds `spells`/`weapons`) are both already in scope in
  `PlayerBrowserPage`.
- "Manage Spells" / "Manage Weapons" buttons must remain present and keep opening
  `ManageAssignmentsDialog` exactly as today (lines 140, 157, and the `dialog` prop's `manageDialog ===
  'spells'|'weapons'` branches at lines 190-217) — do not change the dialog wiring, only where the
  trigger buttons live relative to the new sections. Place each button in its section's header,
  matching the current "group header + Manage button" layout.
- Existing empty-state copy that must be preserved verbatim (now produced by the child components
  instead of inline here): "No spells assigned." and "No weapons assigned." — do not introduce new
  strings for these.
- `frontend/src/features/players/__tests__/PlayerBrowserPage.test.tsx` has a test named "shows
  read-only assigned spells and weapons with no inline mutation controls" (line 127) asserting
  `screen.findByText('Fireball')`, `screen.getByText('Dagger')`, no `Remove` button, and that both
  Manage buttons exist — this test's assertions stay valid with the new layout since it only checks
  presence, not structure; if levelLabel grouping or expand-in-place changes what's queryable, adjust
  only that test's setup (the `spellFireball` fixture already has `quick_rules: null`, `level: 3`), not
  its intent.
- The suite is green before this change (used as the baseline to diff against).

START IN:
- frontend/src/features/players/PlayerBrowserPage.tsx
- frontend/src/features/players/__tests__/PlayerBrowserPage.test.tsx
- frontend/src/features/players/PlayerCombatSummary.tsx (order 04's output)
- frontend/src/features/players/PlayerSpellSection.tsx (order 02's output)
- frontend/src/features/players/PlayerWeaponSection.tsx (order 03's output)

DO:
- Replace the `Card` children in the success branch of the detail pane with, in order:
  `<PlayerCombatSummary player={selected} />`, then the Spells section header (heading + "Manage
  Spells" button) followed by `<PlayerSpellSection player={selected} spells={detail.spells} />`, then
  the Weapons section header (heading + "Manage Weapons" button) followed by
  `<PlayerWeaponSection weapons={detail.weapons} />`.
- Remove the now-dead inline list/empty-copy JSX (former lines ~142-152 and ~159-169) since the child
  components own that rendering now.
- Update `PlayerBrowserPage.test.tsx` only as needed to keep it green against the new structure
  (per KNOWN STATE above) — do not change unrelated tests.

STOP WHEN: `npm test PlayerBrowserPage` and `npm test -- --run frontend/src/features/players` (full
players suite) both pass. Then stop — this order does not touch docs or the area guide surface table.

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
