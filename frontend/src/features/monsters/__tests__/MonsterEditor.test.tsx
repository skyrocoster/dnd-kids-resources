import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../../api/client'
import type { Monster } from '../../../api/types'
import { MonsterEditor } from '../MonsterEditor'
import {
  emptyMonsterForm,
  formStateToMonsterInput,
  monsterToFormState,
  validateMonsterForm,
} from '../monsterForm'

describe('MonsterEditor model', () => {
  it('empty form maps to minimal MonsterInput', () => {
    const input = formStateToMonsterInput(emptyMonsterForm())
    expect(input.name).toBe('')
    expect(input.creature_type).toBeNull()
    expect(input.ac).toBeNull()
    expect(input.hp).toBeNull()
  })

  it('validates that name is required', () => {
    const errors = validateMonsterForm(emptyMonsterForm())
    expect(errors).toContain('Name is required.')
  })

  it('passes validation with just a name', () => {
    const form = emptyMonsterForm()
    form.name = 'Test Monster'
    expect(validateMonsterForm(form)).toEqual([])
  })

  it('validates numeric fields', () => {
    const form = emptyMonsterForm()
    form.name = 'Test'
    form.acValue = 'not-a-number'
    form.hpAverage = 'bad'
    const errors = validateMonsterForm(form)
    expect(errors).toContain('AC must be a number.')
    expect(errors).toContain('HP must be a number.')
  })

  it('round-trips a monster through form state and back', () => {
    const monster: Monster = {
      id: 1,
      name: 'Test Dragon',
      aliases: [],
      sizes: ['large'],
      family: null,
      alignment: 'chaotic evil',
      creature_type: { category: 'dragon', tags: ['chromatic'], swarm_size: null },
      ac: { value: 18, note: 'natural armour', alternatives: [] },
      hp: { average: 200, formula: '20d12+80' },
      speed: [{ mode: 'walk', feet: 40, note: null, hover: false }, { mode: 'fly', feet: 80, note: null, hover: false }],
      abilities: { str: 25, dex: 10, con: 21, int: 14, wis: 14, cha: 18 },
      saving_throws: { str: 7, con: 5 },
      skills: { perception: 8, stealth: 4 },
      passive_perception: 18,
      damage_resistances: [{ damage_type: 'fire', note: null, conditional: false }],
      damage_immunities: [{ damage_type: 'cold', note: null, conditional: false }],
      damage_vulnerabilities: [],
      condition_immunities: ['frightened'],
      senses: [{ type: 'darkvision', range: 120, note: null }],
      languages: ['Common', 'Draconic'],
      audio_path: null,
      features: {
        traits: [{ name: 'Amphibious', description: 'The dragon can breathe air and water.', attack: null }],
        spellcasting: [],
        actions: [{ name: 'Bite', description: 'Melee weapon attack: +14 to hit.', attack: null }],
        bonus_actions: [],
        reactions: [],
        reaction_intro: null,
        legendary_actions: [],
        legendary_intro: null,
        legendary_actions_per_round: null,
        mythic_actions: [],
      },
      cr: '17',
      cr_sort: 1700,
      cr_note: null,
      experience_points: 18000,
    }

    const formState = monsterToFormState(monster)
    expect(formState.name).toBe('Test Dragon')
    expect(formState.acValue).toBe('18')
    expect(formState.hpAverage).toBe('200')
    expect(formState.abilityStr).toBe('25')
    expect(formState.cr).toBe('17')

    const roundTrip = formStateToMonsterInput(formState)
    expect(roundTrip.name).toBe('Test Dragon')
    expect(roundTrip.ac?.value).toBe(18)
    expect(roundTrip.hp?.average).toBe(200)
    expect(roundTrip.abilities?.str).toBe(25)
    expect(roundTrip.cr).toBe('17')
  })
})

describe('MonsterEditor render', () => {
  it('renders all five fieldsets for new monster', () => {
    render(
      <MemoryRouter initialEntries={['/monsters/new']}>
        <Routes>
          <Route path="/monsters/new" element={<MonsterEditor />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Add New Monster')).toBeInTheDocument()
    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Defenses')).toBeInTheDocument()
    expect(screen.getByText('Abilities')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Lore')).toBeInTheDocument()
  })

  it('shows error when name is empty on submit', async () => {
    render(
      <MemoryRouter initialEntries={['/monsters/new']}>
        <Routes>
          <Route path="/monsters/new" element={<MonsterEditor />} />
        </Routes>
      </MemoryRouter>,
    )
    const form = screen.getByTestId('monster-editor-form')
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
  })

  it('loads monster for editing and shows its name', async () => {
    const monster: Monster = {
      id: 99,
      name: 'Edit Test',
      aliases: [],
      sizes: ['medium'],
      family: null,
      alignment: null,
      creature_type: null,
      ac: { value: 15, note: null, alternatives: [] },
      hp: { average: 100, formula: null },
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
    }

    const spy = vi.spyOn(api, 'getMonster').mockResolvedValue(monster)

    render(
      <MemoryRouter initialEntries={['/monsters/99/edit']}>
        <Routes>
          <Route path="/monsters/:id/edit" element={<MonsterEditor />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Edit Monster')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Edit Test')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('supports keyboard focus through the primary editor controls', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/monsters/new']}>
        <Routes>
          <Route path="/monsters/new" element={<MonsterEditor />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.tab()
    expect(screen.getByLabelText('Name')).toHaveFocus()

    await user.tab()
    expect(screen.getByLabelText('Size (comma-separated)')).toHaveFocus()

    const saveButton = screen.getByRole('button', { name: 'Create Monster' })
    saveButton.focus()
    expect(saveButton).toHaveFocus()
  })

  it('navigates to /monsters after saving a new monster', async () => {
    const monster: Monster = {
      id: 1,
      name: 'New Monster',
      aliases: [],
      sizes: ['medium'],
      family: null,
      alignment: null,
      creature_type: null,
      ac: { value: 10, note: null, alternatives: [] },
      hp: { average: 10, formula: null },
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
      features: { traits: [], spellcasting: [], actions: [], bonus_actions: [], reactions: [], reaction_intro: null, legendary_actions: [], legendary_intro: null, legendary_actions_per_round: null, mythic_actions: [] },
      cr: null,
      cr_sort: null,
      cr_note: null,
      experience_points: null,
    }
    vi.spyOn(api, 'createMonster').mockResolvedValue(monster)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/monsters/new']}>
        <Routes>
          <Route path="/monsters/new" element={<MonsterEditor />} />
          <Route path="/monsters" element={<div>Monster list page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Name'), 'New Monster')
    await user.click(screen.getByRole('button', { name: 'Create Monster' }))
    await waitFor(() => expect(screen.getByText('Monster list page')).toBeInTheDocument())
  })

  it('navigates to /monsters after deleting an existing monster', async () => {
    const monster: Monster = {
      id: 99,
      name: 'Delete Test',
      aliases: [],
      sizes: ['medium'],
      family: null,
      alignment: null,
      creature_type: null,
      ac: { value: 15, note: null, alternatives: [] },
      hp: { average: 100, formula: null },
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
      features: { traits: [], spellcasting: [], actions: [], bonus_actions: [], reactions: [], reaction_intro: null, legendary_actions: [], legendary_intro: null, legendary_actions_per_round: null, mythic_actions: [] },
      cr: null,
      cr_sort: null,
      cr_note: null,
      experience_points: null,
    }
    vi.spyOn(api, 'getMonster').mockResolvedValue(monster)
    vi.spyOn(api, 'deleteMonster').mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/monsters/99/edit']}>
        <Routes>
          <Route path="/monsters/:id/edit" element={<MonsterEditor />} />
          <Route path="/monsters" element={<div>Monster list page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByDisplayValue('Delete Test')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete Monster' }))
    await waitFor(() => expect(screen.getByText('Monster list page')).toBeInTheDocument())
  })

  it('navigates to /monsters on Cancel', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/monsters/new']}>
        <Routes>
          <Route path="/monsters/new" element={<MonsterEditor />} />
          <Route path="/monsters" element={<div>Monster list page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Monster list page')).toBeInTheDocument()
  })
})
