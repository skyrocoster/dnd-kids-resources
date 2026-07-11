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
  it('renders a fully-populated NPC with abilities, modifiers, and the composed appearance sentence', () => {
    const npc = makeNpc({
      race: 'Human',
      gender: 'Male',
      background: 'Village Guard',
      stats: { strength: 14, dexterity: 12, constitution: 13, intelligence: 10, wisdom: 11, charisma: 9 },
      armor_class: 16,
      hit_points: 22,
      speed: '30',
      saving_throws: { strength: 2 },
      skills: { athletics: 4 },
      senses: [{ type: 'darkvision', range: 60 }],
      languages: 'Common',
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
    expect(screen.getByText('Duty-bound and suspicious of strangers.')).toBeInTheDocument()
    expect(screen.getByText('Common')).toBeInTheDocument()
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
})
