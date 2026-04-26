(function(window, document) {
  /**
   * PageShell: Production-grade page layout builder with design-aware markup
   * 
   * Features:
   * - Configuration-driven layout generation
   * - Semantic HTML with ARIA support
   * - Animation-ready data attributes
   * - CSS custom property hooks for theming
   * - Support for responsive split layouts and resizable panes
   */

  /**
   * Create DOM element with design-aware attributes
   * @param {string} tagName - HTML tag
   * @param {string} className - CSS classes
   * @param {Object} attrs - Attributes (textContent, innerHTML, data-*, etc.)
   * @returns {HTMLElement}
   */
  function createElement(tagName, className, attrs = {}) {
    const el = document.createElement(tagName);
    if (className) {
      el.className = className;
    }
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (key === 'textContent') {
        el.textContent = String(value);
      } else if (key === 'innerHTML') {
        el.innerHTML = String(value);
      } else {
        el.setAttribute(key, String(value));
      }
    }
    return el;
  }

  function createSearchControl(item) {
    const field = createElement('label', 'search-field', { 'data-animation': 'slide-in' });
    const label = createElement('span', 'search-label', { textContent: item.label || 'Search' });
    const input = createElement('input', 'search-input', {
      id: item.id,
      type: 'search',
      placeholder: item.placeholder || '',
      autocomplete: item.autocomplete || 'off',
      'aria-label': item.label || 'Search'
    });
    field.appendChild(label);
    field.appendChild(input);
    return field;
  }

  function createMetaControl(item) {
    const span = createElement('div', item.className || 'page-meta', {
      id: item.id,
      textContent: item.text || '',
      'data-animation': 'fade-in',
      'role': 'status',
      'aria-live': 'polite'
    });
    return span;
  }

  function createButtonControl(item) {
    const button = createElement('button', item.className || 'button', {
      id: item.id,
      type: 'button',
      textContent: item.text || 'Action',
      'data-animation': 'scale-in',
      'data-interactive': 'true'
    });
    if (item.title) {
      button.title = item.title;
    }
    if (item.ariaLabel) {
      button.setAttribute('aria-label', item.ariaLabel);
    }
    return button;
  }

  function createToolbarItem(item) {
    switch (item.type) {
      case 'search':
        return createSearchControl(item);
      case 'meta':
        return createMetaControl(item);
      case 'button':
        return createButtonControl(item);
      case 'html':
        return createElement('div', item.className || '', { innerHTML: item.html || '' });
      default:
        return createElement('div', item.className || '', { textContent: item.text || '' });
    }
  }

  function buildTopbar(config) {
    const topbar = createElement('div', `page-topbar ${config.topbarClass || ''}`.trim(), {
      'data-animation': 'slide-down'
    });

    const titleRow = createElement('div', 'page-title-row');
    const titleGroup = createElement('div', 'title-group');
    titleGroup.appendChild(createElement('h1', 'page-title', { 
      textContent: config.pageTitle || '',
      'data-animation': 'fade-in-down'
    }));
    if (config.pageSubtitle) {
      titleGroup.appendChild(createElement('p', 'page-subtitle', { 
        textContent: config.pageSubtitle,
        'data-animation': 'fade-in-down',
        'data-animation-delay': '0.1s'
      }));
    }
    titleRow.appendChild(titleGroup);

    if (config.backLink) {
      const backLink = createElement('a', config.backLinkClass || 'back-link', {
        href: config.backLink,
        textContent: config.backLinkText || '← Back',
        'data-animation': 'slide-in-right',
        'aria-label': 'Navigate back'
      });
      titleRow.appendChild(backLink);
    }

    topbar.appendChild(titleRow);

    // Toolbar with semantic structure
    const toolbar = createElement('div', `page-toolbar ${config.toolbarClass || ''}`.trim(), {
      'role': 'toolbar',
      'aria-label': 'Page controls'
    });
    if (Array.isArray(config.toolbarItems)) {
      config.toolbarItems.forEach((item, index) => {
        const control = createToolbarItem(item);
        if (control) {
          // Add staggered animation delay for toolbar items
          control.setAttribute('data-animation-delay', `${index * 0.05}s`);
          toolbar.appendChild(control);
        }
      });
    }

    topbar.appendChild(toolbar);
    return topbar;
  }

  function createSidebar(config) {
    const sidebar = createElement('aside', `page-sidebar ${config.className || ''}`.trim(), {
      id: config.id || 'page-sidebar',
      'data-animation': 'slide-in-right',
      'role': 'complementary',
      'aria-label': config.title || 'Sidebar'
    });

    if (config.title) {
      sidebar.appendChild(createElement('h3', 'sidebar-title', { 
        textContent: config.title,
        'data-animation': 'fade-in'
      }));
    }

    const container = createElement('div', config.containerClass || 'viewer-sidebar');
    if (Array.isArray(config.items)) {
      config.items.forEach((item, index) => {
        const control = createToolbarItem(item);
        if (control) {
          control.setAttribute('data-animation-delay', `${index * 0.05}s`);
          container.appendChild(control);
        }
      });
    }

    sidebar.appendChild(container);
    return sidebar;
  }

  function createPaneHeader(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }
    const header = createElement('div', 'pane-header', {
      'role': 'toolbar',
      'aria-label': 'Pane controls'
    });
    items.forEach((item, index) => {
      const control = createToolbarItem(item);
      if (control) {
        control.setAttribute('data-animation-delay', `${index * 0.05}s`);
        header.appendChild(control);
      }
    });
    return header;
  }

  function buildBody(config) {
    const pageBody = createElement('div', `page-body ${config.bodyClass || ''}`.trim());
    if (config.resizablePane || config.layoutType === 'split') {
      pageBody.classList.add('page-pane-layout');
    }

    // Left pane (list/navigation)
    const leftPane = createElement('div', `page-pane left-pane ${config.leftPaneClass || ''}`.trim(), {
      'data-pane': 'list',
      'data-animation': 'slide-in-left'
    });
    const leftHeader = createPaneHeader(config.leftPaneHeaderItems || config.listHeaderItems);
    if (leftHeader) {
      leftPane.appendChild(leftHeader);
    }
    const listSection = createElement('div', config.listSection.className || 'list-section', {
      id: config.listSection.id || 'list-section',
      'role': 'region',
      'aria-label': 'List'
    });
    leftPane.appendChild(listSection);

    // Main pane (detail/content)
    const mainPane = createElement('main', `page-main ${config.mainPaneClass || ''}`.trim(), {
      'data-pane': 'detail',
      'data-animation': 'fade-in'
    });
    const mainHeader = createPaneHeader(config.mainHeaderItems);
    if (mainHeader) {
      mainPane.appendChild(mainHeader);
    }

    const detailSection = createElement('div', config.detailSection.className || 'detail-section', {
      id: config.detailSection.id || 'detail-section',
      'role': 'region',
      'aria-label': 'Detail view',
      'aria-live': 'polite'
    });
    if (config.detailSection.placeholder) {
      const placeholderClass = config.detailSection.placeholderClass || 'detail-placeholder';
      detailSection.appendChild(createElement('div', placeholderClass, { 
        textContent: config.detailSection.placeholder,
        'data-animation': 'fade-in',
        'role': 'status'
      }));
    }
    mainPane.appendChild(detailSection);

    pageBody.appendChild(leftPane);
    
    // Resize handle with animation
    if (config.resizablePane) {
      pageBody.appendChild(createElement('div', 'resize-handle', {
        'data-interactive': 'true',
        'aria-label': 'Resize panes',
        'role': 'separator',
        'aria-orientation': 'vertical'
      }));
    }
    
    pageBody.appendChild(mainPane);

    if (config.sidebar) {
      pageBody.appendChild(createSidebar(config.sidebar));
    }

    return pageBody;
  }

  function initPageShell(config) {
    const pageConfig = Object.assign({}, config || {});
    const rootId = pageConfig.rootId || 'page-root';
    const root = document.getElementById(rootId);
    if (!root) {
      console.warn(`PageShell: root element not found: ${rootId}`);
      return null;
    }

    const shell = createElement('div', `page-shell ${pageConfig.pageClass || ''}`.trim(), {
      'data-animation': 'page-load',
      'data-page': pageConfig.pageTitle ? pageConfig.pageTitle.toLowerCase().replace(/\s+/g, '-') : 'page'
    });
    shell.appendChild(buildTopbar(pageConfig));
    shell.appendChild(buildBody(pageConfig));

    root.innerHTML = '';
    root.appendChild(shell);

    return {
      root,
      shell,
      listEl: shell.querySelector(`#${pageConfig.listSection?.id}`),
      detailEl: shell.querySelector(`#${pageConfig.detailSection?.id}`),
      /**
       * Get element by ID within shell scope
       * @param {string} id - Element ID
       * @returns {HTMLElement|null}
       */
      getElement(id) {
        return shell.querySelector(`#${id}`);
      },
      /**
       * Query element within shell scope
       * @param {string} selector - CSS selector
       * @returns {HTMLElement|null}
       */
      querySelector(selector) {
        return shell.querySelector(selector);
      }
    };
  }

  window.PageShell = window.PageShell || {};
  window.PageShell.initPageShell = initPageShell;
})(window, document);
