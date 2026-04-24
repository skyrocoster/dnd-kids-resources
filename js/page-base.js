(function(window) {
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

    createPlaceholder(message, className = 'detail-placeholder') {
      const placeholder = document.createElement('div');
      placeholder.className = className;
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

    injectToolsPanel() {
      const mapPanel = document.querySelector('.map-panel');
      if (!mapPanel) return;

      // Don't inject if tools panel already exists
      if (document.getElementById('toolsPanel')) return;

      const toolsHTML = `
        <div class="viewer-sidebar tools-sidebar" id="toolsPanel">
          <div class="action-panel-wrapper">
            <h3>Tools</h3>
            <button id="actionPanelToggle" class="tools-toggle" type="button" aria-expanded="false" title="Toggle tools panel">⚙️ Tools</button>
          </div>
          <div class="action-panel collapsed" id="actionPanel"></div>
        </div>
      `;

      // Insert at the beginning of map-panel
      mapPanel.insertAdjacentHTML('afterbegin', toolsHTML);

      // Wire up toggle
      const toggle = document.getElementById('actionPanelToggle');
      const panel = document.getElementById('actionPanel');
      if (toggle && panel) {
        toggle.addEventListener('click', () => {
          const collapsed = panel.classList.toggle('collapsed');
          toggle.setAttribute('aria-expanded', String(!collapsed));
        });
      }
    },

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
      button.addEventListener('click', clickCallback);
      actionPanel.appendChild(button);
      return button;
    }
  };

  window.PageBase = window.PageBase || PageBase;
})(window);
