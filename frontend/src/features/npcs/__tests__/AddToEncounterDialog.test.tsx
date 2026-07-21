import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Encounter, NPC } from '../../../api/types'
import { AddToEncounterDialog } from '../AddToEncounterDialog'

const testEncounter: Encounter = {
  id: 1,
  title: 'Cragmaw Hideout',
  creatures: [],
  active_index: null,
}

const testNPC: NPC = {
  id: 5,
  name: 'Barkeep',
  sizes: ['medium'],
  alignment: null,
  creature_type: null,
  ac: { value: 10, note: null, alternatives: [] },
  hp: { average: 4, formula: '1d8' },
  speed: [],
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 12 },
  saving_throws: {},
  skills: {},
  passive_perception: null,
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  condition_immunities: [],
  senses: [],
  languages: ['Common'],
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
  cr_note: null,
  experience_points: null,
  race: null,
  gender: null,
  background: null,
  appearance: null,
  notes: null,
}

describe('AddToEncounterDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'listEncounters').mockResolvedValue([testEncounter])
  })

  it('renders the encounter list once loaded', async () => {
    render(<AddToEncounterDialog npc={testNPC} onClose={() => {}} onAdded={() => {}} />)

    await screen.findByText('Cragmaw Hideout')
    expect(screen.getByText('Cragmaw Hideout')).toBeInTheDocument()
  })

  it('shows No encounters found. when the list is empty', async () => {
    vi.spyOn(api, 'listEncounters').mockResolvedValue([])

    render(<AddToEncounterDialog npc={testNPC} onClose={() => {}} onAdded={() => {}} />)

    await screen.findByText('No encounters found.')
    expect(screen.getByText('No encounters found.')).toBeInTheDocument()
  })

  it('shows No encounters match your search. when a search matches nothing', async () => {
    const user = userEvent.setup()

    render(<AddToEncounterDialog npc={testNPC} onClose={() => {}} onAdded={() => {}} />)

    await screen.findByText('Cragmaw Hideout')

    const searchInput = screen.getByRole('searchbox')
    await user.type(searchInput, 'xyzzy')

    await screen.findByText('No encounters match your search.')
    expect(screen.getByText('No encounters match your search.')).toBeInTheDocument()
  })

  it('Add is disabled until an encounter is selected', async () => {
    render(<AddToEncounterDialog npc={testNPC} onClose={() => {}} onAdded={() => {}} />)

    await screen.findByText('Cragmaw Hideout')

    const addButton = screen.getByRole('button', { name: 'Add' })
    expect(addButton).toBeDisabled()

    await userEvent.setup().click(screen.getByText('Cragmaw Hideout'))
    expect(addButton).toBeEnabled()
  })

  it('a successful commit calls onAdded', async () => {
    vi.spyOn(api, 'updateEncounter').mockResolvedValue(testEncounter)
    const onAdded = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<AddToEncounterDialog npc={testNPC} onClose={onClose} onAdded={onAdded} />)

    await screen.findByText('Cragmaw Hideout')
    await user.click(screen.getByText('Cragmaw Hideout'))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(onAdded).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  it('a rejected updateEncounter shows the inline status failure and keeps the dialog open', async () => {
    vi.spyOn(api, 'updateEncounter').mockRejectedValue(new Error('Server error'))
    const onAdded = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<AddToEncounterDialog npc={testNPC} onClose={onClose} onAdded={onAdded} />)

    await screen.findByText('Cragmaw Hideout')
    await user.click(screen.getByText('Cragmaw Hideout'))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const statusEl = await screen.findByRole('status')
    expect(statusEl).toHaveTextContent('Server error')

    expect(onAdded).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
