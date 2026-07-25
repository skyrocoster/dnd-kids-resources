const originalInnerWidth = window.innerWidth
const originalInnerHeight = window.innerHeight
const originalMatchMedia = window.matchMedia

let overrideStyle: HTMLStyleElement | null = null

export function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })

  if (!overrideStyle) {
    overrideStyle = document.createElement('style')
    overrideStyle.setAttribute('data-testid', 'viewport-override')
    document.head.appendChild(overrideStyle)
  }

  if (width <= 768) {
    overrideStyle.textContent = `
      .app-nav-mobile-trigger { display: flex !important; }
      .app-nav { display: none !important; }
      .loom-inspector-toggle { display: inline-flex !important; }
      .loom-inspector-drawer-header { display: flex !important; }
      .loom-inspector-drawer--open { display: flex !important; }
    `
  } else {
    overrideStyle.textContent = ''
  }

  if (width <= 520) {
    overrideStyle.textContent += `
      .browser-layout--detail-open .split-pane-left,
      .browser-layout--detail-open .split-pane-handle,
      .browser-layout--detail-open .split-pane-restore { display: none !important; }
      .browser-layout--detail-open .split-pane-right { width: 100% !important; }
      .browser-layout--detail-open .browser-layout-back { display: inline-flex !important; }
    `
  }
}

export function resetViewport() {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
  window.matchMedia = originalMatchMedia
  if (overrideStyle) {
    overrideStyle.remove()
    overrideStyle = null
  }
}

export function setMatchMedia(matches: boolean) {
  window.matchMedia = () => ({
    matches,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false },
  })
}
