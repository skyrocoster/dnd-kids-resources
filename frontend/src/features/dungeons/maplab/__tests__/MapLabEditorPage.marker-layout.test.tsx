import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import { MapLabEditorPage } from '../MapLabEditorPage'
import {
  DungeonRouteContextProvider,
  type DungeonRouteContext,
} from '../dungeonRouteContext'

function renderMapLabEditorPage(
  initialEntry: string = '/dungeons/4/edit',
  route: DungeonRouteContext = {
    dungeonId: 4,
    dungeon: { id: 4, title: 'Test Dungeon', data: {} },
    status: 'ready',
    error: null,
  },
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DungeonRouteContextProvider value={route}>
        <MapLabEditorPage />
      </DungeonRouteContextProvider>
    </MemoryRouter>,
  )
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

function clientPointForCell(cell: [number, number], bounds: { minX: number; minY: number }) {
  return { clientX: (cell[0] - bounds.minX) * 64, clientY: (cell[1] - bounds.minY) * 64 }
}

function dragRoomBrush(container: HTMLElement, bounds: { minX: number; minY: number }, cells: Array<[number, number]>) {
  const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
  fireEvent.pointerDown(viewport, { pointerId: 1, button: 0, ...clientPointForCell(cells[0], bounds) })
  for (const cell of cells.slice(1)) {
    fireEvent.pointerMove(window, { pointerId: 1, ...clientPointForCell(cell, bounds) })
  }
  fireEvent.pointerUp(window, { pointerId: 1 })
}

describe('MapLabEditorPage (Stage I3 — grid marker layout)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  const baseLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room' }],
    doors: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
  }

  it('a co-located stair and portal render as distinct, non-overlapping markers', async () => {
    const layout = {
      ...baseLayout,
      stairs: [{ stair_id: 1, from: { z: 0, cell: [0, 0] }, to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }],
      props: [],
      portals: [{ portal_id: 1, cell: [0, 0], z: 0, to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    const stairCircle = container.querySelector('.maplab-stair-marker')!
    const portalCircle = container.querySelector('.maplab-portal-marker')!
    const stairCx = Number(stairCircle.getAttribute('cx'))
    const portalCx = Number(portalCircle.getAttribute('cx'))
    const stairR = Number(stairCircle.getAttribute('r'))
    const portalR = Number(portalCircle.getAttribute('r'))
    // Distinct centers, separated by at least the sum of their radii — not overlapping.
    expect(stairCx).not.toBe(portalCx)
    expect(Math.abs(stairCx - portalCx)).toBeGreaterThanOrEqual(stairR + portalR)
  })

  it('a lone stair still renders centered on its cell (no grouped shrink/offset)', async () => {
    const layout = {
      ...baseLayout,
      stairs: [{ stair_id: 1, from: { z: 0, cell: [0, 0] }, to: { z: 0, cell: [0, 0] }, hidden: false, locked: false, trapped: false }],
      props: [],
      portals: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    const stairCircle = container.querySelector('.maplab-stair-marker')!
    expect(Number(stairCircle.getAttribute('cx'))).toBe(0.5 * 64)
    expect(Number(stairCircle.getAttribute('cy'))).toBe(0.5 * 64)
  })

  it('refuses a 5th marker on a cell already holding the max (4) and shows an error', async () => {
    const layout = {
      ...baseLayout,
      stairs: [],
      portals: [],
      props: [
        { prop_id: 1, kind: 'chest', z: 0, cell: [0, 0], hidden: false, locked: false, trapped: false },
        { prop_id: 2, kind: 'table', z: 0, cell: [0, 0], hidden: false, locked: false, trapped: false },
        { prop_id: 3, kind: 'barrel', z: 0, cell: [0, 0], hidden: false, locked: false, trapped: false },
        { prop_id: 4, kind: 'statue', z: 0, cell: [0, 0], hidden: false, locked: false, trapped: false },
      ],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelectorAll('.maplab-prop')).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: 'Prop' }))
    fireEvent.click(container.querySelector('.maplab-prop-placement-cell') as Element)

    const placementStatus = screen.getByText(/already has 4 markers/i)
    expect(placementStatus).toHaveTextContent(/already has 4 markers/i)
    expect(placementStatus.closest('.maplab-map-status')).toBeInTheDocument()
    expect(container.querySelectorAll('.maplab-prop')).toHaveLength(4)

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('shows disabled on-canvas history controls until an edit is made', async () => {
    const layout = {
      ...baseLayout,
      stairs: [],
      portals: [],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    const undo = screen.getByRole('button', { name: 'Undo' })
    const redo = screen.getByRole('button', { name: 'Redo' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()
    expect(undo.closest('.maplab-map-controls')).toBeInTheDocument()

    fireEvent.click(within(screen.getByRole('group', { name: 'Drawing tools' })).getByRole('button', { name: 'Room' }))
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[2, 0]])

    expect(undo).toBeEnabled()
    fireEvent.click(undo)
    expect(redo).toBeEnabled()
  })
})
