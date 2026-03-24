# D&D Kids Resources - Project Guide

A professional web project containing printable D&D 5th Edition tools and reference cards for kids.

## 🏗️ Project Structure

**Standard Web Development Layout:**

```
dnd-kids-resources/
├── index.html                    # Landing page
├── README.md                     # Project documentation
├── WORKSPACE_GUIDE.md            # This file
│
├── pages/                        # HTML templates
│   ├── spell-cards.html         # ✅ Spell card generator
│   ├── condition-cards.html     # 🚧 Combat conditions
│   ├── magic-items-cards.html   # 🚧 Magic items
│   ├── weapon-cards.html        # 🚧 Weapon reference
│   ├── turn-order-tracker.html  # 🚧 Initiative tracker
│   └── character-sheet.html     # 🚧 Character sheet
│
├── data/                         # JSON data (normalized)
│   ├── spells.json              # ✅ 27 spells complete
│   ├── conditions.json          # ✅ 19 conditions complete
│   ├── magic-items.json         # ✅ 3 magic items complete
│   ├── weapons.json             # ✅ 42 weapons complete
│   └── turn-order.json          # 📋 TODO
│
├── css/                          # Stylesheets
│   └── styles.css               # ✅ Shared card styling
│
└── js/                           # JavaScript modules
    ├── card-generator.js        # ✅ Reusable card renderer
    ├── spells.js                # ✅ Loads + renders spells
    ├── conditions.js            # ✅ Loads + renders conditions
    ├── magic-items.js           # ✅ Loads + renders magic items
    ├── weapons.js               # ✅ Loads + renders weapons
    ├── turn-order.js            # 📋 TODO
    └── character-sheet.js       # 📋 TODO

```

## 🎨 Card Types & Locations

| Tool | Type | Location | Status |
|------|------|----------|--------|
| **Spell Cards** | Printable | `pages/spell-cards.html` | ✅ Complete |
| **Condition Cards** | Printable | `pages/condition-cards.html` | ✅ Complete |
| **Magic Items** | Printable | `pages/magic-items-cards.html` | ✅ Complete |
| **Weapon Cards** | Printable | `pages/weapon-cards.html` | ✅ Complete |
| **Turn Tracker** | Interactive | `pages/turn-order-tracker.html` | 🚧 Code needed |
| **Character Sheet** | Printable | `pages/character-sheet.html` | 🚧 Code needed |

## 📐 Card Specifications

**Physical Dimensions:** 63.5mm × 88.9mm (standard playing card size)
**Page Layout:** 3 columns × 3 rows = 9 cards per A4 page
**Format:** Responsive grid, optimized for printing

## 🔧 How to Add Data

### Standard Card Format (JSON)
```json
{
  "title": "Spell/Item Name",
  "icon": "✨",
  "level": "cantrip",           // or "level1", "level2", etc.
  "school": "Evocation",        // Category
  "explanation": "Kid-friendly description",
  "details": [
    { "label": "🎲 Roll", "content": "mechanics" },
    { "label": "💥 Damage", "content": "1d6 fire" }
  ]
}
```

### Create New Card Set:
1. Add JSON file to `data/` folder
2. Create HTML template in `pages/`
3. Create JS initializer in `js/`
4. Add link to `index.html`

Example JS initializer:
```javascript
document.addEventListener('DOMContentLoaded', async function() {
  const response = await fetch('../data/new-data.json');
  const data = await response.json();
  renderPaginatedCards('#page-container', data);
});
```

## 🎨 CSS Classes

**Layout:**
- `.page` - A4 container
- `.cards-grid` - 3-column grid
- `.card` - Individual card

**Card Parts:**
- `.card-header` - Title area (colored)
- `.card-body` - Content
- `.card-footer` - Type label

**Colors by Level:**
- `.cantrip` → Gold
- `.level1` → Red
- `.level2` → Purple
- `.level3` → Blue
- `.level4` → Teal
- `.level5` → Green

**Ability Colors:**
- `.ability-str` → Red
- `.ability-dex` → Green
- `.ability-con` → Orange
- `.ability-int` → Blue
- `.ability-wis` → Purple
- `.ability-cha` → Gold

## 🖨️ Print Features

✅ A4 page format with proper margins
✅ Exact color preservation
✅ Page break handling
✅ Print-friendly CSS
✅ No UI elements in printout

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+
- Requires JavaScript

## 📈 Next Steps

1. **Complete Data Files:**
   - Extract conditions, weapons, magic items from D&D 5e SRD
   - Follow standard card format

2. **Interactive Tools:**
   - Turn order tracker: drag-drop initiative order
   - Character sheet: fillable form, save data

3. **Optimization:**
   - Test print output (A4, Letter)
   - Verify color accuracy
   - Mobile responsive view

4. **Deployment:**
   - GitHub Pages, Netlify, Vercel
   - Works fully offline after download

---

### 4. **dnd_condition_cards.html** — Condition Cards
Printable condition/status effect cards in playing card format. Each condition has unique color.

**Card Format:**
- Header band with condition emoji + title
- Simple explanation of the condition
- Bulleted rules list
- Drawing area for tracking
- Footer with condition type

**Conditions:** Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Poisoned, Prone, Stunned, Unconscious, Inspiration, Advantage, Disadvantage, Concentration, Restrained, Hidden, Turn

---

### 5. **dnd_magic_items_cards.html** — Magic Item Cards
Printable magic item cards in playing card format. Color-coded by item type.

**Card Format:**
- Header band with item emoji + title
- Whimsical flavor description
- Details: Charges (with tracking circles), Effect, Duration, Recharge
- Drawing area
- Footer with item category

**Current Items:** Breathing Bubble, Fire Stone, Frost Stone

---

## 🎨 Universal Color Palette

### Base Colors (Used Across All Files)
```
--parchment:  #fdf3e3  (cream background)
--ink:        #2c1810  (dark brown text)
--border:     #8b5e3c  (brown borders)
--wb:         #fffef7  (white background for cards)
--wbl:        #b0865a  (tan/brown accent)
--muted:      #8b5e3c  (muted text)
```

### Page Background
- Body background: `#c9a97a` (tan)
- Creates a parchment-like aesthetic

---

## 🎭 Color Schemes by Document Type
**Note:** Character Sheet and Spell Cards use different color palettes for spell levels—character sheet uses light pastels for backgrounds, while spell cards use bright colors for headers.
**Character Sheet (kids_dnd_sheet_v3.html):**
**Header Title:** Red `#c0392b` (adventure/action theme)

**Ability Modifiers by Type:** (Color-coded labels)
- Strength (STR): Red `#c0392b` 💪
- Dexterity (DEX): Green `#1e8449` 🎯
- Constitution (CON): Orange `#e67e22` 🛡️
- Intelligence (INT): Blue `#2471a3` 🧠
- Wisdom (WIS): Purple `#7d3c98` 👁️
- Charisma (CHA): Gold `#c9a90a` ✨

**Interactive Elements:**
- Advantage checkbox: Green border/text `#1e8449`
- Disadvantage checkbox: Red border/text `#c0392b`
- Inspiration checkbox: Gold border/text `#c9a90a`
- Spell circles: Purple fill `#7d3c98` when colored

**Spell Slot Colors (9 levels):**
| Level | Color | Hex Code | Use |
|-------|-------|----------|-----|
| 1 | Gold | #fef5e7 (light gold) | Cantrips/Basic |
| 2 | Light Gold | #fef9c3 | Cantrips/Basic |
| 3 | Light Red | #fadbd8 | Basic spells |
| 4 | Light Red | #fadbd8 | Basic spells |
| 5 | Light Purple | #d7bde2 | Mid-level spells |
| 6 | Light Purple | #d7bde2 | Mid-level spells |
| 7 | Light Green | #a9dfbf | Advanced spells |
| 8 | Light Green | #a9dfbf | Advanced spells |
| 9 | Light Blue | #aed6f1 | High-level spells |

---

### Spell Cards (dnd_spell_cards.html)
**Header Title:** Red `#c0392b`

**Spell Level Colors (Card Header & Footer):**
| Level | Display Name | Color | Hex Code |
|-------|--------------|-------|----------|
| 0 | Cantrip | Gold | #f39c12 |
| 1 | Level 1 | Red | #e74c3c |
| 2 | Level 2 | Purple | #9b59b6 |
| 3 | Level 3 | Blue | #3498db |
| 4 | Level 4 | Teal | #1abc9c |
| 5 | Level 5 | Green | #2ecc71 |
| 6 | Level 6 | Yellow | #f1c40f |
| 7 | Level 7 | Orange | #e67e22 |
| 8 | Level 8 | Grey | #95a5a6 |
| 9 | Level 9 | Dark Blue-Grey | #34495e |

**Detail Label Color:** Tan/Brown `#b0865a`

---

### Weapon Cards (dnd_weapon_cards.html)
**Header Title:** Brown `#8b4513`

**Weapon Category Colors (Card Header & Footer):**
| Category | Color | Hex Code | Meaning |
|----------|-------|----------|---------|
| Simple Melee | Grey | #9ca3af | Basic 1-handed/2-handed weapons |
| Simple Ranged | Cyan | #06b6d4 | Basic ranged weapons |
| Martial Melee | Green | #10b981 | Advanced melee weapons |
| Martial Ranged | Blue | #3b82f6 | Advanced ranged weapons |

---

### Condition Cards (dnd_condition_cards.html)
**Header Title:** Red `#c0392b`

**Condition Colors (Card Header & Footer):**
| Condition | Color | Hex Code | Theme |
|-----------|-------|----------|-------|
| Blinded | Dark Purple | #4a4a6a | Darkness |
| Charmed | Purple | #9b59b6 | Magic/Enchantment |
| Deafened | Grey | #7f8c8d | Muted |
| Frightened | Red | #c0392b | Fear/Danger |
| Grappled | Orange | #d35400 | Restraint |
| Incapacitated | Dark Blue-Grey | #2c3e50 | Helpless |
| Invisible | Teal | #1a6b8a | Hidden |
| Paralyzed | Teal-Green | #16a085 | Frozen |
| Poisoned | Green | #27ae60| Toxin |
| Prone | Brown | #8b5e3c | Grounded |
| Stunned | Orange-Gold | #f39c12 | Dazed |
| Unconscious | Black | #2c2c2c | Out |
| Inspiration | Gold | #c9a90a | Bonus |
| Advantage | Green | #1e8449 | Bonus |
| Disadvantage | Red | #c0392b | Penalty |
| Concentration | Purple | #7d3c98 | Focus |
| Restrained | Orange-Brown | #ca6f1e | Bound |
| Hidden | Dark Grey | #34495e | Secret |
| Turn | Blue | #2471a3 | Current |

---

### Magic Item Cards (dnd_magic_items_cards.html)
**Header Title:** Purple `#6b2e7f`

**Item Category Colors (Card Header & Footer):**
| Category | Color | Hex Code | Use |
|----------|-------|----------|-----|
| Utility | Purple | #8b5fbf | Breathing Bubble, etc. |
| Combat | Red | #d66a6a | Fire Stone, Frost Stone |
| Healing | Green | #6ab86a | Healing items |

---

## 📍 Emoji Guide

### Character Sheet Emojis
```
❤️  - HP (Hit Points) heart
⭐ - Star/general marker
🎲 - Dice/roll mechanic
```

### Ability Modifier Emojis (Background hints, semi-transparent)
```
💪 - Strength
🎯 - Dexterity  
🛡️  - Constitution
🧠 - Intelligence
👁️  - Wisdom
✨ - Charisma
```

### Skill Emojis (Various skills)
Displayed with text, used for visual identification of skill types

### Spell Card Detail Emojis
```
🔥 - Fire element/spells
🎲 - Roll/dice
💥 - Damage
🎯 - Range/targeting
⬆️  - Scaling
```

### Weapon Card Detail Emojis
```
⚔️  - General melee weapons (swords, clubs)
🗡️  - Slashing weapons (daggers, scimitars)
🪓 - Axes/slashing
🪵 - Clubs/bludgeoning
🔱 - Spears/polearms
🏹 - Bows/ranged
🎯 - Ranged marker
```

### Magic Item Detail Emojis
```
🫧 - Breathing Bubble (air/bubble)
🔥 - Fire Stone (fire element)
❄️  - Frost Stone (ice element)
💨 - Charges/air
✨ - Effect/magic
⏱️  - Duration/time
🔄 - Recharge/refresh
```

### Condition Card Emojis
```
🙈 - Blinded (not seeing)
💜 - Charmed (heart/attraction)
🔇 - Deafened (muted speaker)
😨 - Frightened (fear)
🔗 - Grappled (chain/binding)
😵 - Incapacitated (dazed)
👻 - Invisible (ghost)
🪨 - Paralyzed (frozen)
💚 - Poisoned (toxic/green)
⬇️  - Prone (down)
⭐ - Stunned (stars/dazed)
😴 - Unconscious (sleeping)
✨ - Inspiration (magic/sparkle)
⬆️  - Advantage (up arrow)
⬇️  - Disadvantage (down arrow)
🎯 - Concentration (focus)
🔗 - Restrained (bound)
👁️  - Hidden (eye)
🎲 - Turn (dice/action)
```

---

## 🎴 Card Format Standards

### All Printable Cards (63.5mm × 88.9mm — Playing Card Ratio)

**Header Band:**
- Icon: 20pt emoji, semi-transparent background hint
- Title: 11pt 'Fredoka One' font, white text, black text shadow
- Background: CSS variable `--cc` (color by category)

**Body:**
- Padding: 2mm 3mm 2.5mm
- Explanation: 9pt 'Fredoka One', dashed separator
- Details: 8pt bold, labeled with emoji prefix
- Draw box: 2px dashed border, semi-transparent background

**Footer:**
- 6.5pt uppercase text, centered
- Background: Same as header (`--cc`)
- Format: "Category · Subcategory"

**Custom Charge Tracking:**
- Inline with label
- Small circles (6mm diameter)
- White with 1.5px border
- Interactive hover effect
- Gap: 2mm between circles

---

## 🖨️ Print Settings

### Standard Setup
- **Size:** A4 (210mm × 297mm)
- **Margins:** 0mm (full bleed)
- **Color Mode:** Exact color (force print color)
- **Orientation:** Portrait

### Card Specifications for Printable Documents
- Grid: 3 columns of cards
- Gap: 3mm between cards
- Auto print-color adjustment enabled

### Character Sheet
- Single page A4
- Full-page format
- Exact colors preserved

---

## 🎨 Design Principles

### Consistency
- Same fonts across all documents: **Fredoka One** (titles), **Nunito** (body)
- Unified parchment aesthetic with brown borders
- Card-based layout for all game materials

### Accessibility
- High contrast text (dark ink on light parchment)
- Color-coding combined with text labels
- Emoji labels for quick visual scanning
- Large fonts for printability

### Interactivity
- Spell slot circles are clickable (stored in localStorage)
- Charge circles support hover effects
- Designed for both digital viewing and printing

---

## 📏 Typography

### Font Family
- **Headers/Titles:** 'Fredoka One' (cursive, decorative)
- **Body Text:** 'Nunito' (sans-serif, 600-800 weight)
- **Sizes:**
  - Page title: 20-22pt
  - Card titles: 11pt
  - Ability names: 7.5pt
  - Details: 8pt
  - Small labels: 6-6.5pt

---

## 🔄 Responsive Layout Notes

- No responsive breakpoints (optimised for print/A4)
- Flexbox and CSS Grid for card layouts
- Fixed dimensions for cards and pages
- Print-specific styles with `@media print`

