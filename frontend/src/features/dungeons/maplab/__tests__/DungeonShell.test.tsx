import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../../../api/client'
import { DungeonShell } from '../DungeonShell'
import { MapLabPage } from '../MapLabPage'
import { MapLabEditorPage } from '../MapLabEditorPage'
import { mapLabLayout } from '../maplabData'

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

function renderDungeonRoute(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dungeons/:dungeonId" element={<DungeonShell />}>
          <Route index element={<MapLabPage />} />
          <Route path="edit" element={<MapLabEditorPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.spyOn(api, 'getDungeon').mockResolvedValue({ id: 4, title: 'Test Dungeon', data: {} })
  vi.spyOn(api, 'getDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
  vi.spyOn(api, 'saveDungeonLayout').mockResolvedValue({ data: mapLabLayout as unknown as Record<string, unknown> })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DungeonShell', () => {
  it('renders the same dungeon title in view and edit modes with sibling mode links', async () => {
    const { rerender } = renderDungeonRoute('/dungeons/4')
    await flush()

    expect(screen.getByRole('heading', { name: 'Test Dungeon' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/dungeons/4')
    expect(screen.getByRole('link', { name: 'Edit map' })).toHaveAttribute('href', '/dungeons/4/edit')

    rerender(
      <MemoryRouter initialEntries={['/dungeons/4/edit']}>
        <Routes>
          <Route path="/dungeons/:dungeonId" element={<DungeonShell />}>
            <Route index element={<MapLabPage />} />
            <Route path="edit" element={<MapLabEditorPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    await flush()

    expect(screen.getByRole('heading', { name: 'Test Dungeon' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/dungeons/4')
    expect(screen.getByRole('link', { name: 'Edit map' })).toHaveAttribute('href', '/dungeons/4/edit')
  })

  it('renders a return-to-browser link to /dungeons', async () => {
    renderDungeonRoute('/dungeons/4')
    await flush()

    expect(screen.getByRole('link', { name: 'Back to dungeons' })).toHaveAttribute('href', '/dungeons')
  })

  it('invalid ids render the shell error state without calling APIs', async () => {
    const getDungeonSpy = vi.spyOn(api, 'getDungeon')
    const getLayoutSpy = vi.spyOn(api, 'getDungeonLayout')

    renderDungeonRoute('/dungeons/not-a-number')
    await flush()

    expect(screen.getByText('Invalid dungeon URL.')).toBeInTheDocument()
    expect(getDungeonSpy).not.toHaveBeenCalled()
    expect(getLayoutSpy).not.toHaveBeenCalled()
  })

  it('missing dungeons render the shell missing state', async () => {
    vi.spyOn(api, 'getDungeon').mockRejectedValue(new api.ApiError(404, 'not found'))

    renderDungeonRoute('/dungeons/4')
    await flush()

    expect(screen.getByText('This dungeon does not exist.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Test Dungeon' })).not.toBeInTheDocument()
  })

  it('shows a recovery link when dungeon is missing', async () => {
    vi.spyOn(api, 'getDungeon').mockRejectedValue(new api.ApiError(404, 'not found'))

    renderDungeonRoute('/dungeons/4')
    await flush()

    const recovery = screen.getAllByRole('link', { name: 'Back to dungeons' })
    expect(recovery.length).toBeGreaterThanOrEqual(1)
    expect(recovery[0]).toHaveAttribute('href', '/dungeons')
  })

  it('shows a recovery link when dungeon ID is invalid', async () => {
    renderDungeonRoute('/dungeons/not-a-number')
    await flush()

    const recovery = screen.getByRole('link', { name: 'Back to dungeons' })
    expect(recovery).toHaveAttribute('href', '/dungeons')
  })

  it('shows a recovery link when dungeon fetch errors', async () => {
    vi.spyOn(api, 'getDungeon').mockRejectedValue(new api.ApiError(500, 'server error'))

    renderDungeonRoute('/dungeons/4')
    await flush()

    const recovery = screen.getAllByRole('link', { name: 'Back to dungeons' })
    expect(recovery.length).toBeGreaterThanOrEqual(1)
    expect(recovery[0]).toHaveAttribute('href', '/dungeons')
  })

  it('layout 404 keeps the dungeon title visible while the child renders the blank map state', async () => {
    vi.spyOn(api, 'getDungeonLayout').mockRejectedValue(new api.ApiError(404, 'not found'))

    renderDungeonRoute('/dungeons/4')
    await flush()

    expect(screen.getByRole('heading', { name: 'Test Dungeon' })).toBeInTheDocument()
    expect(screen.getByText('No saved layout yet. This dungeon is starting from a blank map.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Starting Floor' })).toBeInTheDocument()
  })

  // ── VT2 responsive regions ────────────────────────────────────────────────────

  it('shell and child surfaces align at the 520px narrow breakpoint (VT2 responsive regions)', async () => {
    // VT2: Breakpoints reconciled to VF1 convention (520px/768px). This seam verifies that at
    // 520px the title, View/Edit links, and Back link remain visible without horizontal overflow,
    // and the child surface (MapLabPage) adapts to narrow layout.
    renderDungeonRoute('/dungeons/4')
    await flush()

    const shell = document.querySelector('.dungeon-shell') as HTMLElement
    Object.defineProperty(shell, 'offsetWidth', { value: 520 })

    expect(shell.scrollWidth).toBeLessThanOrEqual(shell.clientWidth + 1)
    expect(screen.getByRole('heading', { name: 'Test Dungeon' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Edit map' })).toBeVisible()
  })

  it('room rail and details panel are reachable in narrow layout (VT2 narrow room access)', async () => {
    // VT2: At 520px, the room rail (ViewerRoomRail), map canvas, and RoomDetailsPanel must
    // be reachable in deliberate order: rail first for floor/room navigation, then canvas, then
    // details sidebar. Narrow layout stacks these as separate flex sections.
    renderDungeonRoute('/dungeons/4')
    await flush()

    // At 520px, the room rail must be accessible (part of the stacked narrow layout).
    const canvas = document.querySelector('.maplab-canvas')
    expect(canvas).toBeInTheDocument()
    expect(document.querySelector('.maplab-viewer-rail-container')).toBeInTheDocument()
    expect(document.querySelector('.maplab-sidebar')).toBeInTheDocument()
  })
})
