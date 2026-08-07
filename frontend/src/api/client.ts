import type {
  Ability,
  Condition,
  DamageType,
  WeaponProperty,
  Skill,
  SpellComponent,
  Spell,
  SpellInput,
  SpellPlayerReplacement,
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
  PlayerDetail,
  PlayerSpellbookCharacter,
  PlayerSpellAssignments,
  PlayerWeaponAssignments,
  NPC,
  NPCInput,
  Encounter,
  EncounterInput,
  Dungeon,
  DungeonInput,
  MapLayoutBlob,
  MapSessionStateBlob,
  IncomingGateway,
  LoomThread,
  LoomThreadCreate,
  LoomNode,
  LoomNodeInput,
  LoomNodeFulfil,
  LoomSessionLogRequest,
  LoomTapestry,
  LoomTapestryThread,
  LoomThreadItemCreate,
  LoomThreadItemPositionUpdate,
  LoomNodeMove,
  LoomThreadMoveResult,
  LoomSession,
  LoomSessionInput,
  RevealedCellsBlob,
  AtTheTableResponse,
  AtTheTableSet,
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

const get = <T>(path: string, options?: RequestInit) => request<T>(path, options)
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
export const getSpellPlayers = (spellId: number) => get<Player[]>(`/spells/${spellId}/players`)
export const replaceSpellPlayers = (spellId: number, playerIds: number[]) =>
  put<Player[]>(`/spells/${spellId}/players`, { player_ids: playerIds } satisfies SpellPlayerReplacement)

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
export const getWeaponPlayers = (id: number) => get<Player[]>(`/weapons/${id}/players`)

// Items
export const listItems = () => get<Item[]>('/items')
export const getItem = (id: number) => get<Item>(`/items/${id}`)
export const createItem = (item: ItemInput) => post<Item>('/items', item)
export const updateItem = (id: number, item: ItemInput) => put<Item>(`/items/${id}`, item)
export const deleteItem = (id: number) => del(`/items/${id}`)

// Players
export const listPlayers = () => get<Player[]>('/players')
export const getPlayer = (id: number) => get<Player>(`/players/${id}`)
export const getPlayerDetail = (id: number) => get<PlayerDetail>(`/players/${id}/detail`)
export const createPlayer = (player: PlayerInput) => post<Player>('/players', player)
export const updatePlayer = (id: number, player: PlayerInput) => put<Player>(`/players/${id}`, player)
export const deletePlayer = (id: number) => del(`/players/${id}`)
export const getPlayerSpellbook = (signal?: AbortSignal) =>
  get<PlayerSpellbookCharacter[]>('/players/spellbook', { signal })
export const getPlayerSpells = (id: number) => get<Spell[]>(`/players/${id}/spells`)
export const getPlayerWeapons = (id: number) => get<Weapon[]>(`/players/${id}/weapons`)
export const replacePlayerSpells = (playerId: number, spellIds: number[]) =>
  put<Spell[]>(`/players/${playerId}/spells`, { spell_ids: spellIds } satisfies PlayerSpellAssignments)
export const replacePlayerWeapons = (playerId: number, weaponIds: number[]) =>
  put<Weapon[]>(`/players/${playerId}/weapons`, { weapon_ids: weaponIds } satisfies PlayerWeaponAssignments)

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
export const getDungeonLayout = (dungeonId: number, signal?: AbortSignal) =>
  get<MapLayoutBlob>(`/dungeons/${dungeonId}/layout`, { signal })
export const saveDungeonLayout = (dungeonId: number, blob: MapLayoutBlob) =>
  put<MapLayoutBlob>(`/dungeons/${dungeonId}/layout`, blob)
export const listIncomingGateways = (dungeonId: number) =>
  get<IncomingGateway[]>(`/dungeons/${dungeonId}/incoming-gateways`)

// Map Lab session state
export const getDungeonSessionState = (dungeonId: number, signal?: AbortSignal) =>
  get<MapSessionStateBlob>(`/dungeons/${dungeonId}/session-state`, { signal })
export const saveDungeonSessionState = (dungeonId: number, blob: MapSessionStateBlob) =>
  put<MapSessionStateBlob>(`/dungeons/${dungeonId}/session-state`, blob)
export const resetDungeonSessionState = (dungeonId: number) =>
  del(`/dungeons/${dungeonId}/session-state`)

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
export const fulfilLoomNode = (id: number, payload: LoomNodeFulfil = {}) =>
  post<LoomNode>(`/loom/nodes/${id}/fulfil`, payload)
export const bankLoomNode = (id: number) =>
  post<LoomNode>(`/loom/nodes/${id}/bank`, {})

// Loom — sessions
export const getLoomSessions = () => get<LoomSession[]>('/loom/sessions')
export const createLoomSession = (session: LoomSessionInput) =>
  post<LoomSession>('/loom/sessions', session)
export const updateLoomSession = (id: number, session: LoomSessionInput) =>
  put<LoomSession>(`/loom/sessions/${id}`, session)
export const deleteLoomSession = (id: number) => del(`/loom/sessions/${id}`)
export const logLoomSession = (request: LoomSessionLogRequest) =>
  post<LoomSession>('/loom/sessions/log', request)

// Loom — thread items (ordered membership)
export const insertLoomThreadItem = (threadId: number, item: LoomThreadItemCreate) =>
  post<LoomTapestryThread>(`/loom/threads/${threadId}/items`, item)
export const reorderLoomThreadItem = (threadId: number, nodeId: number, update: LoomThreadItemPositionUpdate) =>
  patch<LoomTapestryThread>(`/loom/threads/${threadId}/items/${nodeId}`, update)
export const removeLoomThreadItem = (threadId: number, nodeId: number) =>
  del(`/loom/threads/${threadId}/items/${nodeId}`)
export const moveLoomThreadItem = (threadId: number, nodeId: number, body: LoomNodeMove) =>
  post<LoomThreadMoveResult>(`/loom/threads/${threadId}/items/${nodeId}/move`, body)

// Fog of war (player app)
export const getRevealedCells = (dungeonId: number) =>
  get<RevealedCellsBlob>(`/dungeons/${dungeonId}/revealed-cells`)
export const revealCells = (dungeonId: number, blob: RevealedCellsBlob) =>
  put<RevealedCellsBlob>(`/dungeons/${dungeonId}/revealed-cells`, blob)

// At-the-table pointer (DM → player app)
export const getAtTheTable = (signal?: AbortSignal) => get<AtTheTableResponse>('/at-the-table', { signal })
export const setAtTheTable = (blob: AtTheTableSet) => put<AtTheTableResponse>('/at-the-table', blob)


