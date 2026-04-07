# D&D Kids Resources

**Printable D&D 5th Edition tools and reference cards designed for kids.**

🎲 Spell Cards • 🛡️ Condition Cards • ⚔️ Weapons • 🎯 Skills

---

## What Is This?

A web-based toolkit for creating printable D&D reference cards in playing card format (63.5mm × 88.9mm). Perfect for:
- Kids learning D&D mechanics
- Quick in-game reference cards
- Cutout-and-keep card sets
- Interactive digital cards

**All cards are designed for printing on standard A4 paper (9 per page)**

---

## Getting Started

### View Online
Simply open `index.html` in a web browser. All features work offline after first load.

### Run Locally (Development)

**Using Flask API (Database) - Recommended for Full Features:**
```bash
python server_flask.py
# Visit http://localhost:8000
# Loads: Spells, Conditions, Skills, Creatures with full database features
```

**For Weapons & Trackers Only (No Database):**
```bash
python -m http.server 8000
# Visit http://localhost:8000
# Loads: Weapons (JSON), Character Sheet, HP Tracker, Turn Order Tracker
# Note: Spells, Conditions, Skills, and Creatures won't work without Flask server
```

**VS Code Option:**
Install "Live Server" extension, right-click `index.html` → "Open with Live Server" (works for Weapons & Trackers, but not database-driven cards)

**Node.js Option:**
```bash
npx http-server
```

### Print Cards

#### Black & White Preview Mode

All card pages have a **"📄 Print B&W"** toggle button in the top-right corner. Click it to:
- Convert the page to full black & white (grayscale)
- Preview exactly how cards will look when printed in B&W
- Save ink and printing costs
- The button automatically hides when printing

Your choice is saved—next time you visit, the page remembers your preference.

#### Quick Print (5 Steps)
1. Navigate to any card page (e.g., Spell Cards)
2. *(Optional)* Click **"📄 Print B&W"** to preview in black & white
3. Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
4. In print dialog, set paper size to **A4**
5. Enable **"Background graphics"** (also called "Background colors and images")

#### Browser-Specific Settings

**Chrome/Edge:**
- Print dialog → More settings
- Paper size: **A4 (210mm × 297mm)**
- Margins: **0 (None)**
- Background graphics: **On**
- Scale: **100%**

**Firefox:**
- Print → Format & Options tab
- Paper size: **A4**
- Margins: **0mm**
- Print backgrounds: **Enabled**
- Scale: 100% (uncheck "Shrink to fit")

**Safari (Mac):**
- File → Print
- Paper size: **A4**
- Orientation: **Portrait**
- Scale: **100%** (uncheck "Auto")
- Shows backgrounds: **On**

#### Card Specifications
- **Paper:** Standard A4 (210mm × 297mm)
- **Cards per page:** 9 (arranged in 3×3 grid)
- **Card size:** 63.5mm × 88.9mm (standard playing card)
- **Page breaks:** Automatic (never splits a card)
- **Colors:** Preserved exactly as shown on screen

#### What to Expect
- Each page contains exactly 9 cards
- Cards are perfectly sized for standard deck boxes
- All colors and backgrounds print with high fidelity
- No margin wasted (0mm margins recommended)

#### After Printing
1. Let ink dry completely (1-2 minutes)
2. Cut along card borders using a ruler and craft knife, or use a paper cutter
3. Round corners slightly with a corner rounder tool (optional, for durability)
4. Store in standard deck boxes

#### Troubleshooting

**Cards appear too small?**
- Ensure scale is set to **100%**
- Uncheck any "Fit to page" option
- Check margins are set to **0mm/None**

**Colors fade or don't print?**
- Enable **Background graphics** in print settings
- Ensure **color-adjust: exact** is not disabled (our CSS handles this)
- Try a different printer if colors still fail

**Cards split across pages?**
- This shouldn't happen (CSS prevents it)
- If it does, check your print margin settings are 0mm
- Try another browser or printer

**Print preview shows extra pages?**
- This is normal if you have more cards than can fit in 9-card increments
- Just don't print the blank final page

---

## Available Tools

| Tool | Items | Features |
|------|-------|----------|
| **Spell Cards** | 54 spells | Print • **Level filtering** |
| **Condition Cards** | 19 conditions | Print |
| **Skill Cards** | 18 skills | Print |
| **Creature Cards** | 6 creatures | Print |
| **Weapon Cards** | 42+ weapons | Print |
| **Character Sheet** | 1 printable sheet | Print |
| **HP Tracker** | Interactive circles | Print & Track |
| **Turn Order Tracker** | 1 printable tracker | Print |

### Spell Card Features

**Level Filtering:**
- Choose which spell levels to display
  - Filter by: Cantrips, Level 1, Level 2, etc.
  - "Select All" / "Select None" buttons
  - Real-time updates to card display
- Print only the levels you need
- Filter controls hide automatically in print preview

---

## Project Structure

```
.
├── index.html              # Home page
├── README.md               # This file
├── docs/                   # Documentation
│   ├── CONTRIBUTING.md     # Developer guide
│   ├── COLORS.md           # Complete color reference
│   ├── ARCHITECTURE.md     # Technical documentation
│   └── WORKSPACE_GUIDE.md  # Navigation guide
│
├── pages/                  # Card generator pages
│   ├── spell-cards.html
│   ├── condition-cards.html
│   ├── weapon-cards.html
│   └── ...
│
├── data/                   # Card data (JSON)
│   ├── weapons.json
│   └── ...
   (Spells and Conditions loaded from database via Flask API)
│
├── js/                     # Rendering logic
│   ├── card-generator.js   # Core card creation
│   ├── spells.js
│   ├── conditions.js
│   └── ...
│
├── css/
│   └── styles.css          # All card styling
│
├── assets/
│   └── images/             # Card backgrounds, assets
│
├── lib/                    # Production modules ⭐ ACTIVE CODE
│   ├── parse_dungeon.py    # Dungeon HTML parser (used by Flask API)
│   ├── __init__.py
│   └── README.md           # Production code guidelines
│
├── server_flask.py         # Flask web server (main application)
├── start-server.ps1        # Flask server launcher
│
└── _dev/                   # Development utilities (not needed for production)
    ├── README.md           # Dev folder guide
    ├── dungeon_parsing_test/  # Testing code for lib/parse_dungeon.py
    └── ...
```

---

## Features

✅ **Optimized for Printing**
- A4 page layout (3×3 card grid)
- Color preservation in print mode
- Black & White print preview mode (toggle button)
- Page break handling
- Playing card dimensions (63.5mm × 88.9mm)

✅ **Professional Design**
- Consistent styling across all cards
- Color-coded by category (level, condition, profession)
- Kid-friendly fonts and formatting
- Parchment aesthetic

✅ **Extensible**
- Add new card sets by creating JSON data
- Reusable card generation system
- Easy to customize styles

✅ **Zero Dependencies**
- Pure HTML, CSS, JavaScript
- Works offline
- No build tools required

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Requires:** JavaScript enabled

---

## Documentation

- **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** — Add new cards and features
- **[docs/COLORS.md](docs/COLORS.md)** — Complete color reference for all card types
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Technical architecture and data formats
- **[_dev/README.md](_dev/README.md)** — Development utilities

---

## License

Non-commercial fan project based on D&D 5th Edition rules.
