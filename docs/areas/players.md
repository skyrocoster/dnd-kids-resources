# Players Area Guide

> **Plan queue:**
> 1. [Kid Map Legibility](../plans/active/kid-map-legibility/kid-map-legibility.md) (next up)

## Scope

Owns everything related to the player experience — both the DM's player records and the kid-facing
`/play` app. This includes:

- **DM side:** playable character records, player spell and weapon roster relationships, the Players
  API (`players` router), and the Players browser and editors (`/players`).
- **Kid side:** the kid-facing app at `/play`, its shell, navigation, components, the player-view
  transform (Curtain), the fog store, and the at-the-table session endpoint (`fog` and
  `at_the_table` routers).

Does not own the shared Spell or Weapon catalog contracts, non-weapon item inventory, executable
game mechanics, encounters, the Map Lab renderer, or any domain's authored truth (reads those
through the shared API).

The player app is a separate app that happens to share a build and a database — not a filtered view
of the DM app. Features are added to it deliberately or not at all.

## Domain vocabulary

See [players.words.md](players.words.md) for the area's companion vocabulary document.

## Read first

`../DATA_MODEL.md`, `../API_REFERENCE.md`, `../UX_PATTERNS.md`, `../TESTING.md`,
`../DESIGN_SYSTEM.md`, `../ARCHITECTURE.md`, and the active plan. For the settled design intent
behind the whole sequence, `scratch/dm-player-split-intent.md` — user-owned, read only when
explicitly named.

## Source map

- **DM backend:** `backend/app/routers/players.py` and Player schemas in `backend/app/schemas.py`.
- **Kid backend:** fog and at-the-table endpoints in `backend/app/routers/`.
- **DM frontend:** `frontend/src/features/players/`.
- **Kid frontend:** `frontend/src/player/` (shell, navigation, kid components) and the player-view
  transform.
- **Seeds:** `data/seeds/seed_players.json`, `seed_player_spells.json`, and
  `seed_player_weapons.json`.
- **Tests:** the player router tests, colocated frontend player tests, and router tests for the fog
  store.

## Change map

| Change type | Source globs |
|---|---|
| DM player records and API | `backend/app/routers/players.py` |
| DM player backend tests | `backend/tests/routers/test_players.py` |
| Kid fog and at-the-table endpoints | `backend/app/routers/fog.py`<br>`backend/app/routers/at_the_table.py` |
| Kid fog and at-the-table backend tests | `backend/tests/routers/test_fog.py`<br>`backend/tests/routers/test_at_the_table.py` |
| DM player browser and editor | `frontend/src/features/players/**` |
| Kid app (shell, navigation, curtain, and map) | `frontend/src/player/**` |
| Seed data | `data/seeds/seed_players.json`<br>`data/seeds/seed_player_spells.json`<br>`data/seeds/seed_player_weapons.json`<br>`data/seeds/seed_at_the_table.json`<br>`data/seeds/seed_revealed_cells.json` |

## Surfaces

Modes are defined in [../UX_PATTERNS.md](../UX_PATTERNS.md#surface-modes).

| Surface | Route | Mode | Operator |
|---|---|---|---|
| Player browser | `/players` | both | DM |
| Player editor (Edit Character) | modal over the browser | prep | DM |
| Manage Spells | modal over the browser | prep | DM |
| Manage Weapons | modal over the browser | prep | DM |
| Player shell | `/play` | play | kid |
| Kid map | `/play/map` | play | kid |

The kid surfaces are read-only and offer no route out of `/play`. The kid map is the
party-shared, identity-free surface: it records information, which is shared by nature. Personal
surfaces (spells, gear) arrive in a later plan and are the ones that need to know who is holding
the tablet.

## Invariants

- Player spell and weapon relationships reference shared catalog records; they do not snapshot them.
- Player seed and assignment changes must remain round-trippable through the repository's seed
  import/export workflow.
- Spell and weapon catalog behavior belongs to the Reference area; Players owns
  only the assignment and player-specific presentation of those records.
- **Nothing under `/play` writes.** Every mutation of shared truth happens on the DM's device. This
  is not a limitation to be lifted; it is what keeps the distributed design cheap.
- **`player/` may import from `api/`, `theme.css`, and pure model modules only** — never components
  from `features/`. This is the whole discipline of separate builds at the price of a convention,
  and it is enforced mechanically.
- **All concealment flows through the curtain.** No kid-facing component reads raw dungeon data. The
  risk being managed is ordinary carelessness, not a kid with devtools, and tests cannot catch it
  because they assert what is shown rather than what is absent.
- **Knowledge ratchets; value oscillates. They are stored separately and never confused.**
- **There is exactly one fog layer.** Two layers would mean two answers to one question, a seam
  between inside and outside, and no way to express a partially revealed room.
- **No position tracking, ever.** The map records information, not where anyone is standing. Combat
  happens on the table; building a good enough digital position tracker is how the table quietly
  stops being where the game is played.
- **The app informs; it never adjudicates.** No rules enforcement, no slot or HP tracking, no dice.
  The binder holds state, the app holds reference, the DM holds the ruling.

## Work queue

- [Kid Map Legibility](../plans/active/kid-map-legibility/kid-map-legibility.md) is in progress: the
  first table test proved the map cannot be read from a child's seat, so doors, stairs, names,
  contrast and a party marker come before fog. Stages 1-2 shipped the kid map's contrast palette,
  shared inside-room label anchor, and constant-size labels; Stage 3 (doors and stairs) is next.
- Then, in order: fog as a working ratchet; the per-object knowledge model; ambient identity and
  the personal surfaces.
- [Player App Skeleton](../plans/done/player-app-skeleton/player-app-skeleton.md) shipped all six
  stages (archived), ending with the first real table test on 2026-07-23.
- Gear and weapons are an open branch and have no plan. Whether there is a third kid destination at
  all is undecided, and the question of whether a kid surface should be shaped as a decision tree
  rather than a browsable list should be settled before the personal surfaces are designed.
- [Player Spellbook Recovery](../plans/done/player-spellbook-recovery/player-spellbook-recovery.md)
  shipped Stages 1-5 (archived).
- Player-item inventory remains deferred and needs its own design before schema or UI work.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../ARCHITECTURE.md`, [dungeons.md](dungeons.md),
[reference.md](reference.md), and
[design.md](design.md).
