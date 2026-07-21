import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { NPC } from '../../../api/types'
import { NPCEditor } from '../NPCEditor'

describe('NPCEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an NPC from the form fields with structured blank defaults', async () => {
    const created: NPC = { id: 1, name: 'Old Man Willow' }
    const createNPC = vi.spyOn(api, 'createNPC').mockResolvedValue(created)
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<NPCEditor onClose={() => {}} onSaved={onSaved} />)

    await user.type(screen.getByLabelText('Name'), 'Old Man Willow')
    await user.click(screen.getByRole('button', { name: 'Create NPC' }))

    await waitFor(() => expect(createNPC).toHaveBeenCalledOnce())
    expect(createNPC).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Old Man Willow',
        sizes: [],
        ac: null,
        hp: null,
        speed: [],
        abilities: null,
        saving_throws: {},
        skills: {},
        senses: [],
        languages: [],
      }),
    )
    expect(createNPC.mock.calls[0][0]).not.toHaveProperty('size')
    expect(createNPC.mock.calls[0][0]).not.toHaveProperty('armor_class')
    expect(onSaved).toHaveBeenCalledWith(created)
  })

  it('updates an existing NPC without discarding unexposed statblock fields', async () => {
    const npc: NPC = {
      id: 4,
      name: 'Barkeep',
      sizes: ['medium'],
      ac: { value: 12, note: 'apron', alternatives: [{ value: 14, note: 'behind bar' }] },
      hp: { average: 9, formula: '2d8' },
      speed: [
        { mode: 'walk', feet: 30, note: 'busy room', hover: false },
        { mode: 'climb', feet: 10, note: 'cellar ladder', hover: false },
      ],
      damage_resistances: [{ damage_type: 'fire', note: 'kitchen burns', conditional: true }],
      condition_immunities: ['charmed'],
      features: {
        traits: [{ name: 'Regulars', description: 'Knows everyone.', attack: null }],
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
    }
    const updateNPC = vi.spyOn(api, 'updateNPC').mockResolvedValue(npc)
    const user = userEvent.setup()
    render(<NPCEditor npc={npc} onClose={() => {}} onSaved={() => {}} />)

    await user.clear(screen.getByLabelText('Armor Class'))
    await user.type(screen.getByLabelText('Armor Class'), '13')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(updateNPC).toHaveBeenCalledOnce())
    expect(updateNPC).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        name: 'Barkeep',
        ac: { value: 13, note: 'apron', alternatives: [{ value: 14, note: 'behind bar' }] },
        hp: { average: 9, formula: '2d8' },
        speed: [
          { mode: 'walk', feet: 30, note: 'busy room', hover: false },
          { mode: 'climb', feet: 10, note: 'cellar ladder', hover: false },
        ],
        damage_resistances: [{ damage_type: 'fire', note: 'kitchen burns', conditional: true }],
        condition_immunities: ['charmed'],
        features: npc.features,
      }),
    )
  })

  describe('Dialog contract', () => {
    it('renders with the expected title and focuses the first field', () => {
      render(<NPCEditor onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Add New NPC' })).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toHaveFocus()
    })

    it('uses the NPC title when editing', () => {
      const npc: NPC = { id: 4, name: 'Barkeep' }
      render(<NPCEditor npc={npc} onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Edit NPC: Barkeep' })).toBeInTheDocument()
    })

    it('closes on Cancel and on Escape', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<NPCEditor onClose={onClose} onSaved={() => {}} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('reports save status via an accessible status region', async () => {
      vi.spyOn(api, 'createNPC').mockRejectedValue(new Error('Unable to save'))
      const user = userEvent.setup()
      render(<NPCEditor onClose={() => {}} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Name'), 'Failed NPC')
      await user.click(screen.getByRole('button', { name: 'Create NPC' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
    })

    it('disables Cancel and Save while saving, suppressing Escape', async () => {
      let resolveCreate: (npc: NPC) => void = () => {}
      vi.spyOn(api, 'createNPC').mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
      )
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<NPCEditor onClose={onClose} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Name'), 'Pending NPC')
      await user.click(screen.getByRole('button', { name: 'Create NPC' }))

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Create NPC' })).toBeDisabled()

      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()

      resolveCreate({ id: 1, name: 'Pending NPC' })
    })
  })
})
