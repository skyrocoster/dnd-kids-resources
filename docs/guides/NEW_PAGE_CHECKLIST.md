# New Page Development Checklist

Use this checklist when creating a new page for the D&D Kids Resources application.

---

## Pre-Development

- [ ] Understand the page's purpose and content
- [ ] Read `CSS_THEMING_GUIDE.md` to understand theme systems
- [ ] Decide: Material 3 theme (recommended) or custom theme (rare)?
- [ ] Plan page layout: single column, two-pane viewer, or custom?

---

## HTML Setup

### Head Section

- [ ] Include meta tags for character set and viewport
- [ ] Set appropriate `<title>`
- [ ] Link Google Fonts (already loaded on all pages):
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@600;700;800&family=OpenDyslexic&display=swap" rel="stylesheet">
  ```
- [ ] Link required stylesheets **in this order:**
  ```html
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/page-layout.css">
  ```
- [ ] Link page-specific CSS (if needed):
  ```html
  <link rel="stylesheet" href="../css/[page-name]-custom.css">
  ```
- [ ] **⚠️ DO NOT link** `custom-overrides.css` (unless home page)

### Body Structure

- [ ] Add header with title and subtitle
- [ ] Choose layout pattern:
  - [ ] **Single column:** Use `.page-shell` + `.page-body`
  - [ ] **Two-pane viewer:** Use `.dungeon-viewer-layout`
  - [ ] **Custom layout:** Document reason in comments

### Two-Pane Viewer Setup (if applicable)

- [ ] Create `.dungeon-viewer-layout` container
- [ ] Add `.map-panel` for left sidebar (left panel)
- [ ] Add `.dungeon-viewer-right` for main content (right panel)
- [ ] Add `.viewer-controls` for toolbar
- [ ] Include `pane-resize.js` for resizable panels
- [ ] Include `page-base.js` and initialize with `PageBase.autoInitializeViewerPane()`

Example:
```html
<div class="dungeon-viewer-layout active">
  <div id="viewer-sidebar" class="map-panel">
    <!-- Left panel content -->
  </div>
  <div class="dungeon-viewer-right">
    <div class="viewer-controls">
      <!-- Toolbar -->
    </div>
    <div class="dungeon-content">
      <!-- Main content -->
    </div>
  </div>
</div>
```

---

## CSS Development

### Material 3 Theming (Recommended)

- [ ] Use Material 3 color variables exclusively:
  ```css
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline);
  ```

- [ ] Never hardcode colors:
  ```css
  /* ✅ Correct */
  background: var(--md-sys-color-primary);
  
  /* ❌ Wrong */
  background: #80CBC4;
  ```

- [ ] Use Material 3 variables for states:
  - Primary actions: `--md-sys-color-primary`
  - Errors: `--md-sys-color-error`
  - Borders: `--md-sys-color-outline`
  - Text: `--md-sys-color-on-surface`

### Custom Theming (Rare - Home Page Only)

- [ ] Only if explicitly approved
- [ ] Link `custom-overrides.css` after page-layout.css:
  ```html
  <link rel="stylesheet" href="../css/page-layout.css">
  <link rel="stylesheet" href="../custom-overrides.css">
  ```
- [ ] Document in page comments why custom theme is needed

### External CSS File

- [ ] Create `css/[page-name]-custom.css` for page-specific styles
- [ ] Keep inline `<style>` tag minimal (layout-specific only)
- [ ] Comment components in CSS file:
  ```css
  /* Component: Card Layout */
  .card { ... }
  
  /* Component: Button Styles */
  .button { ... }
  ```
- [ ] Use semantic class names
- [ ] Avoid page-specific hacks or over-specific selectors

---

## JavaScript Setup

### Required Scripts

- [ ] Include `js/dom-utils.js` (if using DOM manipulation)
- [ ] Include `js/page-base.js` (if using auto-pane initialization)
- [ ] Include `js/pane-resize.js` (if using two-pane layout)

### Optional Scripts

- [ ] `js/data-utils.js` (if fetching/processing data)
- [ ] `js/api.js` (if making API calls)
- [ ] `js/card-generator.js` (if generating cards dynamically)

### Initialization

- [ ] Initialize viewer pane (if using dungeon-viewer-layout):
  ```javascript
  PageBase.autoInitializeViewerPane('pageName', {
    defaultWidth: 300,
    minWidth: 200,
    maxWidthFraction: 0.5,
    collapseThreshold: 150
  });
  ```

---

## Accessibility & Semantics

- [ ] Use semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, etc.
- [ ] Add `aria-labels` to interactive elements
- [ ] Add `role` attributes where needed (buttons, toolbars, etc.)
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Verify color contrast (WCAG AA minimum)
- [ ] Include alt text for images

Example:
```html
<button aria-label="Add new encounter" role="button">+ New</button>
<input aria-label="Search encounters" placeholder="..." />
```

---

## Testing Checklist

### Visual Testing

- [ ] Page renders correctly on desktop (1920x1080)
- [ ] Page renders correctly on tablet (768x1024)
- [ ] Page renders correctly on mobile (375x667)
- [ ] Colors are consistent with Material 3 dark theme
- [ ] Text contrast is readable
- [ ] No visual glitches or overflow issues

### Browser Testing

- [ ] Firefox: No console errors
- [ ] Chrome: No console errors
- [ ] Edge: No console errors
- [ ] Safari (if available): No console errors

### CSS Validation

- [ ] No undefined CSS variables in console
- [ ] No hardcoded hex colors (except comments)
- [ ] Proper specificity (no !important needed)
- [ ] No unused CSS rules
- [ ] External CSS file is linked correctly

### Functionality Testing

- [ ] All interactive elements respond to clicks
- [ ] Forms submit correctly
- [ ] Modals/dialogs close properly
- [ ] Filters and searches work as expected
- [ ] Pane resizing works (if applicable)

---

## Documentation

- [ ] Add page description to `README.md`
- [ ] Document special features in comments
- [ ] Update `FILE_STRUCTURE.md` if adding new directory
- [ ] Add screenshot to `docs/` if desired
- [ ] Update navigation/routing if applicable

Example comment:
```javascript
/**
 * Encounter Editor Page
 * 
 * Allows users to create, edit, and manage combat encounters.
 * 
 * Key Features:
 * - Search and filter encounters
 * - Add/remove monsters from encounter
 * - Calculate encounter difficulty
 * - Export encounters as JSON
 * 
 * Layout: Two-pane viewer (left sidebar, main content)
 * Theme: Material 3 dark mode
 * Scripts: page-base.js, pane-resize.js, encounter-editor.js
 */
```

---

## Performance Checklist

- [ ] Minimize inline CSS (move to external files)
- [ ] Lazy load images if many are present
- [ ] Cache API responses where appropriate
- [ ] Use event delegation for dynamic content
- [ ] Avoid excessive DOM manipulation in loops
- [ ] Test performance on slow networks (DevTools throttling)

---

## Security Checklist

- [ ] Sanitize user input
- [ ] Prevent XSS attacks (escape HTML entities if rendering user content)
- [ ] Use HTTPS links only
- [ ] Don't hardcode sensitive data (API keys, etc.)
- [ ] Validate form inputs server-side (if applicable)

---

## Common Patterns to Reuse

### Left Sidebar (Viewer Sidebar)
```html
<div class="viewer-sidebar">
  <h3>Section Title</h3>
  <div class="panel-section">
    <!-- Search, filters, etc. -->
  </div>
</div>
```

### Search Field
```html
<label class="search-field" for="search-input">
  <span>Search [Items]</span>
  <input id="search-input" type="search" placeholder="..." autocomplete="off" />
</label>
```

### Filter Buttons
```html
<fieldset class="select-field">
  <legend>Filter by Level</legend>
  <div class="level-filter-row">
    <label class="level-filter">
      <input type="checkbox" value="1" checked> Level 1
    </label>
  </div>
</fieldset>
```

### Card Component
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
  </div>
  <div class="card-body">
    <!-- Card content -->
  </div>
</div>
```

### Action Buttons
```html
<div class="action-panel-row">
  <button class="toolbox-button">Action 1</button>
  <button class="toolbox-button">Action 2</button>
</div>
```

---

## Troubleshooting

### Left Sidebar Doesn't Match Other Pages
- [ ] Verify you're NOT linking `custom-overrides.css`
- [ ] Check that `.map-panel` inherits Material 3 colors
- [ ] Inspect element to see which CSS is applied
- [ ] Look for conflicting inline styles

### Text Not Readable
- [ ] Use `--md-sys-color-on-surface` for text on dark backgrounds
- [ ] Use `--md-sys-color-on-surface-variant` for secondary text
- [ ] Check contrast ratio (minimum WCAG AA)

### CSS Variables Not Applied
- [ ] Verify stylesheets are linked in correct order
- [ ] Check browser console for CSS variable errors
- [ ] Make sure variable name is spelled correctly
- [ ] Check for conflicting inline styles

### Pane Resizing Not Working
- [ ] Include `js/pane-resize.js` script
- [ ] Call `PageBase.autoInitializeViewerPane()` with correct ID
- [ ] Verify `.dungeon-viewer-layout` class is on container
- [ ] Check console for JavaScript errors

---

## Reference Links

- **CSS Theming Guide:** `docs/guides/CSS_THEMING_GUIDE.md`
- **Spell Book Migration:** `docs/guides/SPELL_BOOK_CSS_MIGRATION.md`
- **File Structure:** `docs/guides/FILE_STRUCTURE.md`
- **Example Page:** `pages/encounter-editor.html`
- **Material Design 3:** https://m3.material.io/

---

## Approval Before Publishing

- [ ] Code review completed (no hardcoded colors, proper semantics)
- [ ] Testing completed (desktop, tablet, mobile)
- [ ] Accessibility testing completed
- [ ] Documentation updated
- [ ] No console errors
- [ ] Staging environment deployment successful
- [ ] Ready for production deployment

