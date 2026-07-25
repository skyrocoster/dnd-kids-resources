import type { Bounds, MapCell } from '../../../model/maplabModel'
import type { ZoomState } from './useMapCanvasZoom'
import { BASE_PX_PER_UNIT } from './useMapCanvasZoom'

/**
 * Convert a client (viewport) point to a grid cell coordinate.
 *
 * @param clientPoint - Client coordinates {clientX, clientY}
 * @param viewportRect - DOMRect of the viewport element (from getBoundingClientRect)
 * @param zoom - Current zoom state (scale and pan)
 * @param bounds - Grid bounds (minX, maxX, minY, maxY)
 * @returns The grid cell [x, y] containing the client point
 */
export function cellFromClientPoint(
  clientPoint: { clientX: number; clientY: number },
  viewportRect: DOMRect,
  zoom: ZoomState,
  bounds: Bounds,
): MapCell {
  // Convert client coordinates to viewport offset (relative to viewport top-left)
  const viewportOffsetX = clientPoint.clientX - viewportRect.left
  const viewportOffsetY = clientPoint.clientY - viewportRect.top

  // Convert viewport offset to content coordinates (accounting for pan and scale)
  const contentPx = {
    x: viewportOffsetX + zoom.pan.x,
    y: viewportOffsetY + zoom.pan.y,
  }

  // Convert content pixels to grid units
  const cellX = bounds.minX + Math.floor(contentPx.x / (BASE_PX_PER_UNIT * zoom.scale))
  const cellY = bounds.minY + Math.floor(contentPx.y / (BASE_PX_PER_UNIT * zoom.scale))

  return [cellX, cellY]
}

/**
 * Get all cells on a straight line from one cell to another (Bresenham-style walk).
 * Excludes the start cell but includes the end cell, so repeated calls never skip cells
 * during a fast drag between adjacent cells.
 *
 * @param from - Starting cell [x, y]
 * @param to - Ending cell [x, y]
 * @returns Array of cells on the line, excluding from, including to
 */
export function cellsBetween(from: MapCell, to: MapCell): MapCell[] {
  const [x0, y0] = from
  const [x1, y1] = to

  // If start and end are the same, return empty
  if (x0 === x1 && y0 === y1) {
    return []
  }

  const cells: MapCell[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1

  // Bresenham's line algorithm
  let x = x0
  let y = y0
  let err = (dx > dy ? dx : -dy) / 2

  while (true) {
    // Move one step toward the end
    const e2 = err
    if (e2 > -dx) {
      err -= dy
      x += sx
    }
    if (e2 < dy) {
      err += dx
      y += sy
    }

    // Add cell (excluding the starting point, which is already known)
    cells.push([x, y])

    // Stop once we've reached the end
    if (x === x1 && y === y1) {
      break
    }
  }

  return cells
}
