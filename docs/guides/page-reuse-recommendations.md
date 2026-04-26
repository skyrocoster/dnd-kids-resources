# Page Reuse & Shared Structure Recommendations

This guide explains the shared UI layout shell, reusable CSS/JS modules, and migration plan for aligning all pages to the current two-pane pattern. See docs/README.md for the full documentation index.


## Overview

The repository now has a reusable page shell pattern centered on the `dungeons-library` layout. A shared layout stylesheet and a shared pane resize module are in place, so new pages can use the same two-pane shell and avoid duplicated HTML/CSS/JS.

This document describes what is implemented, what is reusable today, and the concrete plan to migrate the rest of the pages.

## What is implemented

- Shared layout CSS is centralized in `css/page-layout.css`.
- Shared helper modules have been added:
  - `js/api.js`
  - `js/dom-utils.js`
  - `js/data-utils.js`
  - `js/page-base.js`
  - `js/pane-resize.js`
- `js/pane-resize.js` now manages the draggable left-panel resize behaviour used by both `dungeons-library` and `monster-book`.
- `pages/monster-book.html` has been converted to use the same shell structure and shared CSS as `dungeons-library`.
- `pages/dungeons-library.html` now uses shared CSS and the shared resize module instead of page-specific resize code.

## Reuse opportunities

### Shared layout shell

The reusable shell is now:

- `#viewerView` with class `dungeon-viewer-layout active`
- `#mapPanel` with class `map-panel`
- `#resizeHandle` inside the left panel
- `.dungeon-viewer-right` on the right panel
- `.viewer-controls` for the top toolbar row
- `.dungeon-content` for the scrollable detail area

This creates a consistent page structure for:

- left-side navigation/list/filter panel
- right-side main content/detail panel
- drag-resizable panel width

### Shared CSS

`css/page-layout.css` now contains the shared shell and panel styles for:

- fixed full-screen viewer layout
- dark/light mode compatibility for shared viewers
- reusable panel and card styling
- search control formatting
- toolbar spacing and layout
- placeholder/empty state styling

Pages should keep only page-specific visual overrides in their own `<style>` blocks.

### Shared JS helpers

The helper modules already support the common page logic:

- `js/api.js` for API fetch abstraction
- `js/dom-utils.js` for DOM utilities and element creation helpers
- `js/data-utils.js` for parsing and normalizing data
- `js/page-base.js` for page lifecycle helpers
- `js/pane-resize.js` for the shared left-panel resize behaviour

This means page scripts can focus on page content and behavior rather than plumbing.

## Current status

### Shared infrastructure done

- `css/page-layout.css` is in place and being used by:
  - `pages/dungeons-library.html`
  - `pages/monster-book.html`
  - `pages/npc-editor.html`
  - `pages/monster-detail.html`
  - `pages/player-characters.html`
  - `pages/quest-book.html`
  - `pages/spell-book.html`
  - `pages/spell-cards-list.html`
  - `pages/spell-detail.html`
  - `pages/weapons-book.html`

- `js/pane-resize.js` is now the single source of truth for draggable panel resizing.

- `pages/monster-book.html` now shares the same two-pane viewer shell as `dungeons-library`.

- `pages/dungeons-library.html` has been cleaned up to remove duplicate shell CSS and inline resize logic.

### Shared helpers consumed

The following pages already import the shared JS modules:

- `pages/monster-book.html`
- `pages/quest-book.html`
- `pages/weapons-book.html`
- `pages/player-characters.html`
- `pages/spell-book.html`

## Reusable pattern for new pages

When creating a new page, use this pattern:

1. Import shared styles:
   - `css/styles.css`
   - `css/page-layout.css`
2. Use the shared shell structure:
   - `<div id="viewerView" class="dungeon-viewer-layout active">`
   - `<div id="mapPanel" class="map-panel">`
   - `<div id="resizeHandle" class="resize-handle"></div>`
   - `<div class="dungeon-viewer-right">`
   - `<div class="viewer-controls">...</div>`
   - `<div class="dungeon-content">...</div>`
3. Import shared JS modules and `js/pane-resize.js`.
4. Initialize the resize module with a page-unique prefix:

```html
<script src="../js/pane-resize.js"></script>
<script>
  var _pane = PaneResize.init({
    storagePrefix: 'monsterListPanel',
    defaultWidth: 350,
    minWidth: 260,
    maxWidthFraction: 0.6,
    collapseThreshold: 200,
    showBtnId: 'showListPanelBtn'
  });
  function expandListPanel() { _pane.expand(); }
</script>
```

5. Keep all page-specific DOM IDs and event wiring inside the page script.

## Shared sidebar component: viewer-sidebar

The `.viewer-sidebar` is a reusable styled panel component for the left pane of a dungeon-viewer-layout. It creates a cohesive control panel with sections for primary controls and collapsible tool actions.

### Usage pattern

Use `.viewer-sidebar` inside `#mapPanel`:

```html
<div id="mapPanel" class="map-panel">
  <div id="resizeHandle" class="resize-handle"></div>
  <div class="viewer-sidebar">
    <!-- Primary controls section -->
    <h3>Controls</h3>
    <div class="panel-section">
      <!-- Player selector, search input, etc. -->
    </div>
    
    <!-- Collapsible tools section -->
    <div class="action-panel-wrapper">
      <h3>Tools</h3>
      <button id="toolsToggle" class="tools-toggle">⚙️ Tools</button>
    </div>
    <div class="action-panel collapsed" id="toolsPanel">
      <button class="toolbox-button">Action 1</button>
      <button class="toolbox-button">Action 2</button>
    </div>
  </div>
</div>
```

### Styling

The `.viewer-sidebar` provides:
- White background with subtle border and shadow
- Consistent padding (18px)
- Rounded corners (18px)
- Built-in spacing for child elements
- Shared heading styles (`h3`)

### Components inside viewer-sidebar

- **`.panel-section`**: Groups primary controls (selectors, search inputs, info displays). Define layout in your page-specific `<style>` block.
- **`.action-panel-wrapper`**: Header for tool actions with toggle button
- **`.action-panel`**: Grid of tool action buttons; add `.collapsed` to hide
- **`.toolbox-button`**: Style for action buttons inside the panel
- **`.tools-toggle`**: Toggle button to show/hide the action panel

### Page-specific customization

Each page should define `.panel-section` layout in its own `<style>` block:

```css
.viewer-sidebar .panel-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}
```

This keeps the shared CSS focused on the panel container itself while allowing pages to arrange their controls as needed.

### Example: spell-book left panel

See `pages/spell-book.html` for a complete example:
- "Spell controls" section with player selector + search
- "Tools" collapsible section with refill/toggle/clear buttons

## Transfer plan

### Phase 1: List/detail pages

These pages should be migrated first because they already share the same interaction model:

- `pages/monster-book.html` (already migrated)
- `pages/weapons-book.html`
- `pages/quest-book.html`
- `pages/player-characters.html`
- `pages/spell-book.html`
- `pages/spell-cards-list.html`

For each page:

1. Replace the current page wrapper with the shared `dungeon-viewer-layout` shell.
2. Move page-specific shell CSS into `css/page-layout.css` or remove it if it is already generic.
3. Add `js/pane-resize.js` and initialize it with a unique `storagePrefix`.
4. Keep page-specific list/detail rendering logic in the page JS.

### Phase 2: Utility pages and editors

After the core list/detail pages are migrated, move the remaining chrome-heavy pages:

- `pages/resources.html`
- `pages/npc-editor.html`
- `pages/monster-detail.html`
- `pages/dungeons-library.html` (already aligned)

These pages can also share the same shell if they need the two-pane viewer pattern.
If a page does not need a resizable panel, it should still import the shared CSS and use the same topbar/panel conventions.

### Phase 3: Shared shell builder

Once several pages use the same structure, extract the repeated shell HTML into a shared builder module or template fragment.

Possible implementations:

- `js/page-shell.js` / `js/page-layout-shell.js` that builds the shell from config
- Flask/Jinja partials for common `<head>`, header, and viewer layout structure

The goal is to stop copying the same shell markup between pages and make new pages one config object plus page-specific content.

## Recommended next targets

1. Finish shell migration for list/detail pages:
   - `pages/weapons-book.html`
   - `pages/quest-book.html`
   - `pages/player-characters.html`
   - `pages/spell-book.html`
   - `pages/spell-cards-list.html`
2. Migrate `pages/resources.html` as the next shared-page candidate.
3. Remove any remaining inline `resize` scripts and duplicated viewer CSS from migrated pages.
4. Consider adding a lightweight shell builder after the first 4–5 pages are aligned.

## Why this approach

- It preserves the exact `dungeons-library` layout as the reference design.
- It avoids duplicate resize code by centralizing it in `js/pane-resize.js`.
- It keeps shared styling in one place while allowing page-specific visual themes.
- It makes future pages easy to add using the same shell and a small page-specific script.
