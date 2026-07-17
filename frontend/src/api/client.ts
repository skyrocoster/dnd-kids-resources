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
  MonsterInput,
  Weapon,
  WeaponInput,
  Item,
  ItemInput,
  LootBundle,
  LootBundleInput,
  Player,
  PlayerInput,
  NPC,
  NPCInput,
  Encounter,
  EncounterInput,
  Dungeon,
  DungeonInput,
  MapLayoutBlob,
  LoomThread,
  LoomThreadCreate,
  LoomNode,
  LoomNodeInput,
  LoomNodeFulfil,
  LoomTapestry,
  LoomTapestryThread,
  LoomThreadItemCreate,
  LoomThreadItemPositionUpdate,
  LoomNodePositionInput,
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
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
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

// Monsters
export const listMonsters = () => get<Monster[]>('/monsters')
export const getMonster = (id: number) => get<Monster>(`/monsters/${id}`)
export const getMonsterByName = (name: string) => get<Monster>(`/monsters/by-name/${encodeURIComponent(name)}`)
export const createMonster = (monster: MonsterInput) => post<Monster>('/monsters', monster)
export const updateMonster = (id: number, monster: MonsterInput) => put<Monster>(`/monsters/${id}`, monster)
export const deleteMonster = (id: number) => del(`/monsters/${id}`)

// Weapons
export const listWeapons = () => get<Weapon[]>('/weapons')
export const getWeapon = (id: number) => get<Weapon>(`/weapons/${id}`)
export const getWeaponByName = (name: string) => get<Weapon>(`/weapons/by-name/${encodeURIComponent(name)}`)
export const createWeapon = (weapon: WeaponInput) => post<Weapon>('/weapons', weapon)
export const updateWeapon = (id: number, weapon: WeaponInput) => put<Weapon>(`/weapons/${id}`, weapon)
export const deleteWeapon = (id: number) => del(`/weapons/${id}`)

// Items
export const listItems = () => get<Item[]>('/items')
export const getItem = (id: number) => get<Item>(`/items/${id}`)
export const createItem = (item: ItemInput) => post<Item>('/items', item)
export const updateItem = (id: number, item: ItemInput) => put<Item>(`/items/${id}`, item)
export const deleteItem = (id: number) => del(`/items/${id}`)

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

// Encounters
export const listEncounters = () => get<Encounter[]>('/encounters')
export const getEncounter = (id: number) => get<Encounter>(`/encounters/${id}`)
export const createEncounter = (encounter: EncounterInput) => post<Encounter>('/encounters', encounter)
export const updateEncounter = (id: number, encounter: EncounterInput) =>
  put<Encounter>(`/encounters/${id}`, encounter)
export const deleteEncounter = (id: number) => del(`/encounters/${id}`)

// Loot bundles
export const listLootBundles = () => get<LootBundle[]>('/loot-bundles')
export const getLootBundle = (id: number) => get<LootBundle>(`/loot-bundles/${id}`)
export const createLootBundle = (bundle: LootBundleInput) => post<LootBundle>('/loot-bundles', bundle)
export const updateLootBundle = (id: number, bundle: LootBundleInput) =>
  put<LootBundle>(`/loot-bundles/${id}`, bundle)
export const deleteLootBundle = (id: number) => del(`/loot-bundles/${id}`)

// Dungeons
export const listDungeons = () => get<Dungeon[]>('/dungeons')
export const getDungeon = (id: number) => get<Dungeon>(`/dungeons/${id}`)
export const createDungeon = (dungeon: DungeonInput) => post<Dungeon>('/dungeons', dungeon)
export const updateDungeon = (id: number, dungeon: DungeonInput) => put<Dungeon>(`/dungeons/${id}`, dungeon)
export const deleteDungeon = (id: number) => del(`/dungeons/${id}`)

// Map Lab layout
export const getDungeonLayout = (dungeonId: number) => get<MapLayoutBlob>(`/dungeons/${dungeonId}/layout`)
export const saveDungeonLayout = (dungeonId: number, blob: MapLayoutBlob) =>
  put<MapLayoutBlob>(`/dungeons/${dungeonId}/layout`, blob)

// Loom — tapestry
export const getLoomTapestry = () => get<LoomTapestry>('/loom/tapestry')

// Loom — threads
export const listLoomThreads = () => get<LoomThread[]>('/loom/threads')
export const createLoomThread = (thread: LoomThreadCreate) =>
  post<LoomTapestryThread>('/loom/threads', thread)
export const updateLoomThread = (id: number, thread: LoomThreadCreate) =>
  put<LoomThread>(`/loom/threads/${id}`, thread)
export const deleteLoomThread = (id: number) => del(`/loom/threads/${id}`)

// Loom — nodes
export const createLoomNode = (node: LoomNodeInput) => post<LoomNode>('/loom/nodes', node)
export const updateLoomNode = (id: number, node: LoomNodeInput) =>
  put<LoomNode>(`/loom/nodes/${id}`, node)
export const deleteLoomNode = (id: number) => del(`/loom/nodes/${id}`)
export const patchLoomNodePosition = (id: number, position: LoomNodePositionInput) =>
  patch<LoomNode>(`/loom/nodes/${id}/position`, position)
export const fulfilLoomNode = (id: number, payload: LoomNodeFulfil = {}) =>
  post<LoomNode>(`/loom/nodes/${id}/fulfil`, payload)
export const bankLoomNode = (id: number) =>
  post<LoomNode>(`/loom/nodes/${id}/bank`, {})

// Loom — thread items (ordered membership)
export const insertLoomThreadItem = (threadId: number, item: LoomThreadItemCreate) =>
  post<LoomTapestryThread>(`/loom/threads/${threadId}/items`, item)
export const reorderLoomThreadItem = (threadId: number, nodeId: number, update: LoomThreadItemPositionUpdate) =>
  patch<LoomTapestryThread>(`/loom/threads/${threadId}/items/${nodeId}`, update)
export const removeLoomThreadItem = (threadId: number, nodeId: number) =>
  del(`/loom/threads/${threadId}/items/${nodeId}`)
