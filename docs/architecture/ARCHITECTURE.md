# Architecture - D&D Kids Resources

**Technical documentation for system design and implementation details.**

---

## System Overview

The D&D Kids Resources project is a **data-driven card generation system** that converts data sources into printable physical card layouts for D&D 5e reference materials.

```
Database-Driven:              JSON-Driven:
  SQLite Database                JSON Files
       ↓                             ↓
  Flask API Server              JavaScript Initializer
  (/api/* endpoints)            (loads from data/)
       ↓                             ↓
  JavaScript Fetch              JavaScript Fetch
       ↓                             ↓
  ┌─────────────────────────────────────────┐
  │   JavaScript Card Generator             │
  │   (js/card-generator.js)                │
  └─────────────────────────────────────────┘
       ↓
  DOM Layer (HTML Structure)
       ↓
  CSS Styling + Print Optimization
```

**Key Point:** Spells and Conditions are served via a Flask API from the database for dynamic flexibility. Other card types load from JSON files in the `data/` directory.

---

## Data Layer

### JSON Structure

All card data follows a standardized format:

```json
{
  "title": "Card display name",
  "icon": "Emoji icon",
  "level": "CSS class name (determines color)",
  "explanation": "Flavor text / description",
  "details": [
    {
      "label": "🎲 Mechanic Name",
      "content": "Value or description"
    }
  ]
}
```

### Data Files vs. Database

**JSON Data Files (Static):**
```
data/
├── weapons.json          # 42+ weapons (simple/martial, melee/ranged)
└── ...                  # Other static card data
```

**SQLite Database (Dynamic):**
```
dnd_kids_resources.db
├── spells table           # 54 spells with complete card metadata
│   └── Fields: id, title (lowercase), icon, level, school, explanation, 
│              to_hit (JSON), damage (JSON), heal (JSON), range (JSON)
│
├── conditions table       # 19 conditions & status effects
│   └── Fields: id, title (lowercase), icon, explanation, details (JSON)
│   └── Pattern: Stored lowercase, capitalized at API response time
│
├── skills table           # 18 skill reference cards
│   └── Fields: id, title (lowercase), icon, level, explanation, details (JSON)
│   └── Pattern: Stored lowercase, capitalized at API response time
│
├── creatures table        # 6 creatures (druid wild shape forms)
│   └── Fields: id, title (lowercase), icon, size (lowercase), creature_type_id, 
│              hp, ac, explanation, attack_to_hit (JSON*, contains attack name), 
│              damage (JSON), special (text)
│   └── Pattern: All text stored lowercase, capitalized at API response time
│   └── *attack_to_hit: Array where first roll object's 'name' field is the attack name
│
├── creature_types table   # Creature type lookup (references in creatures table)
│   └── Fields: id (PK), code, name, emoji, color
│
├── abilities table        # Ability metadata (abilities, modifiers, proficiency)
│   └── Fields: code (PK), name, emoji, color
│   └── Examples: str, dex, con, int, wis, cha, sam, sad
│
└── damage_types table     # Damage type metadata with emojis and colors
    └── Fields: code (PK), name, emoji, color
    └── Examples: fire, cold, slashing, piercing, bludgeoning, etc.
```

**➜ For complete SQL schema with CREATE TABLE statements, see [SCHEMA_DESIGN.md](SCHEMA_DESIGN.md)**

**Architecture Clarity:**
- **All text fields** (title, size, type, etc.) are stored lowercase in database for consistency
- **All text fields** are capitalized at API response time for proper display ("cat" → "Cat")
- **CSS `level` field** always uses lowercase for consistent styling
- **Spells** are self-contained in the `spells` table containing all card display information
- **Conditions** are self-contained in the `conditions` table with details array as JSON
- **Creatures** (druid wild shapes) are self-contained in the `creatures` table with attack/damage as JSON
- **Abilities & Damage Types** store emoji and color metadata for enrichment at API response time
- **JSON roll data** (to_hit, damage) follows a standardized format across all card types

---

## API Layer (Flask Server)

### Flask API for Spells

**Location:** `server_flask.py` (root directory)

**Purpose:** Provides REST endpoints to retrieve spell, skill, condition, and creature data from the SQLite database in JSON format

**Endpoints:**

**Card Data (Primary)**

| Endpoint | Method | Returns | Purpose |
|----------|--------|---------|---------|
| `/api/spells` | GET | Array of all spells | Used by spell card views and print rendering |
| `/api/spells/<title>` | GET | Single spell by title | Fetch an individual spell record |
| `/api/skills` | GET | Array of all skills | Provides skill/ability metadata for UI rendering |
| `/api/skills/<title>` | GET | Single skill by title | Fetch an individual skill record |
| `/api/conditions` | GET | Array of all conditions | Provides condition/status effect cards |
| `/api/conditions/<title>` | GET | Single condition by title | Fetch an individual condition record |
| `/api/creatures` | GET | Array of all creatures | Provides creature/wild-shape card data |
| `/api/creatures/<title>` | GET | Single creature by title | Fetch an individual creature record |
| `/api/abilities` | GET | Array of all abilities with metadata | Returns ability codes, names, emojis, and colors |

**Dungeon Management (Advanced)**

| Endpoint | Method | Returns | Purpose |
|----------|--------|---------|---------|
| `/api/dungeons` | GET | Array of all dungeons | Lists available dungeon modules |
| `/api/dungeons/<dungeon_id>` | GET | Single dungeon data | Retrieves dungeon detail and parsed content |
| `/api/dungeons/<dungeon_id>` | PUT | Updated dungeon | Updates dungeon information |
| `/api/dungeons/upload` | POST | Job status | Uploads dungeon HTML for parsing |
| `/api/rebuild-database` | POST | Status | Rebuilds the database from seed data |

**Queue System (Job Management for AI Parsing)**

The queue API endpoints are defined in `server_flask.py`, but the separate queue worker script is not present in this repository branch.

| Endpoint | Method | Returns | Purpose |
|----------|--------|---------|---------|
| `/api/queue/submit` | POST | Job ID | Enqueue a parsing job for creature or dungeon content |
| `/api/queue/submit/spell` | POST | Job ID | Enqueue a parsing job for spell content |
| `/api/queue/<job_id>` | GET | Job status & result | Poll job status and retrieve job output |
| `/api/queue/stats` | GET | Queue statistics | Returns current queue metrics |
| `/api/queue/recent` | GET | Recent jobs | Lists recently submitted jobs |

**Query Logic:**
The current schema stores spell metadata directly in the `spells` table. Example query:
```sql
SELECT spell_name, icon, level, school, spell_text, damage, heal, range
FROM spells
ORDER BY spell_name
```

The current implementation does not use a separate `detail_entries` table for spell metadata in this branch.

**Data Transformation:**
1. Queries spell/condition/creature metadata directly from appropriate table
2. Parses JSON fields (to_hit, damage, heal, special, etc.) as needed
3. For spells with paired rolls: Interleaves roll/damage pairs together for visual grouping
4. Uses roll `name` field (A, B, C) to map to number emojis (1️⃣, 2️⃣, 3️⃣)
5. Generates labels: "To Hit" vs "Save" based on roll object's `save` field
6. Enriches roll objects with ability/damage type metadata
7. Capitalizes display text fields (title, size, type, etc.) for display
8. Uses lowercase versions as `level` field for CSS styling
9. Combines into JSON response with complete card information

**Starting the Flask Server:**
```bash
python server_flask.py
# Server runs on http://localhost:8000
# CORS headers enabled for development
```

**Example Response (Single Roll - Fire Bolt):**
```json
[
  {
    "title": "Fire Bolt",
    "icon": "🔥",
    "level": "cantrip",
    "school": "Evocation",
    "explanation": "fling a streak of fire...",
    "details": [
      {
        "label": "🎲 To Hit:",
        "content": {"roll": "1d20", "numerics": [{"code": "sam", "name": "Spellcasting", "emoji": "✨", "color": "#8e44ad"}], "save": false, "name": "attack"}
      },
      {
        "label": "💥 Damage:",
        "content": {"roll": "1d10", "types": [{"code": "fire", "name": "Fire", "emoji": "🔥", "color": "#e74c3c"}], "save": false, "name": "damage"}
      },
      {
        "label": "🎯 Range:",
        "content": {"distance": 120, "unit": "ft", "target": "creature"}
      }
    ]
  }
]
```

**Example Response (Paired Rolls - Ice Knife):**
```json
[
  {
    "title": "Ice Knife",
    "icon": "❄️",
    "level": "level1",
    "school": "Conjuration",
    "explanation": "summon a shard of ice and fling it...",
    "details": [
      {
        "label": "1️⃣ To Hit:",
        "content": {"roll": "1d20", "numerics": [{"code": "sam", "name": "Spellcasting", "emoji": "✨", "color": "#8e44ad"}], "save": false, "name": "A"}
      },
      {
        "label": "1️⃣ Damage:",
        "content": {"roll": "1d10", "types": [{"code": "pierce", "name": "Piercing", "emoji": "🔫", "color": "#34495e"}], "save": false, "name": "A"}
      },
      {
        "label": "2️⃣ Save:",
        "content": {"roll": "1d20", "numerics": [{"code": "dex", "name": "Dexterity", "emoji": "⚡", "color": "#27ae60"}], "save": true, "actor": "target", "name": "B"}
      },
      {
        "label": "2️⃣ Damage:",
        "content": {"roll": "2d6", "types": [{"code": "cold", "name": "Cold", "emoji": "❄️", "color": "#3498db"}], "save": false, "name": "B"}
      },
      {
        "label": "🎯 Range:",
        "content": {"distance": 60, "unit": "ft", "target": "point"}
      }
    ]
  }
]
```

### Special Fields by Card Type

**Spells (from spells table via API):**
- Self-contained in spells table with all metadata
- `id`: Unique spell ID
- `title`: Spell name
- `icon`: Emoji icon
- `level`: "cantrip", "level1"–"level9" (CSS color class)
- `school`: "Evocation", "Transmutation", etc.
- `explanation`: Kid-friendly description
- `to_hit`: JSON array of roll objects with attack/save mechanics
  - Each roll has: `roll` (e.g., "1d20"), `numerics` (ability codes), `save` (boolean), `name` (A, B, C, etc.), optional `actor` field
- `damage`: JSON array of damage roll objects
  - Each roll has: `roll` (e.g., "1d10"), `types` (damage type codes), `save` (boolean), `name` (matches to_hit for pairing)
- `heal`: JSON array of healing roll objects
  - Each roll has: `roll` (e.g., "1d8"), `numerics` (ability codes), `name` (A, B, C, etc.)
- `range`: JSON with range information (distance, unit, target)
- **Paired Rolls:** When spell has multiple to_hit and damage with same count, they are paired by matching `name` fields and displayed interleaved (roll 1, damage 1, roll 2, damage 2)
- **Number Emojis:** Multi-item to_hit/damage pairs use numbered emojis (1️⃣, 2️⃣, 3️⃣) derived from `name` field (A→1️⃣, B→2️⃣, C→3️⃣)
- **Labels:** Automatically generated as "To Hit" or "Save" based on `save` field in roll object

**Weapons:**
- `type`: "Simple Melee", "Martial Ranged", etc.  
- `hands`: "1-handed", "2-handed", or "versatile"
- `properties`: Array of damage types, ranges, etc.

**Conditions:**
- `level`: Condition name (CSS class identifier)
- Self-contained status effects

---

## JavaScript Layer

### Core Modules

#### 1. **card-generator.js** (Core Rendering Engine)
**Purpose:** Reusable card rendering system used by all card type initializers  
**Entry Points:**
- `createCardElement(data)` — Creates single card DOM element from data object
- `renderPaginatedCards(selector, data, cardsPerPage, title, subtitle)` — Creates paginated layout with header and page breaks

**Key Functions:**
- `parseRollString(rollString)` — Parses dice notation (e.g., "1d4 bludgeoning") into roll object
- `reconstructRollString(rollData)` — Converts roll object back to display string
- `createModifierBox(boxText)` — Generates ability/damage modifier boxes (SAM, SAD, BtH)

**Card Generation Logic:**
- Detects card type based on data fields:
  - **Database cards (Spells, Conditions, Creatures, Skills)**: Fetched via API, have `level` field for CSS styling
  - **Weapon cards**: JSON-based, have `type` field for styling
  - **Utility cards**: Character sheet, HP tracker, turn order (mostly HTML-based, minimal JS)
- Creates standard card structure: header (icon + title), body (explanation + details), footer (metadata)
- Applies CSS classes based on card type and level/type field
- Generates interactive draw box for user interaction
- Handles special layouts (weapon properties, multi-roll spell mechanics, etc.)

---

### Initializer Scripts (Card Type Specific)

Each card type has a dedicated initializer that loads data and triggers rendering.

#### **spells.js** (Database-Driven, with Filtering)
**Purpose:** Load spells from Flask API and render with level filtering  
**Data Source:** `/api/spells` endpoint (served by Flask server)  
**Features:**
- Loads all spells on page load
- Creates filter buttons for each spell level (Cantrips, Level 1-9)
- "Select All" / "Select None" quick filters
- Re-renders cards on filter change
- Normalizes level values (e.g., "level1" → 1)

**Pattern:**
```javascript
// 1. Fetch from API
const response = await fetch('/api/spells');
const allSpells = await response.json();

// 2. Extract unique levels and create filter UI
const spellLevels = [...new Set(allSpells.map(spell => normalizeLevel(spell.level)))];

// 3. Create filter buttons that update display
spellLevels.forEach(level => {
  const btn = document.createElement('button');
  btn.addEventListener('click', () => updateSpellDisplay(allSpells, selectedLevels));
  // ...
});
```

#### **conditions.js** (Database-Driven, Simple)
**Purpose:** Load and render condition/status effect cards  
**Data Source:** `/api/conditions` endpoint (served by Flask server)  
**Pattern:**
```javascript
const response = await fetch('/api/conditions');
const conditionsData = await response.json();
renderPaginatedCards(
  '#page-container',
  conditionsData,
  9,  // cards per page
  'Conditions & Status Effects',
  'Knowledge about effects that change how characters work'
);
```

#### **creatures.js** (Database-Driven, Simple)
**Purpose:** Load and render druid wild shape creature cards  
**Data Source:** `/api/creatures` endpoint (served by Flask server)  
**Features:** Displays creature stats with size, type, HP, AC, attacks, and special abilities

#### **skills.js** (Database-Driven, Simple)
**Purpose:** Load and render skill reference cards  
**Data Source:** `/api/skills` endpoint (served by Flask server)  
**Pattern:** Same as conditions.js and creatures.js (simple fetch → render)

#### **weapons.js** (JSON-Driven, with Fallback Paths)
**Purpose:** Load weapons from local JSON and render cards  
**Data Source:** `data/weapons.json` (local file with 3 fallback paths)  
**Pattern:**
```javascript
const paths = [
  '../data/weapons.json',
  './data/weapons.json',
  'data/weapons.json'
];

// Try each path until one succeeds
for (const path of paths) {
  try {
    response = await fetch(path);
    if (response.ok) break;
  } catch (e) { /* try next */ }
}

renderPaginatedCards(
  '#page-container',
  standardWeapons,
  9,
  'Weapons',
  'A complete guide to weapons and combat gear'
);
```

---

### Utility/Helper Scripts

#### **bw-mode-toggle.js** (Print Preview Utility)
**Purpose:** Adds B&W print mode toggle button for grayscale preview  
**Features:**
- Creates "📄 Print B&W" button in top-right corner
- Persists user preference to localStorage
- Applies `bw-mode` CSS class to enable grayscale filter
- Button changes appearance when B&W mode is active
- Automatically hidden during printing

**Pattern:**
```javascript
// On page load, check localStorage for saved preference
const isBWMode = localStorage.getItem('bw-mode') === 'true';
if (isBWMode) {
  document.body.classList.add('bw-mode');
}

// Toggle on button click
bwToggleBtn.addEventListener('click', function() {
  const isCurrentlyBW = document.body.classList.toggle('bw-mode');
  localStorage.setItem('bw-mode', isCurrentlyBW);
});
```

#### **hp-tracker.js** (Interactive HP Management)
**Purpose:** Enables interactive HP circle damage tracking with persistence  
**Features:**
- Selects all HP circles on the page
- Loads saved state from localStorage on page load
- Adds click handlers to toggle circle states (filled = damaged)
- Saves HP state to localStorage for persistence across sessions
- No external dependencies

**Pattern:**
```javascript
const circles = document.querySelectorAll('.hp-circle');

// Load saved state
const savedStates = localStorage.getItem('hpCircleStates');
if (savedStates) {
  JSON.parse(savedStates).forEach((state, i) => {
    if (state) circles[i].classList.add('filled');
  });
}

// Add click handlers
circles.forEach((circle, i) => {
  circle.addEventListener('click', function() {
    this.classList.toggle('filled');
    // Save to localStorage
  });
});
```

#### **character-sheet.js** (Character Sheet Support)
**Purpose:** Minimal JS support for interactive character sheet features  
**Features:** All functionality is embedded in the HTML itself (Flex sizing, spell slot marking, modal interactions)  
**Responsibility:** Provides self-contained character sheet with:
- Ability modifiers calculation display
- Spell slot tracking (visual coloring)
- Saving throws and skills reference
- Interactive sections for handwritten notes

#### **turn-order.js** (Turn Order Display)
**Purpose:** Minimal JS for turn order tracker sheet  
**Features:** Template rendering only; all functionality is in HTML/CSS  
**Pattern:** Display printable tracker grid for D&D combat initiative tracking

#### **wild-shapes.js** (Druid Creature Selection)
**Purpose:** Load and display creature cards specifically for druid wild shapes  
**Data Source:** Same as creatures.js (`/api/creatures`)  
**Note:** Identical to creatures.js; intended for specialized druid-focused view

---

## DOM Structure

### Page Layout

Each card page follows this structure:

```html
<body>
  <div id="page-container">
    <!-- Header (generated by card-generator.js) -->
    <div class="page-header">
      <h1 class="page-title">🎲 Spell Cards 🎲</h1>
      <p class="page-subtitle">D&D 5th Edition</p>
    </div>
    
    <!-- Pages of cards (9 per page via CSS grid) -->
    <div class="page">
      <div class="cards-grid">
        <article class="card level1">
          <header class="card-header">
            <span class="card-icon">✨</span>
            <h2 class="card-title">Card Name</h2>
          </header>
          
          <section class="card-body">
            <p class="explanation">Flavor text...</p>
            <dl class="spell-details">
              <dt class="detail-label">🎲 Roll</dt>
              <dd class="detail-content">d20 + 5</dd>
            </dl>
            <!-- Draw box -->
            <div class="draw-box"></div>
          </section>
          
          <footer class="card-footer">
            Evocation • Higher magic
          </footer>
        </article>
        <!-- More cards... -->
      </div>
    </div>
  </div>
</body>
```

### CSS Grid Setup

Cards use Flexbox for responsive grid:
- **3 columns** per row
- **3 rows** per page = 9 cards per A4 page
- **Automatic page breaks** at 9 cards
- **Standard card dimensions**: 63.5mm × 88.9mm

---

## Presentation Layer (CSS)

### Global Styles (styles.css)

**Base Structure:**
- Parchment aesthetic: Tan/brown color scheme
- Consistent typography: Fredoka One (headers), Nunito (body)
- Playing card proportions: 63.5mm × 88.9mm
- Print-optimized: Exact color preservation

**Card Base Styles:**
```css
.card {
  --cc: #default-color;  /* CSS variable for flexibility */
  
  /* Layout */
  width: 63.5mm;
  height: 88.9mm;
  
  /* Borders */
  border: 2px solid #8b5e3c;
  
  /* Grid */
  display: flex;
  flex-direction: column;
}

.card-header {
  background: var(--cc);
  color: white;
  padding: 4mm 3mm;
}

.card-body {
  flex: 1;
  padding: 2mm 3mm;
  background: #fffef7;
}

.card-footer {
  background: var(--cc);
  color: white;
  font-size: 6.5pt;
  padding: 2mm 0;
}
```

**Color Classes:**
Each card type has corresponding color classes:
- Spells: `.cantrip`, `.level1`–`.level9`
- Conditions: `.blinded`, `.charmed`, `.deafened`, etc.
- Weapons: `.simple-melee`, `.simple-ranged`, `.martial-melee`, `.martial-ranged`

**See COLORS.md for complete color reference.**

### Print Optimization

All pages are optimized for A4 printing with 9 cards per page (3×3 grid). The following CSS rules ensure perfect print output:

```css
@media print {
  /* Remove margins and padding for full card utilization */
  html, body {
    margin: 0;
    padding: 0;
  }
  
  /* Force exact color preservation regardless of browser settings */
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Prevent cards from splitting across page boundaries */
  .card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  
  /* Force page break after each card grid (9 cards = 1 page) */
  .page {
    break-after: page;
    page-break-after: always;
  }
  
  /* Hide screen-only elements */
  .screen-only {
    display: none !important;
  }
}
```

#### Print Layout Details

**Grid System:**
- CSS Grid: 3 columns × 3 rows = 9 cards per page
- Card dimensions: 63.5mm × 88.9mm (standard playing card size)
- No gaps between cards (flush grid)
- A4 page: 210mm × 297mm

**Color Preservation:**
- All cards use CSS variables for header/footer colors
- `color-adjust: exact` forces exact color printing
- Cards are visually tested for color accuracy at 100% scale
- See [COLORS.md](../development/COLORS.md) for all available color classes

**Page Breaking:**
- `break-inside: avoid` prevents cards from splitting
- `.page` containers automatically trigger new page
- Exactly 9 cards print per page
- Last page may be partial (user manually omits if blank)

#### User Requirements for Perfect Printing

1. **Paper:** Standard A4 (210mm × 297mm) white stock
2. **Margins:** Set to **0mm/None**
3. **Scale:** **100%** (disable "Fit to page")
4. **Background graphics:** **Enabled**
5. **Color mode:** Color or CMYK (not Grayscale)

#### Browser Compatibility

All modern browsers support CSS print media queries. Tested on:
- Chrome/Chromium (Windows, Mac, Linux)
- Firefox (all platforms)
- Safari (Mac, iOS)
- Edge (Windows)

All browsers should produce identical output when print settings match.

---

## File Structure & Naming Conventions

### Directory Organization
```
dnd-kids-resources/
├── index.html                      # Landing page
├── server_flask.py                 # Flask API server
├── README.md                       # User-facing documentation
├── requirements.txt                # Python dependencies
│
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md             # This file
│   ├── COLORS.md                   # Color reference
│   ├── CONTRIBUTING.md             # Developer guide
│   └── planning/                   # Historical and design notes
│
├── pages/                          # HTML card page templates
│   ├── resources.html
│   ├── spell-cards-list.html
│   ├── stat-block-parser.html
│   ├── character-sheet.html
│   ├── hp-tracker.html
│   ├── turn-order-tracker.html
│   ├── spell-slots.html
│   └── dungeons-library.html
│
├── data/                           # JSON data sources
│   └── (static card data would go here)
│
├── dnd_kids_resources.db           # SQLite database
│
├── js/                             # JavaScript modules
│   ├── card-generator.js           # Core rendering engine
│   ├── spells-list.js
│   ├── spells-v2.js
│   ├── bw-mode-toggle.js
│   ├── character-sheet.js
│   ├── hp-tracker.js
│   ├── turn-order.js
│   ├── queue-helper.js
│   ├── spell-slots.js
│   └── wild-shapes.js
│
├── css/
│   └── styles.css                  # All styling
│
├── lib/                            # Python modules
│   └── parse_dungeon.py            # Dungeon HTML parser
│
└── _dev/                           # Development utilities
    ├── init_database.py
    ├── seed_database.py
    ├── parse_spells_api.py
    └── README.md
```

### Naming Conventions

**Data Files:** Plural, lowercase, hyphenated
- `spells.json`, `conditions.json`, `weapons.json`

**JavaScript Modules:** Singular, lowercase, hyphenated
- `card-generator.js` (core), then one for each data type
- `spells.js`, `conditions.js`, `weapons.js`

**HTML Pages:** Plural, lowercase, hyphenated
- `pages/resources.html`
- `pages/spell-cards-list.html`
- `pages/stat-block-parser.html`
- `pages/character-sheet.html`
- `pages/hp-tracker.html`
- `pages/turn-order-tracker.html`
- `pages/spell-slots.html`
- `pages/dungeons-library.html`

**CSS Classes:** Lowercase, hyphenated, semantic
- `.card`, `.card-header`, `.card-body`, `.card-footer`
- `.page`, `.page-header`, `.page-title`
- Color classes: `.level1`, `.cantrip`, `.blinded`, `.simple-melee`

---

## Data Flow Diagram

```
User opens pages/spell-cards-list.html
             ↓
Browser loads HTML + CSS + JavaScript
             ↓
spells-list.js DOMContentLoaded event fires
             ↓
fetch('/api/spells') from the Flask server
             ↓
JSON parsed into array of spell objects
             ↓
renderPaginatedCards() called (from card-generator.js)
             ↓
For each spell object:
  - createCardElement() generates card DOM
  - CSS class applied based on spell level
  - Appended to #page-container
             ↓
Card elements rendered in 3×3 grid (9 per page)
             ↓
Page breaks inserted after each 9 cards
             ↓
User sees printable card layout
             ↓
User presses Ctrl+P to print
             ↓
@media print CSS applies color preservation
             ↓
Perfect playing cards printed on A4 paper
```

---

## Deployment

### Local Hosting
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

### Static Hosting
- Works on **GitHub Pages**: Just push to `gh-pages` branch
- Works on **Netlify**: Connect GitHub repo
- Works **offline**: Just download and open index.html

### Browser Requirements
- JavaScript enabled
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- CSS3 support (Flexbox, CSS Grid, @media print)

---

## Testing Strategy

### Unit Testing (Manual)
1. Verify JSON syntax: `JSON.parse()` in browser console
2. Check card rendering: Open page, inspect elements
3. Test data loading: Check Network tab for fetch errors
4. Validate print output: Print preview with exact colors

### Print Testing
1. Open any card page
2. Press Ctrl+P (or Cmd+P on Mac)
3. Set: **A4 size, fit to page, background graphics ON**
4. Verify: Cards are 9 per page, colors accurate

### Common Issues & Debugging

**Console Error: "Failed to load data"**
- Check file paths (3 fallback paths in initializer)
- Verify JSON file exists in `data/` folder
- Check for CORS issues (shouldn't happen locally)

**Cards not rendering**
- Check browser console for JavaScript errors
- Verify JSON syntax (use online JSON validator)
- Ensure `card-generator.js` is loaded before initializer script

**Print colors wrong**
- Enable "Background graphics" in print dialog
- Force color printing (CSS has `color-adjust: exact`)
- Test on different browser/printer combination

**Cards misaligned on page**
- Check A4 paper size setting
- Verify "Fit to page" is selected in print dialog
- Ensure margins are 0mm (full bleed)

---

## Future Enhancements

Potential improvements for consideration:

**Feature Additions:**
- Search/filter functionality
- Custom card builder
- PDF export functionality
- Mobile-friendly view (currently print-optimized)

**System Improvements:**
- Localization (multi-language support)
- Dark mode variant
- Touch-optimized card interactions
- Deck management (save/load custom card sets)

**Data Expansion:**
- Additional D&D 5e classes
- Monster/creature cards
- Magic item descriptions
- Expanded NPC templates

---

## Browser Compatibility

All code uses ES6+ JavaScript (Fetch API, Arrow Functions).

**Supported:**
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅
- Opera 76+ ✅

**Not Supported:**
- Internet Explorer ❌ (uses ES6)
- Very old browsers ❌

---

## Performance Considerations

### Load Time
- No external libraries → Fast load
- JSON parsing is native and fast (< 100ms)
- All fonts are Google Fonts CDN (cached)
- Total page load: < 2 seconds on average connection

### Memory Usage
- ~50KB per JSON data file
- DOM generation is linear O(n) where n = cards
- No significant memory leaks (tested up to 100+ cards)

### Print Performance
- Print-friendly CSS reduces file size
- Colors are exact (no gradients or shadows)
- No JavaScript runs during print
- Result: ~500KB PDF per page

---

For developer questions, see **[Contributing Guide](../development/CONTRIBUTING.md)**.
For color specifications, see **[Color Reference](../development/COLORS.md)**.
