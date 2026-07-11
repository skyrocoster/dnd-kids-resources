import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Player } from '../../../api/types'
import { PlayerBrowserPage } from '../PlayerBrowserPage'

const players: Player[] = [
  { id: 1, name: 'Pip', class_: 'Wizard', level: 1 },
  { id: 2, name: 'Lark', class_: 'Wizard', level: 1 },
]

describe('PlayerBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'getPlayerSpells').mockResolvedValue([])
    vi.spyOn(api, 'getPlayerWeapons').mockResolvedValue([])
    vi.spyOn(api, 'listSpells').mockResolvedValue([])
    vi.spyOn(api, 'listWeapons').mockResolvedValue([])
  })

  it('lists players sorted by name and shows the first one selected', async () => {
    vi.spyOn(api, 'listPlayers').mockResolvedValue(players)

    render(<PlayerBrowserPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lark' })).toBeInTheDocument())
    expect(screen.getByRole('option', { name: /Lark/ })).toBeInTheDocument()
  })

  it('selecting a player shows their detail card', async () => {
    vi.spyOn(api, 'listPlayers').mockResolvedValue(players)
    const user = userEvent.setup()

    render(<PlayerBrowserPage />)
    await waitFor(() => expect(screen.getByText('Pip')).toBeInTheDocument())

    await user.click(screen.getByText('Pip'))
    expect(screen.getByRole('heading', { name: 'Pip' })).toBeInTheDocument()
  })

  it('opens the editor when New Player is clicked', async () => {
    vi.spyOn(api, 'listPlayers').mockResolvedValue(players)
    const user = userEvent.setup()

    render(<PlayerBrowserPage />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lark' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New Player' }))
    expect(screen.getByRole('dialog', { name: 'Add new player' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listPlayers').mockRejectedValue(new Error('boom'))

    render(<PlayerBrowserPage />)
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })
})
