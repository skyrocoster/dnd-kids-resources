import { describe, expect, it } from "vitest";
import type { Player } from "../../../api/types";
import {
  emptyPlayerForm,
  formStateToPlayerInput,
  playerToFormState,
  validatePlayerForm,
} from "../playerForm";

const basePlayer: Player = { id: 1, name: "Pip", class: "Wizard", level: 3 };

const fullPlayer: Player = {
  id: 2,
  name: "Aria",
  child_name: "Ari",
  class: "Cleric",
  subclass: "Life Domain",
  ancestry: "Human",
  background: "Acolyte",
  level: 5,
  sizes: ["medium"],
  alignment: "Lawful Good",
  creature_type: { category: "humanoid", tags: ["human"], swarm_size: null },
  ac: { value: 16, note: "shield", alternatives: [] },
  hp: { average: 40, formula: "5d8+10" },
  speed: [{ mode: "walk", feet: 30, note: null, hover: false }],
  abilities: { str: 10, dex: 12, con: 14, int: 8, wis: 16, cha: 13 },
  saving_throws: { wis: 5, cha: 3 },
  skills: { perception: 5, insight: 4 },
  passive_perception: 15,
  damage_resistances: [{ damage_type: "fire", note: null, conditional: false }],
  damage_immunities: [{ damage_type: "poison", note: null, conditional: false }],
  damage_vulnerabilities: [{ damage_type: "cold", note: null, conditional: false }],
  condition_immunities: ["charmed"],
  senses: [{ type: "darkvision", range: 60, note: null }],
  languages: ["Common", "Elvish"],
  features: {
    traits: [{ name: "Lucky", description: "reroll a 1", attack: null }],
    spellcasting: [],
    actions: [{ name: "Mace", description: "1d6 bludgeoning", attack: null }],
    bonus_actions: [],
    reactions: [],
    reaction_intro: null,
    legendary_actions: [],
    legendary_intro: null,
    legendary_actions_per_round: null,
    mythic_actions: [],
  },
  initiative: 1,
  proficiency_bonus: 3,
  spell_attack_bonus: 5,
  spell_save_dc: 13,
  max_spell_slots: { "1": 4, "2": 3 },
  notes: "Loves puzzles",
};

describe("playerToFormState", () => {
  it("converts a player into editable form fields", () => {
    const form = playerToFormState(basePlayer);
    expect(form.name).toBe("Pip");
    expect(form.class_).toBe("Wizard");
    expect(form.level).toBe("3");
  });

  it("converts a full recovery-contract player into editable form fields", () => {
    const form = playerToFormState(fullPlayer);
    expect(form.child_name).toBe("Ari");
    expect(form.size).toBe("medium");
    expect(form.alignment).toBe("Lawful Good");
    expect(form.creatureType).toBe("humanoid");
    expect(form.creatureTags).toBe("human");
    expect(form.acValue).toBe("16");
    expect(form.acNote).toBe("shield");
    expect(form.hpAverage).toBe("40");
    expect(form.hpFormula).toBe("5d8+10");
    expect(form.speedText).toBe("30");
    expect(form.abilityWis).toBe("16");
    expect(form.savingThrowsText).toBe("wis: 5\ncha: 3");
    expect(form.skillsText).toBe("perception: 5\ninsight: 4");
    expect(form.passivePerception).toBe("15");
    expect(form.damageResistances).toBe("fire");
    expect(form.damageImmunities).toBe("poison");
    expect(form.damageVulnerabilities).toBe("cold");
    expect(form.conditionImmunities).toBe("charmed");
    expect(form.sensesText).toBe("darkvision 60 ft.");
    expect(form.languages).toBe("Common, Elvish");
    expect(form.traitsText).toBe("Lucky: reroll a 1");
    expect(form.actionsText).toBe("Mace: 1d6 bludgeoning");
    expect(form.initiative).toBe("1");
    expect(form.proficiencyBonus).toBe("3");
    expect(form.spellAttackBonus).toBe("5");
    expect(form.spellSaveDc).toBe("13");
    expect(form.maxSpellSlotsText).toBe("1: 4\n2: 3");
    expect(form.notes).toBe("Loves puzzles");
  });
});

describe("formStateToPlayerInput", () => {
  it("round-trips form state back into API-shaped input", () => {
    const input = formStateToPlayerInput(playerToFormState(basePlayer));
    expect(input.name).toBe("Pip");
    expect(input.class).toBe("Wizard");
    expect(input.level).toBe(3);
    expect(input.child_name).toBeNull();
  });

  it("nulls out blank optional fields for an empty form", () => {
    const input = formStateToPlayerInput(emptyPlayerForm());
    expect(input.class).toBeNull();
    expect(input.level).toBeNull();
    expect(input.ac).toBeNull();
    expect(input.hp).toBeNull();
    expect(input.abilities).toBeNull();
    expect(input.creature_type).toBeNull();
    expect(input.sizes).toEqual([]);
    expect(input.max_spell_slots).toEqual({});
  });

  it("round-trips the full recovery contract through form state", () => {
    const input = formStateToPlayerInput(playerToFormState(fullPlayer));
    expect(input.sizes).toEqual(["medium"]);
    expect(input.alignment).toBe("Lawful Good");
    expect(input.creature_type).toEqual({
      category: "humanoid",
      tags: ["human"],
      swarm_size: null,
    });
    expect(input.ac).toEqual({ value: 16, note: "shield", alternatives: [] });
    expect(input.hp).toEqual({ average: 40, formula: "5d8+10" });
    expect(input.speed).toEqual([{ mode: "walk", feet: 30, note: null, hover: false }]);
    expect(input.abilities).toEqual({ str: 10, dex: 12, con: 14, int: 8, wis: 16, cha: 13 });
    expect(input.saving_throws).toEqual({ wis: 5, cha: 3 });
    expect(input.skills).toEqual({ perception: 5, insight: 4 });
    expect(input.passive_perception).toBe(15);
    expect(input.damage_resistances).toEqual([
      { damage_type: "fire", note: null, conditional: false },
    ]);
    expect(input.condition_immunities).toEqual(["charmed"]);
    expect(input.senses).toEqual([{ type: "darkvision", range: 60, note: null }]);
    expect(input.languages).toEqual(["Common", "Elvish"]);
    expect(input.features?.traits).toEqual([
      { name: "Lucky", description: "reroll a 1", attack: null },
    ]);
    expect(input.initiative).toBe(1);
    expect(input.proficiency_bonus).toBe(3);
    expect(input.spell_attack_bonus).toBe(5);
    expect(input.spell_save_dc).toBe(13);
    expect(input.max_spell_slots).toEqual({ "1": 4, "2": 3 });
    expect(input.notes).toBe("Loves puzzles");
  });
});

describe("validatePlayerForm", () => {
  it("requires only the name field", () => {
    const errors = validatePlayerForm(emptyPlayerForm());
    expect(errors).toEqual(["Name is required."]);
  });

  it("accepts a fully populated form", () => {
    const errors = validatePlayerForm(playerToFormState(fullPlayer));
    expect(errors).toEqual([]);
  });

  it("flags non-numeric numeric fields", () => {
    const form = { ...emptyPlayerForm(), name: "Pip", acValue: "abc", initiative: "xyz" };
    const errors = validatePlayerForm(form);
    expect(errors).toContain("AC must be a number.");
    expect(errors).toContain("Initiative must be a number.");
  });
});
