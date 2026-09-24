import type { CreatureSize, MovementMode, Player, PlayerInput } from "../../api/types";

export interface PlayerFormState {
  name: string;
  child_name: string;
  class_: string;
  subclass: string;
  ancestry: string;
  background: string;
  level: string;

  size: string;
  alignment: string;
  creatureType: string;
  creatureTags: string;

  acValue: string;
  acNote: string;
  hpAverage: string;
  hpFormula: string;
  speedText: string;

  abilityStr: string;
  abilityDex: string;
  abilityCon: string;
  abilityInt: string;
  abilityWis: string;
  abilityCha: string;

  savingThrowsText: string;
  skillsText: string;
  passivePerception: string;

  damageResistances: string;
  damageImmunities: string;
  damageVulnerabilities: string;
  conditionImmunities: string;

  sensesText: string;
  languages: string;

  traitsText: string;
  actionsText: string;
  bonusActionsText: string;
  reactionsText: string;
  legendaryActionsText: string;
  legendaryIntro: string;
  legendaryActionsPerRound: string;
  mythicActionsText: string;
  spellcastingText: string;

  initiative: string;
  proficiencyBonus: string;
  spellAttackBonus: string;
  spellSaveDc: string;
  maxSpellSlotsText: string;

  notes: string;
}

const SIZE_RE = /^(tiny|small|medium|large|huge|gargantuan)$/i;

function parseSizes(raw: string): CreatureSize[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => SIZE_RE.test(s)) as CreatureSize[];
}

function parseNumber(raw: string): number | null {
  const n = Number(raw);
  return raw && !Number.isNaN(n) ? n : null;
}

function parseFeatureLines(text: string): { name: string; description: string; attack: null }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return { name: line, description: "", attack: null };
      return {
        name: line.slice(0, colon).trim(),
        description: line.slice(colon + 1).trim(),
        attack: null,
      };
    });
}

function dictToText(dict: Record<string, unknown> | null | undefined): string {
  if (!dict) return "";
  return Object.entries(dict)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function textToKeyedNumbers(text: string): Record<string, number> {
  const result: Record<string, number> = {};
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return;
      const key = line.slice(0, colon).trim().toLowerCase();
      const rawValue = line.slice(colon + 1).trim();
      const num = Number(rawValue);
      if (key && rawValue && !Number.isNaN(num)) {
        result[key] = num;
      }
    });
  return result;
}

function damageModifiersToText(mods: { damage_type: string; note: string | null }[]): string {
  return mods.map((m) => (m.note ? `${m.damage_type}: ${m.note}` : m.damage_type)).join("\n");
}

function textToDamageModifiers(text: string): { damage_type: string; note: string | null }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return { damage_type: line, note: null };
      return {
        damage_type: line.slice(0, colon).trim(),
        note: line.slice(colon + 1).trim() || null,
      };
    });
}

function sensesToText(senses: { type: string; range: number; note: string | null }[]): string {
  return senses
    .map((s) => {
      const parts = [`${s.type} ${s.range} ft.`];
      if (s.note) parts.push(`(${s.note})`);
      return parts.join(" ");
    })
    .join("\n");
}

function textToSenses(text: string): { type: string; range: number; note: string | null }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parenMatch = line.match(/\(([^)]+)\)/);
      const note = parenMatch ? parenMatch[1].trim() : null;
      const clean = parenMatch ? line.replace(/\s*\([^)]+\)/, "").trim() : line;
      const tokens = clean.split(/\s+/);
      const rangeStr = tokens[tokens.length - 2];
      const type = tokens.slice(0, -2).join(" ");
      const range = Number(rangeStr);
      return {
        type: type || clean,
        range: !Number.isNaN(range) ? range : 0,
        note,
      };
    });
}

export function emptyPlayerForm(): PlayerFormState {
  return {
    name: "",
    child_name: "",
    class_: "",
    subclass: "",
    ancestry: "",
    background: "",
    level: "",

    size: "",
    alignment: "",
    creatureType: "",
    creatureTags: "",

    acValue: "",
    acNote: "",
    hpAverage: "",
    hpFormula: "",
    speedText: "",

    abilityStr: "",
    abilityDex: "",
    abilityCon: "",
    abilityInt: "",
    abilityWis: "",
    abilityCha: "",

    savingThrowsText: "",
    skillsText: "",
    passivePerception: "",

    damageResistances: "",
    damageImmunities: "",
    damageVulnerabilities: "",
    conditionImmunities: "",

    sensesText: "",
    languages: "",

    traitsText: "",
    actionsText: "",
    bonusActionsText: "",
    reactionsText: "",
    legendaryActionsText: "",
    legendaryIntro: "",
    legendaryActionsPerRound: "",
    mythicActionsText: "",
    spellcastingText: "",

    initiative: "",
    proficiencyBonus: "",
    spellAttackBonus: "",
    spellSaveDc: "",
    maxSpellSlotsText: "",

    notes: "",
  };
}

export function playerToFormState(player: Player): PlayerFormState {
  const abilityMap = (
    player.abilities
      ? {
          str: player.abilities.str,
          dex: player.abilities.dex,
          con: player.abilities.con,
          int: player.abilities.int,
          wis: player.abilities.wis,
          cha: player.abilities.cha,
        }
      : {}
  ) as Record<string, number | null>;

  const features = player.features;

  return {
    name: player.name || "",
    child_name: player.child_name || "",
    class_: player.class_ || "",
    subclass: player.subclass || "",
    ancestry: player.ancestry || "",
    background: player.background || "",
    level: player.level != null ? String(player.level) : "",

    size: (player.sizes || []).join(", "),
    alignment: player.alignment || "",
    creatureType: player.creature_type?.category || "",
    creatureTags: (player.creature_type?.tags || []).join(", "),

    acValue: player.ac != null ? String(player.ac.value) : "",
    acNote: player.ac?.note || "",
    hpAverage: player.hp != null ? String(player.hp.average) : "",
    hpFormula: player.hp?.formula || "",
    speedText: (player.speed || [])
      .map((s) => {
        const base = s.mode === "walk" ? `${s.feet}` : `${s.mode} ${s.feet}`;
        const hover = s.hover ? " (hover)" : "";
        const note = s.note ? ` (${s.note})` : "";
        return `${base}${hover}${note}`;
      })
      .join(", "),

    abilityStr: abilityMap.str != null ? String(abilityMap.str) : "",
    abilityDex: abilityMap.dex != null ? String(abilityMap.dex) : "",
    abilityCon: abilityMap.con != null ? String(abilityMap.con) : "",
    abilityInt: abilityMap.int != null ? String(abilityMap.int) : "",
    abilityWis: abilityMap.wis != null ? String(abilityMap.wis) : "",
    abilityCha: abilityMap.cha != null ? String(abilityMap.cha) : "",

    savingThrowsText: dictToText(player.saving_throws as Record<string, unknown>),
    skillsText: dictToText(player.skills),
    passivePerception: player.passive_perception != null ? String(player.passive_perception) : "",

    damageResistances: damageModifiersToText(player.damage_resistances || []),
    damageImmunities: damageModifiersToText(player.damage_immunities || []),
    damageVulnerabilities: damageModifiersToText(player.damage_vulnerabilities || []),
    conditionImmunities: (player.condition_immunities || []).join("\n"),

    sensesText: sensesToText(player.senses || []),
    languages: (player.languages || []).join(", "),

    traitsText: (features?.traits || []).map((t) => `${t.name}: ${t.description || ""}`).join("\n"),
    actionsText: (features?.actions || [])
      .map((t) => `${t.name}: ${t.description || ""}`)
      .join("\n"),
    bonusActionsText: (features?.bonus_actions || [])
      .map((t) => `${t.name}: ${t.description || ""}`)
      .join("\n"),
    reactionsText: (features?.reactions || [])
      .map((t) => `${t.name}: ${t.description || ""}`)
      .join("\n"),
    legendaryActionsText: (features?.legendary_actions || [])
      .map((t) => `${t.name}: ${t.description || ""}`)
      .join("\n"),
    legendaryIntro: features?.legendary_intro || "",
    legendaryActionsPerRound:
      features?.legendary_actions_per_round != null
        ? String(features.legendary_actions_per_round)
        : "",
    mythicActionsText: (features?.mythic_actions || [])
      .map((t) => `${t.name}: ${t.description || ""}`)
      .join("\n"),
    spellcastingText: (features?.spellcasting || [])
      .map((s) => {
        const desc = s.description ? `\n${s.description}` : "";
        const groups = s.groups
          .map((g) => `${g.label}: ${g.spells.map((sp) => sp.name).join(", ")}`)
          .join("\n");
        return `${s.name}${desc}${groups ? `\n${groups}` : ""}`;
      })
      .join("\n---\n"),

    initiative: player.initiative != null ? String(player.initiative) : "",
    proficiencyBonus: player.proficiency_bonus != null ? String(player.proficiency_bonus) : "",
    spellAttackBonus: player.spell_attack_bonus != null ? String(player.spell_attack_bonus) : "",
    spellSaveDc: player.spell_save_dc != null ? String(player.spell_save_dc) : "",
    maxSpellSlotsText: dictToText(player.max_spell_slots),

    notes: player.notes || "",
  };
}

export function formStateToPlayerInput(form: PlayerFormState): PlayerInput {
  const sizes = parseSizes(form.size);
  const creatureTags = form.creatureTags
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const speedEntries = form.speedText
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const hoverMatch = part.match(/\(hover\)/i);
      const noteMatch = part.match(/\(([^)]+)\)/g);
      const note = noteMatch
        ? noteMatch
            .filter((m) => !/hover/i.test(m))
            .map((m) => m.slice(1, -1))
            .join("; ") || null
        : null;
      const clean = part.replace(/\s*\([^)]+\)/g, "").trim();
      const tokens = clean.split(/\s+/);
      const modeMatch = tokens[0].match(/^(burrow|climb|fly|swim)$/i);
      const mode: MovementMode = modeMatch ? (modeMatch[1].toLowerCase() as MovementMode) : "walk";
      const feetStr = mode === "walk" ? tokens[0] : tokens[1];
      const feet = parseInt(feetStr, 10);
      return { mode, feet: Number.isFinite(feet) ? feet : 30, note, hover: !!hoverMatch };
    });

  const abilities: Record<string, number | null> = {
    str: parseNumber(form.abilityStr),
    dex: parseNumber(form.abilityDex),
    con: parseNumber(form.abilityCon),
    int: parseNumber(form.abilityInt),
    wis: parseNumber(form.abilityWis),
    cha: parseNumber(form.abilityCha),
  };
  const hasAnyAbility = Object.values(abilities).some((v) => v != null);

  return {
    name: form.name.trim(),
    child_name: form.child_name.trim() || null,
    class_: form.class_.trim() || null,
    subclass: form.subclass.trim() || null,
    ancestry: form.ancestry.trim() || null,
    background: form.background.trim() || null,
    level: form.level ? Number(form.level) : null,

    sizes,
    alignment: form.alignment.trim() || null,
    creature_type: form.creatureType.trim()
      ? { category: form.creatureType.trim(), tags: creatureTags, swarm_size: null }
      : null,

    ac:
      parseNumber(form.acValue) != null
        ? { value: parseNumber(form.acValue)!, note: form.acNote.trim() || null, alternatives: [] }
        : null,
    hp:
      parseNumber(form.hpAverage) != null
        ? { average: parseNumber(form.hpAverage)!, formula: form.hpFormula.trim() || null }
        : null,
    speed: speedEntries,
    abilities: hasAnyAbility
      ? (abilities as {
          str: number | null;
          dex: number | null;
          con: number | null;
          int: number | null;
          wis: number | null;
          cha: number | null;
        })
      : null,
    saving_throws: textToKeyedNumbers(form.savingThrowsText) as Record<string, number>,
    skills: textToKeyedNumbers(form.skillsText),
    passive_perception: parseNumber(form.passivePerception),

    damage_resistances: textToDamageModifiers(form.damageResistances).map((m) => ({
      ...m,
      conditional: false,
    })),
    damage_immunities: textToDamageModifiers(form.damageImmunities).map((m) => ({
      ...m,
      conditional: false,
    })),
    damage_vulnerabilities: textToDamageModifiers(form.damageVulnerabilities).map((m) => ({
      ...m,
      conditional: false,
    })),
    condition_immunities: form.conditionImmunities
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),

    senses: textToSenses(form.sensesText),
    languages: form.languages
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),

    features: {
      traits: parseFeatureLines(form.traitsText),
      actions: parseFeatureLines(form.actionsText),
      bonus_actions: parseFeatureLines(form.bonusActionsText),
      reactions: parseFeatureLines(form.reactionsText),
      reaction_intro: null,
      legendary_actions: parseFeatureLines(form.legendaryActionsText),
      legendary_intro: form.legendaryIntro.trim() || null,
      legendary_actions_per_round: parseNumber(form.legendaryActionsPerRound),
      mythic_actions: parseFeatureLines(form.mythicActionsText),
      spellcasting: form.spellcastingText.trim()
        ? [
            {
              name: form.spellcastingText.trim(),
              ability: null,
              description: null,
              resource: null,
              groups: [],
              footer: null,
            },
          ]
        : [],
    },

    initiative: parseNumber(form.initiative),
    proficiency_bonus: parseNumber(form.proficiencyBonus),
    spell_attack_bonus: parseNumber(form.spellAttackBonus),
    spell_save_dc: parseNumber(form.spellSaveDc),
    max_spell_slots: textToKeyedNumbers(form.maxSpellSlotsText),

    notes: form.notes.trim() || null,
  };
}

export function validatePlayerForm(form: PlayerFormState): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) {
    errors.push("Name is required.");
  }
  if (form.acValue && Number.isNaN(Number(form.acValue))) {
    errors.push("AC must be a number.");
  }
  if (form.hpAverage && Number.isNaN(Number(form.hpAverage))) {
    errors.push("HP must be a number.");
  }
  if (form.passivePerception && Number.isNaN(Number(form.passivePerception))) {
    errors.push("Passive Perception must be a number.");
  }
  if (form.initiative && Number.isNaN(Number(form.initiative))) {
    errors.push("Initiative must be a number.");
  }
  if (form.proficiencyBonus && Number.isNaN(Number(form.proficiencyBonus))) {
    errors.push("Proficiency Bonus must be a number.");
  }
  if (form.spellAttackBonus && Number.isNaN(Number(form.spellAttackBonus))) {
    errors.push("Spell Attack Bonus must be a number.");
  }
  if (form.spellSaveDc && Number.isNaN(Number(form.spellSaveDc))) {
    errors.push("Spell Save DC must be a number.");
  }
  const abilityFields = [
    "abilityStr",
    "abilityDex",
    "abilityCon",
    "abilityInt",
    "abilityWis",
    "abilityCha",
  ] as const;
  for (const field of abilityFields) {
    const val = form[field];
    if (val && Number.isNaN(Number(val))) {
      errors.push(`${field.replace("ability", "")} must be a number.`);
    }
  }
  return errors;
}
