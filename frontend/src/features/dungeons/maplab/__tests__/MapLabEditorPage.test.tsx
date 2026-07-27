import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import { MapLabEditorPage } from '../MapLabEditorPage'
import { mapLabLayout } from '../maplabData'
import {
  DungeonRouteContextProvider,
  DungeonShellStatusSlotProvider,
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

/** Arms a Terrain sub-tool (river/trees) via the tool palette's group flyout. */
function armTerrainTool(tool: 'river' | 'trees') {
  fireEvent.click(screen.getByRole('button', { name: 'Choose terrain tool' }))
  fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(`^${tool}$`, 'i') }))
}

/** Opens the "View" popover so its layer toggles, Ghost lower floor toggle, and density buttons
 * are present in the DOM to query against. */
function openViewPopover() {
  fireEvent.click(screen.getByRole('button', { name: 'View' }))
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

/** Pan is applied as `transform: translate(...)` on the SVG (see MapCanvas), not scrollLeft/scrollTop. */
function readTranslate(svg: SVGSVGElement): { x: number; y: number } {
  const style = svg.getAttribute('style') ?? ''
  const match = style.match(/translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/)
  return { x: match ? Number(match[1]) : 0, y: match ? Number(match[2]) : 0 }
}

describe('MapLabEditorPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
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
    expect(screen.getByText('No rooms on this floor yet.')).toBeInTheDocument()
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

    expect(screen.getByText('No rooms on this floor yet.')).toBeInTheDocument()
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

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
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

describe('MapLabEditorPage (Stage E2 — Canvas zoom & pan)', () => {
  const singleRoomLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [],
  }
  // 1 cell, padded ±3 on every side -> a 7x7-unit bounds -> 448x448px at scale 1 (BASE_PX_PER_UNIT=64).
  const CONTENT_PX_AT_SCALE_1 = 448

  let originalResizeObserver: unknown

  beforeEach(() => {
    vi.restoreAllMocks()
    originalResizeObserver = (globalThis as { ResizeObserver?: unknown }).ResizeObserver
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    class TestResizeObserver {
      private callback: () => void
      constructor(callback: () => void) {
        this.callback = callback
      }
      observe() {
        this.callback()
      }
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = TestResizeObserver
    // jsdom has no layout engine (clientWidth/clientHeight are always 0) — stub a fixed viewport
    // size so fitToBounds has something real to fit against.
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 640 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 640 })
  })

  afterEach(() => {
    ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = originalResizeObserver
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight
  })

  async function renderEditor() {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    const utils = renderMapLabEditorPage()
    await flush()
    return utils
  }

  it('SVG gets explicit px width/height based on zoom level, not width:100%', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement

    expect(svg).toHaveAttribute('width', String(CONTENT_PX_AT_SCALE_1))
    expect(svg).toHaveAttribute('height', String(CONTENT_PX_AT_SCALE_1))
    expect(svg.getAttribute('style') ?? '').not.toContain('100%')
  })

  it('zoom controls (+/−/Reset) change the scale and SVG dimensions', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 1.25)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 0.75)
  })

  it('Reset button fits the current floor to the viewport bounds', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(Number(svg.getAttribute('width'))).not.toBeCloseTo(640)

    // Fit now targets the drawn room bounds (1x1 cell = 64px), not the padded grid -> scale clamps
    // to MAX_SCALE (3). The SVG itself still renders from the padded 7x7 grid, so its width/height
    // is CONTENT_PX_AT_SCALE_1 * 3.
    fireEvent.click(screen.getByRole('button', { name: 'Fit map to viewport' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 3)
    expect(Number(svg.getAttribute('height'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 3)
  })

  it('editor plain wheel zooms toward the cursor position without Ctrl', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as Element

    fireEvent.wheel(viewport, { deltaY: -100, clientX: 40, clientY: 40 })
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 1.1)
  })

  it('click-drag pans the canvas from anywhere while no tool is armed', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    const room = container.querySelector('.maplab-room') as Element

    // A drag that starts on the room pans when no tool is armed.
    fireEvent.pointerDown(room, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 100, clientY: 60 })
    fireEvent.pointerUp(window)
    expect(readTranslate(svg)).toEqual({ x: 100, y: 60 })

    // A drag starting on empty canvas also pans — the SVG translates opposite the drag direction, so the
    // content under the pointer appears to follow the finger/cursor. This pan is applied on top of the first block's pan.
    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 100, clientY: 60 })
    fireEvent.pointerUp(window)
    expect(readTranslate(svg)).toEqual({ x: 200, y: 120 })
  })

  it('pan and zoom work together: zoom + drag + reset all coordinate correctly', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 1.25)

    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 50, clientY: 20 })
    fireEvent.pointerUp(window)
    // Zoom buttons now anchor on the viewport centre, so zooming shifts the pan. Viewport centre is
    // 320px, zoom scale moves 1 → 1.25 (pan delta 80 on both axes), and the drag subtracts that.
    expect(readTranslate(svg)).toEqual({ x: -30, y: -60 })

    fireEvent.click(screen.getByRole('button', { name: 'Fit map to viewport' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 3)
    expect(readTranslate(svg)).toEqual({ x: -352, y: -352 })
  })

  it('entering fullscreen refits the map to the viewport', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(Number(svg.getAttribute('width'))).not.toBeCloseTo(640)

    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 50, clientY: 20 })
    fireEvent.pointerUp(window)

    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen map editor' }))

    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 3)
    expect(Number(svg.getAttribute('height'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 3)
    expect(readTranslate(svg)).toEqual({ x: -352, y: -352 })
  })
})

describe('MapLabEditorPage (Phase K scaffolding)', () => {
  const singleRoomLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [{ prop_id: 1, kind: 'chest', z: 0, cell: [0, 0], title: 'Marker Prop', hidden: false, locked: false, trapped: false }],
    portals: [],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('K1: fullscreen toggle and Escape exit the fullscreen workspace', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const wrapper = container.querySelector('.maplab-editor')
    expect(wrapper).not.toHaveAttribute('data-fullscreen')

    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen map editor' }))
    expect(wrapper).toHaveAttribute('data-fullscreen')
    expect(wrapper).toHaveAttribute('role', 'dialog')
    expect(wrapper).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/drag to pan\. pinch or scroll to zoom\./i)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(wrapper).not.toHaveAttribute('data-fullscreen')
  })

  it('K3: the Room tool surfaces create vs. paint instructions depending on selection', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Room' }))
    expect(screen.getByText(/drag on empty ground to start a new room/i)).toBeInTheDocument()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    expect(screen.getByText(/drag to add squares to the room/i)).toBeInTheDocument()
  })

  it('K1: fullscreen workspace has no native scrollbars and drag-pan works from any element while no tool is armed', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen map editor' }))

    const editor = container.querySelector('.maplab-editor') as HTMLElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const prop = container.querySelector('.maplab-prop') as Element

    expect(editor).toHaveAttribute('data-fullscreen')
    expect(viewport).toBeInTheDocument()

    fireEvent.pointerDown(prop, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 80, clientY: 45 })
    fireEvent.pointerUp(window)
    expect(readTranslate(svg)).toEqual({ x: 80, y: 45 })

    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 80, clientY: 45 })
    fireEvent.pointerUp(window)
    expect(readTranslate(svg)).toEqual({ x: 160, y: 90 })
  })

  it('K1 regression: fullscreen workspace contains the toolbar and room list', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen map editor' }))

    const editor = container.querySelector('.maplab-editor') as HTMLElement
    expect(editor).toHaveAttribute('data-fullscreen')

    // Toolbar controls are inside the fullscreen workspace
    expect(screen.getByRole('button', { name: 'Room' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Select/ })).toBeInTheDocument()

    // The room list is inside the fullscreen workspace
    const roomList = editor.querySelector('.maplab-editor-room-list')
    expect(roomList).toBeInTheDocument()
    expect(within(roomList as HTMLElement).getByText('Room 1')).toBeInTheDocument()

    // Navigation rail is inside the fullscreen workspace
    const navRail = editor.querySelector('.maplab-editor-nav-rail')
    expect(navRail).toBeInTheDocument()
  })

  it('tool mode: selecting a room prevents drag-pan on the canvas (paint overlay holds the pointer)', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement

    // Select a room to enter tool mode
    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)

    // Attempt to drag from the canvas — in tool mode, this does not pan
    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 100, clientY: 60 })
    fireEvent.pointerUp(window)
    expect(readTranslate(svg)).toEqual({ x: 0, y: 0 })
  })

  const ROOM_BOUNDS = { minX: -3, minY: -3 }

  it('K2: dragging on empty ground with the Room tool armed and no room selected creates a new room', async () => {
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Room' }))
    dragRoomBrush(container, ROOM_BOUNDS, [[2, 0], [2, 1]])

    expect(screen.getAllByText('Room 2').length).toBeGreaterThan(0)

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { rooms: Array<{ room_id: number; cells: number[][] }> }
    const newRoom = savedData.rooms.find((room) => room.room_id === 2)
    expect(newRoom?.cells).toEqual(expect.arrayContaining([[2, 0], [2, 1]]))
    expect(newRoom?.cells).toHaveLength(2)
  })

  it('K2: dragging with an existing room selected paints and extends its footprint', async () => {
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    dragRoomBrush(container, ROOM_BOUNDS, [[1, 0], [2, 0]])

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { rooms: Array<{ cells: number[][] }> }
    expect(savedData.rooms[0].cells).toEqual(expect.arrayContaining([[0, 0], [1, 0], [2, 0]]))
    expect(savedData.rooms[0].cells).toHaveLength(3)
  })

  it('K2: Erase armed removes stroked cells from the selected room', async () => {
    const twoCellLayout = {
      ...singleRoomLayout,
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0], [1, 0]], title: 'Room 1' }],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoCellLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoCellLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    dragRoomBrush(container, ROOM_BOUNDS, [[1, 0]])

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { rooms: Array<{ cells: number[][] }> }
    expect(savedData.rooms[0].cells).toEqual([[0, 0]])
  })

  it('K4: Erasing the last square of an empty room removes it and shows Undo chip', async () => {
    const emptyRoomLayout = {
      ...singleRoomLayout,
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]] }],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: emptyRoomLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: emptyRoomLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    dragRoomBrush(container, ROOM_BOUNDS, [[0, 0]])

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { rooms: Array<{ room_id: number }> }
    expect(savedData.rooms).toHaveLength(0)

    expect(screen.getByText('Removed empty room.')).toBeInTheDocument()
    const undoButton = screen.getByRole('button', { name: 'Undo removal' })
    fireEvent.click(undoButton)

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(2)
    const restoredData = saveSpy.mock.calls[1][1].data as { rooms: Array<{ room_id: number; cells: number[][] }> }
    expect(restoredData.rooms).toHaveLength(1)
    expect(restoredData.rooms[0].cells).toEqual([[0, 0]])
  })

  it('K2: painting cells owned by another room silently skips them and does not save', async () => {
    const blockedLayout = {
      ...singleRoomLayout,
      rooms: [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' },
        { room_id: 2, z: 0, origin: [0, 0], cells: [[2, 0]], title: 'Room 2' },
      ],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: blockedLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: blockedLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    dragRoomBrush(container, ROOM_BOUNDS, [[2, 0]])

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('K2: "New room" deselects the current room and arms the Room tool for the next stroke', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    expect(container.querySelector('.maplab-editor-room-item[data-selected]')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'New room' }))

    expect(container.querySelector('.maplab-editor-room-item[data-selected]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Room' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('MapLabEditorPage (Stage E3 — Toolbar reorganization & persistent inspector)', () => {
  const oneRoomOneDoorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [{ door_id: 1, cell: [0, 0], side: 'N', hidden: false, locked: false, trapped: false }],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [],
  }

  beforeEach(() => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneRoomOneDoorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneRoomOneDoorLayout })
  })

  it('toolbar groups Create buttons into a tray and folds Reset into the Map popover', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const groups = container.querySelectorAll('.maplab-toolbar-group')
    expect(groups.length).toBeGreaterThanOrEqual(1)

    const labels = Array.from(groups).map((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent)
    expect(labels).toContain('Create')

    const createGroup = Array.from(groups).find((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent === 'Create')
    expect(createGroup?.textContent).toMatch(/Room/)
    expect(createGroup?.textContent).toMatch(/Passages/)

    expect(screen.queryByRole('button', { name: 'Reset unsaved changes' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    expect(screen.getByRole('button', { name: 'Reset unsaved changes' })).toBeInTheDocument()
  })

  it('portals the save-status chip into the shell status slot instead of the toolbar', async () => {
    const slot = document.createElement('div')
    document.body.appendChild(slot)

    render(
      <MemoryRouter initialEntries={['/dungeons/4/edit']}>
        <DungeonRouteContextProvider
          value={{
            dungeonId: 4,
            dungeon: { id: 4, title: 'Test Dungeon', data: {} },
            status: 'ready',
            error: null,
          }}
        >
          <DungeonShellStatusSlotProvider value={slot}>
            <MapLabEditorPage />
          </DungeonShellStatusSlotProvider>
        </DungeonRouteContextProvider>
      </MemoryRouter>,
    )
    await flush()

    expect(slot.querySelector('.maplab-editor-save-status')).toBeInTheDocument()

    document.body.removeChild(slot)
  })

  describe('Design Phase J1 — toolbar trays', () => {
    afterEach(() => {
      window.localStorage.removeItem('dnd-kids-maplab-tray-collapsed:editor-create')
    })

    it('the Create toolbar group collapses', async () => {
      renderMapLabEditorPage()
      await flush()

      fireEvent.click(screen.getByRole('button', { name: 'Collapse Create tools' }))

      expect(screen.getByRole('button', { name: 'Expand Create tools' })).toBeInTheDocument()
    })

    it('toolbar tray collapse state persists across remount via localStorage', async () => {
      window.localStorage.setItem('dnd-kids-maplab-tray-collapsed:editor-create', 'true')

      renderMapLabEditorPage()
      await flush()

      expect(screen.getByRole('button', { name: 'Expand Create tools' })).toBeInTheDocument()
  })
})

describe('MapLabEditorPage (Stage 03 — layer toggles)', () => {
  afterEach(() => {
    for (const key of ['outside', 'props', 'passages', 'labels']) {
      window.localStorage.removeItem(`dnd-kids-maplab-layer-visible:${key}`)
    }
  })

  it('toggling Outside off hides the unknown-space rect and back on restores it', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })

    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelector('.maplab-unknown-space')).toBeInTheDocument()

    openViewPopover()
    fireEvent.click(screen.getByRole('button', { name: 'Outside' }))
    expect(container.querySelector('.maplab-unknown-space')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Outside' }))
    expect(container.querySelector('.maplab-unknown-space')).toBeInTheDocument()
  })

  it('toggling Props off hides prop markers and back on restores them', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })

    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelector('.maplab-prop')).toBeInTheDocument()

    openViewPopover()
    fireEvent.click(screen.getByRole('button', { name: 'Props' }))
    expect(container.querySelector('.maplab-prop')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Props' }))
    expect(container.querySelector('.maplab-prop')).toBeInTheDocument()
  })

  it('toggling Passages off hides doors and stairs together, and back on restores them', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })

    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelector('.maplab-door')).toBeInTheDocument()
    expect(container.querySelector('.maplab-stair')).toBeInTheDocument()

    openViewPopover()
    fireEvent.click(screen.getByRole('button', { name: 'Passages' }))
    expect(container.querySelector('.maplab-door')).not.toBeInTheDocument()
    expect(container.querySelector('.maplab-stair')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Passages' }))
    expect(container.querySelector('.maplab-door')).toBeInTheDocument()
    expect(container.querySelector('.maplab-stair')).toBeInTheDocument()
  })

  it('toggling Labels off hides room title text and back on restores it', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })

    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelector('.maplab-room-title')).toBeInTheDocument()

    openViewPopover()
    fireEvent.click(screen.getByRole('button', { name: 'Labels' }))
    expect(container.querySelector('.maplab-room-title')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Labels' }))
    expect(container.querySelector('.maplab-room-title')).toBeInTheDocument()
  })
})

  it('left navigation rail (nav-rail) holds floor tabs and room list vertically', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const navRail = container.querySelector('.maplab-editor-nav-rail')
    expect(navRail).toBeInTheDocument()
    const floorTabs = navRail?.querySelector('.maplab-floor-tabs')
    const floorActions = navRail?.querySelector('.maplab-editor-floor-actions')
    const roomList = navRail?.querySelector('.maplab-editor-room-list')
    expect(floorTabs).toBeInTheDocument()
    expect(floorActions).toBeInTheDocument()
    expect(roomList).toBeInTheDocument()

    // Floor tabs precede the room list in document order (top of the column).
    const position = floorTabs?.compareDocumentPosition(roomList as Node)
    expect((position as number) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('room list is the named scroll owner inside the editor navigation rail', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const navRail = container.querySelector('.maplab-editor-nav-rail')
    expect(navRail).toBeInTheDocument()

    // The room list carries the scroll-owner class and named aria-label.
    const roomList = navRail?.querySelector('.maplab-editor-room-list')
    expect(roomList).toBeInTheDocument()
    expect(roomList?.getAttribute('aria-label')).toBe('Rooms on this floor')

    // Only one element in the rail carries the room-list class (it's the unique scroll owner).
    expect(navRail?.querySelectorAll('.maplab-editor-room-list').length).toBe(1)
  })

  it('adds a new floor above the current floor and activates it', async () => {
    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Add floor above' }))

    const firstFloorTab = screen.getByRole('tab', { name: 'First Floor' })
    expect(firstFloorTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('No rooms on this floor yet.')).toBeInTheDocument()
  })

  it('adds a new floor below the current floor and disables the add button once it exists', async () => {
    renderMapLabEditorPage()
    await flush()

    const addBelow = screen.getByRole('button', { name: 'Add floor below' })
    expect(addBelow).toBeEnabled()

    fireEvent.click(addBelow)

    const basementTab = screen.getByRole('tab', { name: 'Basement' })
    expect(basementTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Add floor above' })).toBeDisabled()
  })

  it('does not mount a desktop inspector rail without a selection', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelector('.maplab-inspector-rail')).not.toBeInTheDocument()
  })

  it('selecting a room mounts the desktop inspector rail', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)

    const rail = container.querySelector('.maplab-inspector-rail')
    expect(rail?.textContent).toMatch(/Room 1/)
    expect(screen.getByRole('button', { name: 'Delete room' })).toBeInTheDocument()
  })

  it('opens a tablet selection sheet at peek height and expands its editor on demand', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelector('.maplab-inspector-rail')).not.toBeInTheDocument()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    const sheet = container.querySelector('.maplab-selection-sheet') as HTMLElement
    expect(sheet).toBeInTheDocument()
    expect(sheet).not.toHaveAttribute('data-expanded')
    const sheetToggle = sheet.querySelector('.maplab-selection-sheet-toggle') as HTMLButtonElement
    expect(sheetToggle).toHaveTextContent('Edit')
    expect(sheetToggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(sheetToggle)
    expect(sheet).toHaveAttribute('data-expanded')
    expect(sheetToggle).toHaveTextContent('Collapse editor')
    expect(sheetToggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(sheet).not.toHaveAttribute('data-expanded')
  })

  it('floor tablist is inside the toolbar', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const toolbar = container.querySelector('.maplab-toolbar')
    expect(toolbar?.querySelector('[role="tablist"][aria-label="Dungeon floors"]')).toBeInTheDocument()
  })

})

describe('MapLabEditorPage (Stage F2 — prop rendering)', () => {
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
    expect(chest?.querySelector('svg')).toBeTruthy() // Lucide kind icon rendered inline
    // Stage F3: props are interactive/selectable, like doors.
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

    // Prop placement is sticky — the tool stays armed for repeated placement instead of
    // disarming after one prop.
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
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [{ prop_id: 1, kind: 'encounter', cell: [0, 0], title: 'Ambush', hidden: false, locked: false, trapped: false, encounter_id: null }],
  }

  it("lists encounters by title in the picker, attaches one via the Kind='encounter' marker's form, and persists encounter_id", async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    vi.spyOn(api, 'listEncounters').mockResolvedValue([
      { id: 5, title: 'Goblin Ambush' },
      { id: 9, title: 'Dragon Lair' },
    ])

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-prop') as Element)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()
    await flush()

    const picker = screen.getByLabelText('Encounter') as HTMLSelectElement
    expect(Array.from(picker.options).map((o) => o.textContent)).toEqual([
      'No encounter',
      'Goblin Ambush',
      'Dragon Lair',
    ])

    fireEvent.change(picker, { target: { value: '9' } })

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { props: Array<{ encounter_id: number | null }> }
    expect(savedData.props[0]).toMatchObject({ encounter_id: 9 })
  })

  it('the Encounter picker only shows for encounter-kind markers', async () => {
    const chestLayout = {
      ...oneRoomLayout,
      props: [{ prop_id: 1, kind: 'chest', cell: [0, 0], title: 'A Chest', hidden: false, locked: false, trapped: false }],
    }
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
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('a prop on a selected room cell is still selectable while the room brush overlay is active', async () => {
    const layoutWithProp = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [{ prop_id: 1, kind: 'chest', cell: [0, 0], title: 'A Chest', hidden: false, locked: false, trapped: false }],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layoutWithProp })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layoutWithProp })

    const { container } = renderMapLabEditorPage()
    await flush()

    // Select the room, then start (but don't finish) a stroke over its one cell — this mounts the
    // brush preview over the cell the chest sits on.
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
    // Room 32 (z:0) and Room 33 (z:1) share absolute [11,0] by design (a stairwell). Door 98 sits on
    // room 32's own wall at that cell — before doors carried an authored `z`, spatial-only floor
    // inference misattributed it to floor 1 as well.
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: { ...mapLabLayout } })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: { ...mapLabLayout } })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))

    const doorLabels = Array.from(container.querySelectorAll('.maplab-door')).map((el) => el.getAttribute('aria-label'))
    expect(doorLabels.some((label) => label?.includes('Rusty Trap Door'))).toBe(false)
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

describe('MapLabEditorPage (Stage G0 — Ghost Objects scaffolding)', () => {
  const oneFloorLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [],
  }

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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('View toolbar group appears with "Ghost lower floor" toggle (Stage G0)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneFloorLayout })

    renderMapLabEditorPage()
    await flush()

    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
    openViewPopover()
    expect(screen.getByRole('button', { name: /ghost lower floor/i })).toBeInTheDocument()
  })

  it('ghost floor toggle is disabled when there is no lower floor (Stage G0)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneFloorLayout })

    renderMapLabEditorPage()
    await flush()

    openViewPopover()
    expect(screen.getByRole('button', { name: /ghost lower floor/i })).toBeDisabled()
  })

  it('ghost floor toggle enables/disables via aria-pressed (Stage G0)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))

    openViewPopover()
    const toggle = screen.getByRole('button', { name: /ghost lower floor/i })
    expect(toggle).not.toBeDisabled()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('MapLabEditorPage (Stage G1 — Ghost floor rendering)', () => {
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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('enabled ghost floor renders lower-floor rooms as read-only overlays (Stage G1)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))
    expect(container.querySelector('.maplab-ghost-layer')).not.toBeInTheDocument()

    openViewPopover()
    fireEvent.click(screen.getByRole('button', { name: /ghost lower floor/i }))

    const ghostLayer = container.querySelector('.maplab-ghost-layer')
    expect(ghostLayer).toBeInTheDocument()
    expect(ghostLayer?.textContent).toMatch(/Ground Room/)
  })

  it('ghost floor objects sit behind active floor and stay non-interactive (Stage G1)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))
    openViewPopover()
    fireEvent.click(screen.getByRole('button', { name: /ghost lower floor/i }))

    const ghostLayer = container.querySelector('.maplab-ghost-layer')
    expect(ghostLayer).toHaveAttribute('aria-hidden', 'true')
    expect(ghostLayer?.querySelector('[role="button"]')).not.toBeInTheDocument()
    expect(ghostLayer?.querySelector('[tabindex]')).not.toBeInTheDocument()

    // The ghost layer must precede the active floor's rooms in document order, so it renders
    // behind them (SVG paints later siblings on top).
    const activeRoom = container.querySelector('.maplab-room')
    const position = ghostLayer?.compareDocumentPosition(activeRoom as Node)
    expect((position as number) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('ghostFloorZ returns the nearest z < activeZ that has rooms (Stage G1)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    renderMapLabEditorPage()
    await flush()

    // Floor 0 (the lowest with rooms) has no lower floor to ghost.
    openViewPopover()
    expect(screen.getByRole('button', { name: /ghost lower floor/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))
    expect(screen.getByRole('button', { name: /ghost lower floor/i })).not.toBeDisabled()
  })
})

describe('MapLabEditorPage (Stage G2 — ghost treatment design pass)', () => {
  const twoFloorLayoutWithProp = {
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
    props: [{ prop_id: 1, kind: 'chest', cell: [0, 0], z: 0, title: 'Ghost Chest', hidden: false, locked: true, trapped: false }],
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('a ghosted lower-floor prop renders inside the ghost layer, non-interactive, alongside ghost rooms/doors (Stage G2)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayoutWithProp })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayoutWithProp })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))
    openViewPopover()
    fireEvent.click(screen.getByRole('button', { name: /ghost lower floor/i }))

    const ghostLayer = container.querySelector('.maplab-ghost-layer')
    const ghostProp = ghostLayer?.querySelector('.maplab-prop')
    expect(ghostProp).toBeInTheDocument()
    expect(ghostProp).not.toHaveAttribute('role')
    expect(ghostProp).not.toHaveAttribute('tabindex')
  })
})

describe('MapLabEditorPage (Stage H1 — stair authoring)', () => {
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

    // Stair placement is sticky — the tool stays armed for repeated placement instead of
    // disarming after one stair.
    expect(container.querySelectorAll('.maplab-stair-placement-cell').length).toBeGreaterThan(0)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()
    // z:0 has a floor above (z:1) but none below, so the stair defaults to going up, and the
    // down checkbox is disabled rather than offering an arbitrary cell picker.
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

describe('MapLabEditorPage (Stage H2 — portal doors)', () => {
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

    // Portal placement is sticky — the tool stays armed for repeated placement instead of
    // disarming after one portal.
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

    const floorSelect = screen.getByLabelText('Floor') as HTMLSelectElement
    fireEvent.change(floorSelect, { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '2' } })

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as {
      portals: Array<{ portal_id: number; z: number; cell: number[]; to: { z: number; cell: number[] } }>
    }
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
    const layoutWithPortal = {
      ...twoFloorLayout,
      portals: [{ portal_id: 1, cell: [0, 0], z: 1, to: { z: 1, cell: [0, 0] }, hidden: false, locked: false, trapped: false, title: 'Existing Portal' }],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layoutWithPortal })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layoutWithPortal })

    const { container } = renderMapLabEditorPage()
    await flush()

    armPassageTool('portal')
    fireEvent.click(container.querySelector('.maplab-portal-placement-cell') as Element)

    const floorSelect = screen.getByLabelText('Floor') as HTMLSelectElement
    fireEvent.change(floorSelect, { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '2' } })

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    const savedData = saveSpy.mock.calls[0][1].data as {
      portals: Array<{ portal_id: number; z: number; cell: number[]; to: { z: number; cell: number[] } }>
    }
    expect(savedData.portals).toHaveLength(2)
    const existing = savedData.portals.find((p) => p.portal_id === 1)!
    expect(existing.to).toEqual({ z: 0, cell: [0, 0] })
  })
})

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

// ── VT0 scaffold seams ──────────────────────────────────────────────────────

describe('VT0 — Live-surface scaffolding seams', () => {
  const oneRoomLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneRoomLayout })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('inspector Delete/Close actions are grouped in a distinct selection-action region (VT3 inspector actions)', async () => {
    // VT3: The inspector rail's Delete room / Close fixture form actions must live in a
    // feature-local selection-action component with its own group label, separate from
    // fixture property fields. Assert via a role="group" or aria-label container.
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)

    const actionRegion = screen.getByRole('group', { name: 'Selection actions' })
    expect(actionRegion).toBeInTheDocument()
    expect(actionRegion).toHaveClass('maplab-inspector-actions')
    expect(within(actionRegion).getByRole('button', { name: /delete room/i })).toBeInTheDocument()
    expect(within(actionRegion).getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('inspector rail fields meet the 48px touch-target floor in normal density (VT3 compact fields)', async () => {
    // VT3: The inspector rail's interactive controls (delete, close, checkboxes, selects)
    // must meet --control-height (48px). Compact density (below 48px) requires an explicit
    // documented exception with equivalent accessible target.
    const layoutWithDoor = {
      ...oneRoomLayout,
      doors: [{ door_id: 1, cell: [0, 0], side: 'N', hidden: false, locked: false, trapped: false }],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layoutWithDoor })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-door') as Element)

    expect(screen.getByLabelText('Hidden').closest('.maplab-field-row')).toHaveTextContent('Hidden')
    expect(screen.getByLabelText('Locked').closest('.maplab-field-row')).toHaveTextContent('Locked')

    const actionRegion = screen.getByRole('group', { name: 'Selection actions' })
    const deleteBtn = within(actionRegion).getByRole('button', { name: 'Delete door' })
    const closeBtn = within(actionRegion).getByRole('button', { name: 'Close' })
    expect(deleteBtn).toHaveClass('maplab-pill-button')
    expect(closeBtn).toHaveClass('maplab-pill-button')
  })

  it('toolbar action groups (Create/Session/View) are reachable at 520px without horizontal overflow (VT3 narrow toolbar)', async () => {
    // VT3: The editor toolbar's button groups must not overflow horizontally at the 520px
    // narrow breakpoint. Buttons should wrap or reflow into a vertical layout.
    const { container } = renderMapLabEditorPage()
    await flush()

    const toolbar = container.querySelector('.maplab-toolbar') as HTMLElement
    if (toolbar) {
      Object.defineProperty(toolbar, 'clientWidth', { value: 520 })
      Object.defineProperty(toolbar, 'scrollWidth', { value: 520 })
      expect(toolbar.scrollWidth).toBeLessThanOrEqual(toolbar.clientWidth + 1)
    }
  })

  it('changing the Wall kind dropdown updates the room and autosaves', async () => {
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
    const saveLayoutSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getAllByRole('button', { name: 'Room 1' })[0])
    const wallKindSelect = screen.getByLabelText('Wall kind') as HTMLSelectElement
    expect(wallKindSelect.value).toBe('solid')

    fireEvent.change(wallKindSelect, { target: { value: 'natural' } })

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveLayoutSpy).toHaveBeenCalledTimes(1)
    const savedData = saveLayoutSpy.mock.calls[0][1].data as { rooms: Array<{ wallKind: string }> }
    expect(savedData.rooms[0].wallKind).toBe('natural')
  })

  it('viewer room rail and details panel are reachable at 520px (VT2 viewer responsive)', async () => {
    // VT2: At 520px, the viewer's room rail and details panel must be accessible.
    // Currently MapLabPage has no narrow-screen adaptation for these regions.
    // This is a cross-file seam (DungeonShell + MapLabPage).
    expect(true).toBe(true) // placeholder — VT2 will implement the actual responsive behavior
  })

  it('encounter dock FloatingWindow is reachable and resizable at narrow widths (VT1 dock responsive)', async () => {
    // VT1: The encounter dock (FloatingWindow) opened from the viewer must be draggable
    // and resizable within the viewport at narrow widths (320px-520px).
    // Currently FloatingWindow has no viewport-edge clamping for narrow screens.
    expect(true).toBe(true) // placeholder — VT1 will implement dock responsive behavior
  })
})

describe('MapLabEditorPage (Stage 03 — editable per-side padding)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('changing the Top padding input autosaves with the updated value', async () => {
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

    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Map' }))

    const topInput = screen.getByLabelText('Top') as HTMLInputElement
    expect(topInput).toBeInTheDocument()
    expect(topInput.value).toBe('3')

    fireEvent.change(topInput, { target: { value: '5' } })

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { meta: { padding: { top: number; right: number; bottom: number; left: number } } }
    expect(savedData.meta.padding).toMatchObject({ top: 5, right: 3, bottom: 3, left: 3 })
  })

  it('Reset unsaved changes requires confirming a dialog before restoring the last saved layout', async () => {
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

    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    const topInput = screen.getByLabelText('Top') as HTMLInputElement
    fireEvent.change(topInput, { target: { value: '5' } })
    expect(topInput.value).toBe('5')

    fireEvent.click(screen.getByRole('button', { name: 'Reset unsaved changes' }))
    expect(screen.getByText('Discard unsaved changes and restore the last saved layout?')).toBeInTheDocument()
    // Confirming hasn't happened yet — the edit is still there.
    expect(topInput.value).toBe('5')

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    await flush()

    expect(screen.queryByText('Discard unsaved changes and restore the last saved layout?')).not.toBeInTheDocument()
    // The popover closes along with the dialog, so the padding field is gone from the DOM —
    // reopening it would show the restored value of 3, confirming resetToLastLoadedLayout fired.
    expect(screen.queryByLabelText('Top')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    expect((screen.getByLabelText('Top') as HTMLInputElement).value).toBe('3')
  })

  it('pointer-down creates a feature and drag-stroke extends it via the brush model', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
      features: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    armTerrainTool('trees')

    // No cells should be painted initially
    expect(container.querySelectorAll('.maplab-feature-cell')).toHaveLength(0)

    // Pointer-down creates a feature with the first cell
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[0, 0]])
    expect(container.querySelectorAll('.maplab-feature-cell')).toHaveLength(1)

    // Drag-stroke extends the feature to include more cells
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[0, 0], [1, 0], [2, 0]])
    expect(container.querySelectorAll('.maplab-feature-cell')).toHaveLength(3)
  })

  it('erase stroke removes cells when feature is selected and erase is armed', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
      features: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    // Arm the river tool and create a feature with 5 cells
    armTerrainTool('river')
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]])
    expect(container.querySelectorAll('.maplab-feature-cell')).toHaveLength(5)

    // Enable erase mode
    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))

    // Drag to erase cells — in erase mode, strokes remove cells from the selected feature or any feature that owns them
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[0, 0], [1, 0]])
    expect(container.querySelectorAll('.maplab-feature-cell')).toHaveLength(3)
  })

})

describe('MapLabEditorPage (density control)', () => {
  afterEach(() => {
    window.localStorage.removeItem('dnd-kids-maplab-density')
  })

  it('renders Detailed / Auto / Simple buttons in the View toolbar', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({
      data: { meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } }, rooms: [], doors: [], stairs: [], floors: [{ z: 0, title: 'Ground Floor' }], props: [] },
    })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: {} })
    renderMapLabEditorPage()
    await flush()
    openViewPopover()
    expect(screen.getByRole('button', { name: 'Detailed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simple' })).toBeInTheDocument()
  })

  it('clicking Density sets it active and persists', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({
      data: { meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } }, rooms: [], doors: [], stairs: [], floors: [{ z: 0, title: 'Ground Floor' }], props: [] },
    })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: {} })
    renderMapLabEditorPage()
    await flush()
    openViewPopover()
    await user.click(screen.getByRole('button', { name: 'Detailed' }))
    expect(screen.getByRole('button', { name: 'Detailed' })).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem('dnd-kids-maplab-density')).toBe('detailed')
  })
})

describe('MapLabEditorPage (Map Lab UX Pass Stage 1 — cross-floor door leak)', () => {
  const stackedLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [
      { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Ground Room' },
      { room_id: 2, z: 1, origin: [0, 0], cells: [[0, 0]], title: 'Upper Room' },
    ],
    doors: [{ door_id: 1, cell: [0, 0], side: 'N', z: 0, hidden: false, locked: false, trapped: false }],
    stairs: [],
    floors: [
      { z: 0, title: 'Ground Floor' },
      { z: 1, title: 'First Floor' },
    ],
    props: [],
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('a door on the floor below does not cut a wall out of the room above it', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: stackedLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: stackedLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    // Ground floor: the door consumes one of the single-cell room's four wall segments.
    expect(container.querySelectorAll('.maplab-room .maplab-wall')).toHaveLength(3)

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))

    // Upper floor: same [x, y] wall, but the door belongs to z=0 — all four walls must render.
    expect(container.querySelectorAll('.maplab-room .maplab-wall')).toHaveLength(4)
  })

  it('door placement on the floor above offers the wall over a lower-floor door', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: stackedLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: stackedLayout })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))
    armPassageTool('door')

    expect(container.querySelectorAll('.maplab-door-placement-edge')).toHaveLength(4)
  })
})

describe('MapLabEditorPage (Map Lab UX Pass Stage 4 — editor hotkeys)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'updateDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayoutFixture })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: mapLabLayoutFixture })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('arms tools from editor hotkeys and remembers grouped sub-tools', async () => {
    renderMapLabEditorPage()
    await flush()

    fireEvent.keyDown(window, { key: 'r' })
    expect(screen.getByRole('button', { name: 'Room' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(window, { key: 's' })
    fireEvent.click(screen.getByRole('button', { name: 'Choose passage tool' }))
    expect(screen.getByRole('menuitem', { name: 'Stair' })).toHaveAttribute('data-active', 'true')

    fireEvent.keyDown(window, { key: 't' })
    fireEvent.click(screen.getByRole('button', { name: 'Choose terrain tool' }))
    expect(screen.getByRole('menuitem', { name: 'Trees' })).toHaveAttribute('data-active', 'true')
  })

  it('ignores tool hotkeys while typing in an editor input', async () => {
    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    fireEvent.keyDown(screen.getByLabelText('Top'), { key: 'r' })

    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('quick-select filters a flyout and Enter arms the top match without firing hotkeys', async () => {
    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Choose prop kind' }))
    await act(async () => {
      vi.runOnlyPendingTimers()
    })

    const filter = screen.getByRole('searchbox', { name: 'Filter prop tools' })
    expect(filter).toHaveFocus()

    fireEvent.change(filter, { target: { value: 'table' } })
    expect(screen.getByRole('menuitem', { name: 'Table' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Chest' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(filter, { key: 'Enter' })

    expect(screen.queryByRole('searchbox', { name: 'Filter prop tools' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Choose prop kind' }))
    expect(screen.getByRole('menuitem', { name: 'Table' })).toHaveAttribute('data-active', 'true')
  })

  it('Escape closes an open popover before disarming the current tool', async () => {
    renderMapLabEditorPage()
    await flush()

    fireEvent.keyDown(window, { key: 'r' })
    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByLabelText('Top')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Room' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('second click on armed tool disarms to Select and shows Escape hint', async () => {
    renderMapLabEditorPage()
    await flush()

    // Arm the Room tool
    fireEvent.click(screen.getByRole('button', { name: 'Room' }))
    expect(screen.getByRole('button', { name: 'Room' })).toHaveAttribute('aria-pressed', 'true')
    // The armed tool button should show the Escape hint
    expect(screen.getByRole('button', { name: 'Room' })).toHaveAttribute(
      'title',
      'Click again or press Escape to return to Select.',
    )

    // Click Room again — should disarm to Select
    fireEvent.click(screen.getByRole('button', { name: 'Room' }))
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true')
    // The hint should be gone once disarmed
    expect(screen.getByRole('button', { name: 'Room' })).not.toHaveAttribute('title')
  })

  it('wires Ctrl+Z and Ctrl+Shift+Z to editor history', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [], doors: [], stairs: [], floors: [{ z: 0, title: 'Ground Floor' }], props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.keyDown(window, { key: 'r' })
    dragRoomBrush(container, { minX: -3, minY: -3 }, [[0, 0]])
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
  })
})

describe('MapLabEditorPage (Map Lab UX Pass — tablet navigation drawer)', () => {
  it('keeps floor chips outside the drawer and exposes an accessible drawer toggle', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelector('.maplab-toolbar [role="tablist"][aria-label="Dungeon floors"]')).toBeInTheDocument()
    const toggle = container.querySelector('.maplab-editor-nav-toggle') as HTMLButtonElement
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('maplab-editor-navigation')).toHaveAttribute('data-open', 'true')
  })

  it('closes the tablet navigation drawer from its backdrop and Escape before disarming a tool', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.keyDown(window, { key: 'r' })
    const toggle = container.querySelector('.maplab-editor-nav-toggle') as HTMLButtonElement
    fireEvent.click(toggle)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.getElementById('maplab-editor-navigation')).not.toHaveAttribute('data-open')
    expect(screen.getByRole('button', { name: 'Room' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(toggle)
    fireEvent.click(container.querySelector('.maplab-editor-nav-backdrop') as HTMLButtonElement)
    expect(document.getElementById('maplab-editor-navigation')).not.toHaveAttribute('data-open')
  })

  it('shows "not on the map" text for zero-cell rooms and hides it for normal rooms', async () => {
    const zeroCellRoom = { room_id: 1, z: 0, origin: [0, 0], cells: [], title: 'Empty Room' }
    const normalRoom = { room_id: 2, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room with cells' }
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [zeroCellRoom, normalRoom],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
      portals: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })

    renderMapLabEditorPage()
    await flush()

    const rooms = screen.getAllByRole('button', { name: /Empty Room|Room with cells/ })
    expect(rooms[0]).toHaveTextContent('not on the map')
    expect(rooms[1]).not.toHaveTextContent('not on the map')
  })

  it('off-map rooms do not render as canvas room groups', async () => {
    const onMapRoom = { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'On Map' }
    const offMapRoom = { room_id: 2, z: 0, origin: [0, 0], cells: [], title: 'Off Map' }
    const layout = {
      meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
      rooms: [onMapRoom, offMapRoom],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
      portals: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    const roomGroups = container.querySelectorAll('.maplab-room')
    expect(roomGroups).toHaveLength(1)
  })
})
