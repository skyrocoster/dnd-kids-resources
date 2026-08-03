import { act, fireEvent, render, screen } from '@testing-library/react'
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

function armPassageTool(tool: 'door' | 'stair' | 'portal') {
  fireEvent.click(screen.getByRole('button', { name: 'Choose passage tool' }))
  fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(`^${tool}$`, 'i') }))
}

describe('MapLabEditorPage stair authoring', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  const twoFloorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [
      { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Ground Room' },
      { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: 'Upper Room' },
    ],
    doors: [],
    stairs: [],
    floors: [
      { z: 0, title: 'Ground Floor' },
      { z: 1, title: 'First Floor' },
    ],
    props: [],
  }

  it('places a stair on a room cell, selects it, and shows up/down direction checkboxes', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    armPassageTool('stair')
    expect(container.querySelectorAll('.maplab-stair-placement-cell').length).toBeGreaterThan(0)

    fireEvent.click(container.querySelector('.maplab-stair-placement-cell') as Element)

    expect(container.querySelectorAll('.maplab-stair-placement-cell').length).toBeGreaterThan(0)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()
    expect(screen.getByLabelText('Stairs up to floor 1')).toBeChecked()
    expect(screen.getByLabelText('Stairs down (no floor below)')).toBeDisabled()
    expect(container.querySelector('.maplab-stair[data-selected]')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
  })

  it('unchecking the direction checkbox removes the stair; the form closes since it was selected', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    armPassageTool('stair')
    fireEvent.click(container.querySelector('.maplab-stair-placement-cell') as Element)

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    const savedData = saveSpy.mock.calls[0][1].data as { stairs: Array<{ to: { z: number; cell: number[] } }> }
    expect(savedData.stairs[0].to).toEqual({ z: 1, cell: [0, 0] })

    fireEvent.click(screen.getByLabelText('Stairs up to floor 1'))
    expect(container.querySelector('.maplab-fixture-form')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    const finalData = saveSpy.mock.calls[saveSpy.mock.calls.length - 1][1].data as { stairs: unknown[] }
    expect(finalData.stairs).toHaveLength(0)
  })

  it('"Place door", "Place prop", and "Place stair" placement modes are mutually exclusive', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    armPassageTool('door')
    expect(container.querySelectorAll('.maplab-door-placement-edge').length).toBeGreaterThan(0)

    armPassageTool('stair')
    expect(container.querySelectorAll('.maplab-door-placement-edge')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-stair-placement-cell').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Prop' }))
    expect(container.querySelectorAll('.maplab-stair-placement-cell')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-prop-placement-cell').length).toBeGreaterThan(0)
  })

  it('two stairs landing on the same cell render as distinct, independently selectable markers', async () => {
    const layoutWithLanding = {
      ...twoFloorLayout,
      stairs: [
        { stair_id: 1, from: { z: 0, cell: [0, 0] }, to: { z: 1, cell: [0, 0] }, hidden: false, locked: false, trapped: false, title: 'Up Stair' },
        { stair_id: 2, from: { z: 0, cell: [0, 0] }, to: { z: -1, cell: [0, 0] }, hidden: false, locked: false, trapped: false, title: 'Down Stair' },
      ],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layoutWithLanding })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layoutWithLanding })

    const { container } = renderMapLabEditorPage()
    await flush()

    const stairMarkers = Array.from(container.querySelectorAll('.maplab-stair'))
    expect(stairMarkers).toHaveLength(2)
    const circles = stairMarkers.map((el) => el.querySelector('circle')?.getAttribute('cx'))
    expect(new Set(circles).size).toBe(2)

    fireEvent.click(stairMarkers[0])
    expect(stairMarkers[0]).toHaveAttribute('data-selected')
    expect(stairMarkers[1]).not.toHaveAttribute('data-selected')

    fireEvent.click(stairMarkers[1])
    expect(stairMarkers[0]).not.toHaveAttribute('data-selected')
    expect(stairMarkers[1]).toHaveAttribute('data-selected')
  })
})

describe('MapLabEditorPage portal doors', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  const twoFloorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [
      { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Ground Room' },
      { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: 'Upper Room' },
    ],
    doors: [],
    stairs: [],
    floors: [
      { z: 0, title: 'Ground Floor' },
      { z: 1, title: 'First Floor' },
    ],
    props: [],
    portals: [],
  }

  it('places a portal on a room cell, selects it, and shows its properties form with a destination picker', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    armPassageTool('portal')
    expect(container.querySelectorAll('.maplab-portal-placement-cell').length).toBeGreaterThan(0)
    fireEvent.click(container.querySelector('.maplab-portal-placement-cell') as Element)
    expect(container.querySelectorAll('.maplab-portal-placement-cell').length).toBeGreaterThan(0)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()
    expect(screen.getByLabelText('Floor')).toBeInTheDocument()
    expect(screen.getByLabelText('Room')).toBeInTheDocument()
    expect(container.querySelector('.maplab-portal[data-selected]')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
  })

  it('targeting a non-adjacent room via the picker auto-creates a paired return portal there', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    const { container } = renderMapLabEditorPage()
    await flush()
    armPassageTool('portal')
    fireEvent.click(container.querySelector('.maplab-portal-placement-cell') as Element)
    fireEvent.change(screen.getByLabelText('Floor'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '2' } })
    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { portals: Array<{ portal_id: number; z: number; cell: number[]; to: { z: number; cell: number[] } }> }
    expect(savedData.portals).toHaveLength(2)
    const [source, paired] = savedData.portals
    expect(source.to).toEqual({ z: 1, cell: [0, 0] })
    expect(paired).toMatchObject({ z: 1, cell: [0, 0], to: { z: source.z, cell: source.cell } })
    fireEvent.click(screen.getByRole('button', { name: /delete portal/i }))
    expect(container.querySelector('.maplab-fixture-form')).not.toBeInTheDocument()
  })

  it('"Place door", "Place prop", "Place stair", and "Place portal" placement modes are mutually exclusive', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    const { container } = renderMapLabEditorPage()
    await flush()
    armPassageTool('door')
    expect(container.querySelectorAll('.maplab-door-placement-edge').length).toBeGreaterThan(0)
    armPassageTool('stair')
    expect(container.querySelectorAll('.maplab-door-placement-edge')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-stair-placement-cell').length).toBeGreaterThan(0)
    armPassageTool('portal')
    expect(container.querySelectorAll('.maplab-stair-placement-cell')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-portal-placement-cell').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Prop' }))
    expect(container.querySelectorAll('.maplab-portal-placement-cell')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-prop-placement-cell').length).toBeGreaterThan(0)
  })

  it('retargeting a portal onto an existing portal re-links instead of duplicating', async () => {
    const layoutWithPortal = { ...twoFloorLayout, portals: [{ portal_id: 1, cell: [0, 0], z: 1, to: { z: 1, cell: [0, 0] }, hidden: false, locked: false, trapped: false, title: 'Existing Portal' }] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layoutWithPortal })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layoutWithPortal })
    const { container } = renderMapLabEditorPage()
    await flush()
    armPassageTool('portal')
    fireEvent.click(container.querySelector('.maplab-portal-placement-cell') as Element)
    fireEvent.change(screen.getByLabelText('Floor'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '2' } })
    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    const savedData = saveSpy.mock.calls[0][1].data as { portals: Array<{ portal_id: number; z: number; cell: number[]; to: { z: number; cell: number[] } }> }
    expect(savedData.portals).toHaveLength(2)
    const existing = savedData.portals.find((p) => p.portal_id === 1)!
    expect(existing.to).toEqual({ z: 0, cell: [0, 0] })
  })
})
