import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import { MapLabEditorPage } from '../MapLabEditorPage'
import { DungeonRouteContextProvider, type DungeonRouteContext } from '../dungeonRouteContext'

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

  function readTranslate(svg: SVGSVGElement): { x: number; y: number } {
  const style = svg.getAttribute('style') ?? ''
  const match = style.match(/translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/)
  return { x: match ? Number(match[1]) : 0, y: match ? Number(match[2]) : 0 }
}

describe('MapLabEditorPage (Stage E2 — Canvas zoom & pan)', () => {
  const singleRoomLayout = {
    meta: { cellSizeFt: 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [],
  }

  function readRoomCenter(room: Element, svg: SVGSVGElement) {
    const shape = room.matches('rect') ? room : room.querySelector('rect')
    if (!shape) throw new Error('Expected a room rectangle')
    const x = Number(shape.getAttribute('x'))
    const y = Number(shape.getAttribute('y'))
    const width = Number(shape.getAttribute('width'))
    const height = Number(shape.getAttribute('height'))
    const scale = Number(svg.getAttribute('width')) / CONTENT_PX_AT_SCALE_1
    const translate = readTranslate(svg)
    return {
      x: (x + width / 2) * scale + translate.x,
      y: (y + height / 2) * scale + translate.y,
    }
  }
  // 1 cell, padded ±3 on every side -> a 7x7-unit bounds -> 448x448px at scale 1 (BASE_PX_PER_UNIT=64).
  const CONTENT_PX_AT_SCALE_1 = 448

  let originalResizeObserver: unknown

  beforeEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
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

  async function renderEditor(layout = singleRoomLayout) {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })
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

  it('centers an off-screen room on its origin', async () => {
    const layout = {
      ...singleRoomLayout,
       rooms: [{ room_id: 1, z: 0, origin: [12, 8], cells: [[0, 0], [1, 0], [0, 1]], title: 'Far Room' }],
    } as typeof singleRoomLayout
    const { container } = await renderEditor(layout)
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    const room = container.querySelector('.maplab-room') as Element
    vi.spyOn(room, 'getBoundingClientRect').mockReturnValue({ top: 1000, left: 1000, bottom: 1100, right: 1100, width: 100, height: 100, x: 1000, y: 1000, toJSON: () => ({}) } as DOMRect)

    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 500, clientY: 500 })
    fireEvent.pointerUp(window)
    fireEvent.click(room)
    await flush()

    // Settled anchor is the room origin (3,3) relative to the padded bounds; the zoom scale stays 1
    // through this pan-only interaction, so the CSS transform is 320 - 3 * 64 * 1 = 128 per axis.
    expect(readTranslate(svg)).toEqual({ x: 320 - 3 * 64, y: 320 - 3 * 64 })
  })

  it('preserves framing when the selected room is already visible', async () => {
    const layout = {
      ...singleRoomLayout,
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0], [1, 0]], title: 'Visible Room' }],
    } as typeof singleRoomLayout
    const { container } = await renderEditor(layout)
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const room = container.querySelector('.maplab-room') as Element
    const before = readRoomCenter(room, svg)
    const translateBefore = readTranslate(svg)

    fireEvent.click(room)
    await flush()

    expect(readTranslate(svg)).toEqual(translateBefore)
    expect(readRoomCenter(room, svg)).toEqual(before)
  })

  it('uses the room origin as the room framing anchor', async () => {
    const layout = {
      ...singleRoomLayout,
       rooms: [{ room_id: 1, z: 0, origin: [20, 20], cells: [[0, 0], [1, 0], [2, 0], [0, 1]], title: 'L Room' }],
    } as typeof singleRoomLayout
    const { container } = await renderEditor(layout)
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    const room = container.querySelector('.maplab-room') as Element
    vi.spyOn(room, 'getBoundingClientRect').mockReturnValue({ top: 1000, left: 1000, bottom: 1100, right: 1100, width: 100, height: 100, x: 1000, y: 1000, toJSON: () => ({}) } as DOMRect)

    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 500, clientY: 500 })
    fireEvent.pointerUp(window)
    fireEvent.click(room)

    // Settled anchor is the room origin (3,3) relative to the padded bounds; the zoom scale stays 1
    // through this pan-only interaction, so the CSS transform is 320 - 3 * 64 * 1 = 128 per axis.
    expect(readTranslate(svg)).toEqual({ x: 320 - 3 * 64, y: 320 - 3 * 64 })
  })

  it('centers a connection on double-click without travelling or saving', async () => {
    const layout = {
      ...singleRoomLayout,
      rooms: [
        { room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' },
        { room_id: 2, z: 0, origin: [12, 0], cells: [[0, 0]], title: 'Room 2' },
      ],
       doors: [{ door_id: 1, z: 0, cell: [6, 0], side: 'E' }],
    } as typeof singleRoomLayout
    const { container } = await renderEditor(layout)
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    const connection = container.querySelector('.maplab-door') as Element
    expect(connection).toBeInTheDocument()
    const translateBefore = readTranslate(svg)

    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 500, clientY: 500 })
    fireEvent.pointerUp(window)
    await flush()
    fireEvent.doubleClick(connection)
    await flush()

    expect(readTranslate(svg)).not.toEqual(translateBefore)
    expect(api.updateDungeon).not.toHaveBeenCalled()
    expect(api.saveDungeonLayout).not.toHaveBeenCalled()
  })

  it('clears selection when the background is clicked outside padded bounds', async () => {
    const { container } = await renderEditor()
    const room = container.querySelector('.maplab-room') as Element
    const unknownSpace = container.querySelector('.maplab-unknown-space') as Element

    fireEvent.click(room)
    await flush()
    expect(room).toHaveAttribute('data-selected', 'true')

    fireEvent.click(unknownSpace)

    expect(room).not.toHaveAttribute('data-selected', 'true')
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
