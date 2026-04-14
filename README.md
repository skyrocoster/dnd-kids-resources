# D&D Kids Resources

**Printable D&D 5th Edition tools and reference cards for kids.**

🎲 Spell cards • 🛡️ Condition cards • ⚔️ Weapon cards • 🎯 Skills • 🧾 Trackers

---

## Quick Start

**Option 1: Open the browser UI**

Open `index.html` or `pages/resources.html` in your browser.

**Option 2: Run the Flask server for database-backed cards**

```bash
python server_flask.py
```

Then visit `http://localhost:8000`.

**Need setup instructions?** See [docs/guides/GETTING_STARTED.md](docs/guides/GETTING_STARTED.md)

---

## Documentation

All documentation is centralized in `/docs`.

| Topic | Link |
|------|------|
| Getting Started | [docs/guides/GETTING_STARTED.md](docs/guides/GETTING_STARTED.md) |
| File Structure | [docs/guides/FILE_STRUCTURE.md](docs/guides/FILE_STRUCTURE.md) |
| System Architecture | [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) |
| Database Schema | [docs/architecture/SCHEMA_DESIGN.md](docs/architecture/SCHEMA_DESIGN.md) |
| Contributing | [docs/development/CONTRIBUTING.md](docs/development/CONTRIBUTING.md) |
| Color Reference | [docs/development/COLORS.md](docs/development/COLORS.md) |
| Documentation Hub | [docs/README.md](docs/README.md) |

---

## What Is This?

A local web toolkit for building and printing kid-friendly Dungeons & Dragons reference cards, utilities, and tools.

Current repo features:
- Spell cards list and print preview
- Condition reference cards
- Weapon cards driven from JSON
- Skill and ability reference data
- Printable character sheet
- HP tracker
- Initiative / turn order tracker
- Dungeon library and stat-block parser UI
- Database rebuild tool

## Data Sources

- `data/5eTools/extracted/data/spells/spells-merged-clean-range-text.json` — Spell metadata source
- `data/seed_conditions.json` — Condition seeds
- `data/seed_creatures.json` — Druid/wild shape creature seeds
- `data/seed_abilities.json` — Abilities, skills, and modifiers
- `data/seed_damage_types.json` — Damage type metadata

---

## Notes

- `/docs` is the canonical documentation location.
- The root `README.md` is the project summary; detailed technical reference is in `/docs`.
- Some historical design notes are still kept in `/docs/planning`.

---

## License

Non-commercial fan project based on D&D 5th Edition rules.
