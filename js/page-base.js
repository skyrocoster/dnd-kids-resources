(function(window) {
  /**
   * PageBase: Utility methods for DOM manipulation with design-aware enhancements
   * 
   * Features:
   * - DOM query and manipulation helpers
   * - Animation-ready element creation
   * - Viewer pane lifecycle management
   * - Design-aware markup with semantic structure
   * - Theming hooks via CSS custom properties
   */
  const PageBase = {
    onReady(callback) {
      if (typeof callback !== 'function') {
        return;
      }
      document.addEventListener('DOMContentLoaded', callback);
    },

    getElement(id) {
      return document.getElementById(id);
    },

    query(selector) {
      return document.querySelector(selector);
    },

    clearElement(element) {
      if (element) {
        element.innerHTML = '';
      }
    },

    /**
     * Create a placeholder element with animation-ready structure
     * @param {string} message - Placeholder text
     * @param {string} className - CSS class
     * @returns {HTMLElement} Placeholder div with animation hooks
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
