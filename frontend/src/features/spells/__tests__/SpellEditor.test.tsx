import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import { SpellEditor } from '../SpellEditor'
import { targetSpell } from './spellFixtures'

describe('SpellEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'getDamageTypes').mockResolvedValue([])
    vi.spyOn(api, 'getAbilities').mockResolvedValue([])
    vi.spyOn(api, 'getSpellComponents').mockResolvedValue([])
  })

  it('serializes a target-contract spell when creating', async () => {
    const createSpell = vi.spyOn(api, 'createSpell').mockResolvedValue(targetSpell)
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={onSaved} />)

    await user.type(screen.getByLabelText('Spell Name'), 'Moonbeam')
    await user.type(screen.getByLabelText('Description'), 'Radiant light shines down.')
    await user.type(screen.getByLabelText('Range'), '120 feet')
    await user.type(screen.getByLabelText('Duration'), 'Concentration, up to 1 minute')
    await user.type(screen.getByLabelText('Casting Time'), '1 action')
    await user.click(screen.getByRole('button', { name: 'Create Spell' }))

    await waitFor(() => expect(createSpell).toHaveBeenCalledOnce())
    expect(createSpell).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Moonbeam',
      level: 0,
      description: 'Radiant light shines down.',
      range: '120 feet',
      duration: 'Concentration, up to 1 minute',
      casting_times: ['1 action'],
      damage: [],
      attacks: [],
    }))
    expect(onSaved).toHaveBeenCalledWith(targetSpell)
  })

  it('shows an API failure without closing the editor', async () => {
    vi.spyOn(api, 'createSpell').mockRejectedValue(new Error('Unable to save'))
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Spell Name'), 'Failed Spell')
    await user.click(screen.getByRole('button', { name: 'Create Spell' }))

    expect(await screen.findByText('Unable to save')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Add New Spell' })).toBeInTheDocument()
  })

  describe('Dialog contract', () => {
    it('focuses the first field on open', () => {
      render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)
      expect(screen.getByLabelText('Spell Name')).toHaveFocus()
    })

    it('closes on Cancel and on Escape', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<SpellEditor onClose={onClose} onSaved={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('reports save status via an accessible status region', async () => {
      vi.spyOn(api, 'createSpell').mockRejectedValue(new Error('Unable to save'))
      const user = userEvent.setup()
      render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

      await user.type(screen.getByLabelText('Spell Name'), 'Failed Spell')
      await user.click(screen.getByRole('button', { name: 'Create Spell' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
    })

    it('disables Cancel and Save while saving, suppressing Escape', async () => {
      let resolveCreate: (spell: typeof targetSpell) => void = () => {}
      vi.spyOn(api, 'createSpell').mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
      )
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<SpellEditor onClose={onClose} onSaved={vi.fn()} />)

      await user.type(screen.getByLabelText('Spell Name'), 'Pending Spell')
      await user.click(screen.getByRole('button', { name: 'Create Spell' }))

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Create Spell' })).toBeDisabled()

      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()

      resolveCreate(targetSpell)
    })
  })
})
