import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import * as api from '../../../api/client'
import type { Monster } from '../../../api/types'
import { MonsterBrowserPage } from '../MonsterBrowserPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <MonsterBrowserPage />
    </MemoryRouter>,
  )
}

function monster(overrides: Partial<Monster>): Monster {
  return {
    id: 1,
    name: 'Monster',
    aliases: [],
    sizes: [],
    family: null,
    alignment: null,
    creature_type: null,
    ac: null,
    hp: null,
    speed: [],
    abilities: null,
    saving_throws: {},
    skills: {},
    passive_perception: null,
    damage_resistances: [],
    damage_immunities: [],
    damage_vulnerabilities: [],
    condition_immunities: [],
    senses: [],
    languages: [],
    audio_path: null,
    features: {
      traits: [],
      spellcasting: [],
      actions: [],
      bonus_actions: [],
      reactions: [],
      reaction_intro: null,
      legendary_actions: [],
      legendary_intro: null,
      legendary_actions_per_round: null,
      mythic_actions: [],
    },
    cr: null,
    cr_sort: null,
    cr_note: null,
    experience_points: null,
    ...overrides,
  }
}

const monsters: Monster[] = [
  monster({
    id: 1,
    name: 'Aarakocra',
    ac: { value: 12, note: null, alternatives: [] },
    hp: { average: 13, formula: '3d8' },
    speed: [
      { mode: 'walk', feet: 20, note: null, hover: false },
      { mode: 'fly', feet: 50, note: null, hover: false },
    ],
    abilities: { str: 10, dex: 14, con: 10, int: 11, wis: 12, cha: 11 },
    languages: ['Auran'],
    cr: '1/4',
    cr_sort: 0.25,
    creature_type: { category: 'humanoid', tags: [], swarm_size: null },
    alignment: 'neutral',
    senses: [{ type: 'darkvision', range: 60, note: null }],
    features: {
      ...monster({}).features,
      actions: [
        {
          name: 'Talon',
          description: null,
          attack: {
            kind: 'melee_weapon',
            attack_bonus: 4,
            automatic_hit: false,
            range_ft: 5,
            long_range_ft: null,
            targets: 1,
            damage: [{ formula: '1d4', bonus: 0, damage_types: ['slashing'] }],
          },
        },
      ],
    },
  }),
  monster({
    id: 2,
    name: 'Owlbear',
    ac: { value: 13, note: 'natural armour', alternatives: [] },
    hp: { average: 59, formula: '7d10 + 21' },
    speed: [{ mode: 'walk', feet: 40, note: null, hover: false }],
    abilities: { str: 20, dex: 12, con: 17, int: 3, wis: 12, cha: 7 },
    senses: [{ type: 'darkvision', range: 60, note: null }],
    cr: '3',
    cr_sort: 3,
    creature_type: { category: 'monstrosity', tags: [], swarm_size: null },
    alignment: 'unaligned',
    features: {
      ...monster({}).features,
      actions: [
        {
          name: 'Beak',
          description: null,
          attack: {
            kind: 'melee_weapon',
            attack_bonus: 7,
            automatic_hit: false,
            range_ft: 5,
            long_range_ft: null,
            targets: 1,
            damage: [{ formula: '1d10', bonus: 5, damage_types: ['piercing'] }],
          },
        },
      ],
    },
  }),
]

describe('MonsterBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists monsters sorted by name and shows the first one selected', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)

    renderPage()

    await waitFor(() => expect(screen.getByText('Owlbear')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Aarakocra' })).toBeInTheDocument()
    expect(screen.getByText('Bestiary Field Card')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('deferred load shows loading state, then empty state with no monsters', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue([])

    renderPage()

    await waitFor(() => expect(screen.getByText('No monsters found.')).toBeInTheDocument())
    expect(screen.getByText(/Choose a monster/)).toBeInTheDocument()
  })

  it('shows chapter icon in header', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)

    renderPage()

    await waitFor(() => expect(screen.getByText('Owlbear')).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Monsters' })).toBeInTheDocument()
  })

  it('selecting a monster shows its stat block details', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)
    const user = userEvent.setup()

    renderPage()
    await waitFor(() => expect(screen.getByText('Owlbear')).toBeInTheDocument())

    await user.click(screen.getByText('Owlbear'))
    expect(screen.getByRole('heading', { name: 'Owlbear' })).toBeInTheDocument()
    expect(screen.getByText(/darkvision 60 ft\./)).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listMonsters').mockRejectedValue(new Error('server error'))

    renderPage()
    await waitFor(() => expect(screen.getByText(/server error/)).toBeInTheDocument())
  })

  it('Back to monsters clears the selected detail', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)
    const user = userEvent.setup()

    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Aarakocra' })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Back to monsters' }))
    expect(screen.queryByRole('heading', { name: 'Aarakocra' })).not.toBeInTheDocument()
    expect(screen.getByText(/Choose a monster/)).toBeInTheDocument()
  })
})

describe('Monster data (M2 shape)', () => {
  it('renders AC as {value, note} from the migrated shape', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)

    renderPage()

    await screen.findByRole('heading', { name: 'Aarakocra' })
    const acLabel = screen.getByText('AC')
    expect(acLabel.nextElementSibling).toHaveTextContent('12')
  })

  it.skip('hides sections when data is absent', () => {
    // X1: a bare beast hides Actions and Lore sections
  })
})

describe('Monster New/Edit navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('Add Monster navigates to /monsters/new', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/monsters']}>
        <Routes>
          <Route path="/monsters" element={<MonsterBrowserPage />} />
          <Route path="/monsters/new" element={<p>New monster page</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Aarakocra' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Add Monster' }))
    expect(screen.getByText('New monster page')).toBeInTheDocument()
  })

  it('Edit navigates to /monsters/:id/edit', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/monsters']}>
        <Routes>
          <Route path="/monsters" element={<MonsterBrowserPage />} />
          <Route path="/monsters/:id/edit" element={<p>Edit monster page</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Aarakocra' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('Edit monster page')).toBeInTheDocument()
  })

  it('honors editor-return location.state.selectedId', async () => {
    vi.spyOn(api, 'listMonsters').mockResolvedValue(monsters)

    render(
      <MemoryRouter initialEntries={[{ pathname: '/monsters', state: { selectedId: 2 } }]}>
        <Routes>
          <Route path="/monsters" element={<MonsterBrowserPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Owlbear' })).toBeInTheDocument())
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
