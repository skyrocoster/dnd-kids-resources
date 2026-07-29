# Player Spellbook Recovery — fast playtime spell reference backed by recoverable character records

> **Status:** Stage 1-5 shipped. Feature complete.

- **Area guide:** [Players](../../../areas/players.md)
- **Read trigger:** Player recovery data, spell-first reference, or character assignments


## What we're building & why

Players becomes the DM's spell-first play reference and the preparation-time source for reconstructing
a child's lost paper sheet. The persistent page reads like the NPC browser: one-click character
switching, explicit editing dialogs, and no global play/edit mode. Spells dominate; weapons follow;
the broader recovery profile stays available without turning the page into an interactive sheet.

All values are facts entered by the DM. The app does not derive D&D rules, track current health or
spent slots, or roll dice. That boundary also supports the longer-term move from D&D toward a
changing bespoke children's game.

## Settled contract

- One Player record represents one playable character. Character name is required; optional data
  includes child/player name, class/subclass, ancestry, background, and level.
- Reuse the exact NPC/monster structures for AC, maximum HP, speed, abilities, saving throws, skills,
  senses, languages, and categorized features. Also record authored initiative, proficiency bonus,
  spell attack bonus, spell save DC, maximum slots by level, and notes. Nothing is calculated.
- Remove current spell slots and the unused player-spell at_will state. Spells remain simple
  membership; weapons remain ordinary many-to-many catalog links.
- Non-weapon equipment and player-item relationships are deferred.
- Expanded players, assignments, and customized weapons round-trip through the existing seed export
  and rebuild workflow.
- Deleting a character removes only the character and assignment links. Spell and weapon records
  remain. Catalog deletion behavior is owned by the prerequisite catalog plans.

## UX decisions — Players browser and editors

```
Surface:      Player browser (existing /players row), Edit Character, Manage Spells, and Manage
              Weapons dialogs in docs/areas/players.md.
Mode:         both: the persistent browser follows play rules; all three dialogs are prep.
Operator:     DM.
Focal:        assigned Spells, grouped by level. Every collapsed row leads with name and resolved
              quick rules; full explanation expands in place. Weapons are secondary, then Full Profile.
Route shape:  existing Browser at /players with modal Editors.
Edit style:   one structured Edit Character modal; separate Manage Spells and Manage Weapons batch
              dialogs. No inline mutation controls in the reference lists.
Save:         character create/edit uses explicit Save. Assignment checkboxes stay staged until one
              atomic Save; Cancel discards the draft.
Empty:        SearchList empty state: "No players found."
Filtered empty: "No matches".
No selection: "Choose a player from the list to view their details."
Load failure: roster failure fills the existing BrowserLayout error/list state. Selected-detail
              failure fills only the detail region; the roster remains usable.
Action failure: inline in the dialog or assignment section that caused it with role="status"; drafts
              remain intact for retry.
Destructive:  character deletion uses 'Delete "<name>"? Spell and weapon assignments will be
              removed. Catalog records will remain. This cannot be undone.'
Keyboard:     DOM order. Character rail entries and spell/weapon disclosure buttons activate with
              Enter/Space; Escape closes the top dialog unless pending.
Touch:        48px floor for roster entries, disclosure controls, and dialog actions. Existing mobile
              BrowserLayout list/detail navigation remains.
```

## Stages

1. **Recoverable player contract.** Replace the minimal Player schema with the settled optional
   recovery fields, shared NPC/monster projections, maximum-only slot storage, and simple spell and
   weapon memberships. Migrate current seeds without losing assignments and prove complete
   seed export/rebuild round-tripping.
2. **Player detail and batch APIs.** Keep the roster response light, provide one complete character
   detail contract with assigned spell and weapon references, and add atomic replace operations for
   Manage Spells and Manage Weapons. Preserve explicit cascade behavior on character deletion.
3. **Preparation dialogs.** Build the one structured Edit Character dialog and searchable staged
   assignment dialogs. Require only character name; omit empty optional data from the read surface,
   and declare the new dialogs in the Players surface table when they ship.
4. **Spell-first play reference.** Use the shared collapsible roster rail and show a compact stat
   strip, level-grouped alphabetical Spells with always-visible resolved quick rules, alphabetical
   Weapons with quick rules, then a collapsed Full Profile using the shared statblock structures.
   Update the Player browser's surface row from prep to both when this play composition ships.
5. **Seamless roster switching.** Load the first alphabetical character using the existing
   NPC/monster selection convention, then prefetch and cache the remaining character details so later
   switches are immediate while preserving expanded content per mounted page session.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Replaced the minimal Player schema (name, class, level) with the full recovery contract: child/subclass/ancestry/background identity fields, shared NPC/monster combat projections (AC, HP, abilities, etc.), max-only spell slots, simple spell/weapon memberships, and notes. Removed `current_spell_slots` from players and `at_will` from player_spells. Migrated seed data and proved complete export/rebuild round-tripping. |
| 2 | Added `GET /api/players/{player_id}/detail` returning `PlayerDetail` with inline spells and weapons. Added `PUT /api/players/{player_id}/spells` and `PUT /api/players/{player_id}/weapons` for atomic batch replacement. Added delete-cascade tests proving junction cleanup and catalog preservation. |
| 3 | Built the full Edit Character dialog capturing all identity, combat, ability, spellcasting, and feature fields from the recovery contract with validation. Replaced inline spell/weapon add/remove controls with searchable, staged batch-assignment dialogs that commit atomically via the Stage 2 replace endpoints. Removed per-item assignment API calls. |
| 4 | Created `playerModel.ts` with statblock formatting helpers mirroring NPC equivalents. Built `PlayerCombatSummary` (compact AC/HP/Speed/Initiative strip + collapsible Full Profile via `MonsterStatBlock`), `PlayerSpellSection` (level-grouped spells with always-visible quick rules), and `PlayerWeaponSection` (alphabetical weapons with expandable detail). Wired all three into `PlayerBrowserPage`'s detail pane replacing plain read-only lists. |
| 5 | Added a per-player detail cache to `PlayerBrowserPage` so a cache hit skips the loading state, keeping the spell/weapon section components mounted and their expand/collapse state intact across switches; assignment saves force-refresh the cache. After the roster loads, every other player's detail is now prefetched into the same cache in the background so later switches are immediate. |
