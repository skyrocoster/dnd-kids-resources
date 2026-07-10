export const LEVEL_OPTIONS = [
  { value: '0', label: 'Cantrip' },
  { value: '1', label: '1st Level' },
  { value: '2', label: '2nd Level' },
  { value: '3', label: '3rd Level' },
  { value: '4', label: '4th Level' },
  { value: '5', label: '5th Level' },
  { value: '6', label: '6th Level' },
  { value: '7', label: '7th Level' },
  { value: '8', label: '8th Level' },
  { value: '9', label: '9th Level' },
]

export const SCHOOL_OPTIONS = [
  { value: 'abjuration', label: 'Abjuration' },
  { value: 'conjuration', label: 'Conjuration' },
  { value: 'divination', label: 'Divination' },
  { value: 'enchantment', label: 'Enchantment' },
  { value: 'evocation', label: 'Evocation' },
  { value: 'illusion', label: 'Illusion' },
  { value: 'necromancy', label: 'Necromancy' },
  { value: 'transmutation', label: 'Transmutation' },
]

export const ACTION_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'action', label: 'Action' },
  { value: 'bonus action', label: 'Bonus Action' },
  { value: 'reaction', label: 'Reaction' },
]

export const ATTACK_TYPE_OPTIONS = [
  { value: '', label: '— (save only)' },
  { value: 'melee', label: 'Melee' },
  { value: 'ranged', label: 'Ranged' },
  { value: 'spell', label: 'Spell' },
]

export const CLASS_OPTIONS = [
  { value: 'Artificer', label: 'Artificer' },
  { value: 'Barbarian', label: 'Barbarian' },
  { value: 'Bard', label: 'Bard' },
  { value: 'Cleric', label: 'Cleric' },
  { value: 'Druid', label: 'Druid' },
  { value: 'Fighter', label: 'Fighter' },
  { value: 'Monk', label: 'Monk' },
  { value: 'Paladin', label: 'Paladin' },
  { value: 'Ranger', label: 'Ranger' },
  { value: 'Rogue', label: 'Rogue' },
  { value: 'Sorcerer', label: 'Sorcerer' },
  { value: 'Warlock', label: 'Warlock' },
  { value: 'Wizard', label: 'Wizard' },
]

export const DICE_COUNT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '20']
export const DICE_TYPE_OPTIONS = ['4', '6', '8', '10', '12', '20', '100']

export function levelLabel(level: string | null | undefined): string {
  const found = LEVEL_OPTIONS.find((o) => o.value === level)
  return found ? found.label : level || 'Unknown level'
}
