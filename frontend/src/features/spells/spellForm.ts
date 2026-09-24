import { SPELL_CATEGORIES, type Spell, type SpellCategory, type SpellInput } from "../../api/types";

let rowIdCounter = 0;
export function nextRowId(): string {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

export interface AttackRow {
  id: string;
  kind: "" | "melee" | "ranged";
  savingThrows: string[];
}

export interface DamageRow {
  id: string;
  name: string;
  formula: string;
  damageTypes: string[];
}

export interface SpellFormState {
  name: string;
  level: string;
  school: string;
  categories: SpellCategory[];
  castingTimes: string;
  duration: string;
  range: string;
  concentration: boolean;
  ritual: boolean;
  materials: string;
  description: string;
  alternateDescription: string;
  quickRules: string;
  higherLevelsText: string;
  higherLevelDamageBySlot: Record<string, string>;
  areaShape: string;
  areaSize: string;
  attackRows: AttackRow[];
  damageRows: DamageRow[];
  healingAmount: string;
  healingTempHp: boolean;
  healingMaxHp: boolean;
  components: string[];
}

export function emptySpellForm(): SpellFormState {
  return {
    name: "",
    level: "0",
    school: "",
    categories: [],
    castingTimes: "",
    duration: "",
    range: "",
    concentration: false,
    ritual: false,
    materials: "",
    description: "",
    alternateDescription: "",
    quickRules: "",
    higherLevelsText: "",
    higherLevelDamageBySlot: {},
    areaShape: "",
    areaSize: "",
    attackRows: [],
    damageRows: [],
    healingAmount: "",
    healingTempHp: false,
    healingMaxHp: false,
    components: [],
  };
}

export function spellToFormState(spell: Spell): SpellFormState {
  const higherLevels = spell.higher_levels ?? {};
  const areaOfEffect = spell.area_of_effect ?? {};
  const healing = spell.healing ?? {};
  const categories = (spell.categories ?? []).filter((category): category is SpellCategory =>
    SPELL_CATEGORIES.includes(category as SpellCategory),
  );

  return {
    name: spell.name,
    level: String(spell.level),
    school: spell.school || "",
    categories,
    castingTimes: (spell.casting_times ?? []).join("\n"),
    duration: spell.duration,
    range: spell.range,
    concentration: spell.concentration,
    ritual: spell.ritual,
    materials: spell.materials || "",
    description: spell.description,
    alternateDescription: spell.alternate_description || "",
    quickRules: spell.quick_rules || "",
    higherLevelsText: higherLevels.text || "",
    higherLevelDamageBySlot: higherLevels.damage_by_slot ?? {},
    areaShape: areaOfEffect.shape || "",
    areaSize: areaOfEffect.size == null ? "" : String(areaOfEffect.size),
    attackRows: (spell.attacks ?? []).map((attack) => ({
      id: nextRowId(),
      kind: attack.kind || "",
      savingThrows: attack.saving_throws ?? [],
    })),
    damageRows: (spell.damage ?? []).map((damage) => ({
      id: nextRowId(),
      name: damage.name,
      formula: damage.formula,
      damageTypes: damage.damage_types ?? [],
    })),
    healingAmount: healing.amount || "",
    healingTempHp: healing.temp_hp ?? false,
    healingMaxHp: healing.max_hp ?? false,
    components: spell.components ?? [],
  };
}

export function formStateToSpellInput(form: SpellFormState): SpellInput {
  const size = Number.parseInt(form.areaSize, 10);

  return {
    name: form.name || "New Spell",
    level: Number.parseInt(form.level, 10) || 0,
    school: form.school || null,
    categories: form.categories,
    description: form.description,
    alternate_description: form.alternateDescription || null,
    quick_rules: form.quickRules,
    damage: form.damageRows.map(({ name, formula, damageTypes }) => ({
      name,
      formula,
      damage_types: damageTypes,
    })),
    healing: {
      amount: form.healingAmount || null,
      temp_hp: form.healingTempHp,
      max_hp: form.healingMaxHp,
    },
    range: form.range,
    higher_levels: {
      text: form.higherLevelsText || null,
      damage_by_slot: form.higherLevelDamageBySlot,
    },
    casting_times: form.castingTimes
      .split("\n")
      .map((time) => time.trim())
      .filter(Boolean),
    duration: form.duration,
    concentration: form.concentration,
    ritual: form.ritual,
    components: form.components,
    materials: form.materials || null,
    attacks: form.attackRows.map(({ kind, savingThrows }) => ({
      kind: kind || null,
      saving_throws: savingThrows,
    })),
    area_of_effect: {
      shape: form.areaShape || null,
      size: Number.isNaN(size) ? null : size,
    },
  };
}
