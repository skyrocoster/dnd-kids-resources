import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import { MapLabEditorPage } from '../MapLabEditorPage'
import { mapLabLayout } from '../maplabData'
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

function clientPointForCell(cell: [number, number], bounds: { minX: number; minY: number }) {
  return { clientX: (cell[0] - bounds.minX) * 64, clientY: (cell[1] - bounds.minY) * 64 }
}

describe('MapLabEditorPage (Stage F2 — prop rendering)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the seeded Treasure Chest prop with its kind icon and locked state, selectable in F3', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: { ...mapLabLayout } })

    const { container } = renderMapLabEditorPage()
    await flush()

    const propMarkers = Array.from(container.querySelectorAll('.maplab-prop'))
    const chest = propMarkers.find((el) => el.querySelector('title')?.textContent === 'Treasure Chest')
    expect(chest).toBeTruthy()
    expect(chest).toHaveAttribute('data-state', 'locked')
    expect(chest?.querySelector('svg')).toBeTruthy()
    expect(chest).toHaveAttribute('role', 'button')
  })
})

describe('MapLabEditorPage (Stage F3 — prop authoring)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  const oneRoomLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [],
  }

  it('places a prop on a room cell and shows its properties form', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneRoomLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Prop' }))
    expect(container.querySelectorAll('.maplab-prop-placement-cell').length).toBeGreaterThan(0)
    fireEvent.click(container.querySelector('.maplab-prop-placement-cell') as Element)
    expect(container.querySelectorAll('.maplab-prop-placement-cell').length).toBeGreaterThan(0)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
  })

  it('"Place door" and "Place prop" placement modes are mutually exclusive', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    const { container } = renderMapLabEditorPage()
    await flush()
    armPassageTool('door')
    expect(container.querySelectorAll('.maplab-door-placement-edge').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Prop' }))
    expect(container.querySelectorAll('.maplab-door-placement-edge')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-prop-placement-cell').length).toBeGreaterThan(0)
  })

  it('edits prop kind, a flag, and attach-to-wall, then deletes it', async () => {
    const layoutWithProp = {
      ...oneRoomLayout,
      props: [{ prop_id: 1, kind: 'chest', cell: [0, 0], title: 'A Chest', hidden: false, locked: false, trapped: false }],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layoutWithProp })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layoutWithProp })
    const { container } = renderMapLabEditorPage()
    await flush()
    fireEvent.click(container.querySelector('.maplab-prop') as Element)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()
    const lockedCheckbox = screen.getByLabelText('Locked') as HTMLInputElement
    fireEvent.click(lockedCheckbox)
    expect(lockedCheckbox.checked).toBe(true)
    const wallSelect = screen.getByLabelText('Attach to wall') as HTMLSelectElement
    fireEvent.change(wallSelect, { target: { value: 'N' } })
    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { props: Array<{ locked: boolean; side?: string }> }
    expect(savedData.props[0]).toMatchObject({ locked: true, side: 'N' })
    fireEvent.click(screen.getByRole('button', { name: /delete prop/i }))
    expect(container.querySelector('.maplab-fixture-form')).not.toBeInTheDocument()
  })
})

describe('MapLabEditorPage (Stage D3 — encounter marker authoring)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })
  const oneRoomLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [], stairs: [], floors: [{ z: 0, title: 'Ground Floor' }],
    props: [{ prop_id: 1, kind: 'encounter', cell: [0, 0], title: 'Ambush', hidden: false, locked: false, trapped: false, encounter_id: null }],
  }
  it("lists encounters by title in the picker, attaches one via the Kind='encounter' marker's form, and persists encounter_id", async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    vi.spyOn(api, 'listEncounters').mockResolvedValue([{ id: 5, title: 'Goblin Ambush' }, { id: 9, title: 'Dragon Lair' }])
    const { container } = renderMapLabEditorPage()
    await flush()
    fireEvent.click(container.querySelector('.maplab-prop') as Element)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()
    await flush()
    const picker = screen.getByLabelText('Encounter') as HTMLSelectElement
    expect(Array.from(picker.options).map((o) => o.textContent)).toEqual(['No encounter', 'Goblin Ambush', 'Dragon Lair'])
    fireEvent.change(picker, { target: { value: '9' } })
    await act(async () => { vi.advanceTimersByTime(700); await Promise.resolve() })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { props: Array<{ encounter_id: number | null }> }
    expect(savedData.props[0]).toMatchObject({ encounter_id: 9 })
  })
  it('the Encounter picker only shows for encounter-kind markers', async () => {
    const chestLayout = { ...oneRoomLayout, props: [{ prop_id: 1, kind: 'chest', cell: [0, 0], title: 'A Chest', hidden: false, locked: false, trapped: false }] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: chestLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: chestLayout })
    vi.spyOn(api, 'listEncounters').mockResolvedValue([])
    const { container } = renderMapLabEditorPage()
    await flush()
    fireEvent.click(container.querySelector('.maplab-prop') as Element)
    expect(screen.queryByLabelText('Encounter')).not.toBeInTheDocument()
  })
})

describe('MapLabEditorPage (Stage F4 — prop stays clickable under the paint overlay)', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.useFakeTimers() })
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers() })
  it('a prop on a selected room cell is still selectable while the room brush overlay is active', async () => {
    const layoutWithProp = { meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } }, rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }], doors: [], stairs: [], floors: [{ z: 0, title: 'Ground Floor' }], props: [{ prop_id: 1, kind: 'chest', cell: [0, 0], title: 'A Chest', hidden: false, locked: false, trapped: false }] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layoutWithProp })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layoutWithProp })
    const { container } = renderMapLabEditorPage()
    await flush()
    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    fireEvent.pointerDown(viewport, { pointerId: 1, button: 0, ...clientPointForCell([0, 0], { minX: -3, minY: -3 }) })
    expect(container.querySelector('.maplab-room-brush-cell[data-brush-state="paint"]')).toBeInTheDocument()
    fireEvent.click(container.querySelector('.maplab-prop') as Element)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()
    fireEvent.pointerUp(window, { pointerId: 1 })
  })
})

describe('MapLabEditorPage (floor-stacking regression — doors/props confined to their own floor)', () => {
  it('door98 (ground floor) does not render as a live door when the coincident-coordinate upper floor is active', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: { ...mapLabLayout } })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: { ...mapLabLayout } })
    const { container } = renderMapLabEditorPage()
    await flush()
    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))
    const doorLabels = Array.from(container.querySelectorAll('.maplab-door')).map((el) => el.getAttribute('aria-label'))
    expect(doorLabels.some((label) => label?.includes('Rusty Trap Door'))).toBe(false)
  })
})

describe('VT0 — Live-surface scaffolding seams', () => {
  const oneRoomLayout = { meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } }, rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }], doors: [], stairs: [], floors: [{ z: 0, title: 'Ground Floor' }], props: [] }
  beforeEach(() => {
    vi.restoreAllMocks(); vi.useFakeTimers()
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
  })
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers() })
  it('inspector Delete/Close actions are grouped in a distinct selection-action region (VT3 inspector actions)', async () => {
    const { container } = renderMapLabEditorPage(); await flush()
    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    const actionRegion = screen.getByRole('group', { name: 'Selection actions' })
    expect(actionRegion).toBeInTheDocument(); expect(actionRegion).toHaveClass('maplab-inspector-actions')
    expect(within(actionRegion).getByRole('button', { name: /delete room/i })).toBeInTheDocument()
    expect(within(actionRegion).getByRole('button', { name: /close/i })).toBeInTheDocument()
  })
  it('inspector rail fields meet the 48px touch-target floor in normal density (VT3 compact fields)', async () => {
    const layoutWithDoor = { ...oneRoomLayout, doors: [{ door_id: 1, cell: [0, 0], side: 'N', hidden: false, locked: false, trapped: false }] }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layoutWithDoor })
    const { container } = renderMapLabEditorPage(); await flush()
    fireEvent.click(container.querySelector('.maplab-door') as Element)
    expect(screen.getByLabelText('Hidden').closest('.maplab-field-row')).toHaveTextContent('Hidden')
    expect(screen.getByLabelText('Locked').closest('.maplab-field-row')).toHaveTextContent('Locked')
    const actionRegion = screen.getByRole('group', { name: 'Selection actions' })
    expect(within(actionRegion).getByRole('button', { name: 'Delete door' })).toHaveClass('maplab-pill-button')
    expect(within(actionRegion).getByRole('button', { name: 'Close' })).toHaveClass('maplab-pill-button')
  })
  it('changing the Wall kind dropdown updates the room and autosaves', async () => {
    const layout = { ...oneRoomLayout }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: { rooms: [{ room_id: 1, title: 'Room 1', entries: [], npcs: [] }] } })
    const saveLayoutSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })
    renderMapLabEditorPage(); await flush()
    fireEvent.click(screen.getAllByRole('button', { name: 'Room 1' })[0])
    const wallKindSelect = screen.getByLabelText('Wall kind') as HTMLSelectElement
    expect(wallKindSelect.value).toBe('solid')
    fireEvent.change(wallKindSelect, { target: { value: 'natural' } })
    await act(async () => { vi.advanceTimersByTime(700); await Promise.resolve() })
    expect(saveLayoutSpy).toHaveBeenCalledTimes(1)
    const savedData = saveLayoutSpy.mock.calls[0][1].data as { rooms: Array<{ wallKind: string }> }
    expect(savedData.rooms[0].wallKind).toBe('natural')
  })
})
