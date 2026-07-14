import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Bounds } from './maplabModel'
import { BASE_PX_PER_UNIT, type ViewportSize, type ZoomState } from './useMapCanvasZoom'

interface MapCanvasProps {
  viewBox: string
  bounds: Bounds
  zoom: ZoomState
  ariaLabel: string
  onWheelZoom: (e: WheelEvent) => void
  onPanStart: (e: PointerEvent) => void
  onPanMove: (e: PointerEvent) => void
  onPanEnd: (e: PointerEvent) => void
  onViewportResize: (size: ViewportSize) => void
  /** Sets `data-variant` on the wrapper so descendants (`.maplab-room-cell` etc) can inherit the
   * `--variant-*` custom properties from `theme.css` — the viewer wants `"neutral"`; the editor
   * doesn't set one yet (Stage E3 territory). */
  variant?: string
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  onExitFullscreen?: () => void
  panHint?: string
  controlsSlot?: ReactNode
  children: ReactNode
}

export function MapCanvas({
  viewBox,
  bounds,
  zoom,
  ariaLabel,
  onWheelZoom,
  onPanStart,
  onPanMove,
  onPanEnd,
  onViewportResize,
  variant,
  fullscreen,
  onExitFullscreen,
  panHint,
  controlsSlot,
  children,
}: MapCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)

  const unitsX = bounds.maxX - bounds.minX + 1
  const unitsY = bounds.maxY - bounds.minY + 1
  const pxPerUnit = BASE_PX_PER_UNIT * zoom.scale
  const widthPx = unitsX * pxPerUnit
  const heightPx = unitsY * pxPerUnit

  // Native listeners (not React's synthetic `onWheel`/`onPointerDown`) so the handlers can receive
  // real DOM `WheelEvent`/`PointerEvent` objects — `useMapCanvasZoom` reads `e.currentTarget` off
  // them directly (e.g. to zoom toward the cursor). `pointermove`/`pointerup` are bound to `window`
  // so a drag started inside the viewport keeps tracking once the pointer leaves it; the hook's own
  // handlers already no-op when no drag is in progress.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (e: WheelEvent) => onWheelZoom(e)
    const handlePointerDown = (e: PointerEvent) => onPanStart(e)
    const handlePointerMove = (e: PointerEvent) => onPanMove(e)
    const handlePointerUp = (e: PointerEvent) => onPanEnd(e)

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    viewport.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      viewport.removeEventListener('wheel', handleWheel)
      viewport.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [onWheelZoom, onPanStart, onPanMove, onPanEnd])

  // Pan is expressed as scroll offset — the hook computes it, this is the one place it's applied.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollLeft = zoom.pan.x
    viewport.scrollTop = zoom.pan.y
  }, [zoom.pan.x, zoom.pan.y])

  useEffect(() => {
    const viewport = viewportRef.current
    // jsdom (unit tests) has no ResizeObserver; real browsers all do.
    if (!viewport || typeof ResizeObserver === 'undefined') return

    const report = () => onViewportResize({ width: viewport.clientWidth, height: viewport.clientHeight })
    report()
    const observer = new ResizeObserver(report)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [onViewportResize])

  useEffect(() => {
    if (!fullscreen || !onExitFullscreen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onExitFullscreen()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreen, onExitFullscreen])

  return (
    <div
      className="maplab-canvas-wrapper"
      data-variant={variant}
      data-fullscreen={fullscreen || undefined}
      aria-label={fullscreen ? 'Fullscreen map editor workspace' : undefined}
    >
      <div ref={viewportRef} className="maplab-canvas-viewport">
        <svg
          className="maplab-svg"
          viewBox={viewBox}
          width={widthPx}
          height={heightPx}
          role="img"
          aria-label={ariaLabel}
        >
          {children}
        </svg>
      </div>
      {controlsSlot && (
        <div className="maplab-zoom-controls">
          {controlsSlot}
          {panHint && (
            <span className="maplab-canvas-fullscreen-hint">
              {panHint}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
