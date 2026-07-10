import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Spell } from '../../../api/types'
import { SpellBrowserPage } from '../SpellBrowserPage'

const spells: Spell[] = [
  {
    id: 1,
    spell_name: 'Fireball',
    icon: '🔥',
    level: '3',
    school: 'evocation',
    spell_text: 'A bright streak deals 8d6 fire damage.',
    spell_alt_text: null,
    damage: null,
    heal: null,
    heal_at_spell_slots: null,
    range: '150 feet',
    higher_levels: null,
    damage_at_higher_levels: null,
    casting_time: '1 action',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components: ['V', 'S', 'M'],
    materials: null,
    attack_type: null,
    area_of_effect: null,
    action: null,
    classes: ['Wizard'],
    subclasses: null,
  },
  {
    id: 2,
    spell_name: 'Cure Wounds',
    icon: '✨',
    level: '1',
    school: 'evocation',
    spell_text: 'A creature regains 1d8+3 hit points.',
    spell_alt_text: null,
    damage: null,
    heal: null,
    heal_at_spell_slots: null,
    range: 'Touch',
    higher_levels: null,
    damage_at_higher_levels: null,
    casting_time: '1 action',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components: ['V', 'S'],
    materials: null,
    attack_type: null,
    area_of_effect: null,
    action: null,
    classes: ['Cleric'],
    subclasses: null,
  },
]

describe('SpellBrowserPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists spells sorted by level and shows the first spell selected', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)

    render(<SpellBrowserPage />)

    await waitFor(() => expect(screen.getByText('Cure Wounds')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /Cure Wounds/ })).toBeInTheDocument()
  })

  it('selecting a different spell updates the detail pane', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)
    const user = userEvent.setup()

    render(<SpellBrowserPage />)
    await waitFor(() => expect(screen.getByText('Fireball')).toBeInTheDocument())

    await user.click(screen.getByText('Fireball'))
    expect(screen.getByRole('heading', { name: /Fireball/ })).toBeInTheDocument()
  })

  it('opens the editor when New Spell is clicked', async () => {
    vi.spyOn(api, 'listSpells').mockResolvedValue(spells)
    const user = userEvent.setup()

    render(<SpellBrowserPage />)
    await waitFor(() => expect(screen.getByText('Cure Wounds')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'New Spell' }))
    expect(screen.getByRole('dialog', { name: 'Add new spell' })).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.spyOn(api, 'listSpells').mockRejectedValue(new Error('network down'))

    render(<SpellBrowserPage />)
    await waitFor(() => expect(screen.getByText(/network down/)).toBeInTheDocument())
  })
})
