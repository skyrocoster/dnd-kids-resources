# Contributing to D&D Kids Resources

**Developer guide for adding new cards, features, and improvements.**

---

## Adding New Card Sets

### 1. Create Data File

Create `data/new-tool.json` with card objects:

```json
[
  {
    "title": "Card Name",
    "icon": "✨",
    "level": "wizard",              // or level1, level2, cantrip, condition, etc.
    "explanation": "Kid-friendly description of the card",
    "details": [
      { "label": "🎲 Roll", "content": "d20 + modifier" },
      { "label": "💥 Damage", "content": "1d6 fire" },
      { "label": "🎯 Range", "content": "60 feet" }
    ]
  }
]
```

### 2. Create HTML Page

Create `pages/new-tool.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Tool - D&D Kids Resources</title>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
  <div id="page-container"></div>
  
  <script src="../js/card-generator.js"></script>
  <script src="../js/new-tool.js"></script>
</body>
</html>
```

### 3. Create Initializer Script

Create `js/new-tool.js`:

```javascript
document.addEventListener('DOMContentLoaded', async function() {
  try {
    let response;
    const paths = [
      '../data/new-tool.json',
      './data/new-tool.json',
      'data/new-tool.json'
    ];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`✓ Loaded data from: ${path}`);
          break;
        }
      } catch (e) {
        // Try next path
      }
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to load new-tool.json`);
    }
    
    const data = await response.json();
    
    renderPaginatedCards(
      '#page-container',
      data,
      9,
      '✨ New Tool Cards ✨',
      'Description of your tool'
    );
  } catch (error) {
    console.error('Error loading cards:', error);
    document.getElementById('page-container').innerHTML = `<p>${error.message}</p>`;
  }
});
```

### 4. Add to Homepage

Add link to `index.html` in the tools grid:

```html
<a href="pages/new-tool.html" class="tool-card" target="_blank">
  <div class="tool-icon">✨</div>
  <div class="tool-name">New Tool Name</div>
  <div class="tool-description">Short description of the tool</div>
</a>
```

---

## Card Format Reference

### Data Storage Standardization (All Database-Driven Cards)

**Important:** All text fields in database-driven cards must follow this pattern:
- **Storage**: Store as **lowercase** in database (e.g., title: "blinded", size: "tiny", type: "beast")
- **Display**: Capitalize at the point of use via API response (e.g., "Blinded", "Tiny", "Beast")
- **CSS**: Use lowercase version as the `level` field for styling
- **Roll Data**: Store to_hit/damage as JSON arrays (matching spell format)
- **Metadata**: Never store emojis in database; always add at API response time via enrichment functions

This pattern prevents case-sensitivity bugs, ensures consistent styling, and makes data predictable across all card types.

### All Card Types Support

```json
{
  "title": "String - Display name",
  "icon": "Emoji - Visual identifier",
  "level": "String - Used for CSS class and coloring",
  "explanation": "String - Flavor text displayed at top",
  "details": [
    {
      "label": "Emoji Label - e.g., '🎲 Roll'",
      "content": "String or object - Displayed value"
    }
  ]
}
```

### Special Fields by Type

**Spells:**
- `level`: "cantrip", "level1" through "level9"
- `school`: "Evocation", "Transmutation", etc.
- `to_hit`: JSON array of roll objects
  - Each has: `roll`, `numerics` (ability codes), `save` (boolean), `name` (A, B, C for pairing)
  - Example: `[{"roll": "1d20", "numerics": [{"code": "sam"}], "save": false, "name": "A"}]`
- `damage`: JSON array of roll objects  
  - Each has: `roll`, `types` (damage codes), `save` (boolean), `name` (matches to_hit for pairing)
  - Example: `[{"roll": "1d10", "types": ["fire"], "save": false, "name": "A"}]`
- `heal`: JSON array of roll objects
  - Each has: `roll`, `numerics` (ability codes), `name` (A, B, C, etc.)
  - Example: `[{"roll": "1d8", "numerics": [{"code": "sad"}], "name": "healing"}]`
- **Pairing**: When to_hit and damage have same count > 1, pair them by matching `name` fields
  - API displays as: `1️⃣ To Hit:`, `1️⃣ Damage:`, `2️⃣ Save:`, `2️⃣ Damage:`, etc.
  - Single-roll spells use traditional emojis (🎲, 💥, 💚)

**Weapons:**
- `type`: "Simple Melee", "Martial Ranged", etc.
- `hands`: "1-handed", "2-handed", "versatile"

**Conditions:**
- Stored in database table (not JSON)
- Fields: `title` (lowercase, auto-capitalized), `icon`, `explanation`, `details` (JSON array)
- Loaded via `/api/conditions` endpoint

**Creatures (Wild Shapes):**
- Stored in database table (not JSON)
- Fields: `title` (lowercase, auto-capitalized), `icon`, `size`, `creature_type_id`, `hp`, `ac`, `explanation`, `attack_to_hit` (JSON), `damage` (JSON), `special`
- **Storage pattern**: All text fields (title, size, creature_type) stored lowercase
- **Attack format**: `attack_to_hit` is a JSON array where the first roll object contains the attack name in the `name` field:
  ```json
  [
    {
      "name": "Bite",
      "roll": "1d8",
      "numerics": [{"code": "str"}],
      "save": false
    }
  ]
  ```
- **Damage format**: `damage` is a JSON array where each roll has damage type codes:
  ```json
  [
    {"roll": "1d4", "types": [{"code": "piercing"}]},
    {"roll": "1d6", "types": [{"code": "poison"}]}
  ]
  ```
- **Enrichment**: Damage types and creature types are enriched with emoji/color at API response time
- Loaded via `/api/creatures` endpoint

---

## Card Colors

**See `docs/COLORS.md` for complete color reference.**

Colors are applied via CSS classes on `.card` element:
- `.level1`, `.level2`, etc. for spells
- `.blinded`, `.charmed`, etc. for conditions
- `.simple-melee`, `.martial-ranged`, etc. for weapons

---

## Development Tips

### View Changes Locally

```bash
# Python 3
python -m http.server 8000
#Visit http://localhost:8000

# VS Code - Install "Live Server" extension
# Right-click index.html → "Open with Live Server"
```

### Print Testing

When adding new card types, verify they print correctly:

**Quick Print Test:**
1. Open card page in browser
2. Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
3. Set paper size to **A4** (210mm × 297mm)
4. Set margins to **0mm** or **None**
5. Enable **"Background graphics"** (critical for colors)
6. Scale: **100%** (disable "Fit to page")
7. Print or save as PDF

**What to Verify:**
- [ ] 9 cards print per page (3×3 grid)
- [ ] Each card is exactly 63.5mm × 88.9mm
- [ ] No cards split across pages
- [ ] All colors print accurately (compare with [COLORS.md](COLORS.md))
- [ ] Text is readable and not clipped
- [ ] Icons and emojis render correctly

**For Detailed Browser-Specific Instructions:**
See the "Print Cards" section in [Getting Started Guide](../guides/GETTING_STARTED.md#printing-cards)

### CSS Styling

All card styles are in `css/styles.css`. Cards inherit:
- `.card` - Base card styling
- `.card.level1` - Specific level color
- `.card-header` - Card header styling
- `.card-body` - Card body area
- `.card-footer` - Card footer (species·profession)

---

## Card Generation System

### How It Works

1. **Data Loading** (`js/new-tool.js`)
   - Fetches JSON file from `data/` folder
   - Handles multiple path options for flexibility

2. **Card Creation** (`js/card-generator.js`)
   - `createCardElement(data)` - Creates single card DOM
   - `renderPaginatedCards()` - Creates full page layout

3. **Styling** (`css/styles.css`)
   - CSS classes apply colors and layout
   - Print-friendly media queries handle printing

### Key Functions

**`renderPaginatedCards(selector, data, cardsPerPage, title, subtitle)`**
- `selector`: CSS selector for container (e.g., '#page-container')
- `data`: Array of card objects
- `cardsPerPage`: Cards per page (default: 9)
- `title`: Page header title
- `subtitle`: Page header description

---

## Spell Card Level Filtering

### How It Works

The spell cards page includes interactive level filtering, allowing users to select which spell levels to display and print.

**Features:**
- Discover spell levels automatically from the database
- Toggle individual levels (Cantrips, Level 1, Level 2, etc.) on/off
- "Select All" and "Select None" quick buttons
- Real-time re-rendering when filters change
- Filter controls hide automatically when printing

### Implementation

**HTML** (`pages/spell-cards-list.html`):
```html
<div id="print-options">
  <div class="print-options-title">Print Options</div>
  <div id="class-buttons" class="filter-buttons"></div>
</div>

<div id="page-container"></div>
```

The page currently uses a list-style layout rather than the older card grid template.

**JavaScript** (`js/spells-list.js`):

1. Load spells from the `/api/spells` endpoint
2. Extract distinct spell levels and class filters from the response
3. Create filter controls for classes and page rendering options
4. Re-render the list when filters change

### Example Usage

```javascript
async function loadSpellList() {
  const response = await fetch('/api/spells');
  const spells = await response.json();
  const levels = [...new Set(spells.map(spell => normalizeLevel(spell.level)))]
  renderPaginatedCards('#page-container', spells, 9, '✨ Spell Cards ✨', 'Spell reference cards');
}
```

### Extending to Other Card Types

The same pattern works for other card sets:

1. Add filter UI to the page template
2. Load data from the appropriate API or JSON source
3. Generate filter controls from data values
4. Re-render the page when selections change

---

## File Organization

```
data/                          # Seed and source data
├── 5eAPI/spells.json          # Spell metadata source
├── seed_conditions.json       # Condition seeds
├── seed_creatures.json        # Creature/wild-shape seeds
├── seed_abilities.json        # Abilities, skills, modifiers
└── seed_damage_types.json     # Damage type metadata
```

- Spells are seeded from `data/5eAPI/spells.json`
- Conditions, creatures, abilities, and damage types are seeded from individual JSON files in `data/`

```
js/                            # JavaScript
├── card-generator.js          # Core card rendering engine
├── spells-list.js             # Spell list / print view logic
├── spells-v2.js               # Alternate spell UI logic
├── bw-mode-toggle.js          # B&W print preview toggle
├── character-sheet.js         # Character sheet support
├── hp-tracker.js              # HP tracker logic
├── turn-order.js              # Initiative tracker logic
├── queue-helper.js            # Queue UI helper functions
├── spell-slots.js             # Spell slot tracker logic
└── wild-shapes.js             # Druid wild shape creature rendering
```

```
pages/                         # Browser-accessible tools
├── resources.html              # Resource hub and admin page
├── spell-cards-list.html       # Spell card list view
├── stat-block-parser.html      # Parser and queue UI
├── character-sheet.html        # Printable character sheet
├── hp-tracker.html             # Health tracker
├── turn-order-tracker.html     # Initiative tracker
├── spell-slots.html            # Spell slot tracker
└── dungeons-library.html       # Dungeon upload/library
```

---

## Testing Checklist

- [ ] JSON is valid (test with `JSON.parse()`)
- [ ] Page loads without errors (check browser console)
- [ ] All cards render properly (view in browser)
- [ ] Print preview shows correct layout (Ctrl+P→Print Preview)
- [ ] Colors are accurate (check against docs/COLORS.md)
- [ ] Links work in index.html

---

## Common Issues

**Cards not loading**
- Check browser console for fetch errors
- Verify JSON file path and syntax
- Ensure file is in correct `data/` folder

**Wrong colors**
- Verify CSS class matches `data.level` field
- Check docs/COLORS.md for correct class name
- Reload page (clear cache if needed)

**Print layout broken**
- Check page size is A4
- Enable "Background graphics" in print dialog
- Verify card height doesn't exceed page break

---

## Working with Spells (Database)

**Important:** Spell data is seeded from `data/5eAPI/spells.json` and loaded into the SQLite database via `_dev/seed_database.py`.

### Updating Spell Data

To modify spell content:

1. Edit `data/5eAPI/spells.json` directly.
2. Rebuild the database:
   ```bash
   python _dev/init_database.py
   python _dev/seed_database.py --force
   ```

### Database Workflow

- The current seed workflow uses `data/5eAPI/spells.json` as the primary spell source.
- `_dev/seed_database.py` transforms that JSON into the `spells` table.
- There is no `data/seed_spells.json` file in this branch.

### Current Spell Schema

The current `spells` table stores the core spell card metadata:

```sql
CREATE TABLE spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spell_name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  level TEXT NOT NULL,
  school TEXT,
  spell_text TEXT,
  damage TEXT,
  heal TEXT,
  heal_at_higher_levels TEXT,
  range TEXT,
  higher_levels TEXT,
  casting_time TEXT,
  duration TEXT,
  concentration BOOLEAN DEFAULT 0,
  ritual BOOLEAN DEFAULT 0,
  components TEXT,
  materials TEXT,
  attack_type TEXT,
  area_of_effect TEXT,
  classes TEXT,
  subclasses TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Editing the Database Directly

If you need to inspect the database directly, use a SQLite client:

```bash
sqlite3 dnd_kids_resources.db
```

Or use a GUI tool such as DB Browser for SQLite.

### Testing Spell Changes

1. Start the Flask server:
   ```bash
   python server_flask.py
   ```
2. Visit the spell card list page:
   `http://localhost:8000/spell-cards-list`
3. Confirm the updated spell appears in the card rendering.
4. Check browser console for any API or fetch errors.

---

For technical architecture details, see **[System Architecture](../architecture/ARCHITECTURE.md)**.
