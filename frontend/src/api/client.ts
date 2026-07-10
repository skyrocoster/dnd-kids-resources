import type {
  Ability,
  Condition,
  DamageType,
  WeaponProperty,
  Skill,
  SpellComponent,
  Spell,
  SpellInput,
  Monster,
  Weapon,
  WeaponInput,
  Player,
  PlayerInput,
  NPC,
  NPCInput,
  Quest,
  QuestInput,
  Encounter,
  EncounterInput,
  Dungeon,
  DungeonInput,
} from './types'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body || res.statusText)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const del = (path: string) => request<void>(path, { method: 'DELETE' })

// Reference data
export const getAbilities = () => get<Ability[]>('/abilities')
export const getConditions = () => get<Condition[]>('/conditions')
export const getDamageTypes = () => get<DamageType[]>('/damage_types')
export const getWeaponProperties = () => get<WeaponProperty[]>('/weapon_properties')
export const getSkills = () => get<Skill[]>('/skills')
export const getSpellComponents = () => get<SpellComponent[]>('/spell-components')

// Spells
export const listSpells = () => get<Spell[]>('/spells')
export const getSpell = (id: number) => get<Spell>(`/spells/${id}`)
export const getSpellByTitle = (name: string) => get<Spell>(`/spells/by-title/${encodeURIComponent(name)}`)
export const createSpell = (spell: SpellInput) => post<Spell>('/spells', spell)
export const updateSpell = (id: number, spell: SpellInput) => put<Spell>(`/spells/${id}`, spell)
export const deleteSpell = (id: number) => del(`/spells/${id}`)

// Monsters (read-only)
export const listMonsters = () => get<Monster[]>('/monsters')
export const getMonster = (id: number) => get<Monster>(`/monsters/${id}`)
export const getMonsterByName = (name: string) => get<Monster>(`/monsters/by-name/${encodeURIComponent(name)}`)

// Weapons
export const listWeapons = () => get<Weapon[]>('/weapons')
export const getWeapon = (id: number) => get<Weapon>(`/weapons/${id}`)
export const getWeaponByName = (name: string) => get<Weapon>(`/weapons/by-name/${encodeURIComponent(name)}`)
export const createWeapon = (weapon: WeaponInput) => post<Weapon>('/weapons', weapon)
export const updateWeapon = (id: number, weapon: WeaponInput) => put<Weapon>(`/weapons/${id}`, weapon)
export const deleteWeapon = (id: number) => del(`/weapons/${id}`)

// Players
export const listPlayers = () => get<Player[]>('/players')
export const getPlayer = (id: number) => get<Player>(`/players/${id}`)
export const createPlayer = (player: PlayerInput) => post<Player>('/players', player)
export const updatePlayer = (id: number, player: PlayerInput) => put<Player>(`/players/${id}`, player)
export const deletePlayer = (id: number) => del(`/players/${id}`)
export const getPlayerSpells = (id: number) => get<Spell[]>(`/players/${id}/spells`)
export const assignPlayerSpell = (playerId: number, spellId: number) =>
  post<void>(`/players/${playerId}/spells/${spellId}`, undefined)
export const unassignPlayerSpell = (playerId: number, spellId: number) =>
  del(`/players/${playerId}/spells/${spellId}`)
export const getPlayerWeapons = (id: number) => get<Weapon[]>(`/players/${id}/weapons`)
export const assignPlayerWeapon = (playerId: number, weaponId: number) =>
  post<void>(`/players/${playerId}/weapons/${weaponId}`, undefined)
export const unassignPlayerWeapon = (playerId: number, weaponId: number) =>
  del(`/players/${playerId}/weapons/${weaponId}`)

// NPCs
export const listNPCs = () => get<NPC[]>('/npcs')
export const getNPC = (id: number) => get<NPC>(`/npcs/${id}`)
export const createNPC = (npc: NPCInput) => post<NPC>('/npcs', npc)
export const updateNPC = (id: number, npc: NPCInput) => put<NPC>(`/npcs/${id}`, npc)
export const deleteNPC = (id: number) => del(`/npcs/${id}`)

// Quests
export const listQuests = () => get<Quest[]>('/quests')
export const getQuest = (id: number) => get<Quest>(`/quests/${id}`)
export const createQuest = (quest: QuestInput) => post<Quest>('/quests', quest)
export const updateQuest = (id: number, quest: QuestInput) => put<Quest>(`/quests/${id}`, quest)
export const deleteQuest = (id: number) => del(`/quests/${id}`)

// Encounters
export const listEncounters = () => get<Encounter[]>('/encounters')
export const getEncounter = (id: number) => get<Encounter>(`/encounters/${id}`)
export const createEncounter = (encounter: EncounterInput) => post<Encounter>('/encounters', encounter)
export const updateEncounter = (id: number, encounter: EncounterInput) =>
  put<Encounter>(`/encounters/${id}`, encounter)
export const deleteEncounter = (id: number) => del(`/encounters/${id}`)

// Dungeons
export const listDungeons = () => get<Dungeon[]>('/dungeons')
export const getDungeon = (id: number) => get<Dungeon>(`/dungeons/${id}`)
export const createDungeon = (dungeon: DungeonInput) => post<Dungeon>('/dungeons', dungeon)
export const updateDungeon = (id: number, dungeon: DungeonInput) => put<Dungeon>(`/dungeons/${id}`, dungeon)
export const deleteDungeon = (id: number) => del(`/dungeons/${id}`)
