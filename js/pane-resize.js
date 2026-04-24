/**
 * pane-resize.js — Shared draggable left-panel resize behaviour.
 *
 * Usage:
 *   var pane = PaneResize.init({
 *     storagePrefix:     'myPage',       // drives localStorage keys (required)
 *     layoutId:          'viewerView',   // default: 'viewerView'
 *     panelId:           'mapPanel',     // default: 'mapPanel'
 *     handleId:          'resizeHandle', // default: 'resizeHandle'
 *     showBtnId:         'showPanelBtn', // optional — button shown when panel is collapsed
 *     defaultWidth:      350,            // px
 *     minWidth:          260,            // px
 *     maxWidthFraction:  0.6,            // fraction of window width
 *     collapseThreshold: 200             // px — drag below this to auto-collapse
 *   });
 *
 *   pane.expand();
 *   pane.collapse();
 *   pane.toggle();
 */
(function (window) {
  'use strict';

  function init(config) {
    var cfg = config || {};
    var layoutId          = cfg.layoutId          || 'viewerView';
    var panelId           = cfg.panelId           || 'mapPanel';
    var handleId          = cfg.handleId          || 'resizeHandle';
    var showBtnId         = cfg.showBtnId         || null;
    var storagePrefix     = cfg.storagePrefix      || null;
    var defaultWidth      = cfg.defaultWidth      != null ? cfg.defaultWidth      : 350;
    var minWidth          = cfg.minWidth          != null ? cfg.minWidth          : 260;
    var maxWidthFraction  = cfg.maxWidthFraction  != null ? cfg.maxWidthFraction  : 0.6;
    var collapseThreshold = cfg.collapseThreshold != null ? cfg.collapseThreshold : 200;

    // Public API object — methods are populated once the DOM is ready.
    var api = {
      expand:   function () {},
      collapse: function () {},
      toggle:   function () {}
    };

    function setup() {
      var layout  = document.getElementById(layoutId);
      var panel   = document.getElementById(panelId);
      var handle  = document.getElementById(handleId);
      var showBtn = showBtnId ? document.getElementById(showBtnId) : null;

      if (!layout || !panel || !handle) {
        console.warn('PaneResize: one or more elements not found (' + layoutId + ', ' + panelId + ', ' + handleId + ')');
        return;
      }

      var isResizing = false;

      function collapse() {
        layout.style.gridTemplateColumns = '0 1fr';
        panel.classList.add('collapsed');
        panel.style.width = '0';
        panel.style.minWidth = '0';
        document.body.style.cursor = '';
        if (showBtn) showBtn.classList.remove('hidden');
        if (storagePrefix) localStorage.setItem(storagePrefix + 'Collapsed', 'true');
      }

      function expand() {
        panel.classList.remove('collapsed');
        panel.style.width = '';
        panel.style.minWidth = '';
        var width = Math.min(Math.max(defaultWidth, minWidth), window.innerWidth * maxWidthFraction);
        layout.style.gridTemplateColumns = width + 'px 1fr';
        if (showBtn) showBtn.classList.add('hidden');
        if (storagePrefix) localStorage.setItem(storagePrefix + 'Collapsed', 'false');
      }

      function toggle() {
        if (panel.classList.contains('collapsed')) {
          expand();
        } else {
          collapse();
        }
      }

      function startResize(e) {
        isResizing = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        if (e.pointerId != null) handle.setPointerCapture(e.pointerId);
        e.preventDefault();
      }

      function updateResize(e) {
        if (!isResizing) return;
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        if (clientX <= collapseThreshold) {
          collapse();
          isResizing = false;
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
          return;
        }
        var max = window.innerWidth * maxWidthFraction;
        var width = Math.min(Math.max(clientX, minWidth), max);
        layout.style.gridTemplateColumns = width + 'px 1fr';
        if (storagePrefix) localStorage.setItem(storagePrefix + 'Width', width);
      }

      function stopResize() {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }

      handle.addEventListener('pointerdown', startResize);
      handle.addEventListener('touchstart', startResize, { passive: false });
      document.addEventListener('pointermove', updateResize);
      document.addEventListener('touchmove', updateResize, { passive: false });
      document.addEventListener('pointerup', stopResize);
      document.addEventListener('touchend', stopResize);
      document.addEventListener('pointercancel', stopResize);

      // Restore saved state
      if (storagePrefix && localStorage.getItem(storagePrefix + 'Collapsed') === 'true') {
        collapse();
      } else if (storagePrefix) {
        var savedW = parseInt(localStorage.getItem(storagePrefix + 'Width'), 10);
        if (savedW > 0) {
          var restoredWidth = Math.min(Math.max(savedW, minWidth), window.innerWidth * maxWidthFraction);
          layout.style.gridTemplateColumns = restoredWidth + 'px 1fr';
          if (showBtn) showBtn.classList.add('hidden');
        }
      }

      // Wire up public API
      api.expand   = expand;
      api.collapse = collapse;
      api.toggle   = toggle;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }

    return api;
  }

  window.PaneResize = { init: init };
})(window);
