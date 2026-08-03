# Players Area Guide

- **Read trigger:** Player records, recovery profiles, player rosters, or the kid app

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
| Shared map canvas and marker primitives used by the kid app | `frontend/src/map/**` |
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
- **Obstacle cues are presentation-only.** The kid map polls effective persisted state, renders at most
  one icon-only active-and-shown Trap-or-Lock cue per fixture with Trap precedence, and renders no
  fixture title, status text, Loot, Concealment, DC, or focus target.
- The curtain resolves authored state with sparse session overrides, omits concealment-armed fixtures,
  and exposes only effective open/closed geometry plus active-and-shown Trap/Lock facts to the renderer.
- **Knowledge and value are independently reversible. They are stored separately and never confused.**
- **There is exactly one fog layer.** Two layers would mean two answers to one question, a seam
  between inside and outside, and no way to express a partially revealed room.
- **No position tracking, ever.** The map records information, not where anyone is standing. Combat
  happens on the table; building a good enough digital position tracker is how the table quietly
  stops being where the game is played.
- **The app informs; it never adjudicates.** No rules enforcement, no slot or HP tracking, no dice.
  The binder holds state, the app holds reference, the DM holds the ruling.

## Deferred

- Fog, a dedicated Personal Surfaces grilling session, and the first personal reference surface
  await their own plans; Fog builds on the concealment contract established by
  [Player Map Knowledge](../plans/done/player-map-knowledge/player-map-knowledge.md).
- Gear and weapons are an open branch and have no plan. Whether there is a third kid destination at
  all is undecided, and the question of whether a kid surface should be shaped as a decision tree
  rather than a browsable list should be settled before the personal surfaces are designed.
- Player-item inventory remains deferred and needs its own design before schema or UI work.
- [Kid Map Viewer](../plans/done/kid-map-viewer/kid-map-viewer.md) rebuilt the kid map on the same canvas the DM already uses — absolute zoom, one floor at a time, the DM's own
  drawing rules — and gained a four-family colour language (green goes somewhere, yellow is a way
  through, blue is a thing, pink is a person) solved by script rather than chosen by eye. It
  supersedes [Kid Map Legibility](../plans/done/kid-map-legibility/kid-map-legibility.md), which
  shipped three stages against a wrong diagnosis (contrast, not scale) and was closed on 2026-07-27;
  that plan's shared `roomLabelAnchor` survives, its kid-map palette is largely reversed, and its
  numbered stair badges are dropped.

## Cross-references

`../API_REFERENCE.md`, `../DATA_MODEL.md`, `../ARCHITECTURE.md`, [dungeons.md](dungeons.md),
[reference.md](reference.md), and
[design.md](design.md).
