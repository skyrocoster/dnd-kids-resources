# Development Utilities

This folder contains development scripts and test files that are not needed for the webpages to operate.

## Contents

### Python Utilities
- `abstract_rolls.py` - Updates weapons.json data structure for rolls
- `refactor_modifiers.py` - Refactors spell modifier formatting
- `simplify_prefix.py` - Simplifies card prefixes
- `update_boxes.py` - Updates SAM/BtH box formatting
- `server.py` - Local development web server (run: `python server.py`)

### Test Files
- `test_rendering.js` - Tests for card rendering functions
- `test_variants.py` - Tests for weapon variant logic

### Standards
- `CONTENT_STANDARDS.md` - Guidelines for writing card content

## Using the Development Server

To run locally:
```bash
python server.py
```
Then visit http://localhost:8001

## Note

These files are optional. The webpage runs fine without them - they're only useful for:
- Modifying data structures in JSON files
- Testing changes before deployment
- Local development
