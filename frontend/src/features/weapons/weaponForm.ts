import type { Weapon, WeaponInput } from '../../api/types'

let rowIdCounter = 0
function nextRowId(): string {
  rowIdCounter += 1
  return `weapon-attack-${rowIdCounter}`
}

export interface WeaponAttackRow {
  id: string
  type: string
  damage: string
  damage_type: string
  hands: string
}

export interface WeaponFormState {
  name: string
  base_weapon: string
  rarity: string
  weapon_category: string
  weight: string
  req_attune: string
  property: string[]
  focus: string[]
  attackRows: WeaponAttackRow[]
  entries: string
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : []
}

export function emptyWeaponForm(): WeaponFormState {
  return {
    name: '',
    base_weapon: '',
    rarity: '',
    weapon_category: '',
    weight: '',
    req_attune: '',
    property: [],
    focus: [],
    attackRows: [],
    entries: '',
  }
}

export function weaponToFormState(weapon: Weapon): WeaponFormState {
  const attacks: Array<{ type?: string; damage?: string; damage_type?: string; hands?: number }> = Array.isArray(
    weapon.attack,
  )
    ? (weapon.attack as unknown as Array<{ type?: string; damage?: string; damage_type?: string; hands?: number }>)
    : []

  return {
    name: weapon.name || '',
    base_weapon: weapon.base_weapon || '',
    rarity: weapon.rarity || '',
    weapon_category: weapon.weapon_category || '',
    weight: weapon.weight != null ? String(weapon.weight) : '',
    req_attune: weapon.req_attune || '',
    property: asStringArray(weapon.property),
    focus: asStringArray(weapon.focus),
    attackRows: attacks.map((a) => ({
      id: nextRowId(),
      type: a.type || '',
      damage: a.damage || '',
      damage_type: a.damage_type || '',
      hands: a.hands != null ? String(a.hands) : '',
    })),
    entries: asStringArray(weapon.entries)
      .map((e) => (typeof e === 'string' ? e : JSON.stringify(e)))
      .join('\n\n'),
  }
}

export function addWeaponAttackRow(rows: WeaponAttackRow[]): WeaponAttackRow[] {
  return [...rows, { id: nextRowId(), type: '', damage: '', damage_type: '', hands: '' }]
}

export function formStateToWeaponInput(form: WeaponFormState): WeaponInput {
  const attack = form.attackRows.length
    ? form.attackRows.map((row) => ({
        type: row.type || undefined,
        damage: row.damage || undefined,
        damage_type: row.damage_type || undefined,
        hands: row.hands ? Number(row.hands) : undefined,
      }))
    : null

  const entries = form.entries
    .split(/\n{2,}/)
    .map((e) => e.trim())
    .filter(Boolean)

  return {
    name: form.name,
    base_weapon: form.base_weapon || null,
    rarity: form.rarity || null,
    weapon_category: form.weapon_category || null,
    weight: form.weight ? Number(form.weight) : null,
    req_attune: form.req_attune || null,
    property: form.property.length ? form.property : null,
    focus: form.focus.length ? form.focus : null,
    attack,
    entries: entries.length ? entries : null,
  }
}
