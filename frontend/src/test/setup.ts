import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// React Flow (LM4, The Loom) needs these under jsdom; jsdom implements none of them.
// Concentrate real coverage in the pure loomGraph/loomFlow modules — never attempt
// drag/connect interaction tests here, only render smoke tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

class DOMMatrixReadOnlyStub {
  constructor(_transform?: string) {}
}
;(globalThis as unknown as { DOMMatrixReadOnly: typeof DOMMatrixReadOnlyStub }).DOMMatrixReadOnly ??=
  DOMMatrixReadOnlyStub

Object.defineProperties(HTMLElement.prototype, {
  offsetWidth: { configurable: true, get: () => 1000 },
  offsetHeight: { configurable: true, get: () => 800 },
})
