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
- `data/seeds/seed_spells.json` — optional spell seed fallback

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
