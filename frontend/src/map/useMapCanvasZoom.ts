import { useCallback, useRef, useState } from 'react'
import type { Bounds } from '../model/maplabModel'

export interface ZoomState {
  scale: number
  /** Offset (px, in already-scaled content space) that `MapCanvas` applies to its SVG as
   * `translate(-pan.x, -pan.y)` — free-floating like a map app, never clamped to content bounds. */
  pan: { x: number; y: number }
}

export interface ViewportSize {
  width: number
  height: number
}

export type WheelZoomMode = 'modifier' | 'always'
export type PointerMode = 'pan' | 'tool'

export interface UseMapCanvasZoomOptions {
  wheelZoomMode?: WheelZoomMode
  pointerMode?: PointerMode
}

export const MIN_SCALE = 0.25
export const MAX_SCALE = 3
export const BASE_PX_PER_UNIT = 64

const SCALE_STEP = 0.25
const WHEEL_SCALE_STEP = 0.1

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

interface DragOrigin {
  clientX: number
  clientY: number
  pan: { x: number; y: number }
}

/** A two-pointer pinch in progress. `content*` is the point of the map (in scrolled-content px at
 * `scale`) that sat under the pinch centroid when the gesture began — it is held under the moving
 * centroid for the whole gesture, so a pinch zooms and pans in one motion the way a map app does. */
interface PinchOrigin {
  distance: number
  scale: number
  contentX: number
  contentY: number
}

function centroidOf(points: PointerPoint[]): { x: number; y: number } {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function distanceBetween(a: PointerPoint, b: PointerPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

interface PointerPoint {
  x: number
  y: number
}

export function useMapCanvasZoom({ wheelZoomMode = 'modifier', pointerMode = 'pan' }: UseMapCanvasZoomOptions = {}) {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, pan: { x: 0, y: 0 } })
  const dragOrigin = useRef<DragOrigin | null>(null)
  // Every pointer currently down on the viewport, keyed by `pointerId`. Two or more concurrent
  // pointers means a pinch, which takes over from any single-pointer drag already in flight.
  const activePointers = useRef(new Map<number, PointerPoint>())
  const pinchOrigin = useRef<PinchOrigin | null>(null)
  // `pointermove`/`pointerup` are bound to `window` (see MapCanvas), so their `currentTarget` is not
  // the viewport — remember the element the gesture started on to map client px into content px.
  const viewportEl = useRef<HTMLElement | null>(null)
  // Read inside pointer handlers that must start a gesture from the settled pan without taking a
  // dependency on it (the handlers are attached as native listeners and re-bound on identity change).
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  // Read inside pointer handlers so it is current without re-binding listeners on mode change.
  const pointerModeRef = useRef(pointerMode)
  pointerModeRef.current = pointerMode

  const zoomIn = useCallback((viewport?: ViewportSize) => {
    setZoom((current) => {
      const nextScale = clampScale(current.scale + SCALE_STEP)
      if (nextScale === current.scale) return current
      // If viewport size is not provided, zero-sized, or clamped to no-op, only change scale
      if (!viewport || viewport.width === 0 || viewport.height === 0) {
        return { ...current, scale: nextScale }
      }
      // Keep the content point at the viewport center fixed across the scale change
      const offsetX = viewport.width / 2
      const offsetY = viewport.height / 2
      const contentX = current.pan.x + offsetX
      const contentY = current.pan.y + offsetY
      const ratio = nextScale / current.scale
      return {
        scale: nextScale,
        pan: {
          x: contentX * ratio - offsetX,
          y: contentY * ratio - offsetY,
        },
      }
    })
  }, [])

  const zoomOut = useCallback((viewport?: ViewportSize) => {
    setZoom((current) => {
      const nextScale = clampScale(current.scale - SCALE_STEP)
      if (nextScale === current.scale) return current
      // If viewport size is not provided, zero-sized, or clamped to no-op, only change scale
      if (!viewport || viewport.width === 0 || viewport.height === 0) {
        return { ...current, scale: nextScale }
      }
      // Keep the content point at the viewport center fixed across the scale change
      const offsetX = viewport.width / 2
      const offsetY = viewport.height / 2
      const contentX = current.pan.x + offsetX
      const contentY = current.pan.y + offsetY
      const ratio = nextScale / current.scale
      return {
        scale: nextScale,
        pan: {
          x: contentX * ratio - offsetX,
          y: contentY * ratio - offsetY,
        },
      }
    })
  }, [])

  const reset = useCallback(() => {
    setZoom({ scale: 1, pan: { x: 0, y: 0 } })
  }, [])

  /** `options.floorScale` sets a scale the fit may not go below — for a surface where legibility
   * matters more than seeing everything at once (the kid map), the content then overflows the
   * viewport and stays pannable rather than shrinking past readable. */
  const fitToBounds = useCallback((
    bounds: Bounds,
    viewport: ViewportSize,
    origin: Bounds,
    options?: { floorScale?: number },
  ): { clampedToMin: boolean } => {
    const unitsX = bounds.maxX - bounds.minX + 1
    const unitsY = bounds.maxY - bounds.minY + 1
    const contentWidth = unitsX * BASE_PX_PER_UNIT
    const contentHeight = unitsY * BASE_PX_PER_UNIT

    if (contentWidth <= 0 || contentHeight <= 0 || viewport.width <= 0 || viewport.height <= 0) {
      setZoom({ scale: 1, pan: { x: 0, y: 0 } })
      return { clampedToMin: false }
    }

    const fitScale = Math.min(viewport.width / contentWidth, viewport.height / contentHeight)
    const rawScale = options?.floorScale !== undefined
      ? Math.max(fitScale, options.floorScale)
      : fitScale
    const scale = clampScale(rawScale)
    const offsetX = (bounds.minX - origin.minX) * BASE_PX_PER_UNIT
    const offsetY = (bounds.minY - origin.minY) * BASE_PX_PER_UNIT
    const pan = {
      x: (offsetX + contentWidth / 2) * scale - viewport.width / 2,
      y: (offsetY + contentHeight / 2) * scale - viewport.height / 2,
    }
    setZoom({ scale, pan })
    return { clampedToMin: rawScale < MIN_SCALE }
  }, [])

  // Modifier-only by default; editor mode can opt into plain-wheel zoom. Zooms toward the cursor:
  // `e.currentTarget` is the viewport div the listener is bound to (`MapCanvas` attaches this as a
  // native `wheel` listener), so its bounding rect plus the current `pan` give the cursor's position
  // within the panned/scaled content, which is held fixed across the scale change by solving the
  // new pan for it.
  const handleWheel = useCallback((e: WheelEvent) => {
    const modifierPressed = e.ctrlKey || e.metaKey
    if (wheelZoomMode === 'modifier' && !modifierPressed) return
    if (wheelZoomMode === 'always' || modifierPressed) {
      e.preventDefault()
    } else {
      return
    }

    const container = e.currentTarget as HTMLElement | null
    const delta = e.deltaY > 0 ? -WHEEL_SCALE_STEP : WHEEL_SCALE_STEP

    setZoom((current) => {
      const nextScale = clampScale(current.scale + delta)
      if (nextScale === current.scale) return current
      if (!container) return { ...current, scale: nextScale }

      const rect = container.getBoundingClientRect()
      const cursorFromViewportLeft = e.clientX - rect.left
      const cursorFromViewportTop = e.clientY - rect.top
      const contentX = current.pan.x + cursorFromViewportLeft
      const contentY = current.pan.y + cursorFromViewportTop
      const ratio = nextScale / current.scale

      return {
        scale: nextScale,
        pan: {
          x: contentX * ratio - cursorFromViewportLeft,
          y: contentY * ratio - cursorFromViewportTop,
        },
      }
    })
  }, [wheelZoomMode])

  /** Offset of a client point within the viewport box, i.e. the coordinate space `pan` is in. */
  const viewportOffset = useCallback((point: PointerPoint): PointerPoint => {
    const viewport = viewportEl.current
    if (!viewport) return point
    const rect = viewport.getBoundingClientRect()
    return { x: point.x - rect.left, y: point.y - rect.top }
  }, [])

  /** Begin (or re-seed) a pinch from whatever two pointers are currently down. */
  const beginPinch = useCallback(() => {
    const points = [...activePointers.current.values()]
    if (points.length < 2) {
      pinchOrigin.current = null
      return
    }
    dragOrigin.current = null
    const { scale, pan } = zoomRef.current
    const offset = viewportOffset(centroidOf(points))
    pinchOrigin.current = {
      distance: Math.max(distanceBetween(points[0], points[1]), 1),
      scale,
      contentX: pan.x + offset.x,
      contentY: pan.y + offset.y,
    }
  }, [viewportOffset])

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      const viewportTarget = e.currentTarget as HTMLElement | null
      if (viewportTarget) viewportEl.current = viewportTarget
      // Registered before the interactive-target/scrollbar bail-outs below: a second finger landing
      // on a room or marker should still complete a pinch rather than be swallowed as a tap.
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (activePointers.current.size >= 2) {
        e.preventDefault()
        beginPinch()
        return
      }

      // In 'tool' mode, single-pointer drags are left entirely to the page; no pan starts.
      if (pointerModeRef.current === 'tool') return
      // A drag starting over an SVG <text> (room titles, the scale ruler) would otherwise kick off
      // the browser's native text selection alongside the pan.
      e.preventDefault()
      dragOrigin.current = { clientX: e.clientX, clientY: e.clientY, pan: zoom.pan }
    },
    [zoom.pan],
  )

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    const pinch = pinchOrigin.current
    const points = [...activePointers.current.values()]
    if (pinch && points.length >= 2) {
      e.preventDefault?.()
      const distance = Math.max(distanceBetween(points[0], points[1]), 1)
      const nextScale = clampScale(pinch.scale * (distance / pinch.distance))
      const offset = viewportOffset(centroidOf(points))
      const ratio = nextScale / pinch.scale
      setZoom({
        scale: nextScale,
        pan: { x: pinch.contentX * ratio - offset.x, y: pinch.contentY * ratio - offset.y },
      })
      return
    }

    const origin = dragOrigin.current
    if (!origin) return
    const dx = e.clientX - origin.clientX
    const dy = e.clientY - origin.clientY
    setZoom((current) => ({ ...current, pan: { x: origin.pan.x - dx, y: origin.pan.y - dy } }))
  }, [viewportOffset])

  const handlePointerUp = useCallback((e?: PointerEvent) => {
    if (e === undefined) {
      activePointers.current.clear()
    } else {
      activePointers.current.delete(e.pointerId)
    }
    dragOrigin.current = null

    if (activePointers.current.size >= 2) {
      // A third finger lifting still leaves a pinch: re-seed it from the survivors so the map does
      // not jump by the difference between the old and new centroid.
      beginPinch()
      return
    }
    pinchOrigin.current = null

    // One finger left after a pinch: hand the gesture back to drag-pan from where that finger is,
    // rather than freezing the map until the user lifts and touches down again.
    const remaining = [...activePointers.current.values()][0]
    if (remaining) {
      dragOrigin.current = { clientX: remaining.x, clientY: remaining.y, pan: zoomRef.current.pan }
    }
  }, [beginPinch])

  return {
    zoom,
    zoomIn,
    zoomOut,
    reset,
    fitToBounds,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    MIN_SCALE,
    MAX_SCALE,
    BASE_PX_PER_UNIT,
  }
}
