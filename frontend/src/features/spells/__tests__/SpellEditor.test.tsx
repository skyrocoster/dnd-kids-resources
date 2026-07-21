import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import { SpellEditor } from '../SpellEditor'
import { targetSpell } from './spellFixtures'

const validQuickRules = 'Action: make a spell attack using {spell_attack_bonus}.'

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
    fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: validQuickRules } })
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
      quick_rules: validQuickRules,
      range: '120 feet',
      duration: 'Concentration, up to 1 minute',
      casting_times: ['1 action'],
      damage: [],
      attacks: [],
    }))
    expect(onSaved).toHaveBeenCalledWith(targetSpell)
  })

  it('serializes edited quick rules with registered tokens', async () => {
    const updateSpell = vi.spyOn(api, 'updateSpell').mockResolvedValue(targetSpell)
    const user = userEvent.setup()
    render(<SpellEditor spell={targetSpell} onClose={vi.fn()} onSaved={vi.fn()} />)

    const quickRules = screen.getByLabelText('Quick Rules')
    await user.clear(quickRules)
    fireEvent.change(quickRules, { target: { value: 'Save: target rolls against {spell_save_dc}.' } })
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(updateSpell).toHaveBeenCalledOnce())
    expect(updateSpell).toHaveBeenCalledWith(
      targetSpell.id,
      expect.objectContaining({ quick_rules: 'Save: target rolls against {spell_save_dc}.' }),
    )
  })

  it('blocks blank quick rules with inline field and status errors while preserving the draft', async () => {
    const createSpell = vi.spyOn(api, 'createSpell').mockResolvedValue(targetSpell)
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Spell Name'), 'Draft Spell')
    await user.click(screen.getByRole('button', { name: 'Create Spell' }))

    const quickRules = screen.getByLabelText('Quick Rules')
    expect(screen.getByRole('status')).toHaveTextContent('Fix the Quick Rules errors before saving.')
    expect(screen.getByText('Quick Rules is required.')).toBeInTheDocument()
    expect(quickRules).toHaveAttribute('aria-invalid', 'true')
    expect(quickRules).toHaveAccessibleDescription('Quick Rules is required.')
    expect(screen.getByLabelText('Spell Name')).toHaveValue('Draft Spell')
    expect(screen.getByRole('button', { name: 'Create Spell' })).not.toBeDisabled()
    expect(createSpell).not.toHaveBeenCalled()
  })

  it('blocks malformed quick rules without clearing the draft', async () => {
    const createSpell = vi.spyOn(api, 'createSpell').mockResolvedValue(targetSpell)
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Spell Name'), 'Malformed Spell')
    fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: 'Action: open {spell_save_dc' } })
    await user.click(screen.getByRole('button', { name: 'Create Spell' }))

    expect(screen.getByRole('status')).toHaveTextContent('Fix the Quick Rules errors before saving.')
    expect(screen.getByText('Unmatched opening brace')).toBeInTheDocument()
    expect(screen.getByLabelText('Quick Rules')).toHaveValue('Action: open {spell_save_dc')
    expect(createSpell).not.toHaveBeenCalled()
  })

  it('blocks unknown quick-rules tokens and clears stale errors when edited', async () => {
    const createSpell = vi.spyOn(api, 'createSpell').mockResolvedValue(targetSpell)
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

    const quickRules = screen.getByLabelText('Quick Rules')
    await user.type(screen.getByLabelText('Spell Name'), 'Unknown Token Spell')
    fireEvent.change(quickRules, { target: { value: 'Action: use {bad_token}.' } })
    await user.click(screen.getByRole('button', { name: 'Create Spell' }))

    expect(screen.getByRole('status')).toHaveTextContent('Fix the Quick Rules errors before saving.')
    expect(screen.getByText('Unknown reference token: bad_token')).toBeInTheDocument()
    expect(createSpell).not.toHaveBeenCalled()

    await user.clear(quickRules)
    fireEvent.change(quickRules, { target: { value: validQuickRules } })
    expect(screen.queryByText('Unknown reference token: bad_token')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows an API failure without closing the editor', async () => {
    vi.spyOn(api, 'createSpell').mockRejectedValue(new Error('Unable to save'))
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Spell Name'), 'Failed Spell')
    fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: validQuickRules } })
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
      fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: validQuickRules } })
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
      fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: validQuickRules } })
      await user.click(screen.getByRole('button', { name: 'Create Spell' }))

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Create Spell' })).toBeDisabled()

      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()

      resolveCreate(targetSpell)
    })
  })
})

