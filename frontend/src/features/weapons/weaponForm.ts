import type { Weapon, WeaponInput } from "../../api/types";

let rowIdCounter = 0;
function nextRowId(): string {
  rowIdCounter += 1;
  return `weapon-attack-${rowIdCounter}`;
}

export interface WeaponAttackRow {
  id: string;
  type: string;
  damage: string;
  damage_type: string;
  hands: string;
  attack_mod: string;
  damage_mod: string;
}

export interface WeaponFormState {
  name: string;
  base_weapon: string;
  rarity: string;
  weapon_category: string;
  weight: string;
  req_attune: string;
  property: string[];
  focus: string[];
  attackRows: WeaponAttackRow[];
  entries: string;
  quick_rules: string;
  weapon_attack_bonus: string;
  weapon_damage_bonus: string;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

export function emptyWeaponForm(): WeaponFormState {
  return {
    name: "",
    base_weapon: "",
    rarity: "",
    weapon_category: "",
    weight: "",
    req_attune: "",
    property: [],
    focus: [],
    attackRows: [],
    entries: "",
    quick_rules: "",
    weapon_attack_bonus: "",
    weapon_damage_bonus: "",
  };
}

export function weaponToFormState(weapon: Weapon): WeaponFormState {
  const attacks: Array<{
    type?: string;
    damage?: string;
    damage_type?: string;
    hands?: number;
    attack_mod?: number;
    damage_mod?: number;
  }> = Array.isArray(weapon.attack)
    ? (weapon.attack as unknown as Array<{
        type?: string;
        damage?: string;
        damage_type?: string;
        hands?: number;
        attack_mod?: number;
        damage_mod?: number;
      }>)
    : [];

  return {
    name: weapon.name || "",
    base_weapon: weapon.base_weapon || "",
    rarity: weapon.rarity || "",
    weapon_category: weapon.weapon_category || "",
    weight: weapon.weight != null ? String(weapon.weight) : "",
    req_attune: weapon.req_attune || "",
    property: asStringArray(weapon.property),
    focus: asStringArray(weapon.focus),
    attackRows: attacks.map((a) => ({
      id: nextRowId(),
      type: a.type || "",
      damage: a.damage || "",
      damage_type: a.damage_type || "",
      hands: a.hands != null ? String(a.hands) : "",
      attack_mod: a.attack_mod != null ? String(a.attack_mod) : "",
      damage_mod: a.damage_mod != null ? String(a.damage_mod) : "",
    })),
    entries: asStringArray(weapon.entries)
      .map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
      .join("\n\n"),
    quick_rules: weapon.quick_rules || "",
    weapon_attack_bonus:
      weapon.weapon_attack_bonus != null ? String(weapon.weapon_attack_bonus) : "",
    weapon_damage_bonus:
      weapon.weapon_damage_bonus != null ? String(weapon.weapon_damage_bonus) : "",
  };
}

export function addWeaponAttackRow(rows: WeaponAttackRow[]): WeaponAttackRow[] {
  return [
    ...rows,
    {
      id: nextRowId(),
      type: "",
      damage: "",
      damage_type: "",
      hands: "",
      attack_mod: "",
      damage_mod: "",
    },
  ];
}

export function formStateToWeaponInput(form: WeaponFormState): WeaponInput {
  const attack = form.attackRows.length
    ? form.attackRows.map((row) => {
        const entry: Record<string, unknown> = {};
        if (row.type) entry.type = row.type;
        if (row.damage) entry.damage = row.damage;
        if (row.damage_type) entry.damage_type = row.damage_type;
        if (row.hands) entry.hands = Number(row.hands);
        if (row.attack_mod) entry.attack_mod = Number(row.attack_mod);
        if (row.damage_mod) entry.damage_mod = Number(row.damage_mod);
        return entry;
      })
    : null;

  const entries = form.entries
    .split(/\n{2,}/)
    .map((e) => e.trim())
    .filter(Boolean);

  return {
    name: form.name,
    base_weapon: form.base_weapon || null,
    rarity: form.rarity || null,
    weapon_category: form.weapon_category || null,
    weight: form.weight ? Number(form.weight) : null,
    req_attune: form.req_attune || null,
    property: form.property.length ? form.property : null,
    focus: form.focus.length ? form.focus : null,
    attack,
    entries: entries.length ? entries : null,
    quick_rules: form.quick_rules,
    weapon_attack_bonus: form.weapon_attack_bonus ? Number(form.weapon_attack_bonus) : null,
    weapon_damage_bonus: form.weapon_damage_bonus ? Number(form.weapon_damage_bonus) : null,
  };
}
