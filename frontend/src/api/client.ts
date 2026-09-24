import * as sdk from "./generated/sdk.gen";
import { client as generatedClient } from "./generated/client.gen";
import type {
  AtTheTableResponse,
  AtTheTableSet,
  DungeonInput,
  EncounterInput,
  ItemInput,
  LoomNodeFulfil,
  LoomNodeInput,
  LoomNodeMove,
  LoomSessionInput,
  LoomSessionLogRequest,
  LoomThreadCreate,
  LoomThreadItemCreate,
  LoomThreadItemPositionUpdate,
  LootBundleInput,
  MapLayoutBlob,
  MapSessionStateBlob,
  MonsterInput,
  NPCInput,
  PlayerInput,
  PlayerSpellAssignments,
  PlayerSpellbookCharacter,
  PlayerWeaponAssignments,
  RevealedCellsBlob,
  SpellInput,
  SpellPlayerReplacement,
  WeaponInput,
} from "./types";

export { queryKeys } from "./queryKeys";
export { queryInvalidation } from "./queryInvalidation";

/** A request error that retains the HTTP status used by existing feature error handling. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const baseUrl = (
  configuredBaseUrl || (typeof window === "undefined" ? "" : window.location.origin)
).replace(/\/+$/, "");

/** Shared generated Hey API client. Every production request uses this configured instance. */
export const apiClient = generatedClient;
apiClient.setConfig({ baseUrl, responseStyle: "fields", throwOnError: true });

apiClient.interceptors.error.use((error, response) => {
  if (error instanceof ApiError) return error;

  const payload = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const detailMessage =
    typeof payload?.detail === "string"
      ? payload.detail
      : payload?.detail === undefined
        ? ""
        : JSON.stringify(payload);
  const message =
    (typeof payload?.message === "string" && payload.message) ||
    detailMessage ||
    (error instanceof Error ? error.message : typeof error === "string" ? error : "") ||
    response?.statusText ||
    "API request failed";
  const code = typeof payload?.code === "string" ? payload.code : undefined;
  return new ApiError(response?.status ?? 0, message, code);
});

type DataResult<T> = { data: T };
const resultData = <T>(request: Promise<DataResult<T>>): Promise<T> =>
  request.then(({ data }) => data);
const options = { client: apiClient, responseStyle: "fields", throwOnError: true } as const;

// Reference data
export const getAbilities = () => resultData(sdk.getAbilities(options));
export const getConditions = () => resultData(sdk.getConditions(options));
export const getDamageTypes = () => resultData(sdk.getDamageTypes(options));
export const getWeaponProperties = () => resultData(sdk.getWeaponProperties(options));
export const getSkills = () => resultData(sdk.getSkills(options));
export const getSpellComponents = () => resultData(sdk.getSpellComponents(options));

// Spells
export const listSpells = () => resultData(sdk.listSpells(options));
export const getSpell = (id: number) =>
  resultData(sdk.getSpell({ ...options, path: { spell_id: id } }));
export const getSpellByTitle = (name: string) =>
  resultData(sdk.getSpellByTitle({ ...options, path: { spell_name: name } }));
export const createSpell = (spell: SpellInput) =>
  resultData(sdk.createSpell({ ...options, body: spell }));
export const updateSpell = (id: number, spell: SpellInput) =>
  resultData(sdk.updateSpell({ ...options, path: { spell_id: id }, body: spell }));
export const deleteSpell = (id: number) =>
  resultData(sdk.deleteSpell({ ...options, path: { spell_id: id } })).then(() => undefined);
export const getSpellPlayers = (spellId: number) =>
  resultData(sdk.getSpellPlayers({ ...options, path: { spell_id: spellId } }));
export const replaceSpellPlayers = (spellId: number, playerIds: number[]) =>
  resultData(
    sdk.replaceSpellPlayers({
      ...options,
      path: { spell_id: spellId },
      body: { player_ids: playerIds } satisfies SpellPlayerReplacement,
    }),
  );

// Monsters
export const listMonsters = () => resultData(sdk.listMonsters(options));
export const getMonster = (id: number) =>
  resultData(sdk.getMonster({ ...options, path: { monster_id: id } }));
export const getMonsterByName = (name: string) =>
  resultData(sdk.getMonsterByName({ ...options, path: { name } }));
export const createMonster = (monster: MonsterInput) =>
  resultData(sdk.createMonster({ ...options, body: monster }));
export const updateMonster = (id: number, monster: MonsterInput) =>
  resultData(sdk.updateMonster({ ...options, path: { monster_id: id }, body: monster }));
export const deleteMonster = (id: number) =>
  resultData(sdk.deleteMonster({ ...options, path: { monster_id: id } })).then(() => undefined);

// Weapons
export const listWeapons = () => resultData(sdk.listWeapons(options));
export const getWeapon = (id: number) =>
  resultData(sdk.getWeapon({ ...options, path: { weapon_id: id } }));
export const getWeaponByName = (name: string) =>
  resultData(sdk.getWeaponByName({ ...options, path: { name } }));
export const createWeapon = (weapon: WeaponInput) =>
  resultData(sdk.createWeapon({ ...options, body: weapon }));
export const updateWeapon = (id: number, weapon: WeaponInput) =>
  resultData(sdk.updateWeapon({ ...options, path: { weapon_id: id }, body: weapon }));
export const deleteWeapon = (id: number) =>
  resultData(sdk.deleteWeapon({ ...options, path: { weapon_id: id } })).then(() => undefined);
export const getWeaponPlayers = (id: number) =>
  resultData(sdk.getWeaponPlayers({ ...options, path: { weapon_id: id } }));

// Items and loot bundles
export const listItems = () => resultData(sdk.listItems(options));
export const getItem = (id: number) =>
  resultData(sdk.getItem({ ...options, path: { item_id: id } }));
export const createItem = (item: ItemInput) =>
  resultData(sdk.createItem({ ...options, body: item }));
export const updateItem = (id: number, item: ItemInput) =>
  resultData(sdk.updateItem({ ...options, path: { item_id: id }, body: item }));
export const deleteItem = (id: number) =>
  resultData(sdk.deleteItem({ ...options, path: { item_id: id } })).then(() => undefined);
export const listLootBundles = () => resultData(sdk.listLootBundles(options));
export const getLootBundle = (id: number) =>
  resultData(sdk.getLootBundle({ ...options, path: { bundle_id: id } }));
export const createLootBundle = (bundle: LootBundleInput) =>
  resultData(sdk.createLootBundle({ ...options, body: bundle }));
export const updateLootBundle = (id: number, bundle: LootBundleInput) =>
  resultData(sdk.updateLootBundle({ ...options, path: { bundle_id: id }, body: bundle }));
export const deleteLootBundle = (id: number) =>
  resultData(sdk.deleteLootBundle({ ...options, path: { bundle_id: id } })).then(() => undefined);

// Players and assignments
export const listPlayers = () => resultData(sdk.listPlayers(options));
export const getPlayer = (id: number) =>
  resultData(sdk.getPlayer({ ...options, path: { player_id: id } }));
export const getPlayerDetail = (id: number) =>
  resultData(sdk.getPlayerDetail({ ...options, path: { player_id: id } }));
export const createPlayer = (player: PlayerInput) =>
  resultData(sdk.createPlayer({ ...options, body: player }));
export const updatePlayer = (id: number, player: PlayerInput) =>
  resultData(sdk.updatePlayer({ ...options, path: { player_id: id }, body: player }));
export const deletePlayer = (id: number) =>
  resultData(sdk.deletePlayer({ ...options, path: { player_id: id } })).then(() => undefined);
export const getPlayerSpellbook = (signal?: AbortSignal) =>
  resultData(sdk.getPlayerSpellbook({ ...options, signal })) as Promise<PlayerSpellbookCharacter[]>;
export const getPlayerSpells = (id: number) =>
  resultData(sdk.getPlayerSpells({ ...options, path: { player_id: id } }));
export const getPlayerWeapons = (id: number) =>
  resultData(sdk.getPlayerWeapons({ ...options, path: { player_id: id } }));
export const replacePlayerSpells = (playerId: number, spellIds: number[]) =>
  resultData(
    sdk.replacePlayerSpells({
      ...options,
      path: { player_id: playerId },
      body: { spell_ids: spellIds } satisfies PlayerSpellAssignments,
    }),
  );
export const replacePlayerWeapons = (playerId: number, weaponIds: number[]) =>
  resultData(
    sdk.replacePlayerWeapons({
      ...options,
      path: { player_id: playerId },
      body: { weapon_ids: weaponIds } satisfies PlayerWeaponAssignments,
    }),
  );

// NPCs
export const listNPCs = () => resultData(sdk.listNpcs(options));
export const getNPC = (id: number) => resultData(sdk.getNpc({ ...options, path: { npc_id: id } }));
export const createNPC = (npc: NPCInput) => resultData(sdk.createNpc({ ...options, body: npc }));
export const updateNPC = (id: number, npc: NPCInput) =>
  resultData(sdk.updateNpc({ ...options, path: { npc_id: id }, body: npc }));
export const deleteNPC = (id: number) =>
  resultData(sdk.deleteNpc({ ...options, path: { npc_id: id } })).then(() => undefined);

// Encounters
export const listEncounters = () => resultData(sdk.listEncounters(options));
export const getEncounter = (id: number) =>
  resultData(sdk.getEncounter({ ...options, path: { encounter_id: id } }));
export const createEncounter = (encounter: EncounterInput) =>
  resultData(sdk.createEncounter({ ...options, body: encounter }));
export const updateEncounter = (id: number, encounter: EncounterInput) =>
  resultData(sdk.updateEncounter({ ...options, path: { encounter_id: id }, body: encounter }));
export const deleteEncounter = (id: number) =>
  resultData(sdk.deleteEncounter({ ...options, path: { encounter_id: id } })).then(() => undefined);

// Dungeons and Map Lab
export const listDungeons = () => resultData(sdk.listDungeons(options));
export const getDungeon = (id: number) =>
  resultData(sdk.getDungeon({ ...options, path: { dungeon_id: id } }));
export const createDungeon = (dungeon: DungeonInput) =>
  resultData(sdk.createDungeon({ ...options, body: dungeon }));
export const updateDungeon = (id: number, dungeon: DungeonInput) =>
  resultData(sdk.updateDungeon({ ...options, path: { dungeon_id: id }, body: dungeon }));
export const deleteDungeon = (id: number) =>
  resultData(sdk.deleteDungeon({ ...options, path: { dungeon_id: id } })).then(() => undefined);
export const getDungeonLayout = (dungeonId: number, signal?: AbortSignal) =>
  resultData(sdk.getDungeonLayout({ ...options, path: { dungeon_id: dungeonId }, signal }));
export const saveDungeonLayout = (dungeonId: number, blob: MapLayoutBlob) =>
  resultData(sdk.saveDungeonLayout({ ...options, path: { dungeon_id: dungeonId }, body: blob }));
export const listIncomingGateways = (dungeonId: number) =>
  resultData(sdk.getIncomingGateways({ ...options, path: { dungeon_id: dungeonId } }));
export const getDungeonSessionState = (dungeonId: number, signal?: AbortSignal) =>
  resultData(sdk.getDungeonSessionState({ ...options, path: { dungeon_id: dungeonId }, signal }));
export const saveDungeonSessionState = (dungeonId: number, blob: MapSessionStateBlob) =>
  resultData(
    sdk.saveDungeonSessionState({ ...options, path: { dungeon_id: dungeonId }, body: blob }),
  );
export const resetDungeonSessionState = (dungeonId: number) =>
  resultData(sdk.resetDungeonSessionState({ ...options, path: { dungeon_id: dungeonId } })).then(
    () => undefined,
  );

// Loom
export const getLoomTapestry = () => resultData(sdk.getTapestry(options));
export const listLoomThreads = () => resultData(sdk.listThreads(options));
export const createLoomThread = (thread: LoomThreadCreate) =>
  resultData(sdk.createThread({ ...options, body: thread }));
export const updateLoomThread = (id: number, thread: LoomThreadCreate) =>
  resultData(sdk.updateThread({ ...options, path: { thread_id: id }, body: thread }));
export const deleteLoomThread = (id: number) =>
  resultData(sdk.deleteThread({ ...options, path: { thread_id: id } })).then(() => undefined);
export const createLoomNode = (node: LoomNodeInput) =>
  resultData(sdk.createNode({ ...options, body: node }));
export const updateLoomNode = (id: number, node: LoomNodeInput) =>
  resultData(sdk.updateNode({ ...options, path: { node_id: id }, body: node }));
export const deleteLoomNode = (id: number) =>
  resultData(sdk.deleteNode({ ...options, path: { node_id: id } })).then(() => undefined);
export const fulfilLoomNode = (id: number, payload: LoomNodeFulfil = {}) =>
  resultData(sdk.fulfilBeat({ ...options, path: { node_id: id }, body: payload }));
export const bankLoomNode = (id: number) =>
  resultData(sdk.bankBeat({ ...options, path: { node_id: id } }));
export const getLoomSessions = () => resultData(sdk.listSessions(options));
export const createLoomSession = (session: LoomSessionInput) =>
  resultData(sdk.createSession({ ...options, body: session }));
export const updateLoomSession = (id: number, session: LoomSessionInput) =>
  resultData(sdk.updateSession({ ...options, path: { session_id: id }, body: session }));
export const deleteLoomSession = (id: number) =>
  resultData(sdk.deleteSession({ ...options, path: { session_id: id } })).then(() => undefined);
export const logLoomSession = (request: LoomSessionLogRequest) =>
  resultData(sdk.logSession({ ...options, body: request }));
export const insertLoomThreadItem = (threadId: number, item: LoomThreadItemCreate) =>
  resultData(sdk.addThreadItem({ ...options, path: { thread_id: threadId }, body: item }));
export const reorderLoomThreadItem = (
  threadId: number,
  nodeId: number,
  update: LoomThreadItemPositionUpdate,
) =>
  resultData(
    sdk.reorderThreadItem({
      ...options,
      path: { thread_id: threadId, node_id: nodeId },
      body: update,
    }),
  );
export const removeLoomThreadItem = (threadId: number, nodeId: number) =>
  resultData(
    sdk.removeThreadItem({ ...options, path: { thread_id: threadId, node_id: nodeId } }),
  ).then(() => undefined);
export const moveLoomThreadItem = (threadId: number, nodeId: number, body: LoomNodeMove) =>
  resultData(
    sdk.moveThreadItem({ ...options, path: { thread_id: threadId, node_id: nodeId }, body }),
  );

// Fog of war and the shared DM-to-player pointer
export const getRevealedCells = (dungeonId: number) =>
  resultData(sdk.getRevealedCells({ ...options, path: { dungeon_id: dungeonId } }));
export const revealCells = (dungeonId: number, blob: RevealedCellsBlob) =>
  resultData(sdk.revealCells({ ...options, path: { dungeon_id: dungeonId }, body: blob }));
export const getAtTheTable = (signal?: AbortSignal) =>
  resultData(sdk.getAtTheTable({ ...options, signal })) as Promise<AtTheTableResponse>;
export const setAtTheTable = (blob: AtTheTableSet) =>
  resultData(sdk.setAtTheTable({ ...options, body: blob }));
