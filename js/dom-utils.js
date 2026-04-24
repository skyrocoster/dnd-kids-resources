(function(window) {
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function createElementWithClass(tagName, className, attributes = {}) {
    const el = document.createElement(tagName);
    if (className) {
      el.className = className;
    }
    for (const [key, value] of Object.entries(attributes)) {
      if (value === null || value === undefined) continue;
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

  function createDetailRow(label, value, options = {}) {
    const row = createElementWithClass('div', 'detail-row');
    const labelEl = createElementWithClass('div', 'detail-label', { textContent: String(label) });
    const valueEl = createElementWithClass('div', 'detail-value', { textContent: value == null ? '' : String(value) });
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    if (options.className) {
      row.classList.add(options.className);
    }
    return row;
  }

  function createSectionPanel(title, items, options = {}) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    const panel = createElementWithClass('div', 'detail-panel');
    const heading = createElementWithClass('h2', '', { textContent: String(title) });
    panel.appendChild(heading);

    const itemRenderer = options.itemRenderer || function(item) {
      const itemEl = createElementWithClass('div', 'detail-item-text');
      itemEl.textContent = item == null ? '' : String(item);
      return itemEl;
    };

    items.forEach(item => {
      panel.appendChild(itemRenderer(item));
    });

    return panel;
  }

  function createPlaceholder(message, className = 'detail-placeholder') {
    return createElementWithClass('div', className, { textContent: String(message) });
  }

  window.DomUtils = window.DomUtils || {};
  Object.assign(window.DomUtils, {
    escapeHtml,
    createElementWithClass,
    createDetailRow,
    createSectionPanel,
    createPlaceholder
  });
})(window);
