import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Condition, Encounter, Monster } from '../../../api/types'
import { EncounterEditor } from '../EncounterEditor'
import { combatantFromMonster } from '../encounterRunner'

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

const goblin: Monster = monster({ id: 1, name: 'Goblin', ac: { value: 15, note: null, alternatives: [] }, hp: { average: 7, formula: null } })
const mystery: Monster = monster({ id: 2, name: 'Mystery', ac: null, hp: null })
const conditions: Condition[] = [
  { id: 1, name: 'Poisoned' },
  { id: 2, name: 'Prone' },
]

describe('EncounterEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'getConditions').mockResolvedValue([])
  })

  describe('C1: Stat propagation', () => {
    it('picking a monster fills HP current/max/AC from defaults', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Goblin' })).toBeInTheDocument())

      await user.selectOptions(screen.getByLabelText('Monster'), 'Goblin')

      expect(screen.getByLabelText('HP Current')).toHaveValue(7)
      expect(screen.getByLabelText('HP Max')).toHaveValue(7)
      expect(screen.getByLabelText('AC')).toHaveValue(15)
    })

    it('degrades to blank when the monster lacks hp.average or ac', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([mystery])
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Mystery' })).toBeInTheDocument())

      await user.selectOptions(screen.getByLabelText('Monster'), 'Mystery')

      expect(screen.getByLabelText('HP Current')).toHaveValue(null)
      expect(screen.getByLabelText('HP Max')).toHaveValue(null)
      expect(screen.getByLabelText('AC')).toHaveValue(null)
    })

    it('shares logic with combatantFromMonster', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Goblin' })).toBeInTheDocument())

      await user.selectOptions(screen.getByLabelText('Monster'), 'Goblin')

      const combatant = combatantFromMonster(goblin)
      expect(screen.getByLabelText('HP Current')).toHaveValue(combatant.hp_current)
      expect(screen.getByLabelText('AC')).toHaveValue(combatant.ac)
    })
  })

  describe('C2: Condition checkboxes', () => {
    it('conditions render as checkboxes from getConditions', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      vi.spyOn(api, 'getConditions').mockResolvedValue(conditions)
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      await user.click(screen.getByRole('button', { name: /No conditions/ }))

      await waitFor(() => expect(screen.getByLabelText('Poisoned')).toBeInTheDocument())
      expect(screen.getByLabelText('Prone')).toBeInTheDocument()
      expect(screen.getByLabelText('Poisoned')).not.toBeChecked()
    })

    it('toggling conditions updates form state', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      vi.spyOn(api, 'getConditions').mockResolvedValue(conditions)
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      await user.click(screen.getByRole('button', { name: /No conditions/ }))
      await waitFor(() => expect(screen.getByLabelText('Poisoned')).toBeInTheDocument())

      await user.click(screen.getByLabelText('Poisoned'))
      expect(screen.getByLabelText('Poisoned')).toBeChecked()

      await user.click(screen.getByLabelText('Poisoned'))
      expect(screen.getByLabelText('Poisoned')).not.toBeChecked()
    })

    it('conditions round-trip through formStateToEncounterInput', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      vi.spyOn(api, 'getConditions').mockResolvedValue(conditions)
      const onSaved = vi.fn()
      const createEncounter = vi
        .spyOn(api, 'createEncounter')
        .mockResolvedValue({ id: 1, title: 'Test', creatures: [] })
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={onSaved} />)
      await user.type(screen.getByLabelText('Title'), 'Test')
      await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      await user.click(screen.getByRole('button', { name: /No conditions/ }))
      await waitFor(() => expect(screen.getByLabelText('Poisoned')).toBeInTheDocument())
      await user.click(screen.getByLabelText('Poisoned'))

      await user.click(screen.getByRole('button', { name: 'Create Encounter' }))

      await waitFor(() => expect(createEncounter).toHaveBeenCalled())
      expect(createEncounter.mock.calls[0][0].creatures?.[0].conditions).toEqual(['Poisoned'])
    })

    it('legacy/unknown conditions survive an edit', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      vi.spyOn(api, 'getConditions').mockResolvedValue(conditions)
      const existing: Encounter = {
        id: 7,
        title: 'Old fight',
        creatures: [
          {
            monster_id: 1,
            original_name: 'Goblin',
            name: 'Goblin',
            hp_current: 7,
            hp_max: 7,
            ac: 15,
            status: 'alive',
            conditions: ['stunned (legacy)'],
          },
        ],
      }

      render(<EncounterEditor encounter={existing} onClose={() => {}} onSaved={() => {}} />)
      await screen.findByText('Goblin')
      await userEvent.click(screen.getByRole('button', { name: /stunned \(legacy\)/ }))

      expect(await screen.findByLabelText('stunned (legacy) (custom)')).toBeChecked()
    })
  })

  describe('C3: Creature re-pick and hand-edit persistence', () => {
    it('hand-edits to HP/AC persist until monster is re-picked', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Goblin' })).toBeInTheDocument())

      await user.selectOptions(screen.getByLabelText('Monster'), 'Goblin')
      expect(screen.getByLabelText('HP Current')).toHaveValue(7)

      await user.clear(screen.getByLabelText('HP Current'))
      await user.type(screen.getByLabelText('HP Current'), '5')

      await user.selectOptions(screen.getByLabelText('Monster'), 'Goblin')
      expect(screen.getByLabelText('HP Current')).toHaveValue(7)
    })
  })

  describe('C4: Creature row collapse', () => {
    it('toggles creature row body visibility', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      await waitFor(() => expect(screen.getByLabelText('Monster')).toBeInTheDocument())

      expect(screen.getByLabelText('Monster')).toBeVisible()

      const toggle = screen.getByRole('button', { name: 'Unnamed creature' })
      await user.click(toggle)

      expect(screen.queryByLabelText('Monster')).not.toBeInTheDocument()

      const toggleAgain = screen.getByRole('button', { name: 'Unnamed creature' })
      await user.click(toggleAgain)
      expect(screen.getByLabelText('Monster')).toBeVisible()
    })
  })

  describe('C5: Long creature list', () => {
    it('renders multiple creature rows', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([goblin])
      const user = userEvent.setup()

      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: 'Add Creature' }))
      }

      const rows = screen.getAllByText(/Unnamed creature/)
      expect(rows).toHaveLength(5)
    })
  })

  describe('Dialog contract', () => {
    it('renders with the expected title and focuses the first field', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([])
      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Add New Encounter' })).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toHaveFocus()
    })

    it('closes on Cancel and on Escape', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([])
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<EncounterEditor onClose={onClose} onSaved={() => {}} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('reports save status via an accessible status region', async () => {
      vi.spyOn(api, 'listMonsters').mockResolvedValue([])
      vi.spyOn(api, 'createEncounter').mockRejectedValue(new Error('Unable to save'))
      const user = userEvent.setup()
      render(<EncounterEditor onClose={() => {}} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Title'), 'Test')
      await user.click(screen.getByRole('button', { name: 'Create Encounter' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
    })
  })
})
