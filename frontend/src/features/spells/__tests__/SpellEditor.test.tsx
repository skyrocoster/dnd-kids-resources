import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

    fireEvent.change(screen.getByLabelText('Spell Name'), { target: { value: 'Moonbeam' } })
    fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: validQuickRules } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Radiant light shines down.' } })
    fireEvent.change(screen.getByLabelText('Range'), { target: { value: '120 feet' } })
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: 'Concentration, up to 1 minute' } })
    fireEvent.change(screen.getByLabelText('Casting Time'), { target: { value: '1 action' } })
    const damageCheckbox = screen.getByRole('checkbox', { name: 'Damage' })
    const otherCheckbox = screen.getByRole('checkbox', { name: 'Other' })
    await user.click(damageCheckbox)
    await user.click(otherCheckbox)
    expect(damageCheckbox).toBeChecked()
    expect(otherCheckbox).toBeChecked()
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
      categories: ['Damage', 'Other'],
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
    const damageCheckbox = screen.getByRole('checkbox', { name: 'Damage' })
    await user.click(damageCheckbox)
    expect(damageCheckbox).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(updateSpell).toHaveBeenCalledOnce())
    expect(updateSpell).toHaveBeenCalledWith(
      targetSpell.id,
      expect.objectContaining({
        quick_rules: 'Save: target rolls against {spell_save_dc}.',
        categories: ['Create', 'Damage'],
      }),
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
    it('focuses the first field on open', async () => {
      render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)
      await waitFor(() => expect(screen.getByLabelText('Spell Name')).toHaveFocus())
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

  it('saves Concentration and Ritual values changed through their checkbox handlers', async () => {
    const createSpell = vi.spyOn(api, 'createSpell').mockResolvedValue(targetSpell)
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Spell Name'), { target: { value: 'Focused Spell' } })
    fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: validQuickRules } })
    const concentration = screen.getByRole('checkbox', { name: 'Concentration' })
    const ritual = screen.getByRole('checkbox', { name: 'Ritual' })
    fireEvent.click(concentration)
    fireEvent.click(ritual)

    expect(concentration).toBeChecked()
    expect(ritual).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Create Spell' }))

    await waitFor(() => expect(createSpell).toHaveBeenCalledOnce())
    expect(createSpell).toHaveBeenCalledWith(expect.objectContaining({ concentration: true, ritual: true }))
  })

  it('saves multiple attack-save and damage-type choices from their labeled checkbox groups', async () => {
    vi.mocked(api.getAbilities).mockResolvedValue([
      { code: 'str', name: 'Strength' },
      { code: 'dex', name: 'Dexterity' },
    ] as Awaited<ReturnType<typeof api.getAbilities>>)
    vi.mocked(api.getDamageTypes).mockResolvedValue([
      { code: 'fire', name: 'Fire' },
      { code: 'cold', name: 'Cold' },
    ] as Awaited<ReturnType<typeof api.getDamageTypes>>)
    const createSpell = vi.spyOn(api, 'createSpell').mockResolvedValue(targetSpell)
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Add Attack' }))
    await user.click(screen.getByRole('button', { name: 'Add Damage' }))

    const saveGroup = screen.getByRole('group', { name: 'Save' })
    const damageTypeGroup = screen.getByRole('group', { name: 'Damage Type' })
    const strength = await screen.findByRole('checkbox', { name: 'Strength' })
    const dexterity = screen.getByRole('checkbox', { name: 'Dexterity' })
    const fire = await screen.findByRole('checkbox', { name: 'Fire' })
    const cold = screen.getByRole('checkbox', { name: 'Cold' })

    expect(saveGroup).toContainElement(strength)
    expect(damageTypeGroup).toContainElement(fire)

    await user.click(screen.getByText('Strength', { selector: 'label' }))
    dexterity.focus()
    await user.keyboard(' ')
    await user.click(screen.getByText('Fire', { selector: 'label' }))
    cold.focus()
    await user.keyboard(' ')

    expect(strength).toBeChecked()
    expect(dexterity).toBeChecked()
    expect(fire).toBeChecked()
    expect(cold).toBeChecked()

    fireEvent.change(screen.getByLabelText('Spell Name'), { target: { value: 'Elemental Pair' } })
    fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: validQuickRules } })
    await user.click(screen.getByRole('button', { name: 'Create Spell' }))

    await waitFor(() => expect(createSpell).toHaveBeenCalledOnce())
    expect(createSpell).toHaveBeenCalledWith(expect.objectContaining({
      attacks: [{ kind: null, saving_throws: ['str', 'dex'] }],
      damage: [{ name: '', formula: '', damage_types: ['fire', 'cold'] }],
    }))
  })

  it('uses shared non-submit row actions and serializes only the rows that remain', async () => {
    const createSpell = vi.spyOn(api, 'createSpell').mockResolvedValue(targetSpell)
    const user = userEvent.setup()
    render(<SpellEditor onClose={vi.fn()} onSaved={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Spell Name'), { target: { value: 'Row Actions' } })
    fireEvent.change(screen.getByLabelText('Quick Rules'), { target: { value: validQuickRules } })
    await user.click(screen.getByRole('button', { name: 'Add Attack' }))
    await user.click(screen.getByRole('button', { name: 'Add Attack' }))
    await user.click(screen.getByRole('button', { name: 'Add Damage' }))
    await user.click(screen.getByRole('button', { name: 'Add Damage' }))

    const addAttack = screen.getByRole('button', { name: 'Add Attack' })
    const addDamage = screen.getByRole('button', { name: 'Add Damage' })
    expect(addAttack).toHaveAttribute('type', 'button')
    expect(addAttack).toHaveClass('btn', 'btn--secondary', 'btn--normal', 'spell-editor-add')
    expect(addDamage).toHaveAttribute('type', 'button')
    expect(addDamage).toHaveClass('btn', 'btn--secondary', 'btn--normal', 'spell-editor-add')
    expect(createSpell).not.toHaveBeenCalled()

    const attackGroups = screen.getAllByRole('group', { name: 'Save' })
    const damageGroups = screen.getAllByRole('group', { name: 'Damage Type' })
    const firstDamageCard = damageGroups[0].closest<HTMLDivElement>('.spell-editor-row-card')
    const retainedDamageCard = damageGroups[1].closest<HTMLDivElement>('.spell-editor-row-card')
    expect(firstDamageCard).not.toBeNull()
    expect(retainedDamageCard).not.toBeNull()
    fireEvent.change(within(firstDamageCard!).getByLabelText('Name'), { target: { value: 'Removed Damage' } })
    fireEvent.change(within(retainedDamageCard!).getByLabelText('Name'), { target: { value: 'Retained Damage' } })

    const firstAttackCard = attackGroups[0].closest<HTMLDivElement>('.spell-editor-row-card')
    expect(firstAttackCard).not.toBeNull()
    const removeAttack = within(firstAttackCard!).getByRole('button', { name: 'Remove Row' })
    const removeDamage = within(firstDamageCard!).getByRole('button', { name: 'Remove Row' })
    expect(removeAttack).toHaveAttribute('type', 'button')
    expect(removeAttack).toHaveClass('btn', 'btn--danger', 'btn--normal', 'spell-editor-row-remove')
    expect(removeDamage).toHaveAttribute('type', 'button')
    expect(removeDamage).toHaveClass('btn', 'btn--danger', 'btn--normal', 'spell-editor-row-remove')
    await user.click(removeAttack)
    await user.click(removeDamage)

    expect(screen.getAllByRole('group', { name: 'Save' })).toHaveLength(1)
    const remainingDamageGroup = screen.getAllByRole('group', { name: 'Damage Type' })
    expect(remainingDamageGroup).toHaveLength(1)
    expect(within(remainingDamageGroup[0].closest<HTMLDivElement>('.spell-editor-row-card')!).getByLabelText('Name')).toHaveValue('Retained Damage')
    expect(createSpell).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Create Spell' }))

    await waitFor(() => expect(createSpell).toHaveBeenCalledOnce())
    expect(createSpell).toHaveBeenCalledWith(expect.objectContaining({
      attacks: [{ kind: null, saving_throws: [] }],
      damage: [{ name: 'Retained Damage', formula: '', damage_types: [] }],
    }))
  })
})

