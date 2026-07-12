import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMapCanvasZoom } from '../useMapCanvasZoom'

// Plain objects rather than real `Event`/`PointerEvent` instances — `target`/`currentTarget` are
// getter-only on those DOM classes, so they can't be overridden via `Object.assign`; the hook only
// reads a handful of fields off the event, all of which a plain object can supply just as well.
function makeWheelEvent(overrides: Partial<WheelEvent> & { currentTarget?: EventTarget }): WheelEvent {
  return {
    ctrlKey: false,
    metaKey: false,
    deltaY: 0,
    clientX: 0,
    clientY: 0,
    preventDefault: () => {},
    ...overrides,
  } as unknown as WheelEvent
}

function makePointerEvent(overrides: Partial<PointerEvent> & { target?: EventTarget }): PointerEvent {
  return { clientX: 0, clientY: 0, preventDefault: () => {}, ...overrides } as unknown as PointerEvent
}

describe('useMapCanvasZoom', () => {
  it('initializes zoom state with scale 1 and zero pan', () => {
    const { result } = renderHook(() => useMapCanvasZoom())
    expect(result.current.zoom).toEqual({ scale: 1, pan: { x: 0, y: 0 } })
  })

  it('clamps zoom scale to MIN_SCALE and MAX_SCALE', () => {
    const { result } = renderHook(() => useMapCanvasZoom())

    for (let i = 0; i < 20; i++) {
      act(() => result.current.zoomIn())
    }
    expect(result.current.zoom.scale).toBe(result.current.MAX_SCALE)

    for (let i = 0; i < 20; i++) {
      act(() => result.current.zoomOut())
    }
    expect(result.current.zoom.scale).toBe(result.current.MIN_SCALE)
  })

  it('fitToBounds calculates appropriate scale and pan', () => {
    const { result } = renderHook(() => useMapCanvasZoom())

    // 10x5 grid units at BASE_PX_PER_UNIT=64 -> 640x320 content into a 320x320 viewport:
    // width-constrained, scale = 320/640 = 0.5.
    act(() => result.current.fitToBounds({ minX: 0, maxX: 9, minY: 0, maxY: 4 }, { width: 320, height: 320 }))

    expect(result.current.zoom.scale).toBeCloseTo(0.5)
    expect(result.current.zoom.pan).toEqual({ x: 0, y: 0 })
  })

  it('fitToBounds clamps to MIN_SCALE/MAX_SCALE and no-ops on an empty viewport', () => {
    const { result } = renderHook(() => useMapCanvasZoom())

    // A single cell at a huge viewport would compute scale >> MAX_SCALE without clamping.
    act(() => result.current.fitToBounds({ minX: 0, maxX: 0, minY: 0, maxY: 0 }, { width: 5000, height: 5000 }))
    expect(result.current.zoom.scale).toBe(result.current.MAX_SCALE)

    act(() => result.current.fitToBounds({ minX: 0, maxX: 9, minY: 0, maxY: 9 }, { width: 0, height: 0 }))
    expect(result.current.zoom.scale).toBe(1)
  })

  it('wheel event handler zooms toward cursor only with Ctrl/Cmd held', () => {
    const { result } = renderHook(() => useMapCanvasZoom())
    const container = { getBoundingClientRect: () => ({ left: 0, top: 0 }), scrollLeft: 0, scrollTop: 0 } as unknown as HTMLElement

    // Plain wheel (no modifier): ignored, native scroll of the viewport handles it instead.
    act(() =>
      result.current.handleWheel(makeWheelEvent({ deltaY: -100, currentTarget: container })),
    )
    expect(result.current.zoom.scale).toBe(1)

    // Ctrl+wheel zooms in and re-centers pan on the cursor position.
    act(() =>
      result.current.handleWheel(
        makeWheelEvent({ ctrlKey: true, deltaY: -100, clientX: 50, clientY: 50, currentTarget: container }),
      ),
    )
    expect(result.current.zoom.scale).toBeCloseTo(1.1)
    // Content under the cursor (50,50 at scale 1) should land back under the cursor at scale 1.1.
    expect(result.current.zoom.pan.x).toBeCloseTo(50 * 1.1 - 50)
    expect(result.current.zoom.pan.y).toBeCloseTo(50 * 1.1 - 50)
  })

  it('pointer drag pans the canvas, ignoring drags started on interactive targets', () => {
    const { result } = renderHook(() => useMapCanvasZoom())

    const plainTarget = document.createElement('div')
    act(() => result.current.handlePointerDown(makePointerEvent({ clientX: 100, clientY: 100, target: plainTarget })))
    act(() => result.current.handlePointerMove(makePointerEvent({ clientX: 130, clientY: 80 })))
    expect(result.current.zoom.pan).toEqual({ x: -30, y: 20 })
    act(() => result.current.handlePointerUp())

    // A drag that starts on a room/door/paint-cell hit target must not move the pan at all.
    const roomEl = document.createElement('div')
    roomEl.className = 'maplab-room'
    const inner = document.createElement('div')
    roomEl.appendChild(inner)
    act(() => result.current.handlePointerDown(makePointerEvent({ clientX: 0, clientY: 0, target: inner })))
    act(() => result.current.handlePointerMove(makePointerEvent({ clientX: 500, clientY: 500 })))
    expect(result.current.zoom.pan).toEqual({ x: -30, y: 20 })
  })

  it('honors prefers-reduced-motion by never animating — zoom/fit are synchronous either way', () => {
    const matchMediaMock = (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })
    // @ts-expect-error partial MediaQueryList stub is sufficient for this check
    window.matchMedia = matchMediaMock

    const { result } = renderHook(() => useMapCanvasZoom())
    act(() => result.current.fitToBounds({ minX: 0, maxX: 3, minY: 0, maxY: 3 }, { width: 128, height: 128 }))
    // No animation frame/timer is involved — the state is already settled synchronously.
    expect(result.current.zoom.scale).toBeCloseTo(0.5)
  })
})
