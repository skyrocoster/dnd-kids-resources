# D&D Kids Resources

**Printable D&D 5th Edition tools and reference cards designed for kids.**

🎲 Spell Cards • 🛡️ Condition Cards • 💎 Magic Items • ⚔️ Weapons • 👫 NPCs

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

**Option 1: Python**
```bash
python -m http.server 8000
# Visit http://localhost:8000
```

**Option 2: VS Code**
Install "Live Server" extension, right-click `index.html` → "Open with Live Server"

**Option 3: Node.js**
```bash
npx http-server
```

### Print Cards
1. Navigate to any card page (e.g., Spell Cards)
2. Press `Ctrl+P` (or `Cmd+P` on Mac)
3. Set to **A4 size, fit to page**
4. Enable "Background graphics"
5. Cut and use!

---

## Available Tools

| Tool | Cards | Pages | Format |
|------|-------|-------|--------|
| **Spell Cards** | 27 spells | 3 | Print |
| **Condition Cards** | 19 conditions | 3 | Print |
| **Magic Items** | 9 items | 1 | Print |
| **Weapon Cards** | 42+ weapons | 5+ | Print |
| **NPC Cards** | 9 NPCs | 1 | Print |

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
│   ├── magic-items-cards.html
│   ├── weapon-cards.html
│   ├── npc-cards.html
│   └── ...
│
├── data/                   # Card data (JSON)
│   ├── spells.json
│   ├── conditions.json
│   ├── magic-items.json
│   ├── weapons.json
│   ├── npcs.json
│   └── ...
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
