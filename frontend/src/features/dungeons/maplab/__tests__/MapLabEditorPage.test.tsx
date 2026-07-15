import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import { MapLabEditorPage } from '../MapLabEditorPage'
import { mapLabLayout } from '../maplabData'
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

describe('MapLabEditorPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('loads a blank layout when the backend has no saved layout (404) and does not save until edited', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockRejectedValue(new api.ApiError(404, 'not found'))
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: {} })

    renderMapLabEditorPage()
    await flush()

    expect(screen.getByText('No saved layout yet. Your first edit will save this blank map.')).toBeInTheDocument()
    expect(screen.getByText('No rooms on this floor yet.')).toBeInTheDocument()
    expect(screen.queryByText('Combat Training Hall')).not.toBeInTheDocument()
    expect(saveSpy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /add room/i }))

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
      meta: { cellSizeFt: 5, padding: 3 },
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

  it('add room dispatches action and autosaves (debounced)', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: 3 },
      rooms: [],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    renderMapLabEditorPage()
    await flush()

    expect(screen.getByText('No rooms on this floor yet.')).toBeInTheDocument()
    expect(saveSpy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /add room/i }))

    expect(screen.getAllByText('Room 1').length).toBeGreaterThan(0)
    expect(saveSpy).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(saveSpy.mock.calls[0][0]).toBe(4)
  })

  it('selecting a room reveals paintable cells; deselecting hides them', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: 3 },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelectorAll('.maplab-paint-cell')).toHaveLength(0)

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    expect(container.querySelectorAll('.maplab-paint-cell').length).toBeGreaterThan(0)
    expect(container.querySelector('.maplab-paint-cell[data-paint-state="paintable"]')).toBeInTheDocument()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    expect(container.querySelectorAll('.maplab-paint-cell')).toHaveLength(0)
  })

  it('removing an owned cell still works as single-cell cleanup and autosaves', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: 3 },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0], [1, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      props: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)

    const ownedCell = container.querySelector('.maplab-paint-cell[x="64"][y="0"]')
    expect(ownedCell).toBeInTheDocument()
    fireEvent.click(ownedCell as Element)

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { rooms: Array<{ cells: number[][] }> }
    expect(savedData.rooms[0].cells).toEqual([[0, 0]])
  })

  it('places a door on a wall edge and shows its properties form', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: 3 },
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

    fireEvent.click(screen.getByRole('button', { name: /place door/i }))
    expect(container.querySelectorAll('.maplab-door-placement-edge').length).toBeGreaterThan(0)

    fireEvent.click(container.querySelector('.maplab-door-placement-edge') as Element)

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
      meta: { cellSizeFt: 5, padding: 3 },
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
  })
})

describe('MapLabEditorPage (Stage E2 — Canvas zoom & pan)', () => {
  const singleRoomLayout = {
    meta: { cellSizeFt: 5, padding: 3 },
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
    originalResizeObserver = (globalThis as { ResizeObserver?: unknown }).ResizeObserver
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

    // 448px content into a 640px (stubbed) viewport -> scale = 640/448 -> exactly fills it.
    fireEvent.click(screen.getByRole('button', { name: 'Fit map to viewport' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(640)
    expect(Number(svg.getAttribute('height'))).toBeCloseTo(640)
  })

  it('editor plain wheel zooms toward the cursor position without Ctrl', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as Element

    fireEvent.wheel(viewport, { deltaY: -100, clientX: 40, clientY: 40 })
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1 * 1.1)
  })

  it('click-drag pans the canvas, starting only outside room/door/paint hits', async () => {
    const { container } = await renderEditor()
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    const room = container.querySelector('.maplab-room') as Element

    // A drag that starts on the room itself must not pan.
    fireEvent.pointerDown(room, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 100, clientY: 60 })
    fireEvent.pointerUp(window)
    expect(viewport.scrollLeft).toBe(0)
    expect(viewport.scrollTop).toBe(0)

    // A drag starting on empty canvas pans (scroll offset moves opposite the drag direction).
    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 100, clientY: 60 })
    fireEvent.pointerUp(window)
    expect(viewport.scrollLeft).toBe(-100)
    expect(viewport.scrollTop).toBe(-60)
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
    expect(viewport.scrollLeft).toBe(-50)
    expect(viewport.scrollTop).toBe(-20)

    fireEvent.click(screen.getByRole('button', { name: 'Fit map to viewport' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(640)
    expect(viewport.scrollLeft).toBe(0)
    expect(viewport.scrollTop).toBe(0)
  })
})

describe('MapLabEditorPage (Phase K scaffolding)', () => {
  const singleRoomLayout = {
    meta: { cellSizeFt: 5, padding: 3 },
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

    const wrapper = container.querySelector('.maplab-canvas-wrapper')
    expect(wrapper).not.toHaveAttribute('data-fullscreen')

    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen map editor' }))
    expect(wrapper).toHaveAttribute('data-fullscreen')
    expect(wrapper).toHaveAttribute('role', 'dialog')
    expect(wrapper).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/wheel to zoom\. drag empty canvas or use scrollbars to pan\./i)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(wrapper).not.toHaveAttribute('data-fullscreen')
  })

  it('K3: selected-room footprint controls expose keyboard focus and visible instructions', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    const paintCell = container.querySelector('.maplab-paint-cell[x="64"][y="0"]') as Element
    expect(paintCell).toHaveAttribute('tabindex', '0')
    expect(screen.getByText(/click two free corners to size a room/i)).toBeInTheDocument()

    fireEvent.keyDown(paintCell, { key: 'Enter' })
    expect(screen.getByText(/corner set at 1, 0/i)).toBeInTheDocument()
  })

  it('K1: fullscreen workspace keeps scrollbars available and drag-pan working on empty canvas but not on marker targets', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen map editor' }))

    const wrapper = container.querySelector('.maplab-canvas-wrapper') as HTMLElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as HTMLElement
    const prop = container.querySelector('.maplab-prop') as Element

    expect(wrapper).toHaveAttribute('data-fullscreen')
    expect(viewport).toBeInTheDocument()

    fireEvent.pointerDown(prop, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 80, clientY: 45 })
    fireEvent.pointerUp(window)
    expect(viewport.scrollLeft).toBe(0)
    expect(viewport.scrollTop).toBe(0)

    fireEvent.pointerDown(viewport, { clientX: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientX: 80, clientY: 45 })
    fireEvent.pointerUp(window)
    expect(viewport.scrollLeft).toBe(-80)
    expect(viewport.scrollTop).toBe(-45)
  })

  it('K2: drag rectangle commit updates the selected room footprint and autosaves once', async () => {
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)

    const firstCorner = container.querySelector('.maplab-paint-cell[x="64"][y="0"]') as Element
    const secondCorner = container.querySelector('.maplab-paint-cell[x="128"][y="64"]') as Element
    fireEvent.pointerDown(firstCorner, { clientX: 64, clientY: 0 })
    fireEvent.pointerEnter(secondCorner, { clientX: 128, clientY: 64 })
    fireEvent.pointerUp(secondCorner, { clientX: 128, clientY: 64 })

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { rooms: Array<{ cells: number[][] }> }
    expect(savedData.rooms[0].cells).toEqual([[1, 0], [2, 0], [1, 1], [2, 1]])
  })

  it('K2: dragging from an owned cell extends the selected room without removing its existing cells', async () => {
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    const ownedCell = container.querySelector('.maplab-paint-cell[x="0"][y="0"]') as Element
    const outerCorner = container.querySelector('.maplab-paint-cell[x="128"][y="64"]') as Element
    fireEvent.pointerDown(ownedCell, { clientX: 0, clientY: 0 })
    fireEvent.pointerEnter(outerCorner, { clientX: 128, clientY: 64 })
    fireEvent.pointerUp(outerCorner, { clientX: 128, clientY: 64 })

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    const savedData = saveSpy.mock.calls[0][1].data as { rooms: Array<{ cells: number[][] }> }
    expect(savedData.rooms[0].cells).toEqual([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]])
  })

  it('K2: two-click rectangle commit updates the selected room footprint', async () => {
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    fireEvent.click(container.querySelector('.maplab-paint-cell[x="64"][y="0"]') as Element)
    expect(container.querySelector('.maplab-room-footprint-preview')).toBeInTheDocument()
    fireEvent.click(container.querySelector('.maplab-paint-cell[x="128"][y="64"]') as Element)

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })

    expect(saveSpy).toHaveBeenCalledTimes(1)
    const savedData = saveSpy.mock.calls[0][1].data as { rooms: Array<{ cells: number[][] }> }
    expect(savedData.rooms[0].cells).toEqual([[1, 0], [2, 0], [1, 1], [2, 1]])
  })

  it('K2: preview-only footprint state does not autosave', async () => {
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: singleRoomLayout })
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    fireEvent.click(container.querySelector('.maplab-paint-cell[x="64"][y="0"]') as Element)

    expect(container.querySelector('.maplab-room-footprint-preview')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('K2: Escape and placement mode changes cancel a pending room footprint preview', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    fireEvent.click(container.querySelector('.maplab-paint-cell[x="64"][y="0"]') as Element)
    expect(container.querySelector('.maplab-room-footprint-preview')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(container.querySelector('.maplab-room-footprint-preview')).not.toBeInTheDocument()

    fireEvent.click(container.querySelector('.maplab-paint-cell[x="64"][y="0"]') as Element)
    expect(container.querySelector('.maplab-room-footprint-preview')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /place door/i }))
    expect(container.querySelector('.maplab-room-footprint-preview')).not.toBeInTheDocument()
  })

  it('K2: blocked rectangle shows an alert and does not save', async () => {
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
    fireEvent.click(container.querySelector('.maplab-paint-cell[x="64"][y="0"]') as Element)
    fireEvent.click(container.querySelector('.maplab-paint-cell[x="128"][y="0"]') as Element)

    expect(screen.getByRole('alert')).toHaveTextContent('That footprint overlaps another room or would split this room.')
    expect(container.querySelector('.maplab-room-footprint-preview')).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).not.toHaveBeenCalled()
  })
})

describe('MapLabEditorPage (Stage E3 — Toolbar reorganization & persistent inspector)', () => {
  const oneRoomOneDoorLayout = {
    meta: { cellSizeFt: 5, padding: 3 },
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

  it('toolbar groups buttons into Create / Session / Status clusters', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const groups = container.querySelectorAll('.maplab-toolbar-group')
    expect(groups.length).toBeGreaterThanOrEqual(3)

    const labels = Array.from(groups).map((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent)
    expect(labels).toContain('Create')
    expect(labels).toContain('Session')

    const createGroup = Array.from(groups).find((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent === 'Create')
    expect(createGroup?.textContent).toMatch(/Add room/)
    expect(createGroup?.textContent).toMatch(/Place door/)

    const sessionGroup = Array.from(groups).find((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent === 'Session')
    expect(sessionGroup?.textContent).toMatch(/Reset unsaved changes/)

    const statusGroup = container.querySelector('.maplab-toolbar-group-status')
    expect(statusGroup?.querySelector('.maplab-editor-save-status')).toBeInTheDocument()
  })

  describe('Design Phase J1 — toolbar trays', () => {
    afterEach(() => {
      window.localStorage.removeItem('dnd-kids-maplab-tray-collapsed:editor-create')
      window.localStorage.removeItem('dnd-kids-maplab-tray-collapsed:editor-session')
    })

    it('each toolbar group collapses independently, without affecting siblings', async () => {
      renderMapLabEditorPage()
      await flush()

      fireEvent.click(screen.getByRole('button', { name: 'Collapse Create tools' }))

      expect(screen.getByRole('button', { name: 'Expand Create tools' })).toBeInTheDocument()
      // Session's own toggle is unaffected — still says "Collapse", meaning it stayed expanded.
      expect(screen.getByRole('button', { name: 'Collapse Session tools' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reset unsaved changes' })).toBeInTheDocument()
    })

    it('toolbar tray collapse state persists across remount via localStorage', async () => {
      window.localStorage.setItem('dnd-kids-maplab-tray-collapsed:editor-create', 'true')

      renderMapLabEditorPage()
      await flush()

      expect(screen.getByRole('button', { name: 'Expand Create tools' })).toBeInTheDocument()
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

  it('right inspector rail is persistent, showing placeholder when no fixture selected', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const rail = container.querySelector('.maplab-inspector-rail')
    expect(rail).toBeInTheDocument()
    expect(rail?.querySelector('.maplab-inspector-rail-empty')).toBeInTheDocument()
    expect(screen.getByText('Select a room, door, prop, stair, or portal to see its details.')).toBeInTheDocument()
  })

  it('selecting a room (not just door) populates the inspector rail', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)

    const rail = container.querySelector('.maplab-inspector-rail')
    expect(rail?.querySelector('.maplab-inspector-rail-empty')).not.toBeInTheDocument()
    expect(rail?.textContent).toMatch(/Room 1/)
    expect(screen.getByRole('button', { name: 'Delete room' })).toBeInTheDocument()
  })

  it('inspector rail does not collapse entirely when a room is selected', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    expect(container.querySelector('.maplab-inspector-rail')).toBeInTheDocument()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    expect(container.querySelector('.maplab-inspector-rail')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(container.querySelector('.maplab-inspector-rail')).toBeInTheDocument()

    fireEvent.click(container.querySelector('.maplab-door') as Element)
    expect(container.querySelector('.maplab-inspector-rail')).toBeInTheDocument()
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
    meta: { cellSizeFt: 5, padding: 3 },
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

    fireEvent.click(screen.getByRole('button', { name: /place prop/i }))
    expect(container.querySelectorAll('.maplab-prop-placement-cell').length).toBeGreaterThan(0)

    fireEvent.click(container.querySelector('.maplab-prop-placement-cell') as Element)

    expect(container.querySelectorAll('.maplab-prop-placement-cell')).toHaveLength(0)
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

    fireEvent.click(screen.getByRole('button', { name: /place door/i }))
    expect(container.querySelectorAll('.maplab-door-placement-edge').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /place prop/i }))
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
    meta: { cellSizeFt: 5, padding: 3 },
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

  it('a prop on a selected room cell is still selectable, not swallowed by the room-paint overlay', async () => {
    const layoutWithProp = {
      meta: { cellSizeFt: 5, padding: 3 },
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

    // Select the room — this mounts the paint overlay over every cell the room owns, including
    // the cell the chest sits on.
    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    expect(container.querySelector('.maplab-paint-cell[data-paint-state="ownedSelected"]')).toBeInTheDocument()

    fireEvent.click(container.querySelector('.maplab-prop') as Element)
    expect(container.querySelector('.maplab-fixture-form')).toBeInTheDocument()
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
      meta: { cellSizeFt: 5, padding: 3 },
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
    meta: { cellSizeFt: 5, padding: 3 },
    rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
    doors: [],
    stairs: [],
    floors: [{ z: 0, title: 'Ground Floor' }],
    props: [],
  }

  const twoFloorLayout = {
    meta: { cellSizeFt: 5, padding: 3 },
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

    const { container } = renderMapLabEditorPage()
    await flush()

    const groups = container.querySelectorAll('.maplab-toolbar-group')
    const labels = Array.from(groups).map((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent)
    expect(labels).toContain('View')
    expect(screen.getByRole('button', { name: /ghost lower floor/i })).toBeInTheDocument()
  })

  it('ghost floor toggle is disabled when there is no lower floor (Stage G0)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneFloorLayout })

    renderMapLabEditorPage()
    await flush()

    expect(screen.getByRole('button', { name: /ghost lower floor/i })).toBeDisabled()
  })

  it('ghost floor toggle enables/disables via aria-pressed (Stage G0)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: twoFloorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: twoFloorLayout })

    renderMapLabEditorPage()
    await flush()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))

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
    meta: { cellSizeFt: 5, padding: 3 },
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
    expect(screen.getByRole('button', { name: /ghost lower floor/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('tab', { name: 'First Floor' }))
    expect(screen.getByRole('button', { name: /ghost lower floor/i })).not.toBeDisabled()
  })
})

describe('MapLabEditorPage (Stage G2 — ghost treatment design pass)', () => {
  const twoFloorLayoutWithProp = {
    meta: { cellSizeFt: 5, padding: 3 },
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
    meta: { cellSizeFt: 5, padding: 3 },
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

    fireEvent.click(screen.getByRole('button', { name: /place stair/i }))
    expect(container.querySelectorAll('.maplab-stair-placement-cell').length).toBeGreaterThan(0)

    fireEvent.click(container.querySelector('.maplab-stair-placement-cell') as Element)

    expect(container.querySelectorAll('.maplab-stair-placement-cell')).toHaveLength(0)
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

    fireEvent.click(screen.getByRole('button', { name: /place stair/i }))
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

    fireEvent.click(screen.getByRole('button', { name: /place door/i }))
    expect(container.querySelectorAll('.maplab-door-placement-edge').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /place stair/i }))
    expect(container.querySelectorAll('.maplab-door-placement-edge')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-stair-placement-cell').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /place prop/i }))
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
    meta: { cellSizeFt: 5, padding: 3 },
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

    fireEvent.click(screen.getByRole('button', { name: /place portal/i }))
    expect(container.querySelectorAll('.maplab-portal-placement-cell').length).toBeGreaterThan(0)

    fireEvent.click(container.querySelector('.maplab-portal-placement-cell') as Element)

    expect(container.querySelectorAll('.maplab-portal-placement-cell')).toHaveLength(0)
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

    fireEvent.click(screen.getByRole('button', { name: /place portal/i }))
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

    fireEvent.click(screen.getByRole('button', { name: /place door/i }))
    expect(container.querySelectorAll('.maplab-door-placement-edge').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /place stair/i }))
    expect(container.querySelectorAll('.maplab-door-placement-edge')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-stair-placement-cell').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /place portal/i }))
    expect(container.querySelectorAll('.maplab-stair-placement-cell')).toHaveLength(0)
    expect(container.querySelectorAll('.maplab-portal-placement-cell').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /place prop/i }))
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

    fireEvent.click(screen.getByRole('button', { name: /place portal/i }))
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
    meta: { cellSizeFt: 5, padding: 3 },
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

    fireEvent.click(screen.getByRole('button', { name: /place prop/i }))
    fireEvent.click(container.querySelector('.maplab-prop-placement-cell') as Element)

    expect(screen.getByRole('alert')).toHaveTextContent(/already has 4 markers/i)
    expect(container.querySelectorAll('.maplab-prop')).toHaveLength(4)

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).not.toHaveBeenCalled()
  })
})
