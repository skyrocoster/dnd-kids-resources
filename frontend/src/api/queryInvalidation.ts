import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

type Invalidate = Pick<QueryClient, "invalidateQueries">;

const invalidate = (queryClient: Invalidate, ...keys: QueryKey[]) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

/** Canonical invalidation rules for every API-backed feature mutation. */
export const queryInvalidation = {
  spells: (queryClient: Invalidate, spellId?: number) =>
    invalidate(
      queryClient,
      queryKeys.spells.all,
      queryKeys.players.spellbook,
      ...(spellId === undefined
        ? []
        : [queryKeys.spells.detail(spellId), queryKeys.spells.players(spellId)]),
    ),
  spellAssignments: (queryClient: Invalidate, playerId: number, spellId?: number) =>
    invalidate(
      queryClient,
      queryKeys.players.detail(playerId),
      queryKeys.players.spells(playerId),
      queryKeys.players.spellbook,
      ...(spellId === undefined ? [] : [queryKeys.spells.players(spellId)]),
    ),
  monsters: (queryClient: Invalidate, monsterId?: number) =>
    invalidate(
      queryClient,
      queryKeys.monsters.all,
      ...(monsterId === undefined ? [] : [queryKeys.monsters.detail(monsterId)]),
    ),
  weapons: (queryClient: Invalidate, weaponId?: number) =>
    invalidate(
      queryClient,
      queryKeys.weapons.all,
      ...(weaponId === undefined
        ? []
        : [queryKeys.weapons.detail(weaponId), queryKeys.weapons.players(weaponId)]),
    ),
  weaponAssignments: (queryClient: Invalidate, playerId: number, weaponId?: number) =>
    invalidate(
      queryClient,
      queryKeys.players.detail(playerId),
      queryKeys.players.weapons(playerId),
      ...(weaponId === undefined ? [] : [queryKeys.weapons.players(weaponId)]),
    ),
  items: (queryClient: Invalidate, itemId?: number) =>
    invalidate(
      queryClient,
      queryKeys.items.all,
      ...(itemId === undefined ? [] : [queryKeys.items.detail(itemId)]),
    ),
  lootBundles: (queryClient: Invalidate, bundleId?: number) =>
    invalidate(
      queryClient,
      queryKeys.lootBundles.all,
      ...(bundleId === undefined ? [] : [queryKeys.lootBundles.detail(bundleId)]),
    ),
  players: (queryClient: Invalidate, playerId?: number) =>
    invalidate(
      queryClient,
      queryKeys.players.all,
      queryKeys.players.spellbook,
      ...(playerId === undefined ? [] : [queryKeys.players.detail(playerId)]),
    ),
  npcs: (queryClient: Invalidate, npcId?: number) =>
    invalidate(
      queryClient,
      queryKeys.npcs.all,
      ...(npcId === undefined ? [] : [queryKeys.npcs.detail(npcId)]),
    ),
  encounters: (queryClient: Invalidate, encounterId?: number) =>
    invalidate(
      queryClient,
      queryKeys.encounters.all,
      ...(encounterId === undefined ? [] : [queryKeys.encounters.detail(encounterId)]),
    ),
  dungeons: (queryClient: Invalidate, dungeonId?: number) =>
    invalidate(
      queryClient,
      queryKeys.dungeons.all,
      queryKeys.atTheTable,
      ...(dungeonId === undefined
        ? []
        : [
            queryKeys.dungeons.detail(dungeonId),
            queryKeys.dungeons.layout(dungeonId),
            queryKeys.dungeons.incomingGateways(dungeonId),
            queryKeys.dungeons.sessionState(dungeonId),
            queryKeys.dungeons.revealedCells(dungeonId),
          ]),
    ),
  loom: (queryClient: Invalidate) =>
    invalidate(
      queryClient,
      queryKeys.loom.tapestry,
      queryKeys.loom.threads.all,
      queryKeys.loom.nodes.all,
      queryKeys.loom.sessions.all,
    ),
};
