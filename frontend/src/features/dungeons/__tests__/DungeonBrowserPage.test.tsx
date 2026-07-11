import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import * as api from '../../../api/client'
import type { Dungeon } from '../../../api/types'
import { DungeonBrowserPage } from '../DungeonBrowserPage'

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
  })

  it('lists dungeons sorted by title and shows the first one selected', async () => {
    vi.spyOn(api, 'listDungeons').mockResolvedValue(dungeons)

    render(
      <BrowserRouter>
        <DungeonBrowserPage />
      </BrowserRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Greenhouse' })).toBeInTheDocument())
    expect(screen.getByRole('option', { name: /Greenhouse/ })).toBeInTheDocument()
  })

  it('selecting a dungeon shows its rooms and doors', async () => {
    vi.spyOn(api, 'listDungeons').mockResolvedValue(dungeons)
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <DungeonBrowserPage />
      </BrowserRouter>,
    )
    await waitFor(() => expect(screen.getByText('Isly Castle')).toBeInTheDocument())

    await user.click(screen.getByText('Isly Castle'))
    expect(screen.getByRole('heading', { name: 'Isly Castle' })).toBeInTheDocument()
    expect(screen.getByText('Outside')).toBeInTheDocument()
    expect(screen.getByText(/Great Double Wooden Doors/)).toBeInTheDocument()
  })

  it('opens the editor when New Dungeon is clicked', async () => {
    vi.spyOn(api, 'listDungeons').mockResolvedValue(dungeons)
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <DungeonBrowserPage />
      </BrowserRouter>,
    )
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Greenhouse' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New Dungeon' }))
    expect(screen.getByRole('dialog', { name: 'Add new dungeon' })).toBeInTheDocument()
  })
})
