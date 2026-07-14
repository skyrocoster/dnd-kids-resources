import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Monster } from '../../../api/types'
import { MonsterStatBlock } from '../MonsterStatBlock'

function monster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: 1,
    name: 'Test Monster',
    aliases: [],
    sizes: ['medium'],
    family: null,
    alignment: 'chaotic evil',
    creature_type: { category: 'dragon', tags: [], swarm_size: null },
    ac: { value: 18, note: 'natural armour', alternatives: [] },
    hp: { average: 100, formula: '10d12 + 40' },
    speed: [
      { mode: 'walk', feet: 40, note: null, hover: false },
      { mode: 'fly', feet: 80, note: null, hover: false },
    ],
    abilities: { str: 20, dex: 14, con: 18, int: 10, wis: 12, cha: 16 },
    saving_throws: { str: 5, con: 4 },
    skills: { perception: 6, stealth: 3 },
    passive_perception: 16,
    damage_resistances: [{ damage_type: 'fire', note: null, conditional: false }],
    damage_immunities: [{ damage_type: 'poison', note: 'non-magical', conditional: false }],
    damage_vulnerabilities: [],
    condition_immunities: ['frightened'],
    senses: [{ type: 'darkvision', range: 120, note: null }],
    languages: ['Draconic'],
    audio_path: null,
    features: {
      traits: [
        { name: 'Keen Senses', description: null, attack: null },
        { name: 'Amphibious', description: 'Can breathe air and water.', attack: null },
      ],
      spellcasting: [
        {
          name: 'Innate Spellcasting',
          ability: 'cha',
          description: 'The dragon can cast spells innately.',
          resource: null,
          groups: [
            { label: 'At will', spells: [{ name: 'Detect Magic', hidden: false }], hidden: false },
          ],
          footer: null,
        },
      ],
      actions: [
        {
          name: 'Bite',
          description: 'Melee Weapon Attack.',
          attack: {
            kind: 'melee_weapon',
            attack_bonus: 8,
            automatic_hit: false,
            range_ft: 5,
            long_range_ft: null,
            targets: 1,
            damage: [{ formula: '2d10', bonus: 5, damage_types: ['piercing'] }],
          },
        },
      ],
      bonus_actions: [],
      reactions: [
        { name: 'Tail Swipe', description: 'Reaction to a nearby hit.', attack: null },
      ],
      reaction_intro: null,
      legendary_actions: [
        { name: 'Wing Attack', description: 'Beats wings.', attack: null },
      ],
      legendary_intro: 'The dragon can take 3 legendary actions.',
      legendary_actions_per_round: 3,
      mythic_actions: [],
    },
    cr: '10',
    cr_sort: 10,
    cr_note: null,
    experience_points: null,
    ...overrides,
  }
}

describe('MonsterStatBlock', () => {
  it('renders monster name and identity line', () => {
    render(<MonsterStatBlock monster={monster()} />)
    expect(screen.getByRole('heading', { name: 'Test Monster' })).toBeInTheDocument()
    expect(screen.getByText('medium, dragon, chaotic evil')).toBeInTheDocument()
    expect(screen.getByText('CR 10')).toBeInTheDocument()
  })

  it('renders AC, HP, and speed in the stat strip', () => {
    render(<MonsterStatBlock monster={monster()} />)
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('18 (natural armour)')).toBeInTheDocument()
    expect(screen.getByText('HP')).toBeInTheDocument()
    expect(screen.getByText('100 (10d12 + 40)')).toBeInTheDocument()
    expect(screen.getByText('Speed')).toBeInTheDocument()
  })

  it('renders the six-ability block with modifiers', () => {
    render(<MonsterStatBlock monster={monster()} />)
    expect(screen.getByText('STR')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('DEX')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('renders saving throws and skills', () => {
    render(<MonsterStatBlock monster={monster()} />)
    expect(screen.getByText(/Saving Throws/)).toBeInTheDocument()
    expect(screen.getByText(/Str \+5, Con \+4/)).toBeInTheDocument()
    expect(screen.getByText(/Skills/)).toBeInTheDocument()
    expect(screen.getByText(/Perception \+6, Stealth \+3/)).toBeInTheDocument()
  })

  it('renders defenses: resistances, immunities, condition immunities, senses', () => {
    render(<MonsterStatBlock monster={monster()} />)
    expect(screen.getByText('Damage Resistances')).toBeInTheDocument()
    expect(screen.getByText(/fire/)).toBeInTheDocument()
    expect(screen.getByText('Damage Immunities')).toBeInTheDocument()
    expect(screen.getByText(/poison \(non-magical\)/)).toBeInTheDocument()
    expect(screen.getByText('Condition Immunities')).toBeInTheDocument()
    expect(screen.getByText(/frightened/)).toBeInTheDocument()
    expect(screen.getByText('Senses')).toBeInTheDocument()
    expect(screen.getByText(/darkvision 120 ft\., passive Perception 16/)).toBeInTheDocument()
  })

  it('renders actions, reactions, legendary actions, and spellcasting', () => {
    render(<MonsterStatBlock monster={monster()} />)
    expect(screen.getByText(/Bite: Melee Weapon Attack\./)).toBeInTheDocument()
    expect(screen.getByText(/Tail Swipe: Reaction to a nearby hit\./)).toBeInTheDocument()
    expect(screen.getByText(/Wing Attack: Beats wings\./)).toBeInTheDocument()
    expect(screen.getByText('Innate Spellcasting')).toBeInTheDocument()
    expect(screen.getByText(/At will:/)).toBeInTheDocument()
    expect(screen.getByText('Detect Magic')).toBeInTheDocument()
    expect(screen.getByText(/Legendary actions per round: 3/)).toBeInTheDocument()
  })

  it('renders traits and languages in the Lore region', () => {
    render(<MonsterStatBlock monster={monster()} />)
    expect(screen.getByText('Keen Senses')).toBeInTheDocument()
    expect(screen.getByText('Amphibious: Can breathe air and water.')).toBeInTheDocument()
    expect(screen.getByText('Languages')).toBeInTheDocument()
    expect(screen.getByText('Draconic')).toBeInTheDocument()
  })

  it('hides regions when their data is absent', () => {
    const bare = monster({
      abilities: null,
      saving_throws: {},
      skills: {},
      damage_resistances: [],
      damage_immunities: [],
      condition_immunities: [],
      senses: [],
      languages: [],
      features: {
        ...monster({}).features,
        traits: [],
        actions: [],
        reactions: [],
        legendary_actions: [],
        spellcasting: [],
      },
      audio_path: null,
    })

    render(<MonsterStatBlock monster={bare} />)
    expect(screen.getByTestId('monster-stat-block')).toBeInTheDocument()
    expect(screen.queryByText('Damage Resistances')).not.toBeInTheDocument()
    expect(screen.queryByText('Actions')).not.toBeInTheDocument()
    expect(screen.queryByText('Languages')).not.toBeInTheDocument()
  })
})
