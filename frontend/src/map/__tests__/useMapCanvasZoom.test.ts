import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
    act(() => result.current.fitToBounds({ minX: 0, maxX: 9, minY: 0, maxY: 4 }, { width: 320, height: 320 }, { minX: 0, maxX: 9, minY: 0, maxY: 4 }))

    expect(result.current.zoom.scale).toBeCloseTo(0.5)
    // Fitted content is 320x160, so it fills the viewport's width and is centred vertically:
    // pan.y = (160 - 320) / 2 = -80. (This assertion used to read { x: 0, y: 0 } back when
    // fitToBounds always parked the pan at the origin instead of centring.)
    expect(result.current.zoom.pan).toEqual({ x: 0, y: -80 })
  })

  it('fitToBounds clamps to MIN_SCALE/MAX_SCALE and no-ops on an empty viewport', () => {
    const { result } = renderHook(() => useMapCanvasZoom())

    // A single cell at a huge viewport would compute scale >> MAX_SCALE without clamping.
    act(() => result.current.fitToBounds({ minX: 0, maxX: 0, minY: 0, maxY: 0 }, { width: 5000, height: 5000 }, { minX: 0, maxX: 0, minY: 0, maxY: 0 }))
    expect(result.current.zoom.scale).toBe(result.current.MAX_SCALE)

    act(() => result.current.fitToBounds({ minX: 0, maxX: 9, minY: 0, maxY: 9 }, { width: 0, height: 0 }, { minX: 0, maxX: 9, minY: 0, maxY: 9 }))
    expect(result.current.zoom.scale).toBe(1)
  })

  it('wheel event handler zooms toward cursor only with Ctrl/Cmd held', () => {
    const { result } = renderHook(() => useMapCanvasZoom())
    const container = { getBoundingClientRect: () => ({ left: 0, top: 0 }) } as unknown as HTMLElement

    // Plain wheel (no modifier): ignored — a plain wheel does nothing but scroll the page.
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

  it('plain wheel zooms and prevents default when wheelZoomMode is always, while Ctrl/Cmd still works', () => {
    const { result } = renderHook(() => useMapCanvasZoom({ wheelZoomMode: 'always' }))
    const container = { getBoundingClientRect: () => ({ left: 0, top: 0 }) } as unknown as HTMLElement
    const plainPreventDefault = vi.fn()
    const modifierPreventDefault = vi.fn()

    // Pan to (20, 30) first — the wheel math must fold the existing pan into its cursor-anchored
    // zoom, not just the raw cursor position (this is what the old scrollLeft/scrollTop reads used
    // to exercise; pan is now the hook's own state instead of a DOM scroll position).
    act(() => result.current.handlePointerDown(makePointerEvent({ clientX: 100, clientY: 100 })))
    act(() => result.current.handlePointerMove(makePointerEvent({ clientX: 80, clientY: 70 })))
    act(() => result.current.handlePointerUp())
    expect(result.current.zoom.pan).toEqual({ x: 20, y: 30 })

    act(() =>
      result.current.handleWheel(
        makeWheelEvent({
          deltaY: -100,
          clientX: 40,
          clientY: 50,
          currentTarget: container,
          preventDefault: plainPreventDefault,
        }),
      ),
    )
    expect(plainPreventDefault).toHaveBeenCalledTimes(1)
    expect(result.current.zoom.scale).toBeCloseTo(1.1)
    expect(result.current.zoom.pan.x).toBeCloseTo((20 + 40) * 1.1 - 40)
    expect(result.current.zoom.pan.y).toBeCloseTo((30 + 50) * 1.1 - 50)

    act(() =>
      result.current.handleWheel(
        makeWheelEvent({
          ctrlKey: true,
          deltaY: 100,
          clientX: 40,
          clientY: 50,
          currentTarget: container,
          preventDefault: modifierPreventDefault,
        }),
      ),
    )
    expect(modifierPreventDefault).toHaveBeenCalledTimes(1)
    expect(result.current.zoom.scale).toBeCloseTo(1)
  })

  it('in pan mode a drag starting on a .maplab-room element pans; in tool mode a single-pointer drag never pans', () => {
    const { result: panResult } = renderHook(() => useMapCanvasZoom({ pointerMode: 'pan' }))

    // In 'pan' mode, a drag on a room element should pan.
    const roomEl = document.createElement('div')
    roomEl.className = 'maplab-room'
    act(() => panResult.current.handlePointerDown(makePointerEvent({ clientX: 100, clientY: 100, target: roomEl })))
    act(() => panResult.current.handlePointerMove(makePointerEvent({ clientX: 130, clientY: 80 })))
    expect(panResult.current.zoom.pan).toEqual({ x: -30, y: 20 })
    act(() => panResult.current.handlePointerUp())

    // In 'tool' mode, a single-pointer drag does not pan, even on a plain target.
    const { result: toolResult } = renderHook(() => useMapCanvasZoom({ pointerMode: 'tool' }))
    const plainTarget = document.createElement('div')
    act(() => toolResult.current.handlePointerDown(makePointerEvent({ clientX: 100, clientY: 100, target: plainTarget })))
    act(() => toolResult.current.handlePointerMove(makePointerEvent({ clientX: 130, clientY: 80 })))
    expect(toolResult.current.zoom.pan).toEqual({ x: 0, y: 0 })
  })

  it('two-pointer pinch zooms about the pinch centroid and hands back to drag-pan on release', () => {
    const { result } = renderHook(() => useMapCanvasZoom())
    const viewport = document.createElement('div')
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0 } as DOMRect)
    const down = (pointerId: number, clientX: number, clientY: number) =>
      makePointerEvent({ pointerId, clientX, clientY, target: viewport, currentTarget: viewport })

    act(() => result.current.handlePointerDown(down(1, 100, 100)))
    act(() => result.current.handlePointerDown(down(2, 200, 100)))
    expect(result.current.zoom).toEqual({ scale: 1, pan: { x: 0, y: 0 } })

    // Fingers spread 100px -> 200px apart: scale doubles, and the content point that sat under the
    // original centroid (150,100) stays under the new centroid (200,100).
    act(() => result.current.handlePointerMove(makePointerEvent({ pointerId: 2, clientX: 300, clientY: 100 })))
    expect(result.current.zoom.scale).toBeCloseTo(2)
    expect(result.current.zoom.pan.x).toBeCloseTo(150 * 2 - 200)
    expect(result.current.zoom.pan.y).toBeCloseTo(100 * 2 - 100)

    // Lifting one finger continues as a drag-pan from where the surviving finger is, with no jump.
    act(() => result.current.handlePointerUp(makePointerEvent({ pointerId: 2, clientX: 300, clientY: 100 })))
    act(() => result.current.handlePointerMove(makePointerEvent({ pointerId: 1, clientX: 80, clientY: 130 })))
    expect(result.current.zoom.scale).toBeCloseTo(2)
    expect(result.current.zoom.pan.x).toBeCloseTo(100 + 20)
    expect(result.current.zoom.pan.y).toBeCloseTo(100 - 30)
  })

  it('pinch clamps to MAX_SCALE and starts even when a finger lands on an interactive target', () => {
    const { result } = renderHook(() => useMapCanvasZoom())
    const viewport = document.createElement('div')
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0 } as DOMRect)
    const room = document.createElement('div')
    room.className = 'maplab-room'

    act(() => result.current.handlePointerDown(makePointerEvent({ pointerId: 1, clientX: 100, clientY: 100, target: room, currentTarget: viewport })))
    act(() => result.current.handlePointerDown(makePointerEvent({ pointerId: 2, clientX: 200, clientY: 100, target: room, currentTarget: viewport })))
    act(() => result.current.handlePointerMove(makePointerEvent({ pointerId: 2, clientX: 1100, clientY: 100 })))

    expect(result.current.zoom.scale).toBe(result.current.MAX_SCALE)
  })

  it('pointercancel/pointerup clears the gesture so a lifted finger leaves no phantom pan', () => {
    const { result } = renderHook(() => useMapCanvasZoom())
    const plainTarget = document.createElement('div')

    act(() => result.current.handlePointerDown(makePointerEvent({ pointerId: 7, clientX: 100, clientY: 100, target: plainTarget })))
    act(() => result.current.handlePointerUp(makePointerEvent({ pointerId: 7, clientX: 100, clientY: 100 })))
    act(() => result.current.handlePointerMove(makePointerEvent({ pointerId: 7, clientX: 400, clientY: 400 })))

    expect(result.current.zoom.pan).toEqual({ x: 0, y: 0 })
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
    act(() => result.current.fitToBounds({ minX: 0, maxX: 3, minY: 0, maxY: 3 }, { width: 128, height: 128 }, { minX: 0, maxX: 3, minY: 0, maxY: 3 }))
    // No animation frame/timer is involved — the state is already settled synchronously.
    expect(result.current.zoom.scale).toBeCloseTo(0.5)
  })

  it('zoom buttons with viewport keep the content at viewport center fixed, and without viewport only change scale', () => {
    const { result } = renderHook(() => useMapCanvasZoom())
    const viewport = { width: 400, height: 300 }

    // Drag to set up panned state: pan (100, 50)
    act(() => {
      result.current.handlePointerDown(makePointerEvent({ clientX: 100, clientY: 100 }))
      result.current.handlePointerMove(makePointerEvent({ clientX: 0, clientY: 50 }))
      result.current.handlePointerUp()
    })
    expect(result.current.zoom).toEqual({ scale: 1, pan: { x: 100, y: 50 } })

    // The SVG content point at viewport center before zoom (divide by scale to get world coord)
    const { scale: scaleBefore, pan: panBefore } = result.current.zoom
    const centerSvgX = (panBefore.x + viewport.width / 2) / scaleBefore
    const centerSvgY = (panBefore.y + viewport.height / 2) / scaleBefore

    // zoomIn with viewport should keep the center content point fixed
    act(() => result.current.zoomIn(viewport))

    const { scale: scaleAfter, pan: panAfter } = result.current.zoom
    const centerSvgXAfter = (panAfter.x + viewport.width / 2) / scaleAfter
    const centerSvgYAfter = (panAfter.y + viewport.height / 2) / scaleAfter

    // The SVG content point at viewport center should stay fixed
    expect(centerSvgXAfter).toBeCloseTo(centerSvgX)
    expect(centerSvgYAfter).toBeCloseTo(centerSvgY)
    expect(scaleAfter).toBeCloseTo(scaleBefore + 0.25)

    // zoomOut should reverse the change
    act(() => result.current.zoomOut(viewport))
    expect(result.current.zoom.scale).toBeCloseTo(scaleBefore)
    expect(result.current.zoom.pan.x).toBeCloseTo(100)
    expect(result.current.zoom.pan.y).toBeCloseTo(50)

    // zoomIn with no viewport should only change scale, leave pan as-is
    const panBeforeNoViewport = { ...result.current.zoom.pan }
    act(() => result.current.zoomIn())
    expect(result.current.zoom.pan).toEqual(panBeforeNoViewport)
    expect(result.current.zoom.scale).toBeCloseTo(scaleBefore + 0.25)
  })

})
