import { describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { queryInvalidation, queryKeys } from "../client";

function createQueryClient() {
  return {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  } as unknown as Pick<QueryClient, "invalidateQueries"> & {
    invalidateQueries: ReturnType<typeof vi.fn>;
  };
}

describe("canonical API query invalidation", () => {
  it("invalidates dependent spell and player spellbook data", async () => {
    const queryClient = createQueryClient();

    await queryInvalidation.spells(queryClient, 12);

    expect(queryClient.invalidateQueries.mock.calls.map(([filters]) => filters.queryKey)).toEqual([
      queryKeys.spells.all,
      queryKeys.players.spellbook,
      queryKeys.spells.detail(12),
      queryKeys.spells.players(12),
    ]);
  });

  it("invalidates the dungeon surfaces tied to one changed map", async () => {
    const queryClient = createQueryClient();

    await queryInvalidation.dungeons(queryClient, 5);

    expect(queryClient.invalidateQueries.mock.calls.map(([filters]) => filters.queryKey)).toEqual([
      queryKeys.dungeons.all,
      queryKeys.atTheTable,
      queryKeys.dungeons.detail(5),
      queryKeys.dungeons.layout(5),
      queryKeys.dungeons.incomingGateways(5),
      queryKeys.dungeons.sessionState(5),
      queryKeys.dungeons.revealedCells(5),
    ]);
  });
});
