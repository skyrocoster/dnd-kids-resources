import { describe, expect, it } from 'vitest'
import { cellFromClientPoint, cellsBetween } from '../canvasGrid'
import type { ZoomState } from '../useMapCanvasZoom'
import type { Bounds, MapCell } from '../../../../model/maplabModel'

describe('canvasGrid', () => {
  describe('cellFromClientPoint', () => {

    it('at scale 1 with zero pan, a point inside a known cell resolves to that cell', () => {
      const viewportRect = { left: 0, top: 0 } as DOMRect
      const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } }
      const bounds: Bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 }

      // Cell (0, 0) spans px 0-63
      const cell00 = cellFromClientPoint({ clientX: 32, clientY: 32 }, viewportRect, zoom, bounds)
      expect(cell00).toEqual([0, 0])

      // Cell (5, 3) starts at px 320, 192
      const cell53 = cellFromClientPoint({ clientX: 350, clientY: 220 }, viewportRect, zoom, bounds)
      expect(cell53).toEqual([5, 3])

      // Cell (9, 9) starts at px 576
      const cell99 = cellFromClientPoint({ clientX: 600, clientY: 600 }, viewportRect, zoom, bounds)
      expect(cell99).toEqual([9, 9])
    })

    it('a point one pixel across a cell boundary resolves to the neighbor cell', () => {
      const viewportRect = { left: 0, top: 0 } as DOMRect
      const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } }
      const bounds: Bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 }

      // Cell boundary at px 64 (between cells 0 and 1 on x-axis)
      const justInside0 = cellFromClientPoint({ clientX: 63, clientY: 32 }, viewportRect, zoom, bounds)
      expect(justInside0).toEqual([0, 0])

      const justAfter64 = cellFromClientPoint({ clientX: 64, clientY: 32 }, viewportRect, zoom, bounds)
      expect(justAfter64).toEqual([1, 0])

      // Cell boundary at py 128 (between rows 1 and 2 on y-axis)
      const justInside1 = cellFromClientPoint({ clientX: 32, clientY: 127 }, viewportRect, zoom, bounds)
      expect(justInside1).toEqual([0, 1])

      const justAfter128 = cellFromClientPoint({ clientX: 32, clientY: 128 }, viewportRect, zoom, bounds)
      expect(justAfter128).toEqual([0, 2])
    })

    it('at a zoomed+panned scale, correctly converts client to cell coordinates', () => {
      // Viewport at window (100, 50), scaled 2x with pan (-128, -64)
      const viewportRect = { left: 100, top: 50 } as DOMRect
      const zoom: ZoomState = { scale: 2, pan: { x: 128, y: 64 } }
      const bounds: Bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 }

      // Client (100, 50) is at viewport (0, 0)
      // Viewport (0, 0) + pan (128, 64) = content (128, 64)
      // At scale 2, cell size is 128 px (64 * 2), so content (128, 64) is cell (1, 0.5) -> cell (1, 0)
      const cell = cellFromClientPoint({ clientX: 100, clientY: 50 }, viewportRect, zoom, bounds)
      expect(cell).toEqual([1, 0])

      // Client (100, 50) + pan (128, 64) at scale 2 + some offset
      // Let's place client at viewport (64, 64) which is cell (1, 1) at scale 2
      const cell11 = cellFromClientPoint({ clientX: 164, clientY: 114 }, viewportRect, zoom, bounds)
      expect(cell11).toEqual([1, 1])
    })

    it('negative bounds.minX/minY work correctly', () => {
      const viewportRect = { left: 0, top: 0 } as DOMRect
      const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } }
      // Bounds starting at negative coordinates
      const bounds: Bounds = { minX: -5, maxX: 5, minY: -3, maxY: 7 }

      // Cell (-5, -3) is the minimum cell, at content px (0, 0) after grid math
      // But wait, the viewBox formula means the grid is laid out at -5*64, -3*64 in content space
      // So content px 0 corresponds to cell: -5 + floor(0 / 64) = -5
      const cellMin = cellFromClientPoint({ clientX: 0, clientY: 0 }, viewportRect, zoom, bounds)
      expect(cellMin).toEqual([-5, -3])

      // Cell (-4, -2) at content px 64, 64
      const cell = cellFromClientPoint({ clientX: 64, clientY: 64 }, viewportRect, zoom, bounds)
      expect(cell).toEqual([-4, -2])

      // Cell (0, 0) at content px 320, 192
      const cellOrigin = cellFromClientPoint({ clientX: 320, clientY: 192 }, viewportRect, zoom, bounds)
      expect(cellOrigin).toEqual([0, 0])
    })

    it('respects viewport offset (when viewport is not at window origin)', () => {
      // Viewport is positioned at window (200, 150) with size 400x300
      const viewportRect = { left: 200, top: 150 } as DOMRect
      const zoom: ZoomState = { scale: 1, pan: { x: 0, y: 0 } }
      const bounds: Bounds = { minX: 0, maxX: 9, minY: 0, maxY: 9 }

      // Client at window (200, 150) is at viewport (0, 0), which is cell (0, 0)
      const cell00 = cellFromClientPoint({ clientX: 200, clientY: 150 }, viewportRect, zoom, bounds)
      expect(cell00).toEqual([0, 0])

      // Client at window (232, 182) is at viewport (32, 32), which is cell (0, 0)
      const cell00b = cellFromClientPoint({ clientX: 232, clientY: 182 }, viewportRect, zoom, bounds)
      expect(cell00b).toEqual([0, 0])

      // Client at window (264, 214) is at viewport (64, 64), which is cell (1, 1)
      const cell11 = cellFromClientPoint({ clientX: 264, clientY: 214 }, viewportRect, zoom, bounds)
      expect(cell11).toEqual([1, 1])
    })
  })

  describe('cellsBetween', () => {
    it('returns empty array when from and to are the same cell', () => {
      const cells = cellsBetween([5, 5], [5, 5])
      expect(cells).toEqual([])
    })

    it('on adjacent orthogonal cells, returns just the neighbor cell', () => {
      // Adjacent on x-axis
      const rightNeighbor = cellsBetween([0, 0], [1, 0])
      expect(rightNeighbor).toEqual([[1, 0]])

      const leftNeighbor = cellsBetween([1, 0], [0, 0])
      expect(leftNeighbor).toEqual([[0, 0]])

      // Adjacent on y-axis
      const downNeighbor = cellsBetween([0, 0], [0, 1])
      expect(downNeighbor).toEqual([[0, 1]])

      const upNeighbor = cellsBetween([0, 1], [0, 0])
      expect(upNeighbor).toEqual([[0, 0]])
    })

    it('on adjacent diagonal cells, returns just the diagonal neighbor', () => {
      // Diagonal down-right
      const diagDR = cellsBetween([0, 0], [1, 1])
      expect(diagDR).toEqual([[1, 1]])

      // Diagonal up-left
      const diagUL = cellsBetween([1, 1], [0, 0])
      expect(diagUL).toEqual([[0, 0]])
    })

    it('on a longer horizontal line, returns all cells in the path, excluding start, including end', () => {
      // 5 cells to the right
      const cells = cellsBetween([0, 0], [5, 0])
      expect(cells).toEqual([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]])

      // 3 cells to the left
      const leftCells = cellsBetween([3, 0], [0, 0])
      expect(leftCells).toEqual([[2, 0], [1, 0], [0, 0]])
    })

    it('on a longer vertical line, returns all cells in the path, excluding start, including end', () => {
      // 4 cells down
      const cells = cellsBetween([0, 0], [0, 4])
      expect(cells).toEqual([[0, 1], [0, 2], [0, 3], [0, 4]])

      // 3 cells up
      const upCells = cellsBetween([0, 3], [0, 0])
      expect(upCells).toEqual([[0, 2], [0, 1], [0, 0]])
    })

    it('on a diagonal line, returns a connected run covering all cells on the path', () => {
      // Diagonal down-right: (0,0) -> (5,5)
      const diagCells = cellsBetween([0, 0], [5, 5])
      // Bresenham will include all cells along the line
      expect(diagCells.length).toBeGreaterThan(1)
      expect(diagCells[diagCells.length - 1]).toEqual([5, 5])
      // Path should be connected (each cell adjacent to previous/next)
      for (let i = 1; i < diagCells.length; i++) {
        const [x0, y0] = diagCells[i - 1]
        const [x1, y1] = diagCells[i]
        const dx = Math.abs(x1 - x0)
        const dy = Math.abs(y1 - y0)
        expect(dx + dy).toBeLessThanOrEqual(2) // Cells are adjacent (orthogonal or diagonal)
      }
    })

    it('on a steep diagonal, fills all cells without gaps', () => {
      // Steep diagonal: (0,0) -> (2,10)
      const cells = cellsBetween([0, 0], [2, 10])
      expect(cells[cells.length - 1]).toEqual([2, 10])
      // Check continuity
      for (let i = 1; i < cells.length; i++) {
        const [x0, y0] = cells[i - 1]
        const [x1, y1] = cells[i]
        const dx = Math.abs(x1 - x0)
        const dy = Math.abs(y1 - y0)
        expect(dx + dy).toBeLessThanOrEqual(2)
      }
    })

    it('on a shallow diagonal, fills all cells without gaps', () => {
      // Shallow diagonal: (0,0) -> (10,2)
      const cells = cellsBetween([0, 0], [10, 2])
      expect(cells[cells.length - 1]).toEqual([10, 2])
      // Check continuity
      for (let i = 1; i < cells.length; i++) {
        const [x0, y0] = cells[i - 1]
        const [x1, y1] = cells[i]
        const dx = Math.abs(x1 - x0)
        const dy = Math.abs(y1 - y0)
        expect(dx + dy).toBeLessThanOrEqual(2)
      }
    })

    it('works with negative coordinates', () => {
      // From negative to positive
      const cells = cellsBetween([-2, -2], [2, 2])
      expect(cells[cells.length - 1]).toEqual([2, 2])
      // First cell should be closer to start but not the start itself
      expect(cells[0]).not.toEqual([-2, -2])

      // Both negative
      const negCells = cellsBetween([-5, -5], [-1, -1])
      expect(negCells[negCells.length - 1]).toEqual([-1, -1])
    })

    it('never includes the starting cell but always includes the ending cell', () => {
      const tests: Array<[MapCell, MapCell]> = [
        [[0, 0], [5, 0]],
        [[0, 0], [0, 5]],
        [[0, 0], [5, 5]],
        [[5, 5], [0, 0]],
        [[10, 3], [15, 8]],
      ]

      for (const [from, to] of tests) {
        const cells = cellsBetween(from, to)
        expect(cells).not.toContainEqual(from)
        if (cells.length > 0) {
          expect(cells[cells.length - 1]).toEqual(to)
        }
      }
    })
  })
})
