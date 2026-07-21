# Players Area Guide

> **Active plan:** [Player Spellbook Recovery](../plans/active/player-spellbook-recovery.md) (next up; blocked by its Spell, Weapon, and shared-rail prerequisites).

## Scope

Owns playable character records, player spell and weapon roster relationships, the Players API, and
the Players browser and editors. It does not own the shared Spell or Weapon catalog contracts,
non-weapon item inventory, executable game mechanics, encounters, or kid-operated surfaces.

## Domain vocabulary

**Player**:
A persisted playable character record. It may include the character's name, the child's/player's
name, recovery details, and assigned spell and weapon rosters.
_Avoid_: pc, hero

**Recovery Profile**:
The authored facts needed to reconstruct a paper character sheet. It is reference data, not an
interactive sheet or rules engine.
_Avoid_: live sheet, character engine

**Spell Roster**:
The set of shared Spell records assigned to one Player.
_Avoid_: spellbook, when referring to the stored relationship contract

**Weapon Roster**:
The set of shared Weapon records assigned to one Player.
_Avoid_: inventory, which would also imply non-weapon Items

## Read first

`../DATA_MODEL.md`, `../API_REFERENCE.md`, `../UX_PATTERNS.md`, and `../TESTING.md`, then the
active plan.

## Source map

- Backend: `backend/app/routers/players.py` and Player schemas in `backend/app/schemas.py`.
- Frontend: `frontend/src/features/players/`.
- Seeds: `data/seeds/seed_players.json`, `seed_player_spells.json`, and
  `seed_player_weapons.json`.
- Tests: the player router tests and colocated frontend player tests.

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Player browser | `/players` | prep | DM |
| Player editor | modal over the browser | prep | DM |

The active plan changes the persistent browser to both mode and adds prep-only roster dialogs when
those behaviors ship. A future kid-operated lookup would be a separate surface.

## Invariants

- Player spell and weapon relationships reference shared catalog records; they do not snapshot them.
- Player seed and assignment changes must remain round-trippable through the repository's seed
  import/export workflow.
- Spell behavior belongs to Spells and weapon behavior belongs to Reference Catalogs; Players owns
  only the assignment and player-specific presentation of those records.

## Work queue

- [Player Spellbook Recovery](../plans/active/player-spellbook-recovery.md) is next for this area but
  begins only after Validated Reference Text, Weapon Quick Reference, and Collapsible Catalog Rail
  provide its required contracts.
- Player-item inventory remains deferred and needs its own design before schema or UI work.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, [spells.md](spells.md),
[reference-catalogs.md](reference-catalogs.md), and [visual-design.md](visual-design.md).
