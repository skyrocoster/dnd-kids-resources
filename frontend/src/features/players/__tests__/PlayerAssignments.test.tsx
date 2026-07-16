import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import { targetSpell } from '../../spells/__tests__/spellFixtures'
import { SpellAssignment } from '../PlayerAssignments'

const availableSpell = { ...targetSpell, id: 2, name: 'Acid Splash' }

describe('SpellAssignment', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'getPlayerSpells').mockResolvedValue([targetSpell])
    vi.spyOn(api, 'listSpells').mockResolvedValue([targetSpell, availableSpell])
  })

  it('renders target spell names and offers unassigned target spells', async () => {
    render(<SpellAssignment playerId={7} />)

    await waitFor(() => expect(screen.getByText('Plant Growth')).toBeInTheDocument())
    expect(targetSpell.casting_times).toEqual(['1 action', '8 hours'])
    expect(targetSpell.area_of_effect).toEqual({ shape: 'cylinder', size: 100 })
    expect(screen.getByRole('option', { name: 'Acid Splash' })).toBeInTheDocument()
  })

  it('assigns the selected spell by ID', async () => {
    const assignPlayerSpell = vi.spyOn(api, 'assignPlayerSpell').mockResolvedValue()
    const user = userEvent.setup()

    render(<SpellAssignment playerId={7} />)

    await screen.findByRole('option', { name: 'Acid Splash' })
    await user.selectOptions(screen.getByLabelText('Add Spell'), '2')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(assignPlayerSpell).toHaveBeenCalledWith(7, 2)
  })
})
