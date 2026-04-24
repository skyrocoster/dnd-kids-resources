(function(window) {
  const API_BASE = (window.location.protocol === 'file:' || !window.location.origin)
    ? 'http://127.0.0.1:8000'
    : '/api';

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Failed to load ${path} (${response.status})`);
    }
    return body;
  }

  window.ApiHelpers = window.ApiHelpers || {};
  window.ApiHelpers.API_BASE = API_BASE;
  window.ApiHelpers.apiFetch = apiFetch;
})(window);
