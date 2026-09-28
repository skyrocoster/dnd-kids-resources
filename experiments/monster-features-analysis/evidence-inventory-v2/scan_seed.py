"""Read-only, bounded evidence summaries; not a monster converter.

Usage: python -B scan_seed.py SEED_PATH summary|families|spellcasting|cases|modifiers
The script prints aggregate JSON and never writes to the input or output tables.
"""

import collections
import hashlib
import json
import sys
from pathlib import Path


CATEGORIES = (
    "traits", "actions", "bonus_actions", "reactions", "legendary_actions",
    "mythic_actions", "spellcasting",
)
NATURAL = ("Bite", "Claw", "Tail")


def key(monster, category, index):
    return [monster["id"], category, index]


def ordered(counter, limit=None):
    rows = [[list(k) if isinstance(k, tuple) else k, v] for k, v in
            sorted(counter.items(), key=lambda item: (-item[1], str(item[0])))]
    return rows if limit is None else rows[:limit]


def occurrences(monsters):
    for monster in monsters:
        for category in CATEGORIES:
            for index, feature in enumerate(monster["features"][category]):
                yield monster, category, index, feature


def attack_profile(attack):
    first = attack["damage"][0] if attack["damage"] else None
    return (attack["kind"], attack["range_ft"], attack["long_range_ft"],
            first["formula"] if first else None,
            tuple(first["damage_types"]) if first else ())


def summary(monsters, raw):
    categories = collections.Counter()
    names = {category: collections.Counter() for category in CATEGORIES}
    contexts = collections.defaultdict(collections.Counter)
    structured = collections.Counter()
    kinds = collections.Counter()
    lengths = collections.Counter()
    formulas = collections.Counter()
    damage_types_lengths = collections.Counter()
    attack_bonus_distinct = collections.Counter()
    damage_bonus_distinct = collections.Counter()
    attacks_per_monster = collections.Counter()
    shape = collections.Counter()
    for monster in monsters:
        f = monster["features"]
        shape[tuple(sorted(f))] += 1
        for field in ("legendary_intro", "reaction_intro", "legendary_actions_per_round"):
            contexts[field]["non_null" if f[field] is not None else "null"] += 1
        attacks = [v["attack"] for category in CATEGORIES if category != "spellcasting"
                   for v in f[category] if v["attack"] is not None]
        attacks_per_monster[len(attacks)] += 1
        attack_bonus_distinct[len({a["attack_bonus"] for a in attacks
                                   if a["attack_bonus"] is not None})] += 1
        damage_bonus_distinct[len({a["damage"][0]["bonus"] for a in attacks
                                   if a["damage"] and a["damage"][0]["bonus"] is not None})] += 1
    for _, category, _, feature in occurrences(monsters):
        categories[category] += 1
        names[category][feature["name"]] += 1
        if category == "spellcasting":
            continue
        attack = feature["attack"]
        if attack is None:
            structured[(category, "null")] += 1
            continue
        structured[(category, "object")] += 1
        kinds[attack["kind"]] += 1
        lengths[len(attack["damage"])] += 1
        for component in attack["damage"]:
            value = component["formula"]
            if value.isdecimal():
                form = "integer"
            elif " + " in value:
                form = "dice_with_embedded_bonus"
            elif value.startswith("d"):
                form = "dice_without_count"
            else:
                form = "dice_or_other"
            formulas[form] += 1
            damage_types_lengths[len(component["damage_types"])] += 1
    return {
        "source_sha256": hashlib.sha256(raw).hexdigest(), "source_bytes": len(raw),
        "monsters": len(monsters), "categories": dict(categories),
        "feature_keys_by_monster": ordered(shape),
        "non_list_contexts": {k: dict(v) for k, v in contexts.items()},
        "top_exact_names_by_category": {c: ordered(n, 8) for c, n in names.items()},
        "distinct_names_by_category": {c: len(n) for c, n in names.items()},
        "structured_by_category": ordered(structured),
        "attack_kinds": dict(kinds), "damage_components_per_attack": dict(lengths),
        "damage_formula_forms": dict(formulas),
        "damage_types_per_component": dict(damage_types_lengths),
        "structured_attacks_per_monster": dict(attacks_per_monster),
        "distinct_non_null_attack_bonuses_per_monster": dict(attack_bonus_distinct),
        "distinct_non_null_first_damage_bonuses_per_monster": dict(damage_bonus_distinct),
    }


def families(monsters):
    result = {}
    for name in NATURAL + ("Javelin", "Longsword", "Multiattack"):
        by_category = collections.Counter()
        profiles = collections.Counter()
        first_component = collections.Counter()
        components = collections.Counter()
        examples = {}
        for monster, category, index, feature in occurrences(monsters):
            if feature["name"] != name or category == "spellcasting":
                continue
            attack = feature["attack"]
            by_category[(category, "structured" if attack else "text_only")] += 1
            if attack:
                profile = attack_profile(attack)
                profiles[profile] += 1
                components[len(attack["damage"])] += 1
                if attack["damage"]:
                    first_component[(attack["damage"][0]["formula"],
                                     tuple(attack["damage"][0]["damage_types"]))] += 1
                examples.setdefault(profile, key(monster, category, index))
        result[name] = {
            "exact_name_by_category": ordered(by_category),
            "distinct_structured_numeric_profiles": len(profiles),
            "top_coherent_profiles": [
                {"profile_kind_range_long_formula_types": list(profile[:4]) + [list(profile[4])],
                 "count": count, "example": examples[profile]}
                for profile, count in sorted(profiles.items(), key=lambda x: (-x[1], str(x[0])))[:12]
            ],
            "top_first_components_irrespective_of_mode": ordered(first_component, 8),
            "component_count": dict(components),
        }
    return result


def spellcasting(monsters):
    fields = collections.Counter()
    abilities = collections.Counter()
    labels = collections.Counter()
    resources = collections.Counter()
    footers = collections.Counter()
    repertoires = collections.Counter()
    by_name_repertoires = collections.defaultdict(set)
    group_count = spell_refs = 0
    for monster, category, _, feature in occurrences(monsters):
        if category != "spellcasting":
            continue
        fields[tuple(sorted(feature))] += 1
        abilities[str(feature["ability"])] += 1
        if feature["resource"] is not None:
            resources[feature["resource"]] += 1
        if feature["footer"] is not None:
            footers[feature["footer"]] += 1
        repertoire = json.dumps([feature["ability"], feature["groups"]], sort_keys=True)
        repertoires[repertoire] += 1
        by_name_repertoires[feature["name"]].add(repertoire)
        for group in feature["groups"]:
            group_count += 1
            labels[group["label"]] += 1
            spell_refs += len(group["spells"])
    return {"entry_shapes": ordered(fields), "abilities": dict(abilities),
            "non_null_resources": dict(resources), "non_null_footers": dict(footers),
            "group_count": group_count, "spell_references": spell_refs,
            "labels": ordered(labels, 20),
            "distinct_ability_and_group_repertoires": len(repertoires),
            "repertoire_count_by_exact_name": sorted(
                [[name, len(values)] for name, values in by_name_repertoires.items()],
                key=lambda row: (-row[1], row[0]))[:12]}


def cases(monsters):
    requested = {
        237: ("actions", 0), 864: ("actions", 3), 170: ("actions", 0),
        2622: ("actions", 2), 402: ("actions", 2),
    }
    result = []
    for monster in monsters:
        if monster["id"] not in requested:
            continue
        if monster["id"] == 2622:
            indices = [i for i, a in enumerate(monster["features"]["actions"])
                       if a["name"] == "Longsword"]
        elif monster["id"] == 170:
            indices = [i for i, a in enumerate(monster["features"]["actions"])
                       if a["name"] == "Multiattack"]
        elif monster["id"] == 402:
            indices = [i for i, a in enumerate(monster["features"]["actions"])
                       if a["name"] == "Javelin"]
        else:
            indices = [requested[monster["id"]][1]]
        for i in indices:
            feature = monster["features"]["actions"][i]
            result.append({"ref": key(monster, "actions", i), "monster": monster["name"],
                           "feature": feature})
    return result


def modifiers(monsters):
    phrases = ("included in the attack", "included in the attacks", "brute",
               "grapple", "restrain", "prone", "swallow", "recharge")
    by_category = collections.Counter()
    included_names = collections.Counter()
    examples = {}
    for monster, category, index, feature in occurrences(monsters):
        if category == "spellcasting":
            continue
        text = (feature["description"] or "").lower()
        for phrase in phrases:
            if phrase not in text:
                continue
            if phrase == "included in the attack" and "included in the attacks" in text:
                continue  # Count singular/plural phrasing once, not twice.
            by_category[(category, phrase)] += 1
            if phrase.startswith("included"):
                included_names[(category, feature["name"])] += 1
                examples.setdefault((category, feature["name"]), key(monster, category, index))
    return {"description_keyword_hits_not_exhaustive_semantic_families": ordered(by_category),
            "included_contribution_feature_names": [
                {"category_name": list(k), "count": v, "example": examples[k]}
                for k, v in sorted(included_names.items(), key=lambda x: (-x[1], str(x[0])))[:35]]}


def main():
    if len(sys.argv) != 3 or sys.argv[2] not in {"summary", "families", "spellcasting", "cases", "modifiers"}:
        raise SystemExit(__doc__)
    raw = Path(sys.argv[1]).read_bytes()
    monsters = json.loads(raw)
    section = sys.argv[2]
    print(json.dumps(globals()[section](monsters, raw) if section == "summary"
                     else globals()[section](monsters), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
