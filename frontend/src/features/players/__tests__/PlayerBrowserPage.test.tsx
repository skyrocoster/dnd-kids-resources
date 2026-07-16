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
    expect(screen.getByRole('button', { name: /Lark/ })).toBeInTheDocument()
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
    expect(screen.getByRole('dialog', { name: 'Add New Player' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listPlayers').mockRejectedValue(new Error('boom'))

    render(<PlayerBrowserPage />)
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })

  it('keeps loading distinct from an empty collection', () => {
    vi.spyOn(api, 'listPlayers').mockReturnValue(new Promise(() => {}))
    render(<PlayerBrowserPage />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('No players found.')).not.toBeInTheDocument()
  })

  it('shows filtered-empty state and returns from the detail view', async () => {
    vi.spyOn(api, 'listPlayers').mockResolvedValue(players)
    const user = userEvent.setup()
    render(<PlayerBrowserPage />)

    await screen.findByRole('heading', { name: 'Lark' })
    await user.type(screen.getByRole('searchbox'), 'missing')
    expect(screen.getByText('No matches')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to players' }))
    expect(screen.getByText('Select an item')).toBeInTheDocument()
  })
})
