# Documentation Guide

**This page has been reorganized for clarity. See the appropriate guide below:**

---

## 📖 Documentation Files

### For End Users
👉 **[README.md](README.md)** — Start here!
- What this project is
- How to view and print cards
- Available tools and features
- Browser support and getting started

---

### For Developers

**New Feature? Need to add a card type?**
👉 **[CONTRIBUTING.md](CONTRIBUTING.md)**
- Step-by-step guide to adding new card sets
- Card data format specifications
- HTML/JS templates to copy
- Testing checklist

**Need to understand the system?**
👉 **[ARCHITECTURE.md](ARCHITECTURE.md)**
- How the card generation system works
- JavaScript module structure
- CSS styling and print optimization
- Data flow and deployment info
- Browser compatibility

**Looking for color codes?**
👉 **[COLORS.md](COLORS.md)**
- Card styling colors (headers, footers, backgrounds)
- CSS color classes for spells, conditions, weapons, NPCs
- Ability and damage type colors are now in the database (see ARCHITECTURE.md)

---

## 🚀 Quick Development Start

```bash
# View locally
python -m http.server 8000
# Then open http://localhost:8000
```

**To add cards:**
1. Create JSON in `data/`
2. Create HTML in `pages/`
3. Create JS in `js/` (copy template from CONTRIBUTING.md)
4. Add link to `index.html`

**To customize colors:**
- **Card styling colors:** See COLORS.md for CSS classes
- **Ability colors:** Update the `abilities` table in dnd_kids_resources.db
- **Damage type colors:** Update the `damage_types` table in dnd_kids_resources.db

---

## 📁 File Structure

```
.
├── index.html              # Landing page
├── README.md               # User guide ← START HERE
├── CONTRIBUTING.md         # Developer: Add features
├── ARCHITECTURE.md         # Developer: How it works
├── COLORS.md              # Developer: Color reference
│
├── pages/                  # HTML card pages
├── data/                   # JSON card data
├── js/                     # JavaScript modules
├── css/                    # Styling
├── assets/                 # Images and assets
└── _dev/                   # Development utilities
```

---

## ❓ FAQ

**Q: How do I print the cards?**  
A: See [README.md](README.md) — "Print Cards" section

**Q: Can I add my own cards?**  
A: Yes! See [CONTRIBUTING.md](CONTRIBUTING.md)

**Q: What colors should I use for my new card type?**  
A: Check [COLORS.md](COLORS.md) for available colors, or add a new one

**Q: How does the JavaScript work?**  
A: See [ARCHITECTURE.md](ARCHITECTURE.md) — "System Overview" section

**Q: Is this mobile-friendly?**  
A: Not yet — optimized for print on A4 paper. See ARCHITECTURE.md for future enhancements.

---

## 📚 Documentation Reorganization

The previous monolithic WORKSPACE_GUIDE.md has been split into focused, professional documentation:

| Old Content | New Location |
|---|---|
| Getting started | [README.md](README.md) |
| How to add cards | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Card format, templates | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Color palette | [COLORS.md](COLORS.md) |
| System architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| CSS classes | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Print settings | [ARCHITECTURE.md](ARCHITECTURE.md) + [README.md](README.md) |
| Navigation | This file (WORKSPACE_GUIDE.md) |

Each document now has a specific purpose and acts as a single source of truth for its content. This eliminates conflicts and redundancy found in the old documentation.

---

## 🔍 Improvements Made

✅ **Removed conflicts:** Outdated server.py references deleted  
✅ **Consolidated colors:** Single authoritative palette in COLORS.md  
✅ **Professional structure:** Separated user docs, developer docs, and architecture  
✅ **Single source of truth:** Each fact documented in only one place  
✅ **Clear navigation:** This file directs readers to the right guide  

---

**Last updated:** Professional documentation reorganization  
**Files created:** README.md, CONTRIBUTING.md, ARCHITECTURE.md, COLORS.md  
**Migration:** Complete — all information consolidated and conflicts resolved

