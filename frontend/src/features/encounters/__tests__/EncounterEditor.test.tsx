import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Monster } from '../../../api/types'
import { EncounterEditor } from '../EncounterEditor'
import { combatantFromMonster } from '../encounterRunner'

const goblin: Monster = { id: 1, name: 'Goblin', ac: { '15': null }, hp: { average: 7 } }
const mystery: Monster = { id: 2, name: 'Mystery', ac: null, hp: null }

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
    it.skip('conditions render as checkboxes from getConditions', () => {
      // TODO C2: mount editor, verify condition checkboxes render
      expect(true).toBe(true)
    })

    it.skip('toggling conditions updates form state', () => {
      // TODO C2: click checkbox, verify conditions: string[] updates
      expect(true).toBe(true)
    })

    it.skip('conditions round-trip through formStateToEncounterInput', () => {
      // TODO C2: set conditions, convert to input, verify round-trip
      expect(true).toBe(true)
    })

    it.skip('legacy/unknown conditions survive an edit', () => {
      // TODO C2: verify conditions not in canonical list persist
      expect(true).toBe(true)
    })
  })
})
