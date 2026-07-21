import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NPCStatCard } from '../NPCStatCard'
import type { NPC } from '../../../api/types'

function makeNpc(overrides: Partial<NPC> = {}): NPC {
  return {
    id: 1,
    name: 'Emery Hart',
    ...overrides,
  }
}

describe('NPCStatCard', () => {
  it('renders a fully-populated NPC with structured abilities, movement, languages, and appearance', () => {
    const npc = makeNpc({
      race: 'Human',
      gender: 'Male',
      background: 'Village Guard',
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
      ac: { value: 16, note: null, alternatives: [] },
      hp: { average: 22, formula: '4d8 + 4' },
      speed: [
        { mode: 'walk', feet: 30, note: null, hover: false },
        { mode: 'fly', feet: 60, note: null, hover: true },
      ],
      saving_throws: { str: 2 },
      skills: { athletics: 4 },
      senses: [{ type: 'darkvision', range: 60, note: null }],
      languages: ['Common', 'Elvish'],
      appearance: { hair_colour: 'black', eye_colour: 'brown' },
      notes: 'Duty-bound and suspicious of strangers.',
    })

    render(<NPCStatCard npc={npc} />)

    expect(screen.getByText('Emery Hart')).toBeInTheDocument()
    expect(screen.getByText('Human · Male · Village Guard')).toBeInTheDocument()
    expect(screen.getByText('Black hair, brown eyes')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument() // STR modifier for score 14
    expect(screen.getByText('16')).toBeInTheDocument() // AC
    expect(screen.getByText('22')).toBeInTheDocument() // HP
    expect(screen.getByText('30 ft., fly 60 ft. (hover)')).toBeInTheDocument()
    expect(screen.getByText('Str +2')).toBeInTheDocument()
    expect(screen.getByText('Athletics +4')).toBeInTheDocument()
    expect(screen.getByText('darkvision 60 ft.')).toBeInTheDocument()
    expect(screen.getByText('Duty-bound and suspicious of strangers.')).toBeInTheDocument()
    expect(screen.getByText('Common, Elvish')).toBeInTheDocument()
    expect(screen.getByTestId('monster-stat-block')).toBeInTheDocument()
  })

  it('renders a bare NPC (name only) with no empty AC/HP/ability rows', () => {
    render(<NPCStatCard npc={makeNpc()} />)

    expect(screen.getByText('Emery Hart')).toBeInTheDocument()
    expect(screen.queryByText('AC')).not.toBeInTheDocument()
    expect(screen.queryByText('HP')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Ability scores' })).not.toBeInTheDocument()
    expect(screen.queryByText('Saving Throws')).not.toBeInTheDocument()
    expect(screen.queryByText('Skills')).not.toBeInTheDocument()
    expect(screen.queryByText('Senses')).not.toBeInTheDocument()
    expect(screen.queryByText('Languages')).not.toBeInTheDocument()
  })

  it('applies the compact class when compact is set', () => {
    render(<NPCStatCard npc={makeNpc()} compact />)
    expect(screen.getByTestId('npc-stat-card')).toHaveClass('npc-stat-card-compact')
  })

  it('shows a statless affordance for a bare NPC in non-compact mode', () => {
    render(<NPCStatCard npc={makeNpc()} />)
    expect(screen.getByText('No combat stats yet.')).toBeInTheDocument()
    expect(screen.getByText('Pull from a monster…')).toBeInTheDocument()
    expect(screen.queryByTestId('monster-stat-block')).not.toBeInTheDocument()
  })
})

  it('renders nothing in the combat region for a bare NPC in compact mode', () => {
    render(<NPCStatCard npc={makeNpc()} compact />)
    expect(screen.queryByText('No combat stats yet.')).not.toBeInTheDocument()
    expect(screen.queryByText('Pull from a monster…')).not.toBeInTheDocument()
    expect(screen.queryByTestId('monster-stat-block')).not.toBeInTheDocument()
  })
