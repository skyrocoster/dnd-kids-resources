(function(window, document) {
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
    const field = createElement('label', 'search-field');
    const label = createElement('span', '', { textContent: item.label || 'Search' });
    const input = createElement('input', '', {
      id: item.id,
      type: 'search',
      placeholder: item.placeholder || '',
      autocomplete: item.autocomplete || 'off'
    });
    field.appendChild(label);
    field.appendChild(input);
    return field;
  }

  function createMetaControl(item) {
    const span = createElement('div', item.className || 'page-meta', {
      id: item.id,
      textContent: item.text || ''
    });
    return span;
  }

  function createButtonControl(item) {
    const button = createElement('button', item.className || 'button', {
      id: item.id,
      type: 'button',
      textContent: item.text || 'Action'
    });
    if (item.title) {
      button.title = item.title;
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
    const topbar = createElement('div', `page-topbar ${config.topbarClass || ''}`.trim());

    const titleRow = createElement('div', 'page-title-row');
    const titleGroup = createElement('div');
    titleGroup.appendChild(createElement('h1', 'page-title', { textContent: config.pageTitle || '' }));
    if (config.pageSubtitle) {
      titleGroup.appendChild(createElement('p', 'page-subtitle', { textContent: config.pageSubtitle }));
    }
    titleRow.appendChild(titleGroup);

    if (config.backLink) {
      const backLink = createElement('a', config.backLinkClass || 'back-link', {
        href: config.backLink,
        textContent: config.backLinkText || '← Back'
      });
      titleRow.appendChild(backLink);
    }

    topbar.appendChild(titleRow);

    const toolbar = createElement('div', `page-toolbar ${config.toolbarClass || ''}`.trim());
    if (Array.isArray(config.toolbarItems)) {
      config.toolbarItems.forEach(item => {
        const control = createToolbarItem(item);
        if (control) {
          toolbar.appendChild(control);
        }
      });
    }

    topbar.appendChild(toolbar);
    return topbar;
  }

  function createSidebar(config) {
    const sidebar = createElement('aside', `page-sidebar ${config.className || ''}`.trim(), {
      id: config.id || 'page-sidebar'
    });

    if (config.title) {
      sidebar.appendChild(createElement('h3', '', { textContent: config.title }));
    }

    const container = createElement('div', config.containerClass || 'viewer-sidebar');
    if (Array.isArray(config.items)) {
      config.items.forEach(item => {
        const control = createToolbarItem(item);
        if (control) {
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
    const header = createElement('div', 'pane-header');
    items.forEach(item => {
      const control = createToolbarItem(item);
      if (control) {
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

    const leftPane = createElement('div', `page-pane left-pane ${config.leftPaneClass || ''}`.trim());
    const leftHeader = createPaneHeader(config.leftPaneHeaderItems || config.listHeaderItems);
    if (leftHeader) {
      leftPane.appendChild(leftHeader);
    }
    const listSection = createElement('div', config.listSection.className || 'list-section', {
      id: config.listSection.id || 'list-section'
    });
    leftPane.appendChild(listSection);

    const mainPane = createElement('main', `page-main ${config.mainPaneClass || ''}`.trim());
    const mainHeader = createPaneHeader(config.mainHeaderItems);
    if (mainHeader) {
      mainPane.appendChild(mainHeader);
    }

    const detailSection = createElement('div', config.detailSection.className || 'detail-section', {
      id: config.detailSection.id || 'detail-section'
    });
    if (config.detailSection.placeholder) {
      const placeholderClass = config.detailSection.placeholderClass || 'detail-placeholder';
      detailSection.appendChild(createElement('div', placeholderClass, { textContent: config.detailSection.placeholder }));
    }
    mainPane.appendChild(detailSection);

    pageBody.appendChild(leftPane);
    if (config.resizablePane) {
      pageBody.appendChild(createElement('div', 'resize-handle'));
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

    const shell = createElement('div', `page-shell ${pageConfig.pageClass || ''}`.trim());
    shell.appendChild(buildTopbar(pageConfig));
    shell.appendChild(buildBody(pageConfig));

    root.innerHTML = '';
    root.appendChild(shell);

    return {
      root,
      shell,
      listEl: shell.querySelector(`#${pageConfig.listSection?.id}`),
      detailEl: shell.querySelector(`#${pageConfig.detailSection?.id}`),
      getElement(id) {
        return shell.querySelector(`#${id}`);
      }
    };
  }

  window.PageShell = window.PageShell || {};
  window.PageShell.initPageShell = initPageShell;
})(window, document);
