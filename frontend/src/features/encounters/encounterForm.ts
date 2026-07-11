import type { Encounter, EncounterCreature, EncounterInput } from '../../api/types'

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
  conditionsText: string
}

export interface EncounterFormState {
  title: string
  creatureRows: EncounterCreatureRow[]
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
      conditionsText: '',
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
      conditionsText: (c.conditions || []).join(', '),
    })),
  }
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
        conditions: row.conditionsText
          ? row.conditionsText
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
      }))
    : null

  return {
    title: form.title,
    creatures,
  }
}
