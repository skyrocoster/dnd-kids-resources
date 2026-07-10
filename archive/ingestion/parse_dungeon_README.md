# Production Libraries (`lib/`)

Core modules used by the Flask API and web application. **These are production code**, not development tools.

## Modules

### `parse_dungeon.py`
**Purpose:** Extract structured data from donjon-generated dungeon HTML

**Usage:**
- **Imported by:** Flask API server (`server_flask.py`) for dungeon upload/parsing endpoints
- **Standalone:** Can also be run as a command-line tool for testing
  ```bash
  python lib/parse_dungeon.py input.html --output output.json
  ```

**Key Classes:**
- `DungeonHTMLParser` - Main parser class
- `DungeonData` - Complete parsed dungeon structure
- `Room` - Individual room in dungeon
- `RoomEntry` - Features, monsters, traps, doors in a room

**Testing:** See `_dev/dungeon_parsing_test/` for test cases and examples

---

## Guidelines

- **Do NOT move code from `lib/` to `_dev/`** — these are active production dependencies
- **Do move dev-only testing code to `_dev/`** — e.g., test files, debug scripts, example data
- Tests and examples for production modules go in `_dev/<module>_test/` subdirectories
