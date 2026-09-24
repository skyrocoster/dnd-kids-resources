import { useCallback, useRef } from "react";
import type { Bounds, MapCell } from "../../../model/maplabModel";
import { cellFromClientPoint, cellsBetween } from "../../../map/canvasGrid";
import type { ZoomState } from "../../../map/useMapCanvasZoom";

export interface UseCanvasStrokeOptions {
  enabled: boolean;
  zoom: ZoomState;
  bounds: Bounds;
  onStrokeStart?: (cell: MapCell) => void;
  onStrokeCell?: (cell: MapCell) => void;
  onStrokeEnd?: () => void;
}

interface StrokeInProgress {
  pointerId: number;
  lastCell: MapCell;
}

export interface UseCanvasStrokeHandlers {
  onStrokePointerDown: (e: PointerEvent) => void;
  onStrokePointerMove: (e: PointerEvent) => void;
  onStrokePointerUp: (e: PointerEvent) => void;
  setStrokeViewportEl: (el: HTMLElement | null) => void;
}

/**
 * A hook that captures pointer drags over the map viewport and converts them into a
 * de-duplicated, gap-free sequence of grid cells using `cellFromClientPoint` and `cellsBetween`.
 *
 * Behavior:
 * - When `enabled`, a primary pointer down captures the pointer and reports the start cell.
 * - Each move reports newly entered cells, filling gaps from fast drags via `cellsBetween`.
 * - Up/cancel releases capture and ends the stroke.
 * - A second pointer landing during a stroke abandons it without an end-cell callback.
 *
 * The returned handlers should be wired to the viewport element (down) and window (move/up/cancel).
 */
export function useCanvasStroke({
  enabled,
  zoom,
  bounds,
  onStrokeStart,
  onStrokeCell,
  onStrokeEnd,
}: UseCanvasStrokeOptions): UseCanvasStrokeHandlers {
  const viewportEl = useRef<HTMLElement | null>(null);
  const strokeInProgress = useRef<StrokeInProgress | null>(null);
  const activePointerCount = useRef(0);

  // Refs to read current values inside handlers without re-binding them.
  // See useMapCanvasZoom.ts for the same pattern.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onStrokeStartRef = useRef(onStrokeStart);
  onStrokeStartRef.current = onStrokeStart;
  const onStrokeCellRef = useRef(onStrokeCell);
  onStrokeCellRef.current = onStrokeCell;
  const onStrokeEndRef = useRef(onStrokeEnd);
  onStrokeEndRef.current = onStrokeEnd;

  const setStrokeViewportEl = useCallback((el: HTMLElement | null) => {
    viewportEl.current = el;
  }, []);

  const handleStrokePointerDown = useCallback((e: PointerEvent) => {
    // Track total active pointers to detect multi-pointer gestures
    activePointerCount.current += 1;

    if (!enabledRef.current || e.button !== 0) return; // Only primary pointer
    if (activePointerCount.current > 1) return; // Second pointer landing: abandon any stroke
    if (strokeInProgress.current) return; // Stroke already in flight

    const viewport = viewportEl.current;
    if (!viewport) return;

    const clientPoint = { clientX: e.clientX, clientY: e.clientY };
    const viewportRect = viewport.getBoundingClientRect();
    const startCell = cellFromClientPoint(
      clientPoint,
      viewportRect,
      zoomRef.current,
      boundsRef.current,
    );

    // Begin the stroke
    strokeInProgress.current = { pointerId: e.pointerId, lastCell: startCell };
    onStrokeStartRef.current?.(startCell);

    // Capture the pointer so moves continue tracking even if pointer leaves viewport
    if (typeof viewport.setPointerCapture === "function") {
      viewport.setPointerCapture(e.pointerId);
    }
  }, []);

  const handleStrokePointerMove = useCallback((e: PointerEvent) => {
    const stroke = strokeInProgress.current;
    if (!stroke || stroke.pointerId !== e.pointerId) return;

    // If a second pointer is now down, abandon the stroke without reporting end-cell
    if (activePointerCount.current > 1) {
      strokeInProgress.current = null;
      return;
    }

    const viewport = viewportEl.current;
    if (!viewport) return;

    const clientPoint = { clientX: e.clientX, clientY: e.clientY };
    const viewportRect = viewport.getBoundingClientRect();
    const currentCell = cellFromClientPoint(
      clientPoint,
      viewportRect,
      zoomRef.current,
      boundsRef.current,
    );

    // If we moved to a new cell, fill the gap and report each cell
    if (currentCell[0] !== stroke.lastCell[0] || currentCell[1] !== stroke.lastCell[1]) {
      const cellsToReport = cellsBetween(stroke.lastCell, currentCell);
      for (const cell of cellsToReport) {
        onStrokeCellRef.current?.(cell);
      }
      stroke.lastCell = currentCell;
    }
  }, []);

  const handleStrokePointerUp = useCallback((e: PointerEvent) => {
    activePointerCount.current = Math.max(0, activePointerCount.current - 1);

    const stroke = strokeInProgress.current;
    if (!stroke || stroke.pointerId !== e.pointerId) return;

    const viewport = viewportEl.current;
    if (viewport && typeof viewport.releasePointerCapture === "function") {
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch {
        // releasePointerCapture can throw if the element is no longer in the DOM
      }
    }

    strokeInProgress.current = null;
    onStrokeEndRef.current?.();
  }, []);

  return {
    onStrokePointerDown: handleStrokePointerDown,
    onStrokePointerMove: handleStrokePointerMove,
    onStrokePointerUp: handleStrokePointerUp,
    setStrokeViewportEl,
  };
}
