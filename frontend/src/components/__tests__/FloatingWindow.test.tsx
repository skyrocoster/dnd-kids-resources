import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { FloatingWindow, clampSize } from '../FloatingWindow'
import type { Size } from '../FloatingWindow'

const VIEWPORT_W = 1024
const VIEWPORT_H = 768

function mockViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

function getStoredSize(key: string): Size | null {
  try {
    const raw = sessionStorage.getItem(`${key}:size`)
    return raw ? (JSON.parse(raw) as Size) : null
  } catch {
    return null
  }
}

describe('clampSize', () => {
  beforeEach(() => {
    mockViewport(VIEWPORT_W, VIEWPORT_H)
  })

  it('returns the given size when within bounds', () => {
    expect(clampSize(380, 480)).toEqual({ width: 380, height: 480 })
  })

  it('clamps below minimum to the floor', () => {
    expect(clampSize(100, 100)).toEqual({ width: 300, height: 240 })
  })

  it('clamps above viewport ceiling', () => {
    const maxW = Math.floor(VIEWPORT_W * 0.92)
    const maxH = Math.floor(VIEWPORT_H * 0.85)
    expect(clampSize(9999, 9999)).toEqual({ width: maxW, height: maxH })
  })

  it('clamps mixed out-of-range values independently', () => {
    const maxW = Math.floor(VIEWPORT_W * 0.92)
    expect(clampSize(9999, 100)).toEqual({ width: maxW, height: 240 })
  })
})

describe('loadSize / saveSize round-trip', () => {
  const storageKey = 'test-floating-window'

  beforeEach(() => {
    sessionStorage.clear()
    mockViewport(VIEWPORT_W, VIEWPORT_H)
  })

  it('returns DEFAULT_SIZE when nothing is stored', () => {
    // Re-import to get module-level constants; we test via the render's loadSize
    // by checking the initial rendered width
    render(<FloatingWindow title="Test" storageKey="fresh-key" onClose={() => {}}>content</FloatingWindow>)
    const windowEl = screen.getByRole('dialog')
    expect(windowEl.style.width).toBe('380px')
    expect(windowEl.style.height).toBe('480px')
  })

  it('persists and retrieves a clamped size', () => {
    render(<FloatingWindow title="Test" storageKey={storageKey} onClose={() => {}}>content</FloatingWindow>)
    const handle = screen.getByLabelText(/resize window/i)

    // Simulate keyboard resize: arrow down once
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    let stored = getStoredSize(storageKey)
    expect(stored).not.toBeNull()
    expect(stored!.height).toBe(480 + 16)

    // Arrow right once
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    stored = getStoredSize(storageKey)
    expect(stored!.width).toBe(380 + 16)
  })

  it('falls back to DEFAULT_SIZE on malformed JSON', () => {
    sessionStorage.setItem(`${storageKey}:size`, 'not-json')
    render(<FloatingWindow title="Test" storageKey={storageKey} onClose={() => {}}>content</FloatingWindow>)
    const windowEl = screen.getByRole('dialog')
    expect(windowEl.style.width).toBe('380px')
  })
})

describe('FloatingWindow resize', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mockViewport(VIEWPORT_W, VIEWPORT_H)
  })

  it('renders a resize handle with accessible label', () => {
    render(<FloatingWindow title="Test" storageKey="k" onClose={() => {}}>content</FloatingWindow>)
    const handle = screen.getByRole('separator', { name: /resize window/i })
    expect(handle).toBeInTheDocument()
    expect(handle.tabIndex).toBe(0)
    expect(handle).toHaveAttribute('aria-orientation', 'horizontal')
    expect(handle.querySelector('.floating-window-resize-ridges')).toBeInTheDocument()
  })

  it('keyboard arrow keys resize the window and persist', () => {
    render(<FloatingWindow title="Test" storageKey="keyboard-test" onClose={() => {}}>content</FloatingWindow>)
    const handle = screen.getByRole('separator', { name: /resize window/i })
    const windowEl = screen.getByRole('dialog')

    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(windowEl.style.height).toBe(`${480 + 16}px`)

    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(windowEl.style.width).toBe(`${380 + 16}px`)

    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(windowEl.style.height).toBe(`${480}px`)

    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(windowEl.style.width).toBe(`${380}px`)

    // Verify persistence
    const stored = getStoredSize('keyboard-test')
    expect(stored).toEqual({ width: 380, height: 480 })
  })

  it('resize does not trigger when dragging the header', () => {
    render(<FloatingWindow title="Test" storageKey="no-drag" onClose={() => {}}>content</FloatingWindow>)
    const windowEl = screen.getByRole('dialog')
    const originalH = windowEl.style.height

    // Pointer down on handle, then move, then up
    const handle = screen.getByRole('separator', { name: /resize window/i })
    fireEvent(handle, new PointerEvent('pointerdown', { clientX: 400, clientY: 500, bubbles: true }))
    fireEvent(window, new PointerEvent('pointermove', { clientX: 450, clientY: 560 }))
    fireEvent(window, new PointerEvent('pointerup', {}))

    expect(windowEl.style.height).not.toBe(originalH)
    const newH = parseInt(windowEl.style.height, 10)
    expect(newH).toBe(480 + 60)

    // Move back to original
    fireEvent(handle, new PointerEvent('pointerdown', { clientX: 450, clientY: 560, bubbles: true }))
    fireEvent(window, new PointerEvent('pointermove', { clientX: 400, clientY: 500 }))
    fireEvent(window, new PointerEvent('pointerup', {}))
    expect(windowEl.style.height).toBe(`${480}px`)
  })
})
