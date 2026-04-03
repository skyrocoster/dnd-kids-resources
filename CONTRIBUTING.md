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

**Weapons:**
- `type`: "Simple Melee", "Martial Ranged", etc.
- `hands`: "1-handed", "2-handed", "versatile"

**Conditions:**
- Stored in database table (not JSON)
- Fields: `title` (lowercase, auto-capitalized), `icon`, `explanation`, `details` (JSON array)
- Loaded via `/api/conditions` endpoint

**Creatures (Wild Shapes):**
- Stored in database table (not JSON)
- Fields: `title`, `icon`, `size`, `type`, `hp`, `ac`, `explanation`, `attack_name`, `attack_to_hit` (JSON), `damage` (JSON), `special`
- **Storage pattern**: All text fields (title, size, type) stored lowercase
- **Attack format**: `attack_to_hit` is a JSON array (same format as spell `to_hit`):
  ```json
  [
    {
      "numDice": 1,
      "diceType": "d8",
      "modifier": 4,
      "numerics": [{"code": "str"}]
    }
  ]
  ```
- **Damage format**: `damage` is a JSON array where each roll has damage type codes:
  ```json
  [
    {"numDice": 2, "diceType": "d4", "types": ["piercing"]},
    {"numDice": 1, "diceType": "d6", "types": ["poison"]}
  ]
  ```
- **Enrichment**: Damage types (stored as codes like "piercing", "cold") are enriched with emoji/color at API response time
- Loaded via `/api/creatures` endpoint

---

## Card Colors

**See `COLORS.md` for complete color reference.**

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
# Visit http://localhost:8000

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
See the "Print Cards" section in [README.md](README.md#print-cards)

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

**HTML** (`pages/spell-cards.html`):
```html
<div id="level-filter">
  <div class="filter-title">Filter by Spell Level</div>
  <div class="filter-buttons" id="level-buttons"></div>
  <div class="filter-controls">
    <button class="filter-btn" id="select-all-btn">Select All</button>
    <button class="filter-btn" id="select-none-btn">Select None</button>
  </div>
</div>

<div id="page-container"></div>
```

The CSS hides the filter in print mode:
```css
@media print {
  #level-filter {
    display: none !important;
  }
}
```

**JavaScript** (`js/spells.js`):

1. **Load spells** from `/api/spells` endpoint
2. **Extract unique levels** from spell data and normalize them:
   - `"cantrip"` → `0`
   - `"level1"` → `1`
   - `"level2"` → `2`, etc.
3. **Create button** for each level with click handlers
4. **Filter and re-render** when buttons are clicked using `updateSpellDisplay()`

### Example Usage

```javascript
// Normalize different spell level formats to numbers
function normalizeLevel(level) {
  if (typeof level === 'number') return level;
  if (level === 'cantrip') return 0;
  const match = level.match(/\d+/);
  return match ? parseInt(match[0]) : NaN;
}

// Filter spells based on selected levels
function updateSpellDisplay(allSpells, selectedLevels, normalizeLevel) {
  const filteredSpells = allSpells.filter(spell => 
    selectedLevels.has(normalizeLevel(spell.level))
  );
  
  renderPaginatedCards('#page-container', filteredSpells, 9, 
    '✨ Spell Cards ✨', 'Description');
}
```

### Extending to Other Card Types

To add level filtering to other card types (e.g., weapons by rarity), follow this pattern:

1. Add filter UI to HTML page (similar to spell-filter div)
2. Extract unique filter values from data
3. Create buttons for each value
4. Re-render when buttons are clicked
5. Hide filter controls in print mode with CSS

---

## File Organization

```
data/                          # Card data (JSON)
├── weapons.json               # 42+ weapons
└── ...                        # Other static card data

(Spells, Conditions, and Creatures are stored in the database and loaded via `/api/spells`, `/api/conditions`, and `/api/creatures` endpoints)

js/                            # JavaScript
├── card-generator.js          # Core system (don't modify)
├── spells.js                  # Fetch from API & render
├── conditions.js              # Fetch from API & render
├── wild-shapes.js             # Fetch creatures from API & render
└── weapons.js

pages/                         # HTML pages for each tool
├── spell-cards.html
├── condition-cards.html
├── wild-shapes.html
└── weapon-cards.html
```

---

## Testing Checklist

- [ ] JSON is valid (test with `JSON.parse()`)
- [ ] Page loads without errors (check browser console)
- [ ] All cards render properly (view in browser)
- [ ] Print preview shows correct layout (Ctrl+P→Print Preview)
- [ ] Colors are accurate (check against COLORS.md)
- [ ] Links work in index.html

---

## Common Issues

**Cards not loading**
- Check browser console for fetch errors
- Verify JSON file path and syntax
- Ensure file is in correct `data/` folder

**Wrong colors**
- Verify CSS class matches `data.level` field
- Check COLORS.md for correct class name
- Reload page (clear cache if needed)

**Print layout broken**
- Check page size is A4
- Enable "Background graphics" in print dialog
- Verify card height doesn't exceed page break

---

## Working with Spells (Database)

**Important:** Spells are now stored in the SQLite database (`dnd_kids_resources.db`), not in a JSON file.

### Updating Spell Data

To modify existing spells or add new spells:

1. **Edit the database directly** (via CLI or DB browser):
   ```bash
   sqlite3 dnd_kids_resources.db
   ```

2. **Or use the migration scripts** in `_dev/`:
   - Modify `_dev/migrate_spells.py` to import spell data from a JSON source
   - Run the migration script to update the database

### Database Schema for Spells

The spells table is now self-contained with all card metadata:

```sql
-- Main spells table (consolidated from previous cards + spells)
spells (
  id              INTEGER PRIMARY KEY,
  title           TEXT NOT NULL,         -- Spell name
  icon            TEXT NOT NULL,         -- Emoji icon
  level           TEXT NOT NULL,         -- "cantrip", "level1"–"level9"
  school          TEXT,                  -- "Evocation", "Transmutation", etc.
  explanation     TEXT,                  -- Kid-friendly description
  to_hit          TEXT,                  -- JSON: {roll, numerics, types, save}
  damage          TEXT,                  -- JSON: {roll, numerics, types}
  heal            TEXT,                  -- JSON: {roll, numerics}
  range           TEXT                   -- JSON: {distance, target, area}
)

-- Detail entries for additional information (scaling, etc.)
detail_entries (
  id              INTEGER PRIMARY KEY,
  spell_id        INTEGER NOT NULL,      -- FK to spells.id
  label           TEXT NOT NULL,         -- "⬆️ Scaling", etc.
  content_text    TEXT,                  -- Description or value
  sequence_order  INTEGER DEFAULT 0      -- Display order
  FOREIGN KEY (spell_id) REFERENCES spells(id) ON DELETE CASCADE
)
```

**Important:** The previous `cards` table has been removed. All spell metadata is now stored directly in the `spells` table.

### Testing Spell Changes

1. **Start the Flask server:**
   ```bash
   python _dev/server_flask.py
   ```

2. **Visit Spell Cards page:** `http://localhost:8000/pages/spell-cards.html`

3. **Verify changes appear** in the rendered cards

4. **Check browser console** for any API errors or warnings
- Verify margins are set correctly

---

For technical architecture details, see **ARCHITECTURE.md**.
