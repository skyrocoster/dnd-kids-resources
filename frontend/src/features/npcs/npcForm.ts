import type { NPC, NPCInput } from '../../api/types'

export interface NPCFormState {
  name: string
  race: string
  gender: string
  background: string
  size: string
  armorClass: string
  hitPoints: string
  speed: string
  languages: string
  notes: string
  statsText: string
  savingThrowsText: string
  skillsText: string
  sensesText: string
  appearanceText: string
}

function dictToText(dict: Record<string, unknown> | null | undefined): string {
  if (!dict) return ''
  return Object.entries(dict)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
}

function textToDict(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(':')
      if (!key || rest.length === 0) return
      const rawValue = rest.join(':').trim()
      const numeric = Number(rawValue)
      result[key.trim()] = rawValue !== '' && !Number.isNaN(numeric) ? numeric : rawValue
    })
  return result
}

function sensesToText(senses: Record<string, unknown>[] | null | undefined): string {
  if (!senses) return ''
  return senses
    .map((sense) => {
      const type = typeof sense.type === 'string' ? sense.type : ''
      const range = sense.range != null ? sense.range : ''
      return type ? `${type}: ${range}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function textToSenses(text: string): Record<string, unknown>[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type, rangeRaw] = line.split(':').map((part) => part.trim())
      const range = Number(rangeRaw)
      return { type, range: rangeRaw && !Number.isNaN(range) ? range : rangeRaw || null }
    })
}

export function emptyNPCForm(): NPCFormState {
  return {
    name: '',
    race: '',
    gender: '',
    background: '',
    size: '',
    armorClass: '',
    hitPoints: '',
    speed: '',
    languages: '',
    notes: '',
    statsText: '',
    savingThrowsText: '',
    skillsText: '',
    sensesText: '',
    appearanceText: '',
  }
}

export function npcToFormState(npc: NPC): NPCFormState {
  return {
    name: npc.name || '',
    race: npc.race || '',
    gender: npc.gender || '',
    background: npc.background || '',
    size: npc.size || '',
    armorClass: npc.armor_class != null ? String(npc.armor_class) : '',
    hitPoints: npc.hit_points != null ? String(npc.hit_points) : '',
    speed: npc.speed || '',
    languages: npc.languages || '',
    notes: npc.notes || '',
    statsText: dictToText(npc.stats),
    savingThrowsText: dictToText(npc.saving_throws),
    skillsText: dictToText(npc.skills),
    sensesText: sensesToText(npc.senses),
    appearanceText: dictToText(npc.appearance),
  }
}

export function formStateToNPCInput(form: NPCFormState): NPCInput {
  return {
    name: form.name,
    race: form.race || null,
    gender: form.gender || null,
    background: form.background || null,
    size: form.size || null,
    armor_class: form.armorClass ? Number(form.armorClass) : null,
    hit_points: form.hitPoints ? Number(form.hitPoints) : null,
    speed: form.speed || null,
    languages: form.languages || null,
    notes: form.notes || null,
    stats: form.statsText ? textToDict(form.statsText) : null,
    saving_throws: form.savingThrowsText ? textToDict(form.savingThrowsText) : null,
    skills: form.skillsText ? textToDict(form.skillsText) : null,
    senses: form.sensesText ? textToSenses(form.sensesText) : null,
    appearance: form.appearanceText ? textToDict(form.appearanceText) : null,
  }
}
