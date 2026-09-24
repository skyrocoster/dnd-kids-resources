import type { WeaponAttackEntry } from "../../api/types";

export function describeAttack(attack: WeaponAttackEntry): string {
  const type = typeof attack.type === "string" ? attack.type : "";
  const damage = typeof attack.damage === "string" ? attack.damage : "";
  const damageType = typeof attack.damage_type === "string" ? attack.damage_type : "";
  const hands = attack.hands;
  const parts = [type, damage, damageType].filter(Boolean).join(" ");
  return hands ? `${parts} (${hands}-handed)` : parts;
}
