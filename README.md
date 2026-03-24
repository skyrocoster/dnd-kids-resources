# D&D Kids Resources - Web Project

A collection of printable D&D 5th Edition tools and reference cards designed for kids, including spell cards, creature conditions, magic items, weapons, and more.

## Project Structure

```
dnd-kids-resources/
├── index.html                 # Home page with all tools
├── README.md                  # This file
├── WORKSPACE_GUIDE.md         # Development guide
│
├── pages/                     # HTML pages for each tool
│   ├── spell-cards.html
│   ├── condition-cards.html
│   ├── magic-items-cards.html
│   ├── weapon-cards.html
│   ├── turn-order-tracker.html
│   └── character-sheet.html
│
├── data/                      # JSON data files
│   ├── spells.json
│   ├── conditions.json
│   ├── magic-items.json
│   └── weapons.json
│
├── css/                       # Stylesheets
│   └── styles.css            # Shared card styling
│
├── js/                        # JavaScript modules
│   ├── card-generator.js     # Reusable card creation & rendering
│   ├── spells.js             # Spell cards initialization
│   ├── conditions.js         # Conditions cards initialization
│   ├── character-sheet.js    # Character sheet initialization
│   ├── magic-items.js        # Magic items cards initialization
│   ├── weapons.js            # Weapons cards initialization
│   └── turn-order.js         # Turn order tracker initialization
│
└── assets/                    # Static assets
    └── images/

server.py                     # Local web server launcher
```

## Running the Web Server

To view the website locally during development:

### Option 1: Python Script (Recommended)
```bash
python server.py
```
This will:
- Start a local web server on `http://localhost:8000`
- Automatically open your browser (if possible)
- Display the server status in the terminal
- Press `Ctrl+C` to stop the server

### Option 2: Python Command Line
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### Option 3: Other Methods
- **Node.js/npx**: `npx http-server`
- **Live Server Extension** (VS Code): Install "Live Server" extension and right-click index.html

## Data Format

Each card type uses a standardized JSON format:

```json
{
  "title": "Spell Name",
  "icon": "✨",
  "level": "cantrip",
  "school": "Evocation",
  "explanation": "Brief description in kid-friendly language",
  "details": [
    { "label": "🎲 Roll", "content": "mechanics description" },
    { "label": "💥 Damage", "content": "damage value" }
  ]
}
```

## How to Add a New Tool

1. **Create the data file** in `data/` folder (e.g., `data/new-tool.json`)
2. **Create the HTML file** in `pages/` folder (e.g., `pages/new-tool.html`)
3. **Create the JS initializer** in `js/` folder (e.g., `js/new-tool.js`)
4. **Add to index.html** with a link to the new page

Example HTML file:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Tool - D&D Kids Resources</title>
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
  <div id="page-container"></div>
  
  <script src="../js/card-generator.js"></script>
  <script src="../js/new-tool.js"></script>
</body>
</html>
```

## CSS Classes

The shared stylesheet provides these card classes:

- `.page` - Full A4 page container
- `.card` - Individual card element
- `.card-header` - Card title section
- `.card-body` - Main content area
- `.card-footer` - Card metadata
- `.spell-details` - Details grid
- `.draw-box` - Empty drawing area

### Level Colors

Cards automatically color-code by spell level:
- `.cantrip` - Gold (#f39c12)
- `.level1` - Red (#e74c3c)
- `.level2` - Purple (#9b59b6)
- `.level3` - Blue (#3498db)
- `.level4` - Teal (#1abc9c)
- `.level5` - Green (#2ecc71)
- And more...

### Ability Score Colors

Text colors for ability checks:
- `.ability-str` - Red (Strength)
- `.ability-dex` - Green (Dexterity)
- `.ability-con` - Orange (Constitution)
- `.ability-int` - Blue (Intelligence)
- `.ability-wis` - Purple (Wisdom)
- `.ability-cha` - Gold (Charisma)

## Features

### Card Generation (`card-generator.js`)

**`createCardElement(data)`**
- Converts a data object into a DOM card element
- Handles icons, titles, descriptions, and details
- Applies appropriate styling based on card level

**`renderPaginatedCards(containerSelector, cardsData, cardsPerPage, pageTitle, pageSubtitle)`**
- Renders cards across multiple A4 pages
- 9 cards per page by default (3 columns × 3 rows)
- Includes page headers with customizable title/subtitle
- Print-friendly with exact color preservation

### Printing

All pages are optimized for printing:
- A4 page size with proper margins
- Color preservation in print mode
- Page break handling for multi-page documents
- Card dimensions: 63.5mm × 88.9mm (standard playing cards)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript enabled for card rendering.

## Future Enhancements

- [ ] Search/filter functionality
- [ ] Customizable card sizes
- [ ] Export to PDF
- [ ] Player hand view (subset of cards)
- [ ] Deck builder/custom cards
- [ ] Mobile-friendly view

## License

Non-commercial fan project based on D&D 5th Edition rules.
