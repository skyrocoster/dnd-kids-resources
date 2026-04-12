# Development Utilities

Scripts and tools for development, testing, and database management. These are **not needed** for the webpages to operate—they're only for local development and data migration.

**⚠️ Production Code Location:** Core production modules like dungeon parsing are stored in `lib/`, NOT here. The `_dev` folder is for supporting development workflows only.

---

## Active Tools

### Database Setup
- `init_database.py` — Create the SQLite schema for the app
- `seed_database.py` — Load JSON seed/source files into the database

### Spell Data Utilities
- `extract_5eapi_spells.py` — Fetch raw spell JSON from the D&D 5e API for ingestion
- `parse_spells_api.py` — Convert 5eAPI spell payloads into the app schema
- `test_spell_parsing.py` — Parser test harness for spell ingestion experiments
- `view_abilities.py` — Inspect ability metadata and validate ability lookup data

### Dungeon & Data Maintenance
- `reparse_dungeons.py` — Reparse dungeon HTML input for updated dungeon content
- `CONTENT_STANDARDS.md` — Guidelines for card content and formatting
- `CREATURE_JSON_FORMAT.md` — Creature JSON schema and formatting reference
- `dungeon_parsing_test/` — Example cases and regression tests for dungeon parsing

---

## Notes

- `_dev/init_database.py` and `_dev/seed_database.py` are the primary dev utilities needed to rebuild the app database.
- The other scripts in `_dev/` are support utilities for migration, import, and validation.
- Legacy one-time migration scripts such as `migrate_*.py` are no longer present in this branch.
- The website itself runs without any of these tools—they are purely for local development.

---

## Getting Started

### Initialize the database
```bash
python _dev/init_database.py
python _dev/seed_database.py
```

### Run the Flask server
```bash
python server_flask.py
```

### Inspect or test spell ingestion
```bash
python _dev/test_spell_parsing.py
python _dev/view_abilities.py
```

---

## Current `_dev` files

- `CONTENT_STANDARDS.md`
- `CREATURE_JSON_FORMAT.md`
- `dungeon_parsing_test/`
- `extract_5eapi_spells.py`
- `init_database.py`
- `parse_spells_api.py`
- `reparse_dungeons.py`
- `seed_database.py`
- `test_spell_parsing.py`
- `view_abilities.py`
`