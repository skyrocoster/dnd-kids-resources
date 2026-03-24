# D&D Kids Resources - Copilot Instructions

Guidelines for working with the D&D card generation system.

## Documentation Reference

When helping with different tasks, consult these files:

| Task | Reference File |
|------|---|
| **Getting started, setup, printing** | [README.md](README.md) |
| **Adding new card types or features** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Color codes, hex values, CSS classes** | [COLORS.md](COLORS.md) |
| **System architecture, data flow, JavaScript modules** | [ARCHITECTURE.md](ARCHITECTURE.md) |
| **Navigation and doc overview** | [WORKSPACE_GUIDE.md](WORKSPACE_GUIDE.md) |

## Architecture Principles

**Data-Driven Card System:** JSON data → JavaScript rendering → CSS styling
- All card data lives in `data/` as normalized JSON
- Card rendering is centralized in `js/card-generator.js`
- Colors are CSS classes applied via `data.level` field
- All styles unified in `css/styles.css`

**File Organization:**
- `pages/` - HTML card templates (minimal—just load JS)
- `data/` - Card data only (no logic)
- `js/` - One initializer per card type + shared generator
- `css/` - All styling (print-optimized)

## Card Development Workflow

1. **Add card data** → Create JSON in `data/`
2. **Create page** → Copy template from `pages/` folder
3. **Create initializer** → Use template from [CONTRIBUTING.md](CONTRIBUTING.md)
4. **Link in homepage** → Add to `index.html` tools grid
5. **Test** → Check browser console for errors, verify print layout

## Color System

**Single source of truth:** [COLORS.md](COLORS.md)  
All 45+ color classes are documented there with hex codes and usage.

To use a color:
1. Set `data.level` to CSS class name (e.g., `"wizard"`, `"level1"`)
2. CSS automatically applies header + footer color
3. See COLORS.md for available colors

## Print Optimization

All cards are designed for:
- **A4 paper** (9 cards per page, 3×3 grid)
- **Playing card dimensions** (63.5mm × 88.9mm)
- **Exact color preservation** (CSS has `color-adjust: exact`)
- **@media print** rules handle breaks automatically

When debugging print issues, check:
- Page size is A4
- "Background graphics" enabled in print dialog
- Card doesn't span across pages (CSS prevents this)

## Common Tasks

**See [CONTRIBUTING.md](CONTRIBUTING.md) for:**
- Adding a new card type with step-by-step examples
- Card data format (JSON structure)
- HTML/JavaScript templates to copy

**See [ARCHITECTURE.md](ARCHITECTURE.md) for:**
- How the card-generator.js system works
- JavaScript module patterns
- NPC system implementation
- Deployment notes

## Key Files (Don't Modify Without Care)

- `js/card-generator.js` - Core rendering engine (used by all card types)
- `css/styles.css` - All styling (changes affect every card)
- `index.html` - Navigation hub

Adding new card types does NOT require modifying these files—only adding new JSON + initializer.

## Development Setup

```bash
# Local testing
python -m http.server 8000
# Visit http://localhost:8000

# VS Code: Install "Live Server" extension
# Right-click index.html → "Open with Live Server"
```

## Testing Checklist

- [ ] JSON is valid (test in browser console with JSON.parse)
- [ ] Page loads without console errors
- [ ] Cards render with correct colors
- [ ] Print preview shows 9 cards per page
- [ ] Colors accurate (compare with COLORS.md)
