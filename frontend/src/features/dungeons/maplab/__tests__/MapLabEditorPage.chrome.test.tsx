import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../../../api/client'
import { MapLabEditorPage } from '../MapLabEditorPage'
import { mapLabLayout } from '../maplabData'
import {
  DungeonRouteContextProvider,
  DungeonShellStatusSlotProvider,
} from '../dungeonRouteContext'

function renderMapLabEditorPage() {
  return render(
    <MemoryRouter initialEntries={['/dungeons/4/edit']}>
      <DungeonRouteContextProvider
        value={{
          dungeonId: 4,
          dungeon: { id: 4, title: 'Test Dungeon', data: {} },
          status: 'ready',
          error: null,
        }}
      >
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

function openViewPopover() {
  fireEvent.click(screen.getByRole('button', { name: 'View' }))
}

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
    window.sessionStorage.clear()
    vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: oneRoomOneDoorLayout })
    vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: oneRoomOneDoorLayout })
  })

  it('toolbar separates Primary and Active tool options and folds Reset into the Map popover', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const groups = container.querySelectorAll('.maplab-toolbar-group')
    expect(groups.length).toBeGreaterThanOrEqual(1)

    const labels = Array.from(groups).map((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent)
    expect(labels).toEqual(expect.arrayContaining(['Primary', 'Active tool options']))

    const primaryGroup = Array.from(groups).find((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent === 'Primary')
    const activeOptionsGroup = Array.from(groups).find((group) => group.querySelector('.maplab-toolbar-group-label')?.textContent === 'Active tool options')
    expect(primaryGroup?.textContent).toMatch(/Select.*Room/)
    expect(activeOptionsGroup?.textContent).toMatch(/Passages.*Prop.*Terrain/)

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
      window.localStorage.removeItem('dnd-kids-maplab-tray-collapsed:editor-primary')
      window.localStorage.removeItem('dnd-kids-maplab-tray-collapsed:editor-active-options')
    })

    it('the Primary toolbar group collapses', async () => {
      renderMapLabEditorPage()
      await flush()

      fireEvent.click(screen.getByRole('button', { name: 'Collapse Primary tools' }))

      expect(screen.getByRole('button', { name: 'Expand Primary tools' })).toBeInTheDocument()
    })

    it('toolbar tray collapse state persists across remount via localStorage', async () => {
      window.localStorage.setItem('dnd-kids-maplab-tray-collapsed:editor-primary', 'true')

      renderMapLabEditorPage()
      await flush()

      expect(screen.getByRole('button', { name: 'Expand Primary tools' })).toBeInTheDocument()
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

  it('left navigation rail holds the room list while floor creation controls live in the command band', async () => {
    const { container } = renderMapLabEditorPage()
    await flush()

    const navRail = container.querySelector('.maplab-editor-nav-rail')
    expect(navRail).toBeInTheDocument()
    const roomList = navRail?.querySelector('.maplab-editor-room-list')
    expect(roomList).toBeInTheDocument()

    // Floor creation controls moved to the command band; the rail is room navigation.
    expect(navRail?.querySelector('.maplab-editor-floor-actions')).not.toBeInTheDocument()
    const toolbar = container.querySelector('.maplab-toolbar')
    const floorActions = toolbar?.querySelector('.maplab-editor-floor-actions')
    expect(floorActions).toBeInTheDocument()
    expect(floorActions?.textContent).toMatch(/Add floor above.*Add floor below/)
    expect(floorActions?.textContent).not.toMatch(/delete|connection/i)
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

  it('keeps floor tabs ordered and activates Add floor above with Enter', async () => {
    const user = userEvent.setup()
    renderMapLabEditorPage()
    await flush()

    const addAbove = screen.getByRole('button', { name: 'Add floor above' })
    addAbove.focus()
    await user.keyboard('{Enter}')

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Ground Floor', 'First Floor'])
    expect(screen.getByRole('tab', { name: 'First Floor' })).toHaveAttribute('aria-selected', 'true')
  })

  it('activates Add floor below with Space and keeps the floor controls as native buttons', async () => {
    const user = userEvent.setup()
    renderMapLabEditorPage()
    await flush()

    const addBelow = screen.getByRole('button', { name: 'Add floor below' })
    expect(addBelow.tagName).toBe('BUTTON')
    addBelow.focus()
    await user.keyboard(' ')

    expect(screen.getByRole('tab', { name: 'Basement' })).toHaveAttribute('aria-selected', 'true')
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
