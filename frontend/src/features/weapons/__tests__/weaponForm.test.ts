import { describe, expect, it } from "vitest";
import type { Weapon } from "../../../api/types";
import { emptyWeaponForm, formStateToWeaponInput, weaponToFormState } from "../weaponForm";

const baseWeapon: Weapon = {
  id: 1,
  name: "Longsword",
  base_weapon: "Longsword",
  rarity: null,
  weapon_category: "martial",
  weight: 3,
  req_attune: null,
  property: ["V"],
  focus: [],
  attack: [
    {
      type: "melee",
      damage: "1d8",
      damage_type: "slashing",
      hands: 1,
      attack_mod: 1,
      damage_mod: 1,
    },
  ],
  entries: ["A sturdy blade."],
  quick_rules: "Attack +{weapon_attack_bonus}",
  weapon_attack_bonus: 2,
  weapon_damage_bonus: 1,
};

describe("weaponToFormState", () => {
  it("flattens attack rows and entries for editing", () => {
    const form = weaponToFormState(baseWeapon);
    expect(form.name).toBe("Longsword");
    expect(form.attackRows).toHaveLength(1);
    expect(form.attackRows[0].damage).toBe("1d8");
    expect(form.attackRows[0].hands).toBe("1");
    expect(form.attackRows[0].attack_mod).toBe("1");
    expect(form.attackRows[0].damage_mod).toBe("1");
    expect(form.entries).toBe("A sturdy blade.");
    expect(form.weight).toBe("3");
    expect(form.quick_rules).toBe("Attack +{weapon_attack_bonus}");
    expect(form.weapon_attack_bonus).toBe("2");
    expect(form.weapon_damage_bonus).toBe("1");
  });

  it("preserves attack_mod and damage_mod in attack rows", () => {
    const form = weaponToFormState(baseWeapon);
    expect(form.attackRows[0].attack_mod).toBe("1");
    expect(form.attackRows[0].damage_mod).toBe("1");
  });
});

describe("formStateToWeaponInput", () => {
  it("round-trips a weapon form back into API-shaped input", () => {
    const form = weaponToFormState(baseWeapon);
    const input = formStateToWeaponInput(form);
    expect(input.name).toBe("Longsword");
    expect(input.attack).toEqual([
      {
        type: "melee",
        damage: "1d8",
        damage_type: "slashing",
        hands: 1,
        attack_mod: 1,
        damage_mod: 1,
      },
    ]);
    expect(input.entries).toEqual(["A sturdy blade."]);
    expect(input.weight).toBe(3);
    expect(input.quick_rules).toBe("Attack +{weapon_attack_bonus}");
    expect(input.weapon_attack_bonus).toBe(2);
    expect(input.weapon_damage_bonus).toBe(1);
  });

  it("omits empty structured sections for a blank form", () => {
    const input = formStateToWeaponInput(emptyWeaponForm());
    expect(input.attack).toBeNull();
    expect(input.entries).toBeNull();
    expect(input.property).toBeNull();
    expect(input.weight).toBeNull();
    expect(input.quick_rules).toBe("");
  });
});
