import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../../api/client'
import { MapLabEditorPage } from '../MapLabEditorPage'

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

  it('falls back to the fixture layout when the backend has no saved layout (404)', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockRejectedValue(new api.ApiError(404, 'not found'))
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: {} })

    render(<MapLabEditorPage />)
    await flush()

    expect(screen.getAllByText('Combat Training Hall').length).toBeGreaterThan(0)
  })

  it('renders a saved layout from the backend', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: 3 },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Saved Room' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      items: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    render(<MapLabEditorPage />)
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
      items: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    render(<MapLabEditorPage />)
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
      items: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = render(<MapLabEditorPage />)
    await flush()

    expect(container.querySelectorAll('.maplab-paint-cell')).toHaveLength(0)

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    expect(container.querySelectorAll('.maplab-paint-cell').length).toBeGreaterThan(0)
    expect(container.querySelector('.maplab-paint-cell[data-paint-state="paintable"]')).toBeInTheDocument()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)
    expect(container.querySelectorAll('.maplab-paint-cell')).toHaveLength(0)
  })

  it('painting an adjacent cell extends the room and autosaves; a non-adjacent cell is refused', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: 3 },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      items: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = render(<MapLabEditorPage />)
    await flush()

    fireEvent.click(container.querySelector('.maplab-editor-room-item-select') as Element)

    const adjacentCell = container.querySelector('.maplab-paint-cell[x="64"][y="0"]')
    expect(adjacentCell).toBeInTheDocument()
    fireEvent.click(adjacentCell as Element)

    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)

    // Refetch and confirm the invalid (non-adjacent) cell has no click effect: still shows a single
    // extra save from the valid paint above, not two.
    const invalidCell = container.querySelector('.maplab-paint-cell[data-paint-state="invalid"]')
    expect(invalidCell).toBeInTheDocument()
    fireEvent.click(invalidCell as Element)
    await act(async () => {
      vi.advanceTimersByTime(700)
      await Promise.resolve()
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
  })

  it('places a door on a wall edge and shows its properties form', async () => {
    const layout = {
      meta: { cellSizeFt: 5, padding: 3 },
      rooms: [{ room_id: 1, z: 0, origin: [0, 0], cells: [[0, 0]], title: 'Room 1' }],
      doors: [],
      stairs: [],
      floors: [{ z: 0, title: 'Ground Floor' }],
      items: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = render(<MapLabEditorPage />)
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
      items: [],
    }
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: layout })
    const saveSpy = vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: layout })

    const { container } = render(<MapLabEditorPage />)
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
    items: [],
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
    const utils = render(<MapLabEditorPage />)
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
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(640)
    expect(Number(svg.getAttribute('height'))).toBeCloseTo(640)
  })

  it('Ctrl/⌘+wheel zooms toward the cursor position', async () => {
    const { container } = await renderEditor()
    const svg = container.querySelector('.maplab-svg') as SVGSVGElement
    const viewport = container.querySelector('.maplab-canvas-viewport') as Element

    fireEvent.wheel(viewport, { deltaY: -100, clientX: 40, clientY: 40 })
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(CONTENT_PX_AT_SCALE_1)

    fireEvent.wheel(viewport, { ctrlKey: true, deltaY: -100, clientX: 40, clientY: 40 })
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

    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }))
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(640)
    expect(viewport.scrollLeft).toBe(0)
    expect(viewport.scrollTop).toBe(0)
  })
})

describe('MapLabEditorPage (Stage E3 — Toolbar reorganization & persistent inspector)', () => {
  it.skip('toolbar groups buttons into Create / Canvas / Session / Status clusters', () => {
    // Stage E3: Assert .maplab-toolbar-group containers with group labels present
    // Create: Add room, Place door
    // Canvas: Zoom +/−/Reset
    // Session: Reset to fixture
    // Status: rightmost save status indicator
  })

  it.skip('left navigation rail (nav-rail) holds floor tabs and room list vertically', () => {
    // Stage E3: Assert .maplab-editor-nav-rail container exists, is flex-column,
    // contains floor tabs at top, room list below
  })

  it.skip('right inspector rail is persistent, showing placeholder when no fixture selected', () => {
    // Stage E3: .maplab-inspector-rail visible always; .maplab-inspector-rail-empty shown
    // when no door/room selected; selecting a room populates the rail with room details
  })

  it.skip('selecting a room (not just door) populates the inspector rail', () => {
    // Stage E3: click room -> inspector rail shows title/meta/delete; mirror door behavior
  })

  it.skip('inspector rail does not collapse entirely when a room is selected', () => {
    // Stage E3: assert .maplab-inspector-rail remains flex: 0 0 16rem (or similar fixed),
    // visible whether the selection is a room, door, or nothing
  })
})
