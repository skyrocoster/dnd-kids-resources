import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import { MapLabEditorPage } from '../MapLabEditorPage'
import { mapLabLayout } from '../maplabData'
import {
  DungeonRouteContextProvider,
  type DungeonRouteContext,
} from '../dungeonRouteContext'

const mapLabLayoutFixture: Record<string, unknown> = { ...mapLabLayout }

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

/** Arms a Passages sub-tool (door/stair/portal) via the tool palette's group flyout — opens the
 * flyout, then clicks the named menu item, mirroring how a person actually reaches this tool. */
function armPassageTool(tool: 'door' | 'stair' | 'portal') {
  fireEvent.click(screen.getByRole('button', { name: 'Choose passage tool' }))
  fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(`^${tool}$`, 'i') }))
}

/** Converts a grid cell to the `clientX`/`clientY` a real pointer event over it would carry —
 * mirrors `cellFromClientPoint` (jsdom's viewport rect is always {left:0,top:0}, zoom starts at
 * scale 1 / pan {0,0}, and CELL_SIZE is 64px), so tests can name cells instead of raw pixels. */
function clientPointForCell(cell: [number, number], bounds: { minX: number; minY: number }) {
  return { clientX: (cell[0] - bounds.minX) * 64, clientY: (cell[1] - bounds.minY) * 64 }
}

/** Simulates a Room-tool brush stroke over `cells`: pointerdown on the first cell, pointermove
 * through the rest, pointerup to commit — mirrors how `useCanvasStroke`'s handlers are actually
 * wired (down on the viewport element, move/up on `window`). */
function dragRoomBrush(container: HTMLElement, bounds: { minX: number; minY: number }, cells: Array<[number, number]>) {
  const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
  fireEvent.pointerDown(viewport, { pointerId: 1, button: 0, ...clientPointForCell(cells[0], bounds) })
  for (const cell of cells.slice(1)) {
    fireEvent.pointerMove(window, { pointerId: 1, ...clientPointForCell(cell, bounds) })
  }
  fireEvent.pointerUp(window, { pointerId: 1 })
}

describe('MapLabEditorPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayoutFixture as unknown as Record<string, unknown> })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('loads a blank layout when the backend has no saved layout (404) and does not save until edited', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockRejectedValue(new api.ApiError(404, 'not found'))
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: {} })

    const { container } = renderMapLabEditorPage()
    await flush()

    expect(screen.getByText('No saved layout yet. Your first edit will save this blank map.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find room…' })).toBeInTheDocument()
    expect(screen.queryByText('Combat Training Hall')).not.toBeInTheDocument()
    expect(saveSpy).not.toHaveBeenCalled()

    // A blank layout's padded bounds are [-3, 3] on both axes (no rooms, 3-unit padding).
    fireEvent.click(screen.getByRole('button', { name: 'Room' }))
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[-3, -3]])

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
  })

  it('mounts the door badge overlay after the door glyph layer', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })

    const { container } = renderMapLabEditorPage()
    await flush()

    const door = container.querySelector('.maplab-door') as Element
    const layer = container.querySelector('.maplab-door-badge-layer') as Element
    expect(door.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders a saved layout from the backend', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Saved Room' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    renderMapLabEditorPage()
    await flush()

    expect(screen.getAllByText('Saved Room').length).toBeGreaterThan(0)
  })

  it('Room tool creates a room from the first stroke and autosaves (debounced)', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    expect(screen.getByRole('button', { name: 'Find room…' })).toBeInTheDocument()
    expect(saveSpy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Room' }))
    // A blank layout's padded bounds are [-3, 3] on both axes.
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[-3, -3]])

    expect(screen.getAllByText('Room 1').length).toBeGreaterThan(0)
    expect(saveSpy).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(saveSpy.mock.calls[0][0]).toBe(4)
  })

  it('places a door on a wall edge and shows its properties form', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    armPassageTool('door')
    expect(container.querySelectorAll('.maplab-door-placement-edge').length).toBeGreaterThan(0)

    fireEvent.click(container.querySelector('.maplab-door-placement-hitband') as Element)

    expect(container.querySelectorAll('.maplab-door-placement-edge')).toHaveLength(0)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
  })

  it('edits door properties and autosaves the change', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [{ door_id: 1, cell: [0, 0], side: 'N', hidden: false, locked: false, trapped: false }],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-door') as Element)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()

    const lockedCheckbox = screen.getByLabelText('Locked') as HTMLInputElement
    fireEvent.click(lockedCheckbox)
    expect(lockedCheckbox.checked).toBe(true)
    expect(screen.getByLabelText('Break DC')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { doors: Array<{ locked: boolean }> }
    expect(savedData.doors[0]).toMatchObject({ locked: true })

    fireEvent.click(screen.getByRole('button', { name: /delete door/i }))
    expect(container.querySelector('.maplab-fixture-form')).not.toBeInTheDocument()
    expect(screen.getByText('Deleted door.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo deletion' }))
    expect(container.querySelector('.maplab-door')).toBeInTheDocument()
  })

  it('confirms room deletion before removing the room', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [], stairs: [], floors: [{ z: 0, title: 'Ground Floor' }], props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    const room = container.querySelector('.maplab-room') as Element
    fireEvent.click(room)
    fireEvent.click(screen.getByRole('button', { name: 'Delete room' }))
    expect(screen.getByText('Delete "Room 1"? This cannot be undone.')).toBeInTheDocument()
    expect(container.querySelector('.maplab-room')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(container.querySelector('.maplab-room')).not.toBeInTheDocument()
  })

  it('shows room content editing and persists room title changes', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: { rooms: [{ room_id: 1, title: 'Room 1', entries: [], npcs: [] }] } })
    const updateDungeonSpy = vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getAllByRole('button', { name: 'Room 1' })[0])
    const titleInput = screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement
    expect(titleInput.value).toBe('Room 1')

    fireEvent.change(titleInput, { target: { value: 'Renamed Room' } })

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(updateDungeonSpy).toHaveBeenCalledTimes(1)
    const payload = updateDungeonSpy.mock.calls[0][1].data as { rooms: Array<{ title: string }> }
    expect(payload.rooms[0].title).toBe('Renamed Room')
  })

  it('shows the create-room-data action for layout-only rooms', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: { rooms: [] } })
    const updateDungeonSpy = vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getAllByRole('button', { name: 'Room 1' })[0])
    expect(screen.getByRole('button', { name: 'Create room data' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create room data' }))

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(updateDungeonSpy).toHaveBeenCalledTimes(1)
    const payload = updateDungeonSpy.mock.calls[0][1].data as { rooms: Array<{ room_id: number; title: string }> }
    expect(payload.rooms[0]).toMatchObject({ room_id: 1, title: '' })
  })
})

describe('MapLabEditorPage (Stage G-fix — black-fill bug)', () => {
  it('canvas wrapper renders data-variant="neutral" so room cells get the correct fill color', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await act(async () => {
      await Promise.resolve()
    })

    const canvasWrapper = container.querySelector('.maplab-canvas-wrapper')
    expect(canvasWrapper).toHaveAttribute('data-variant', 'neutral')
  })
})


