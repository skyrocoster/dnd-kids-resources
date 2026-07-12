import type { Condition, Encounter, EncounterCreature, EncounterInput } from '../../api/types'

let rowIdCounter = 0
function nextRowId(): string {
  rowIdCounter += 1
  return `encounter-creature-${rowIdCounter}`
}

export interface EncounterCreatureRow {
  id: string
  monsterId: string
  originalName: string
  name: string
  hpCurrent: string
  hpMax: string
  ac: string
  status: string
  conditions: string[]
}

export interface EncounterFormState {
  title: string
  creatureRows: EncounterCreatureRow[]
}

export interface ConditionOption {
  value: string
  label: string
}

export function emptyEncounterForm(): EncounterFormState {
  return { title: '', creatureRows: [] }
}

export function addEncounterCreatureRow(rows: EncounterCreatureRow[]): EncounterCreatureRow[] {
  return [
    ...rows,
    {
      id: nextRowId(),
      monsterId: '',
      originalName: '',
      name: '',
      hpCurrent: '',
      hpMax: '',
      ac: '',
      status: 'alive',
      conditions: [],
    },
  ]
}

export function encounterToFormState(encounter: Encounter): EncounterFormState {
  const creatures: EncounterCreature[] = encounter.creatures || []
  return {
    title: encounter.title || '',
    creatureRows: creatures.map((c) => ({
      id: nextRowId(),
      monsterId: c.monster_id != null ? String(c.monster_id) : '',
      originalName: c.original_name || '',
      name: c.name || '',
      hpCurrent: c.hp_current != null ? String(c.hp_current) : '',
      hpMax: c.hp_max != null ? String(c.hp_max) : '',
      ac: c.ac != null ? String(c.ac) : '',
      status: c.status || 'alive',
      conditions: c.conditions || [],
    })),
  }
}

function dedupeConditions(conditions: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of conditions) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export function formStateToEncounterInput(form: EncounterFormState): EncounterInput {
  const creatures = form.creatureRows.length
    ? form.creatureRows.map((row) => ({
        monster_id: row.monsterId ? Number(row.monsterId) : null,
        original_name: row.originalName || null,
        name: row.name || null,
        hp_current: row.hpCurrent ? Number(row.hpCurrent) : null,
        hp_max: row.hpMax ? Number(row.hpMax) : null,
        ac: row.ac ? Number(row.ac) : null,
        status: row.status || null,
        conditions: dedupeConditions(row.conditions),
      }))
    : null

  return {
    title: form.title,
    creatures,
  }
}

/** Canonical conditions as checkbox options, plus any already-selected value not in the canonical
 * list (case-insensitively) appended as a "(custom)" option — so editing an old encounter with a
 * legacy/unknown condition string never silently drops it.
 */
export function mergeConditionOptions(canonical: Condition[], selected: string[]): ConditionOption[] {
  const canonicalLower = new Set(canonical.map((c) => c.name.toLowerCase()))
  const options: ConditionOption[] = canonical.map((c) => ({ value: c.name, label: c.name }))
  const seenExtra = new Set<string>()
  for (const value of selected) {
    const key = value.toLowerCase()
    if (canonicalLower.has(key) || seenExtra.has(key)) continue
    seenExtra.add(key)
    options.push({ value, label: `${value} (custom)` })
  }
  return options
}

export function isConditionSelected(selected: string[], value: string): boolean {
  const key = value.toLowerCase()
  return selected.some((c) => c.toLowerCase() === key)
}

export function toggleCondition(selected: string[], value: string): string[] {
  return isConditionSelected(selected, value)
    ? selected.filter((c) => c.toLowerCase() !== value.toLowerCase())
    : [...selected, value]
}
