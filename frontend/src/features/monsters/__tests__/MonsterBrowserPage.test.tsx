import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Monster } from '../../../api/types'
import { MonsterBrowserPage } from '../MonsterBrowserPage'

const monsters: Monster[] = [
  {
    id: 1,
    name: 'Aarakocra',
    ac: { '12': null },
    hp: { average: 13, formula: '3d8' },
    speed: { walk: 20, fly: 50 },
    stats: { str: 10, dex: 14, con: 10, int: 11, wis: 12, cha: 11 },
    senses: [],
    languages: ['Auran'],
    cr: '1/4',
    action: [
      { name: 'Talon', attack: { type: 'melee', mod: 4, damage: '1d4', damage_type: 'slashing' } },
    ],
  },
  {
    id: 2,
    name: 'Owlbear',
    ac: { '13': null },
    hp: { average: 59, formula: '7d10+21' },
    speed: { walk: 40 },
    stats: { str: 20, dex: 12, con: 17, int: 3, wis: 12, cha: 7 },
    senses: [{ type: 'darkvision', range: 60 }],
    languages: [],
    cr: '3',
    action: [{ name: 'Beak', attack: { type: 'melee', mod: 7, damage: '1d10+5', damage_type: 'piercing' } }],
  },
]

describe('MonsterBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists monsters sorted by name and shows the first one selected', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)

    render(<MonsterBrowserPage />)

    await waitFor(() => expect(screen.getByText('Owlbear')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Aarakocra' })).toBeInTheDocument()
  })

  it('selecting a monster shows its stat block details', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)
    const user = userEvent.setup()

    render(<MonsterBrowserPage />)
    await waitFor(() => expect(screen.getByText('Owlbear')).toBeInTheDocument())

    await user.click(screen.getByText('Owlbear'))
    expect(screen.getByRole('heading', { name: 'Owlbear' })).toBeInTheDocument()
    expect(screen.getByText(/darkvision 60 ft\./)).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listMonsters').mockRejectedValue(new Error('server error'))

    render(<MonsterBrowserPage />)
    await waitFor(() => expect(screen.getByText(/server error/)).toBeInTheDocument())
  })
})
