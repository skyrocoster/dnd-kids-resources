import { useCallback, useRef, useState } from 'react'
import type { Bounds } from './maplabModel'

export interface ZoomState {
  scale: number
  /** Scroll offset (px) that `MapCanvas` applies to its `overflow:auto` viewport — panning is
   * implemented as scrolling, not an SVG transform, so this doubles as `scrollLeft`/`scrollTop`. */
  pan: { x: number; y: number }
}

export interface ViewportSize {
  width: number
  height: number
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

/** Interactive elements a drag-pan must not start on top of — matches the room/door/paint-cell/
 * door-placement hit targets in `MapLabPage.tsx`/`MapLabEditorPage.tsx`, so a click that's meant to
 * select a room or place a door never gets swallowed as the start of a pan gesture. */
const NON_PAN_TARGET_SELECTOR = '.maplab-room, .maplab-door, .maplab-stair, .maplab-paint-cell, .maplab-door-placement-edge'

export function useMapCanvasZoom() {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, pan: { x: 0, y: 0 } })
  const dragOrigin = useRef<DragOrigin | null>(null)

  const zoomIn = useCallback(() => {
    setZoom((current) => ({ ...current, scale: clampScale(current.scale + SCALE_STEP) }))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((current) => ({ ...current, scale: clampScale(current.scale - SCALE_STEP) }))
  }, [])

  const reset = useCallback(() => {
    setZoom({ scale: 1, pan: { x: 0, y: 0 } })
  }, [])

  const fitToBounds = useCallback((bounds: Bounds, viewport: ViewportSize) => {
    const unitsX = bounds.maxX - bounds.minX + 1
    const unitsY = bounds.maxY - bounds.minY + 1
    const contentWidth = unitsX * BASE_PX_PER_UNIT
    const contentHeight = unitsY * BASE_PX_PER_UNIT

    if (contentWidth <= 0 || contentHeight <= 0 || viewport.width <= 0 || viewport.height <= 0) {
      setZoom({ scale: 1, pan: { x: 0, y: 0 } })
      return
    }

    const scale = clampScale(Math.min(viewport.width / contentWidth, viewport.height / contentHeight))
    setZoom({ scale, pan: { x: 0, y: 0 } })
  }, [])

  // Ctrl/⌘+wheel only — a plain wheel is left for native scroll of the `overflow:auto` viewport.
  // Zooms toward the cursor: `e.currentTarget` is the viewport div the listener is bound to
  // (`MapCanvas` attaches this as a native `wheel` listener), so its scroll position + bounding
  // rect give the cursor's position within the scrolled content, which is held fixed across the
  // scale change by solving the new pan for it.
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()

    const container = e.currentTarget as HTMLElement | null
    const delta = e.deltaY > 0 ? -WHEEL_SCALE_STEP : WHEEL_SCALE_STEP

    setZoom((current) => {
      const nextScale = clampScale(current.scale + delta)
      if (nextScale === current.scale) return current
      if (!container) return { ...current, scale: nextScale }

      const rect = container.getBoundingClientRect()
      const cursorFromViewportLeft = e.clientX - rect.left
      const cursorFromViewportTop = e.clientY - rect.top
      const contentX = container.scrollLeft + cursorFromViewportLeft
      const contentY = container.scrollTop + cursorFromViewportTop
      const ratio = nextScale / current.scale

      return {
        scale: nextScale,
        pan: {
          x: contentX * ratio - cursorFromViewportLeft,
          y: contentY * ratio - cursorFromViewportTop,
        },
      }
    })
  }, [])

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest(NON_PAN_TARGET_SELECTOR)) return
      // A drag starting over an SVG <text> (room titles, the scale ruler) would otherwise kick off
      // the browser's native text selection alongside the pan.
      e.preventDefault()
      dragOrigin.current = { clientX: e.clientX, clientY: e.clientY, pan: zoom.pan }
    },
    [zoom.pan],
  )

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const origin = dragOrigin.current
    if (!origin) return
    const dx = e.clientX - origin.clientX
    const dy = e.clientY - origin.clientY
    setZoom((current) => ({ ...current, pan: { x: origin.pan.x - dx, y: origin.pan.y - dy } }))
  }, [])

  const handlePointerUp = useCallback(() => {
    dragOrigin.current = null
  }, [])

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
