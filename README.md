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

**Using Flask API (Database):**
```bash
python _dev/server_flask.py
# Visit http://localhost:5000
# Spells and Conditions load from dnd_kids_resources.db
```

**For Other Cards (Weapons, Skills):**
```bash
python -m http.server 8000
# Visit http://localhost:8000
# Cards load from JSON files (or run Flask for all features)
```

**VS Code Option:**
Install "Live Server" extension, right-click `index.html` → "Open with Live Server" (works for all except spells)

**Node.js Option:**
```bash
npx http-server
```

### Print Cards

#### Quick Print (5 Steps)
1. Navigate to any card page (e.g., Spell Cards)
2. Press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
3. In print dialog, set paper size to **A4**
4. Enable **"Background graphics"** (also called "Background colors and images")
5. Click **Print**

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

| Tool | Cards | Pages | Features |
|------|-------|-------|----------|
| **Spell Cards** | 27 spells | 3 | Print • **Level filtering** |
| **Condition Cards** | 19 conditions | 3 | Print |
| **Weapon Cards** | 42+ weapons | 5+ | Print |

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
├── CONTRIBUTING.md         # Developer guide
├── COLORS.md               # Complete color reference
├── ARCHITECTURE.md         # Technical documentation
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
└── _dev/                   # Development utilities
    ├── server.py           # Local test server
    ├── README.md           # Dev folder guide
    └── ...
```

---

## Features

✅ **Optimized for Printing**
- A4 page layout (3×3 card grid)
- Color preservation in print mode
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

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Add new cards and features
- **[COLORS.md](COLORS.md)** — Complete color reference for all card types
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Technical architecture and data formats
- **[_dev/README.md](_dev/README.md)** — Development utilities

---

## License

Non-commercial fan project based on D&D 5th Edition rules.
