# CSS Theming Guide: D&D Kids Resources

## Overview

This project uses a **dual-theme CSS architecture** with two distinct color systems:

1. **Material 3 Dark Mode** (Primary theme for most pages)
2. **Custom Warm Theme** (Legacy/special-purpose, used selectively)

Understanding which theme to use is critical for visual consistency across the application.

---

## Theme Systems

### 1. Material 3 Dark Mode (Primary Theme)

**Files:**
- `css/styles.css` - Defines Material 3 color system
- `css/page-layout.css` - Defines shared component styles using Material 3 colors

**Color Variables:**
```css
--md-sys-color-primary: #80CBC4 (Teal)
--md-sys-color-on-primary: #003632
--md-sys-color-background: #191C1C (Very Dark Gray)
--md-sys-color-on-background: #E0E3E2 (Light Gray)
--md-sys-color-surface: #191C1C (Dark Gray)
--md-sys-color-on-surface: #E0E3E2 (Light Gray)
--md-sys-color-surface-variant: #404947 (Medium Gray)
--md-sys-color-outline: #899391 (Border Gray)
--md-sys-color-error: #FFB4A9 (Light Red)
--md-sys-color-tertiary: #FFE082 (Amber)
```

**Usage:**
- All production pages should use this theme by default
- Provides dark mode viewing optimized for accessibility
- Semantic color roles for consistency
- Full Material Design 3 compliance

**Pages using Material 3:**
- `pages/encounter-editor.html` ✅
- `pages/spell-book.html` ✅ (after fix)
- `pages/monster-book.html` (verify)
- `pages/player-characters.html` (verify)
- `pages/resources.html` (verify)

---

### 2. Custom Warm Theme (Legacy/Special Purpose)

**Files:**
- `custom-overrides.css` - Defines warm brown/cream color system

**Color Variables:**
```css
--page-bg: #fdf3e3 (Cream)
--panel-bg: #fdf3e3 (Light Cream)
--panel-border: #8b5e3c (Brown)
--accent: #c0392b (Red)
--text-normal: #2c1810 (Dark Brown)
--text-muted: #8b5e3c (Medium Brown)
--font-family-base: 'Nunito', sans-serif
--font-family-title: 'Fredoka One', cursive
```

**Spell Level Colors (1-9):**
```css
--spell-level-1-color: #f39c12 (Orange)
--spell-level-2-color: #3498db (Blue)
--spell-level-3-color: #9b59b6 (Purple)
--spell-level-4-color: #1abc9c (Teal)
--spell-level-5-color: #2ecc71 (Green)
--spell-level-6-color: #f1c40f (Yellow)
--spell-level-7-color: #e67e22 (Orange-Red)
--spell-level-8-color: #95a5a6 (Gray)
--spell-level-9-color: #34495e (Dark Blue)
```

**Usage:**
- ⚠️ **DEPRECATED FOR NEW PAGES** - Do not use for new pages
- Only used where specifically required by design
- Creates visual contrast with Material 3 pages
- Was used during initial development

**Pages using Custom Warm Theme:**
- `pages/index.html` (home page - uses custom-overrides.css) ✓

---

## How to Add a New Page

### Step 1: Link Stylesheets (Template)

```html
<head>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@600;700;800&family=OpenDyslexic&display=swap" rel="stylesheet">
  
  <!-- Base Styles (ALWAYS REQUIRED) -->
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/page-layout.css">
  
  <!-- Optional: Page-specific CSS -->
  <link rel="stylesheet" href="../css/your-page-custom.css">
</head>
```

### Step 2: Use Material 3 Colors by Default

**✅ Correct - Uses Material 3:**
```css
.sidebar {
  background: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline);
  color: var(--md-sys-color-on-surface);
}
```

**❌ Wrong - Adds custom-overrides.css:**
```html
<link rel="stylesheet" href="../custom-overrides.css">  <!-- Don't add this! -->
```

### Step 3: Never Override Colors Unnecessarily

Only use hardcoded colors if there's no Material 3 equivalent:

**✅ Correct:**
```css
.button {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
```

**❌ Wrong:**
```css
.button {
  background: #80CBC4;  /* Hardcoded - not maintainable */
  color: #003632;
}
```

---

## Left Sidebar Styling

### Why Your Sidebars Matched

The **left sidebar (`.map-panel`)** is defined in `css/page-layout.css` line 725:

```css
.map-panel {
  background: var(--md-sys-color-surface);      /* Dark Gray */
  padding: 1.5rem;
  border-right: 1px solid var(--md-sys-color-outline);
  overflow-y: scroll;
  height: 100%;
}
```

**Key Points:**
1. This is a **shared component** used by all pages with `dungeon-viewer-layout`
2. It uses Material 3 colors by default (`--md-sys-color-surface`)
3. All pages using this layout will have **matching sidebars**
4. Adding `custom-overrides.css` would override these values globally

### Why They Weren't Matching (Previous Issue)

**Problem:** `spell-book.html` linked `custom-overrides.css` which redefined:
```css
:root {
  --md-sys-color-surface: #191C1C;  /* Original Material 3 */
  /* becomes overridden by custom-overrides styles */
  --page-bg: #fdf3e3;
  --panel-bg: #fdf3e3;
}
```

**Solution:** Remove `custom-overrides.css` link from `spell-book.html`

---

## Color Selection Logic

Use this flowchart to choose the right color variable:

```
┌─ What color do I need?
│
├─ Text on dark background?
│  └─ Use: var(--md-sys-color-on-surface)  ✅
│
├─ Container/panel background?
│  └─ Use: var(--md-sys-color-surface)  ✅
│
├─ Borders/dividers?
│  └─ Use: var(--md-sys-color-outline)  ✅
│
├─ Primary action button?
│  └─ Use: var(--md-sys-color-primary)  ✅
│
├─ Error/destructive action?
│  └─ Use: var(--md-sys-color-error)  ✅
│
├─ Spell level indicator (1-9)?
│  └─ Use: var(--spell-level-N-color) [from custom-overrides.css]
│     (Only if that feature is needed)
│
└─ Custom color not in Material 3?
   └─ Add new variable to css/page-layout.css (NOT custom-overrides.css)
      └─ Document why in comments
```

---

## File Organization

```
css/
├── styles.css                    ← Material 3 color system + base styles
├── page-layout.css               ← Shared component styles (uses Material 3)
├── spell-book-custom.css         ← Spell-book specific styles (Material 3)
├── [other-page]-custom.css       ← Page-specific styles as needed
└── (custom-overrides.css)        ← LEGACY - Used only by index.html

pages/
├── index.html                    ← Links custom-overrides.css (warm theme)
├── spell-book.html               ← Material 3 only
├── encounter-editor.html         ← Material 3 only
├── monster-book.html             ← Material 3 only
└── ...                           ← All others: Material 3 only
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Linking custom-overrides.css on Material 3 pages

```html
<!-- WRONG - Creates theme conflict -->
<link rel="stylesheet" href="../css/styles.css">
<link rel="stylesheet" href="../css/page-layout.css">
<link rel="stylesheet" href="../custom-overrides.css">  <!-- Don't add this! -->
```

**Impact:** Breaks left sidebar styling, creates visual inconsistency

**Fix:** Only link custom-overrides.css if you specifically want the warm theme (rare)

---

### ❌ Mistake 2: Hardcoding colors instead of using variables

```css
/* WRONG */
.card {
  background: #404947;
  border: 1px solid #899391;
  color: #E0E3E2;
}

/* CORRECT */
.card {
  background: var(--md-sys-color-surface-variant);
  border: 1px solid var(--md-sys-color-outline);
  color: var(--md-sys-color-on-surface);
}
```

**Impact:** Theme changes don't apply, maintenance nightmare

---

### ❌ Mistake 3: Using undefined or wrong variables

```css
/* WRONG - These don't exist */
color: var(--ink);
background: var(--panel-shadow);
border: var(--border);

/* CORRECT */
color: var(--md-sys-color-on-surface);
background: rgba(0, 0, 0, 0.15);
border: 1px solid var(--md-sys-color-outline);
```

**Impact:** CSS rendering failures, browser console errors

---

### ❌ Mistake 4: Page-specific overrides in page-layout.css

```css
/* WRONG - page-layout.css is shared */
.spell-book-custom-color {
  background: #fdf3e3;  /* Affects all pages */
}

/* CORRECT - Use page-specific stylesheet */
/* In css/spell-book-custom.css: */
.spell-book-custom-color {
  background: var(--md-sys-color-surface);
}
```

**Impact:** Unintended side effects on other pages

---

## Spell Level Bubbles: Special Case

The 9 spell level colors (1-9) are **Material 3-compatible** but defined in `custom-overrides.css` historically.

**Current Usage:**
- Available via Material 3 pages without including custom-overrides.css
- They're now in custom-overrides.css but should be migrated to css/spell-book-custom.css

**To Use Spell Level Colors:**
```css
/* Currently in custom-overrides.css */
.spell-level-bubble.level-1 {
  background: var(--spell-level-1-color);
}

/* Alternative: Use explicit hex values in spell-book-custom.css */
.spell-level-bubble.level-1 {
  background: #f39c12;
}
```

**Recommendation:** Define spell level colors directly in `css/spell-book-custom.css` to avoid custom-overrides.css dependency.

---

## Verification Checklist

When adding or modifying a page, verify:

- [ ] Page links only `css/styles.css` and `css/page-layout.css`
- [ ] Page does NOT link `custom-overrides.css` (unless home page)
- [ ] All colors use Material 3 variables (`--md-sys-color-*`)
- [ ] No hardcoded hex colors in CSS (except in comments or dynamic JS)
- [ ] Left sidebar uses Material 3 dark theme
- [ ] Text colors have sufficient contrast on Material 3 backgrounds
- [ ] Buttons/interactive elements use `--md-sys-color-primary` for primary actions
- [ ] Errors use `--md-sys-color-error`
- [ ] Page-specific styles are in a dedicated `[page-name]-custom.css` file
- [ ] Browser console shows no CSS variable errors

---

## Future Improvements

1. **Migrate spell level colors:** Move from custom-overrides.css to css/spell-book-custom.css
2. **Remove custom-overrides.css:** Once home page (index.html) is redesigned to use Material 3
3. **Add light mode support:** Use CSS media queries with Material 3 light mode variables
4. **Standardize component library:** Create reusable component CSS files (buttons, cards, forms, etc.)

---

## Quick Reference: Material 3 Variable Cheat Sheet

| Purpose | Variable |
|---------|----------|
| **Text** | |
| Primary text | `--md-sys-color-on-surface` |
| Muted/secondary text | `--md-sys-color-on-surface-variant` |
| Error text | `--md-sys-color-on-error` |
| **Backgrounds** | |
| Page background | `--md-sys-color-background` |
| Card/panel background | `--md-sys-color-surface` |
| Hover/elevated surface | `--md-sys-color-surface-variant` |
| **Borders/Dividers** | |
| Default borders | `--md-sys-color-outline` |
| **Interactive** | |
| Primary buttons | `--md-sys-color-primary` |
| Destructive/errors | `--md-sys-color-error` |
| Success/tertiary | `--md-sys-color-tertiary` |

---

## Questions?

Refer to:
- `css/styles.css` - Material 3 system definition (lines 1-57)
- `css/page-layout.css` - Component styles (lines 59+)
- Existing pages like `pages/encounter-editor.html` - Template for correct setup

