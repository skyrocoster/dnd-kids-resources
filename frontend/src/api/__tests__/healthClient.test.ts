import { describe, expect, it } from "vitest";
import { apiClient, getAbilities } from "../client";

const runLiveContract = import.meta.env.VITE_LIVE_API_TEST === "1";

describe("live generated API client contract", () => {
  it.skipIf(!runLiveContract)("reads reference data from the existing API endpoint", async () => {
    apiClient.setConfig({
      baseUrl: (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, ""),
    });

    const abilities = await getAbilities();

    expect(Array.isArray(abilities)).toBe(true);
    expect(abilities).toHaveLength(6);
    expect(abilities.map((ability) => ability.code)).toEqual(
      expect.arrayContaining(["str", "dex", "con", "int", "wis", "cha"]),
    );
  });
});
