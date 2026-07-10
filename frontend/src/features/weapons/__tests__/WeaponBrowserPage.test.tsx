import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Weapon } from '../../../api/types'
import { WeaponBrowserPage } from '../WeaponBrowserPage'

const weapons: Weapon[] = [
  {
    id: 1,
    name: 'Longsword',
    base_weapon: 'Longsword',
    rarity: null,
    weapon_category: 'martial',
    weight: 3,
    req_attune: null,
    property: ['V'],
    focus: [],
    attack: [{ type: 'melee', damage: '1d8', damage_type: 'slashing', hands: 1 }],
    entries: ['A sturdy blade.'],
  },
  {
    id: 2,
    name: '+1 Moon Sickle',
    base_weapon: 'Sickle',
    rarity: 'uncommon',
    weapon_category: 'simple',
    weight: 2,
    req_attune: 'by a druid or ranger',
    property: ['L'],
    focus: ['Druid', 'Ranger'],
    attack: [{ type: 'melee', damage: '1d4', damage_type: 'slashing', hands: 1 }],
    entries: ['This silver-bladed sickle glimmers softly.'],
  },
]

describe('WeaponBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists weapons sorted by name and shows the first one selected', async () => {
    vi.spyOn(api, 'listWeapons').mockResolvedValue(weapons)

    render(<WeaponBrowserPage />)

    await waitFor(() => expect(screen.getByText('Longsword')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /Moon Sickle/ })).toBeInTheDocument()
  })

  it('selecting a weapon shows its attack details', async () => {
    vi.spyOn(api, 'listWeapons').mockResolvedValue(weapons)
    const user = userEvent.setup()

    render(<WeaponBrowserPage />)
    await waitFor(() => expect(screen.getByText('Longsword')).toBeInTheDocument())

    await user.click(screen.getByText('Longsword'))
    expect(screen.getByRole('heading', { name: 'Longsword' })).toBeInTheDocument()
    expect(screen.getByText(/slashing/)).toBeInTheDocument()
  })

  it('opens the editor when New Weapon is clicked', async () => {
    vi.spyOn(api, 'listWeapons').mockResolvedValue(weapons)
    const user = userEvent.setup()

    render(<WeaponBrowserPage />)
    await waitFor(() => expect(screen.getByText('Longsword')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New Weapon' }))
    expect(screen.getByRole('dialog', { name: 'Add new weapon' })).toBeInTheDocument()
  })
})
