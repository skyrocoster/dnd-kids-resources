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

// ── M2/M3 test stubs ────────────────────────────────────────────────────────────

describe('Monster data (M2 shape)', () => {
  it.skip('renders AC as {value, note} from the migrated shape', () => {
    // M2: AC shape changes from {"13": null} to {"value": 13, "note": null}
  })

  it.skip('hides sections when data is absent', () => {
    // M2: empty traits/actions/reactions produce no DOM section
  })
})

describe('Monster CRUD (M3)', () => {
  it.skip('createMonster sends POST and returns the created monster', () => {
    // M3: stub becomes real when CRUD endpoints land
  })

  it.skip('updateMonster sends PUT and returns updated fields', () => {
    // M3: stub becomes real when CRUD endpoints land
  })

  it.skip('deleteMonster sends DELETE and removes the monster', () => {
    // M3: stub becomes real when CRUD endpoints land
  })
})
