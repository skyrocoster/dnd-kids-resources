/**
 * Compatibility names for UI code, backed by the checked-in OpenAPI-generated models.
 * Keep API-owned fields in generated/types.gen.ts rather than mirroring them here.
 */
export type * from "./generated/types.gen";

import type {
  AbilityScores,
  ArmorClass,
  ArmorClassEntry,
  Attack,
  AttackDamage,
  CreatureType,
  DamageModifier,
  Feature,
  HitPoints,
  LootBundle,
  Monster,
  MonsterCreate,
  MonsterFeatures,
  MovementSpeed,
  Npc,
  NpcCreate,
  PlayerCreate,
  Sense,
  SpellCreate,
  SpellGroup,
  SpellReference,
  SpellcastingBlock,
  Weapon,
  WeaponCreate,
} from "./generated/types.gen";

export const SPELL_CATEGORIES = [
  "Damage",
  "Heal",
  "Protect",
  "Control",
  "Move",
  "Detect",
  "Influence",
  "Create",
  "Summon",
  "Other",
] as const;

/** UI filter choices layered over the generated spell category string field. */
export type SpellCategory = (typeof SPELL_CATEGORIES)[number];

export type SpellInput = SpellCreate;
export type SpellPlayerReplacement = import("./generated/types.gen").SpellPlayerAssignments;

export type AbilityName = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type CreatureSize = NonNullable<Monster["sizes"]>[number];
export type MovementMode = NonNullable<MovementSpeed["mode"]>;
export type AttackKind = NonNullable<Attack["kind"]>;

export type CreatureTypeInput = CreatureType;
export type ArmorClassEntryInput = ArmorClassEntry;
export type ArmorClassInput = ArmorClass;
export type HitPointsInput = HitPoints;
export type MovementSpeedInput = MovementSpeed;
export type AbilityScoresInput = AbilityScores;
export type DamageModifierInput = DamageModifier;
export type SenseInput = Sense;
export type AttackDamageInput = AttackDamage;
export type AttackInput = Attack;
export type FeatureInput = Feature;
export type SpellReferenceInput = SpellReference;
export type SpellGroupInput = SpellGroup;
export type SpellcastingBlockInput = SpellcastingBlock;
export type MonsterFeaturesInput = MonsterFeatures;
export type MonsterFeaturesView = Required<MonsterFeatures>;
export type MonsterView = Omit<Required<Monster>, "features" | "created_at" | "updated_at"> & {
  features: MonsterFeaturesView;
};
export type MonsterInput = MonsterCreate;

export function completeMonsterFeatures(
  features: MonsterFeatures | null | undefined,
): MonsterFeaturesView {
  return {
    traits: features?.traits ?? [],
    spellcasting: features?.spellcasting ?? [],
    actions: features?.actions ?? [],
    bonus_actions: features?.bonus_actions ?? [],
    reactions: features?.reactions ?? [],
    reaction_intro: features?.reaction_intro ?? null,
    legendary_actions: features?.legendary_actions ?? [],
    legendary_intro: features?.legendary_intro ?? null,
    legendary_actions_per_round: features?.legendary_actions_per_round ?? null,
    mythic_actions: features?.mythic_actions ?? [],
  };
}

/**
 * The OpenAPI schema currently represents nested weapon attacks as an opaque object.
 * This UI refinement keeps the known display fields typed without replacing the generated
 * Weapon contract.
 */
export type WeaponAttackEntry = NonNullable<Weapon["attack"]>[number] & {
  type?: string;
  damage?: string;
  damage_type?: string;
  hands?: number;
  attack_mod?: number;
  damage_mod?: number;
  range?: string;
  special?: string;
};

export type WeaponInput = WeaponCreate;
export type ItemInput = import("./generated/types.gen").ItemCreate;
export type LootEntry = NonNullable<LootBundle["contents"]>[number] & {
  kind: "item" | "weapon";
  ref_id: number | null;
  name: string;
  value_gp: number | null;
  category?: string | null;
  quantity: number;
};
export type LootBundleInput = import("./generated/types.gen").LootBundleCreate;

export type PlayerInput = PlayerCreate;
export type NPCStatblockFields = Omit<
  NpcCreate,
  "name" | "race" | "gender" | "background" | "appearance" | "notes"
>;
export type NPC = Npc;
export type NPCInput = NpcCreate;

export type EncounterCreature = {
  [key: string]: unknown;
  creature_id?: number | null;
  source_kind?: "monster" | "npc" | null;
  original_name?: string | null;
  name?: string | null;
  hp_current?: number | null;
  hp_max?: number | null;
  ac?: number | null;
  status?: string | null;
  conditions?: string[] | null;
  kind?: "monster" | "player" | null;
};
export type EncounterInput = import("./generated/types.gen").EncounterCreate;
export type DungeonInput = import("./generated/types.gen").DungeonCreate;
export type ThreadColor = `thread-${1 | 2 | 3 | 4 | 5 | 6}`;
export type LoomNodeKind = import("./generated/types.gen").LoomNode["kind"];
export type LoomThreadInput = import("./generated/types.gen").LoomThreadUpdate;
export type LoomNodeInput = import("./generated/types.gen").LoomNodeCreate;
export type LoomSessionInput = import("./generated/types.gen").LoomSessionCreate;
export type LoomSessionLogOutcome = import("./generated/types.gen").LoomThreadOutcome["outcome"];
