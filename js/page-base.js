/**
 * PageBase: Modern UI utility library for reusable, accessible, and animated web interfaces
 *
 * Features:
 * - DOM query/manipulation helpers
 * - Animation/data-animation hooks
 * - Placeholder/empty state helpers
 * - Theming and ARIA helpers
 * - Clean, maintainable, and documented APIs
 *
 * API:
 *   PageBase.onReady(callback)
 *   PageBase.getElement(id)
 *   PageBase.query(selector)
 *   PageBase.clearElement(element)
 *   PageBase.createPlaceholder(message, className)
 *   PageBase.showEmptyState(target, message, className)
 *   PageBase.setTheme(themeName)
 *   PageBase.setAria(element, attrs)
 *   PageBase.animate(element, animationName, cb)
 *   PageBase.initializeViewerPane(pageName, overrides)
 *   PageBase.autoInitializeViewerPane(pageName, overrides)
 *   PageBase.injectToolsPanel()
 *   PageBase.addToolButton(buttonText, buttonId, clickCallback)
 */
(function(window) {
  const PageBase = {
    /**
     * Run callback on DOMContentLoaded
     */
    onReady(callback) {
      if (typeof callback === 'function') {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', callback);
        } else {
          callback();
        }
      }
    },

    /**
     * Get element by ID
     */
    getElement(id) {
      return document.getElementById(id);
    },

    /**
     * Query selector
     */
    query(selector) {
      return document.querySelector(selector);
    },

    /**
     * Remove all children from element
     */
    clearElement(element) {
      if (element) element.innerHTML = '';
    },

    /**
     * Create a placeholder/empty state element with animation and ARIA
     */
    createPlaceholder(message, className = 'detail-placeholder') {
      const placeholder = document.createElement('div');
      placeholder.className = className;
      placeholder.setAttribute('role', 'status');
      placeholder.setAttribute('aria-live', 'polite');
      placeholder.setAttribute('data-animation', 'fade-in');
      placeholder.textContent = String(message);
      return placeholder;
    },

    /**
     * Show an empty state/placeholder in a target element
     */
    showEmptyState(target, message = 'No data', className = 'empty-state') {
      if (!target) return;
      this.clearElement(target);
      target.appendChild(this.createPlaceholder(message, className));
    },

    /**
     * Set a theme by adding a class to <body> and updating CSS variables
     */
    setTheme(themeName) {
      document.body.classList.forEach(cls => {
        if (cls.startsWith('theme-')) document.body.classList.remove(cls);
      });
      document.body.classList.add('theme-' + themeName);
      // Optionally update CSS variables here
    },

    /**
     * Set ARIA attributes on an element
     */
    setAria(element, attrs = {}) {
      if (!element) return;
      Object.entries(attrs).forEach(([k, v]) => {
        element.setAttribute('aria-' + k, v);
      });
    },

    /**
     * Animate an element by setting data-animation and listening for animationend
     */
    animate(element, animationName, cb) {
      if (!element) return;
      element.setAttribute('data-animation', animationName);
      const handler = () => {
        element.removeEventListener('animationend', handler);
        if (typeof cb === 'function') cb();
      };
      element.addEventListener('animationend', handler);
    },

    initializeViewerPane(pageName, overrides = {}) {
      if (typeof PaneResize === 'undefined') {
        console.warn('PaneResize not loaded');
        return null;
      }
      const defaults = {
        storagePrefix: pageName + 'Panel',
        defaultWidth: 500,
        minWidth: 200,
        maxWidthFraction: 0.5,
        collapseThreshold: 150,
        showBtnId: 'showListPanelBtn'
      };
      const config = { ...defaults, ...overrides };
      const pane = PaneResize.init(config);
      window.expandListPanel = () => pane.expand();
      return pane;
    },

    autoInitializeViewerPane(pageName, overrides = {}) {
      if (document.querySelector('.dungeon-viewer-layout')) {
        this.initializeViewerPane(pageName, overrides);
        this.injectToolsPanel();
      }
    },

    /**
     * Inject tools panel with animation-ready markup
     * Supports collapsible state with smooth transitions
     */
    injectToolsPanel() {
      const mapPanel = document.querySelector('.map-panel');
      if (!mapPanel) return;

      // Don't inject if tools panel already exists
      if (document.getElementById('toolsPanel')) return;

      const toolsHTML = `
        <div class="viewer-sidebar tools-sidebar" id="toolsPanel" data-animation="slide-in-left">
          <div class="action-panel-wrapper">
            <h3 class="tools-title">Tools</h3>
            <button 
              id="actionPanelToggle" 
              class="tools-toggle" 
              type="button" 
              aria-expanded="false" 
              aria-controls="actionPanel"
              title="Toggle tools panel"
              data-animation="scale-in">⚙️ Tools</button>
          </div>
          <div class="action-panel collapsed" id="actionPanel" role="region" aria-label="Tools panel"></div>
        </div>
      `;

      // Insert at the beginning of map-panel
      mapPanel.insertAdjacentHTML('afterbegin', toolsHTML);

      // Wire up toggle with animation support
      const toggle = document.getElementById('actionPanelToggle');
      const panel = document.getElementById('actionPanel');
      if (toggle && panel) {
        toggle.addEventListener('click', () => {
          const isCollapsed = panel.classList.contains('collapsed');
          panel.classList.toggle('collapsed');
          toggle.setAttribute('aria-expanded', String(isCollapsed));
          // Signal to CSS that animation should play
          panel.setAttribute('data-animation-state', isCollapsed ? 'expanding' : 'collapsing');
        });
      }
    },

    /**
     * Add a tool button with design-aware markup
     * @param {string} buttonText - Button label
     * @param {string} buttonId - Button ID for styling/selection
     * @param {Function} clickCallback - Click handler
     * @returns {HTMLElement} Button element
     */
    addToolButton(buttonText, buttonId, clickCallback) {
      const actionPanel = document.getElementById('actionPanel');
      if (!actionPanel) {
        console.warn('Tools panel not found');
        return null;
      }

      const button = document.createElement('button');
      button.id = buttonId;
      button.className = 'toolbox-button';
      button.type = 'button';
      button.textContent = buttonText;
      button.setAttribute('data-animation', 'fade-in-up');
      button.addEventListener('click', clickCallback);
      actionPanel.appendChild(button);
      return button;
    }
  };

  window.PageBase = window.PageBase || PageBase;
})(window);

/**
 * API Documentation:
 *
 * - onReady(callback): Run callback on DOMContentLoaded or immediately if already loaded.
 * - getElement(id): Get element by ID.
 * - query(selector): Query selector.
 * - clearElement(element): Remove all children from element.
 * - createPlaceholder(message, className): Create a placeholder/empty state element.
 * - showEmptyState(target, message, className): Show an empty state in a target element.
 * - setTheme(themeName): Set a theme by adding a class to <body>.
 * - setAria(element, attrs): Set ARIA attributes on an element.
 * - animate(element, animationName, cb): Animate an element and run callback on animation end.
 * - initializeViewerPane(pageName, overrides): Initialize a resizable viewer pane.
 * - autoInitializeViewerPane(pageName, overrides): Auto-initialize viewer pane if layout exists.
 * - injectToolsPanel(): Inject tools panel with animation-ready markup.
 * - addToolButton(buttonText, buttonId, clickCallback): Add a tool button to the tools panel.
 */
