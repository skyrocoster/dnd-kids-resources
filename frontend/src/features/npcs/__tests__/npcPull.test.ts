import { describe, expect, it } from 'vitest'
import type { Monster, NPC } from '../../../api/types'
import { getPullableRows, applyPull } from '../npcPull'

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

function npc(overrides: Partial<NPC> = {}): NPC {
  return {
    id: 42,
    name: 'Emery Hart',
    ...overrides,
  }
}

describe('getPullableRows', () => {
  it('returns a row for every populated monster field, with correct region and kind', () => {
    const m = monster()
    const n = npc()
    const rows = getPullableRows(m, n)

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ac', region: 'Stats', kind: 'overwrite', label: 'Armor Class' }),
        expect.objectContaining({ id: 'hp', region: 'Stats', kind: 'overwrite', label: 'Hit Points' }),
        expect.objectContaining({ id: 'speed', region: 'Stats', kind: 'add', label: 'Speed' }),
        expect.objectContaining({ id: 'cr', region: 'Stats', kind: 'overwrite', label: 'Challenge Rating' }),
        expect.objectContaining({ id: 'damage_resistances', region: 'Defenses', kind: 'add', label: 'Damage Resistances' }),
        expect.objectContaining({ id: 'damage_immunities', region: 'Defenses', kind: 'add', label: 'Damage Immunities' }),
        expect.objectContaining({ id: 'condition_immunities', region: 'Defenses', kind: 'add', label: 'Condition Immunities' }),
        expect.objectContaining({ id: 'senses', region: 'Defenses', kind: 'add', label: 'Senses' }),
        expect.objectContaining({ id: 'abilities', region: 'Abilities', kind: 'overwrite', label: 'Ability Scores' }),
        expect.objectContaining({ id: 'saving_throws', region: 'Abilities', kind: 'overwrite', label: 'Saving Throws' }),
        expect.objectContaining({ id: 'skills', region: 'Abilities', kind: 'overwrite', label: 'Skills' }),
        expect.objectContaining({ id: 'languages', region: 'Lore', kind: 'add', label: 'Languages' }),
      ]),
    )

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'traits:0', region: 'Lore', kind: 'add', label: 'Keen Senses' }),
        expect.objectContaining({ id: 'traits:1', region: 'Lore', kind: 'add', label: 'Amphibious' }),
        expect.objectContaining({ id: 'spellcasting:0', region: 'Actions', kind: 'add', label: 'Innate Spellcasting' }),
        expect.objectContaining({ id: 'actions:0', region: 'Actions', kind: 'add', label: 'Bite' }),
        expect.objectContaining({ id: 'reactions:0', region: 'Actions', kind: 'add', label: 'Tail Swipe' }),
        expect.objectContaining({ id: 'legendary_actions:0', region: 'Actions', kind: 'add', label: 'Wing Attack' }),
      ]),
    )
  })

  it('omits rows for empty monster fields', () => {
    const m = monster({
      ac: null,
      hp: null,
      speed: [],
      cr: null,
      abilities: null,
      saving_throws: {},
      skills: {},
      damage_resistances: [],
      damage_immunities: [],
      condition_immunities: [],
      senses: [],
      languages: [],
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
    })
    const n = npc()
    const rows = getPullableRows(m, n)

    expect(rows).toHaveLength(0)
  })

  it('omits damage_vulnerabilities when empty on monster', () => {
    const m = monster({ damage_vulnerabilities: [] })
    const n = npc()
    const rows = getPullableRows(m, n)

    expect(rows.find(r => r.id === 'damage_vulnerabilities')).toBeUndefined()
  })

  describe('currentValueLabel', () => {
    it('populates currentValueLabel for overwrite rows when NPC has that field set', () => {
      const n = npc({
        ac: { value: 15, note: 'leather', alternatives: [] },
        hp: { average: 60, formula: null },
        abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
      })
      const rows = getPullableRows(monster(), n)

      expect(rows.find(r => r.id === 'ac')!.currentValueLabel).toBe('15 (leather)')
      expect(rows.find(r => r.id === 'hp')!.currentValueLabel).toBe('60')
      expect(rows.find(r => r.id === 'abilities')!.currentValueLabel).toMatch(/Str 14, Dex 12/)
    })

    it('sets currentValueLabel to null for overwrite rows when NPC has no value', () => {
      const n = npc()
      const rows = getPullableRows(monster(), n)

      expect(rows.find(r => r.id === 'ac')!.currentValueLabel).toBeNull()
      expect(rows.find(r => r.id === 'hp')!.currentValueLabel).toBeNull()
      expect(rows.find(r => r.id === 'abilities')!.currentValueLabel).toBeNull()
    })

    it('sets currentValueLabel to null for add-kind rows', () => {
      const n = npc()
      const rows = getPullableRows(monster(), n)

      for (const row of rows) {
        if (row.kind === 'add') {
          expect(row.currentValueLabel).toBeNull()
        }
      }
    })

    it('populates saving_throws currentValueLabel when NPC has saves', () => {
      const n = npc({ saving_throws: { str: 2, wis: 3 } })
      const rows = getPullableRows(monster(), n)

      const saveRow = rows.find(r => r.id === 'saving_throws')
      expect(saveRow!.currentValueLabel).toMatch(/Str \+2/)
      expect(saveRow!.currentValueLabel).toMatch(/Wis \+3/)
    })

    it('sets saving_throws currentValueLabel to null when NPC has no saves', () => {
      const n = npc({ saving_throws: {} })
      const rows = getPullableRows(monster(), n)

      expect(rows.find(r => r.id === 'saving_throws')!.currentValueLabel).toBeNull()
    })
  })
})

describe('applyPull', () => {
  it('with empty selectedRowIds returns NPC values unchanged for every field', () => {
    const n = npc({
      ac: { value: 15, note: 'leather', alternatives: [] },
      hp: { average: 60, formula: null },
      speed: [{ mode: 'walk', feet: 30, note: null, hover: false }],
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
      saving_throws: { str: 2 },
      skills: { perception: 4 },
      passive_perception: 14,
      languages: ['Common'],
      cr: '3',
      cr_note: null,
      experience_points: 100,
    })
    const m = monster()
    const result = applyPull(n, m, new Set())

    expect(result.ac).toEqual(n.ac)
    expect(result.hp).toEqual(n.hp)
    expect(result.speed).toEqual(n.speed)
    expect(result.abilities).toEqual(n.abilities)
    expect(result.saving_throws).toEqual(n.saving_throws)
    expect(result.skills).toEqual(n.skills)
    expect(result.passive_perception).toEqual(n.passive_perception)
    expect(result.damage_resistances).toEqual(n.damage_resistances)
    expect(result.damage_immunities).toEqual(n.damage_immunities)
    expect(result.damage_vulnerabilities).toEqual(n.damage_vulnerabilities)
    expect(result.condition_immunities).toEqual(n.condition_immunities)
    expect(result.senses).toEqual(n.senses)
    expect(result.languages).toEqual(n.languages)
    expect(result.features).toEqual(n.features ?? {
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
    })
    expect(result.cr).toEqual(n.cr)
    expect(result.cr_note).toEqual(n.cr_note)
    expect(result.experience_points).toEqual(n.experience_points)
  })

  it('selecting ac overwrites only that field', () => {
    const n = npc({
      ac: { value: 15, note: 'leather', alternatives: [] },
      hp: { average: 60, formula: null },
      abilities: { str: 14, dex: 12, con: 13, int: 10, wis: 11, cha: 9 },
    })
    const m = monster()
    const result = applyPull(n, m, new Set(['ac']))

    expect(result.ac).toEqual(m.ac)
    expect(result.hp).toEqual(n.hp)
    expect(result.abilities).toEqual(n.abilities)
  })

  it('selecting cr overwrites cr, cr_note, and experience_points together', () => {
    const m = monster({ cr: '5', cr_note: 'boss', experience_points: 1800 })
    const n = npc({ cr: '2', cr_note: null, experience_points: 450 })
    const result = applyPull(n, m, new Set(['cr']))

    expect(result.cr).toBe('5')
    expect(result.cr_note).toBe('boss')
    expect(result.experience_points).toBe(1800)
  })

  it('selecting abilities overwrites the whole ability scores map', () => {
    const n = npc({ abilities: { str: 8, dex: 10, con: 10, int: 14, wis: 16, cha: 12 } })
    const m = monster()
    const result = applyPull(n, m, new Set(['abilities']))

    expect(result.abilities).toEqual(m.abilities)
  })

  it('selecting saving_throws overwrites the whole map', () => {
    const n = npc({ saving_throws: { str: 2, wis: 3 } })
    const m = monster({ saving_throws: { str: 5, con: 4 } })
    const result = applyPull(n, m, new Set(['saving_throws']))

    expect(result.saving_throws).toEqual({ str: 5, con: 4 })
  })

  it('selecting skills overwrites skills and carries passive_perception', () => {
    const n = npc({ skills: { perception: 2 }, passive_perception: 12 })
    const m = monster({ skills: { perception: 6, stealth: 3 }, passive_perception: 16 })
    const result = applyPull(n, m, new Set(['skills']))

    expect(result.skills).toEqual(m.skills)
    expect(result.passive_perception).toBe(16)
  })

  it('selecting an add-list row concatenates onto NPC existing list', () => {
    const n = npc({
      senses: [{ type: 'darkvision', range: 60, note: null }],
      languages: ['Common', 'Elvish'],
    })
    const m = monster({
      senses: [{ type: 'blindsight', range: 30, note: null }],
      languages: ['Draconic'],
    })
    const result = applyPull(n, m, new Set(['senses', 'languages']))

    expect(result.senses).toHaveLength(2)
    expect(result.senses).toEqual([
      { type: 'darkvision', range: 60, note: null },
      { type: 'blindsight', range: 30, note: null },
    ])
    expect(result.languages).toEqual(['Common', 'Elvish', 'Draconic'])
  })

  it('selecting trait:N appends only that one trait and leaves others untouched', () => {
    const n = npc({
      features: {
        traits: [
          { name: 'Brave', description: 'Advantage on fear saves.', attack: null },
        ],
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
    })
    const m = monster()
    const result = applyPull(n, m, new Set(['traits:0']))

    expect(result.features!.traits).toHaveLength(2)
    expect(result.features!.traits[1]).toEqual(m.features.traits[0])
    expect(result.features!.traits[0]).toEqual(n.features!.traits[0])
    expect(result.features!.actions).toHaveLength(0)
  })

  it('selecting reactions:N appends the reaction and overwrites reaction_intro', () => {
    const m = monster({
      features: {
        ...monster().features,
        reactions: [
          { name: 'Tail Swipe', description: 'Reaction.', attack: null },
        ],
        reaction_intro: 'Can make one reaction per turn.',
      },
    })
    const n = npc()
    const result = applyPull(n, m, new Set(['reactions:0']))

    expect(result.features!.reactions).toHaveLength(1)
    expect(result.features!.reactions[0].name).toBe('Tail Swipe')
    expect(result.features!.reaction_intro).toBe('Can make one reaction per turn.')
  })

  it('selecting legendary_actions:N appends and overwrites intro and actions_per_round', () => {
    const m = monster()
    const n = npc()
    const result = applyPull(n, m, new Set(['legendary_actions:0']))

    expect(result.features!.legendary_actions).toHaveLength(1)
    expect(result.features!.legendary_intro).toBe('The dragon can take 3 legendary actions.')
    expect(result.features!.legendary_actions_per_round).toBe(3)
  })

  it('does not mutate the original NPC', () => {
    const originalTraits = [{ name: 'Brave', description: null, attack: null }]
    const n = npc({
      features: {
        traits: originalTraits,
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
    })
    const m = monster()
    applyPull(n, m, new Set(['traits:0']))

    expect(n.features!.traits).toHaveLength(1)
    expect(n.features!.traits[0].name).toBe('Brave')
  })

  it('handles npc with undefined features', () => {
    const n = npc({ features: undefined })
    const m = monster()
    const result = applyPull(n, m, new Set(['traits:0']))

    expect(result.features!.traits).toHaveLength(1)
    expect(result.features!.traits[0].name).toBe('Keen Senses')
  })
})
