(function(window) {
  function parseJsonValue(value) {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        return value;
      }
    }

    return value;
  }

  function formatDisplayValue(value) {
    const parsed = parseJsonValue(value);
    if (Array.isArray(parsed)) {
      return parsed.map(item => formatDisplayValue(item)).filter(Boolean).join(', ');
    }
    if (parsed && typeof parsed === 'object') {
      if (parsed.name) {
        return String(parsed.name);
      }
      return Object.entries(parsed)
        .filter(([_, item]) => item != null && item !== '')
        .map(([key, item]) => {
          const formatted = formatDisplayValue(item);
          return formatted ? `${key}: ${formatted}` : '';
        })
        .filter(Boolean)
        .join(', ');
    }
    return String(parsed || '');
  }

  function normalizeSearchText(value) {
    if (value == null) {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  window.DataUtils = window.DataUtils || {};
  Object.assign(window.DataUtils, {
    parseJsonValue,
    formatDisplayValue,
    normalizeSearchText,
    getQueryParam
  });
})(window);
