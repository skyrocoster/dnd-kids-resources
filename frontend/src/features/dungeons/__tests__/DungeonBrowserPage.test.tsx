import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Dungeon } from '../../../api/types'
import { DungeonBrowserPage } from '../DungeonBrowserPage'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}))

const dungeons: Dungeon[] = [
  {
    id: 4,
    title: 'Isly Castle',
    data: {
      rooms: [{ room_id: 1, title: 'Outside', entries: [] }],
      doors: [{ door_id: 1, title: 'Great Double Wooden Doors', leads_to: [2, 1] }],
    },
  },
  { id: 5, title: 'Greenhouse', data: { rooms: [], doors: [] } },
]

describe('DungeonBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate.mockReset()
    vi.spyOn(api, 'listDungeons').mockResolvedValue(dungeons)
  })

  it('lists dungeons sorted by title and shows the first one selected', async () => {
    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Greenhouse' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Greenhouse/ })).toBeInTheDocument()
  })

  it('selecting a dungeon shows its title, room count, and map editor guidance', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'Greenhouse' })

    await user.click(screen.getByText('Isly Castle'))
    expect(screen.getByText('1 room(s)')).toBeInTheDocument()
    expect(screen.getByText(/Open this dungeon in the map editor/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('navigates to the production editor when Edit is clicked', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'Greenhouse' })

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(mockNavigate).toHaveBeenCalledWith('/dungeons/5/edit')
  })

  it('creates a dungeon then navigates to its production editor', async () => {
    vi.spyOn(api, 'createDungeon').mockResolvedValue({ id: 9, title: 'Untitled Dungeon', data: {} })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'New Dungeon' }))
    await waitFor(() => expect(api.createDungeon).toHaveBeenCalledWith({ title: 'Untitled Dungeon', data: {} }))
    expect(mockNavigate).toHaveBeenCalledWith('/dungeons/9/edit')
  })

  it('shows a create error without navigating', async () => {
    vi.spyOn(api, 'createDungeon').mockRejectedValue(new Error('Creation failed'))
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'New Dungeon' }))
    expect(await screen.findByText('Creation failed')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('disables New Dungeon while creation is in flight', async () => {
    let resolveCreate!: (dungeon: Dungeon) => void
    vi.spyOn(api, 'createDungeon').mockReturnValue(
      new Promise<Dungeon>((resolve) => {
        resolveCreate = resolve
      }),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'New Dungeon' }))
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
    resolveCreate({ id: 9, title: 'Untitled Dungeon', data: {} })
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dungeons/9/edit'))
  })

  it('deletes a dungeon after confirmation and refreshes the list', async () => {
    vi.spyOn(api, 'deleteDungeon').mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Greenhouse' })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete Greenhouse?' })
    expect(dialog).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.deleteDungeon).toHaveBeenCalledWith(5))
    expect(api.listDungeons).toHaveBeenCalledTimes(2)
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listDungeons').mockRejectedValue(new Error('network down'))

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText(/network down/)).toBeInTheDocument())
  })

  it('shows loading state before data arrives', async () => {
    let resolve!: (value: Dungeon[]) => void
    vi.spyOn(api, 'listDungeons').mockReturnValue(new Promise((done) => { resolve = done }))

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('No dungeons found.')).not.toBeInTheDocument()
    resolve([])
  })

  it('shows no-selection prompt when no dungeons', async () => {
    vi.spyOn(api, 'listDungeons').mockResolvedValue([])

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('No dungeons found.')).toBeInTheDocument())
    expect(screen.getByText(/Choose a dungeon/)).toBeInTheDocument()
  })

  it('shows chapter icon tab in header', async () => {
    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Greenhouse' })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Dungeons' })).toBeInTheDocument()
  })

  it('Back to dungeons clears the selected detail', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Greenhouse' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Back to dungeons' }))
    expect(screen.queryByRole('heading', { name: 'Greenhouse' })).not.toBeInTheDocument()
    expect(screen.getByText(/Choose a dungeon/)).toBeInTheDocument()
  })

  it('filtering to no matches shows filtered-empty state', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Greenhouse' })).toBeInTheDocument())

    await user.type(screen.getByRole('searchbox'), 'zzz-no-match')
    await waitFor(() => expect(screen.getByText('No dungeons found.')).toBeInTheDocument())
  })

  it('navigates to the dungeon viewer when Enter is clicked', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'Greenhouse' })

    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(mockNavigate).toHaveBeenCalledWith('/dungeons/5')
  })

  it('shows a pending confirm dialog while deleting', async () => {
    let resolveDelete: () => void = () => {}
    vi.spyOn(api, 'deleteDungeon').mockImplementation(
      () => new Promise((resolve) => { resolveDelete = () => resolve(undefined) }),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <DungeonBrowserPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Greenhouse' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-busy', 'true'))

    resolveDelete()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
