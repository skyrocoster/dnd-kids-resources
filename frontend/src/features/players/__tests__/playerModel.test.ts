import { describe, expect, it } from "vitest";
import { hasCombatStats, hasStatblock, playerToMonsterView } from "../playerModel";
import type { Monster, Player } from "../../../api/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    name: "Luna Starweaver",
    ...overrides,
  };
}

describe("hasCombatStats", () => {
  it("is true when any of AC/HP/speed is present", () => {
    expect(hasCombatStats(makePlayer({ ac: { value: 16, note: null, alternatives: [] } }))).toBe(
      true,
    );
    expect(hasCombatStats(makePlayer({ hp: { average: 22, formula: null } }))).toBe(true);
    expect(
      hasCombatStats(makePlayer({ speed: [{ mode: "walk", feet: 30, note: null, hover: false }] })),
    ).toBe(true);
  });

  it("is false when AC/HP/speed are all absent", () => {
    expect(hasCombatStats(makePlayer())).toBe(false);
    expect(hasCombatStats(makePlayer({ ac: null, hp: null, speed: [] }))).toBe(false);
  });
});

describe("hasStatblock", () => {
  it("returns false for a bare Player", () => {
    expect(hasStatblock(makePlayer())).toBe(false);
  });

  it("returns true when only ac is populated", () => {
    expect(hasStatblock(makePlayer({ ac: { value: 16, note: null, alternatives: [] } }))).toBe(
      true,
    );
  });
});

describe("playerToMonsterView", () => {
  it("maps a fully statful Player to a complete Monster with all keys present", () => {
    const player = makePlayer({
      sizes: ["medium"],
      alignment: "Chaotic Good",
      creature_type: { category: "humanoid", tags: [], swarm_size: null },
      abilities: { str: 10, dex: 14, con: 12, int: 16, wis: 13, cha: 15 },
      ac: { value: 15, note: "Mage Armor", alternatives: [] },
      hp: { average: 36, formula: "6d8 + 6" },
      speed: [{ mode: "walk", feet: 30, note: null, hover: false }],
      saving_throws: { int: 5, wis: 3 },
      skills: { arcana: 6, perception: 3 },
      passive_perception: 13,
      damage_resistances: [{ damage_type: "fire", note: null, conditional: false }],
      damage_immunities: [{ damage_type: "poison", note: null, conditional: false }],
      damage_vulnerabilities: [{ damage_type: "thunder", note: null, conditional: false }],
      condition_immunities: ["charmed"],
      senses: [{ type: "darkvision", range: 60, note: null }],
      languages: ["Common", "Elvish"],
      features: {
        traits: [{ name: "Arcane Recovery", description: "Recover spell slots", attack: null }],
        spellcasting: [],
        actions: [{ name: "Fire Bolt", description: "Ranged spell attack", attack: null }],
        bonus_actions: [],
        reactions: [],
        reaction_intro: null,
        legendary_actions: [],
        legendary_intro: null,
        legendary_actions_per_round: null,
        mythic_actions: [],
      },
    });

    const result = playerToMonsterView(player);
    const requiredKeys: (keyof Monster)[] = [
      "id",
      "name",
      "aliases",
      "sizes",
      "family",
      "alignment",
      "creature_type",
      "ac",
      "hp",
      "speed",
      "abilities",
      "saving_throws",
      "skills",
      "passive_perception",
      "damage_resistances",
      "damage_immunities",
      "damage_vulnerabilities",
      "condition_immunities",
      "senses",
      "languages",
      "audio_path",
      "features",
      "cr",
      "cr_sort",
      "cr_note",
      "experience_points",
    ];
    for (const key of requiredKeys) {
      expect(result).toHaveProperty(key);
      expect(result[key]).not.toBeUndefined();
    }

    expect(result.aliases).toEqual([]);
    expect(result.family).toBeNull();
    expect(result.audio_path).toBeNull();
    expect(result.cr_sort).toBeNull();
    expect(result.cr).toBeNull();
    expect(result.cr_note).toBeNull();
    expect(result.experience_points).toBeNull();
    expect(result.sizes).toEqual(["medium"]);
    expect(result.alignment).toBe("Chaotic Good");
    expect(result.speed).toHaveLength(1);
    expect(result.features.traits).toHaveLength(1);
    expect(result.features.actions).toHaveLength(1);
  });

  it("produces empty-safe defaults for a bare id/name Player", () => {
    const result = playerToMonsterView(makePlayer());
    const requiredKeys: (keyof Monster)[] = [
      "id",
      "name",
      "aliases",
      "sizes",
      "family",
      "alignment",
      "creature_type",
      "ac",
      "hp",
      "speed",
      "abilities",
      "saving_throws",
      "skills",
      "passive_perception",
      "damage_resistances",
      "damage_immunities",
      "damage_vulnerabilities",
      "condition_immunities",
      "senses",
      "languages",
      "audio_path",
      "features",
      "cr",
      "cr_sort",
      "cr_note",
      "experience_points",
    ];
    for (const key of requiredKeys) {
      expect(result[key]).not.toBeUndefined();
    }
    expect(result.aliases).toEqual([]);
    expect(result.speed).toEqual([]);
    expect(result.features.traits).toEqual([]);
    expect(result.features.actions).toEqual([]);
    expect(result.features.spellcasting).toEqual([]);
    expect(result.features.bonus_actions).toEqual([]);
    expect(result.features.reactions).toEqual([]);
    expect(result.features.legendary_actions).toEqual([]);
    expect(result.features.mythic_actions).toEqual([]);
    expect(result.saving_throws).toEqual({});
    expect(result.skills).toEqual({});
    expect(result.cr).toBeNull();
    expect(result.cr_note).toBeNull();
    expect(result.experience_points).toBeNull();
  });
});
