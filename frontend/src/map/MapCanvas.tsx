import { useEffect, useId, useRef } from "react";
import "./MapCanvas.css";
import type { ReactNode } from "react";
import type { Bounds } from "../model/maplabModel";
import { BASE_PX_PER_UNIT, type ViewportSize, type ZoomState } from "./useMapCanvasZoom";

interface MapCanvasProps {
  viewBox: string;
  bounds: Bounds;
  zoom: ZoomState;
  ariaLabel: string;
  onWheelZoom: (e: WheelEvent) => void;
  onPanStart: (e: PointerEvent) => void;
  onPanMove: (e: PointerEvent) => void;
  onPanEnd: (e: PointerEvent) => void;
  onViewportResize: (size: ViewportSize) => void;
  /** Optional stroke (drag-paint) handlers from `useCanvasStroke` — bound alongside the zoom
   * handlers but in a separate effect so the two concerns stay independent. */
  onStrokePointerDown?: (e: PointerEvent) => void;
  onStrokePointerMove?: (e: PointerEvent) => void;
  onStrokePointerUp?: (e: PointerEvent) => void;
  /** Reports the viewport element to `useCanvasStroke` so it can read `getBoundingClientRect()`. */
  strokeViewportRef?: (el: HTMLElement | null) => void;
  /** Sets `data-variant` on the wrapper so descendants (`.maplab-room-cell` etc) can inherit the
   * `--variant-*` custom properties from `theme.css` — the viewer wants `"neutral"`; the editor
   * doesn't set one yet (Stage E3 territory). */
  variant?: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onExitFullscreen?: () => void;
  panHint?: string;
  viewportDescription?: string;
  /** Floating control cluster, bottom-right corner of the map (zoom/fit) — Google Maps convention. */
  controlsSlot?: ReactNode;
  /** Floating control(s), top-right corner of the map (e.g. fullscreen toggle) — kept separate from
   * `controlsSlot` so the two clusters never compete for the same corner. */
  topRightSlot?: ReactNode;
  /** Floating feedback chip, centered at the bottom of the map viewport. */
  bottomCenterSlot?: ReactNode;
  children: ReactNode;
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
  onStrokePointerDown,
  onStrokePointerMove,
  onStrokePointerUp,
  strokeViewportRef,
  variant,
  fullscreen,
  onExitFullscreen,
  panHint,
  viewportDescription,
  controlsSlot,
  topRightSlot,
  bottomCenterSlot,
  children,
}: MapCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hintId = useId();

  const unitsX = bounds.maxX - bounds.minX + 1;
  const unitsY = bounds.maxY - bounds.minY + 1;
  const pxPerUnit = BASE_PX_PER_UNIT * zoom.scale;
  const widthPx = unitsX * pxPerUnit;
  const heightPx = unitsY * pxPerUnit;

  // Native listeners (not React's synthetic `onWheel`/`onPointerDown`) so the handlers can receive
  // real DOM `WheelEvent`/`PointerEvent` objects — `useMapCanvasZoom` reads `e.currentTarget` off
  // them directly (e.g. to zoom toward the cursor). `pointermove`/`pointerup` are bound to `window`
  // so a drag started inside the viewport keeps tracking once the pointer leaves it; the hook's own
  // handlers already no-op when no drag is in progress.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => onWheelZoom(e);
    const handlePointerDown = (e: PointerEvent) => onPanStart(e);
    const handlePointerMove = (e: PointerEvent) => onPanMove(e);
    const handlePointerUp = (e: PointerEvent) => onPanEnd(e);

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    // Touch pointers get cancelled (browser gesture take-over, finger leaving the digitizer) without
    // ever firing pointerup — without this the hook would keep a phantom finger down forever.
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [onWheelZoom, onPanStart, onPanMove, onPanEnd]);

  // Stroke (drag-paint) handlers, kept in their own effect so they can be wired independently of
  // the zoom/pan handlers above — same element targets (viewport for down, window for move/up/
  // cancel), `passive: false` for pointermove.
  useEffect(() => {
    const viewport = viewportRef.current;
    strokeViewportRef?.(viewport);
    if (!viewport || !onStrokePointerDown || !onStrokePointerMove || !onStrokePointerUp) return;

    const handlePointerDown = (e: PointerEvent) => onStrokePointerDown(e);
    const handlePointerMove = (e: PointerEvent) => onStrokePointerMove(e);
    const handlePointerUp = (e: PointerEvent) => onStrokePointerUp(e);

    viewport.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      viewport.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [onStrokePointerDown, onStrokePointerMove, onStrokePointerUp, strokeViewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    // jsdom (unit tests) has no ResizeObserver; real browsers all do.
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const report = () =>
      onViewportResize({ width: viewport.clientWidth, height: viewport.clientHeight });
    report();
    const observer = new ResizeObserver(report);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [onViewportResize]);

  useEffect(() => {
    if (!fullscreen || !onExitFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onExitFullscreen();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, onExitFullscreen]);

  useEffect(() => {
    if (!fullscreen) return;

    wrapperRef.current?.focus();

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [fullscreen]);

  return (
    <div
      ref={wrapperRef}
      className="maplab-canvas-wrapper"
      data-variant={variant}
      tabIndex={fullscreen ? -1 : undefined}
    >
      <div
        ref={viewportRef}
        className="maplab-canvas-viewport"
        tabIndex={0}
        aria-label="Map canvas"
        aria-describedby={viewportDescription || panHint ? hintId : undefined}
      >
        <svg
          className="maplab-svg"
          viewBox={viewBox}
          width={widthPx}
          height={heightPx}
          role="group"
          aria-label={ariaLabel}
          style={{ transform: `translate(${-zoom.pan.x}px, ${-zoom.pan.y}px)` }}
        >
          {children}
        </svg>
      </div>
      {topRightSlot && <div className="maplab-map-controls-top-right">{topRightSlot}</div>}
      {controlsSlot && <div className="maplab-map-controls">{controlsSlot}</div>}
      {bottomCenterSlot && <div className="maplab-map-status">{bottomCenterSlot}</div>}
      {(panHint || viewportDescription) && (
        <p id={hintId} className="maplab-map-hint">
          {panHint}
          {panHint && viewportDescription ? " " : null}
          {viewportDescription}
        </p>
      )}
    </div>
  );
}
