import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// Shared jsdom geometry shims for components that observe or measure layout.
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
