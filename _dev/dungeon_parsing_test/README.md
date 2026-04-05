# Dungeon Parsing Test Environment

Test environment for extracting and parsing dungeon HTML into structured JSON format before adding to database.

## Workflow

1. **Place your dungeon HTML file** in this folder (e.g., `test_dungeon.html`)
2. **Run the parser script:**
   ```powershell
   cd f:\DND\Kids Resources\_dev\dungeon_parsing_test
   python parse_dungeon.py test_dungeon.html
   ```
3. **Review the generated JSON** in `test_dungeon_output.json` or `output/` folder
4. **Validate the structure** against your requirements
5. **Iterate and refine** the JSON structure as needed
6. **Once satisfied**, integrate into the database and Flask API

## Files

- `parse_dungeon.py` - Main extraction and parsing script
- `example_output.json` - Template showing expected JSON structure
- `output/` - Generated JSON files go here (auto-created)
- Test HTML files you provide

## Parser Logic

The parser extracts:
- **General Info** (title, size, walls, floor, temperature, illumination)
- **Map Image** (base64 encoded data URI from HTML)
- **Rooms** with all entries:
  - Features
  - Monsters/Creatures (split into individual entries if multiple)
  - Traps
  - Tricks
  - Doors
  - Other

Monsters with counts (e.g., "2 x Goblin") are automatically split into individual creature entries with metadata.

## Example Output Structure

See `example_output.json` for the full expected format. Key features:

```json
{
  "general_info": {
    "title": "Dungeon Name",
    "size": "...",
    "walls": "...",
    "floor": "...",
    "temperature": "...",
    "illumination": "..."
  },
  "map_image": "data:image/png;base64,...",
  "map_image_length": 45821,
  "rooms": [
    {
      "room_id": 0,
      "title": "Room #1",
      "entries": [...]
    }
  ]
}
```

## Usage Examples

**Parse a single file:**
```powershell
python parse_dungeon.py test_dungeon.html
```

**Parse and specify output location:**
```powershell
python parse_dungeon.py test_dungeon.html --output output/my_parsed_dungeon.json
```

## Next Steps

Once the JSON structure looks good:
1. Add `parsed_data` column to `dungeon_edits` table (JSON type)
2. Integrate extraction into Flask upload endpoint
3. Modify dungeon-editor.js to use parsed JSON data
4. Design custom HTML template using the JSON structure
