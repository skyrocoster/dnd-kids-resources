# D&D Kids Resources

**Printable D&D 5th Edition tools and reference cards for kids.**

🎲 Spell cards • 🧾 Trackers • 🗺️ Dungeon tools • 🧠 Parser utilities

---

## Quick Start

**Option 1: Open the browser UI**

Open `index.html` in your browser for the main landing page, or open `pages/resources.html` for the resource hub.

**Option 2: Run the Flask server**

```bash
python server_flask.py
```

Or use the launcher scripts in `launchers/` (see docs for details).

Then visit `http://localhost:8000`.

The Flask server serves the site and enables database-backed API endpoints.

---

## Available Tools & Features

- **Landing page:** `index.html` — quick links to all resources
- **Resource hub:** `pages/resources.html` — admin UI, database rebuild
- **Spell cards:** `pages/spell-cards-list.html` — print preview, filtering
- **Character sheet:** `pages/character-sheet.html` — printable, fillable
- **HP tracker:** `pages/hp-tracker.html` — health tracking
- **Spell slot tracker:** `pages/spell-slots.html`
- **Turn order tracker:** `pages/turn-order-tracker.html`
- **Stat block parser:** `pages/stat-block-parser.html` — AI parser UI
- **Dungeon library:** `pages/dungeons-library.html` — upload, parse, and browse dungeons
- **Shared layout:** Most pages use a reusable two-pane shell (see docs/guides/page-reuse-recommendations.md)

---

## Documentation

- [docs/README.md](docs/README.md) — Documentation hub
- [docs/guides/FILE_STRUCTURE.md](docs/guides/FILE_STRUCTURE.md) — Repo structure
- [docs/guides/page-reuse-recommendations.md](docs/guides/page-reuse-recommendations.md) — Shared UI patterns
- [docs/unparsed_attack_note_patterns.md](docs/unparsed_attack_note_patterns.md) — Parser note patterns

> See `/docs` for all guides and architecture notes. Some older docs may be out of date; see commit history for changes.

---

## Data Sources

Seed and source data used by the app:
- `data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json` — spell metadata
- `data/seeds/seed_abilities.json` — abilities, skills, and modifiers
- `data/seeds/seed_damage_types.json` — damage type metadata
- `data/seeds/seed_conditions.json` — condition seeds
- `data/seeds/seed_creature_types.json` — creature type metadata
- `data/seeds/seed_creatures.json` — creature and wild shape seeds
- `data/seeds/seed_traps.json` — trap definitions
- `data/seeds/seed_dungeons.json` — dungeon seed data
- `data/seeds/seed_actions.json` — basic actions and rule explanations
- `data/seeds/seed_spells.json` — optional spell seed fallback
- `data/seeds/seed_players.json` — player character seed data
- `data/seeds/seed_player_spells.json` — player spell assignments
- `data/seeds/seed_player_weapons.json` — player weapon assignments

**Seed export workflow:**
- `python _dev/export_db_seeds.py` — archive legacy seed files into `data/seeds/archive` and export current DB data to `data/seeds/`

---

## Developer Notes

- `/docs` is the canonical documentation location.
- The root `README.md` is the project overview and quick start guide.
- Use `launchers/` scripts for starting the server and GUI on Windows.
- See `docs/guides/FILE_STRUCTURE.md` for a full directory breakdown.
- Some older documentation links and UI placeholders in the repo may be stale and need cleanup.

---

## License

Non-commercial fan project based on D&D 5th Edition rules.


**Printable D&D 5th Edition tools and reference cards for kids.**

🎲 Spell cards • 🧾 Trackers • 🗺️ Dungeon tools • 🧠 Parser utilities

---

## Quick Start

**Option 1: Open the browser UI**

Open `index.html` in your browser for the main landing page, or open `pages/resources.html` for the resource hub.

**Option 2: Run the Flask server**

```bash
python server_flask.py
```

Then visit `http://localhost:8000`.

The Flask server serves the site and enables database-backed API endpoints.

---

## Available Tools

Current repository features include:
- `index.html` — landing page and quick links
- `pages/resources.html` — resource hub and admin database rebuild UI
- `pages/spell-cards-list.html` — spell cards list and print preview
- `pages/character-sheet.html` — printable character sheet
- `pages/hp-tracker.html` — health tracker
- `pages/spell-slots.html` — spell slot tracker
- `pages/turn-order-tracker.html` — initiative / turn order tracker
- `pages/stat-block-parser.html` — stat block parser UI
- `pages/dungeons-library.html` — dungeon library and upload/parsing interface

---

## Documentation

The current documentation set is limited to:
- [docs/README.md](docs/README.md)
- [docs/guides/FILE_STRUCTURE.md](docs/guides/FILE_STRUCTURE.md)

> The docs hub is intentionally small at the moment. Additional architecture, developer, and contribution docs are not currently present.

---

## Data Sources

Seed and source data used by the app:
- `data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json` — spell metadata
- `data/seeds/seed_abilities.json` — abilities, skills, and modifiers
- `data/seeds/seed_damage_types.json` — damage type metadata
- `data/seeds/seed_conditions.json` — condition seeds
- `data/seeds/seed_creature_types.json` — creature type metadata
- `data/seeds/seed_creatures.json` — creature and wild shape seeds
- `data/seeds/seed_traps.json` — trap definitions
- `data/seeds/seed_dungeons.json` — dungeon seed data
- `data/seeds/seed_actions.json` — basic actions and rule explanations
- `data/seeds/seed_spells.json` — optional spell seed fallback- data/seeds/seed_players.json — player character seed data
- data/seeds/seed_player_spells.json — player spell assignments
- data/seeds/seed_player_weapons.json — player weapon assignments
Seed export workflow:
- `python _dev/export_db_seeds.py` — archive legacy seed files into `data/seeds/archive` and export current DB data to `data/seeds/`

---

## Notes

- `/docs` is the canonical documentation location.
- The root `README.md` is the project overview and quick start guide.
- Some older documentation links and UI placeholders in the repo are stale and may need cleanup.

---

## License

Non-commercial fan project based on D&D 5th Edition rules.
