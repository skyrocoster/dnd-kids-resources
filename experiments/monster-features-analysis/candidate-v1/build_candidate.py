"""Closed pilot, not an automatic whole-dataset normaliser. Standard library only."""
import copy
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = HERE / "catalogue-decisions.json"
NAME_MAPPING = HERE / "source-name-mapping.json"
SEED = HERE.parent / "seed-sample.json"
REVIEW = HERE.parent / "javelin-name-review.json"
CATEGORIES = {
    "traits": "trait", "actions": "action", "bonus_actions": "bonus_action",
    "reactions": "reaction", "legendary_actions": "legendary_action",
    "mythic_actions": "mythic_action", "spellcasting": "spellcasting",
}
CONTEXT = {"legendary_actions_per_round", "legendary_intro", "reaction_intro"}
FEATURE_KEYS = {"id", "monster_id", "category", "position", "part_id",
                "display_name", "mode_ids", "modifier_ids"}


def encoded(value):
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def modal_bonus(values):
    counts = Counter(values)
    return max(counts, key=lambda n: (counts[n], n)) if counts else 0


def usage_from_name(name, category):
    usage = {}
    patterns = [
        (r" \(Recharge (\d)(?:-(\d))?\)$", "recharge"),
        (r" \(Costs (\d+) Actions\)$", "cost"),
        (r" \((\d+)/Day\)$", "day"),
        (r" \(Recharges after a Short or Long Rest\)$", "rest"),
    ]
    for pattern, kind in patterns:
        match = re.search(pattern, name)
        if match:
            name = name[:match.start()]
            if kind == "recharge":
                usage["recharge_roll"] = list(range(int(match[1]), int(match[2] or match[1]) + 1))
            elif kind == "cost":
                usage["action_cost"] = int(match[1])
            elif kind == "day":
                usage["uses_per_day"] = int(match[1])
            else:
                usage["recharge_after"] = ["short_rest", "long_rest"]
            break
    if category in {"legendary_action", "mythic_action"}:
        usage.setdefault("action_cost", 1)
    return name, usage


def generic(text, config):
    for phrase in sorted(config["actor_phrases"], key=len, reverse=True):
        text = re.sub(r"\b" + re.escape(phrase) + r"\b",
                      lambda m: "This monster" if m[0][0].isupper() else "this monster",
                      text, flags=re.I)
    return text


def clean_spells(value):
    if isinstance(value, list):
        return [clean_spells(v) for v in value]
    if isinstance(value, dict):
        return {k: clean_spells(v) for k, v in value.items()
                if v is not None and not (k == "hidden" and v is False)}
    return value


def signature(part):
    return json.dumps({k: v for k, v in part.items() if k not in {"id", "name"}}, sort_keys=True)


def load_evidence():
    seed = json.loads(SEED.read_text(encoding="utf8"))
    review = json.loads(REVIEW.read_text(encoding="utf8"))
    rows, names, contexts = {}, {}, {}
    for monster in seed["monsters"]:
        mid = monster["id"]
        names[mid] = monster["name"]
        container = monster["features"]
        if set(container) != set(CATEGORIES) | CONTEXT:
            raise ValueError("Unreviewed feature container shape")
        contexts[mid] = {k: v for k, v in container.items() if k in CONTEXT and v is not None}
        for plural, category in CATEGORIES.items():
            for index, raw in enumerate(container[plural]):
                rows[mid, category, index] = raw
    overlap = 0
    review_keys = set()
    for item in review["occurrences"]:
        key = (item["monster_id"], "action", item["action_index"])
        if key in review_keys:
            raise ValueError("Duplicate Javelin occurrence")
        review_keys.add(key)
        if key in rows:
            if rows[key] != item["action"]:
                raise ValueError("Disagreeing overlapping evidence")
            overlap += 1
        rows[key] = item["action"]
        if key[0] in names and names[key[0]] != item["monster_name"]:
            raise ValueError("Disagreeing monster name")
        names[key[0]] = item["monster_name"]
    return seed, review, rows, names, contexts, overlap


def build():
    config = json.loads(CONFIG.read_text(encoding="utf8"))
    name_mapping = json.loads(NAME_MAPPING.read_text(encoding="utf8"))
    seed, review, rows, names, contexts, overlap = load_evidence()
    multiattack_mappings = {item["occurrence"]: item for item in name_mapping["multiattacks"]}
    fire_mappings = {item["occurrence"]: item for item in name_mapping["fire_riders"]}
    if len(multiattack_mappings) != len(name_mapping["multiattacks"]):
        raise ValueError("Duplicate Multiattack source mapping")
    if len(fire_mappings) != len(name_mapping["fire_riders"]):
        raise ValueError("Duplicate fire-rider source mapping")
    parts = copy.deepcopy(config["attack_parts"] + config["other_parts"])
    pm = {p["id"]: p for p in parts}
    identities = {signature(p): p["id"] for p in parts}
    attack_names = {p["name"]: p for p in parts if "modes" in p}
    features, assignments, attack_values, damage_values = [], [], {}, {}
    used_multiattack_mappings, used_fire_mappings = set(), set()

    def add_part(part):
        key = signature(part)
        if key in identities:
            return pm[identities[key]]
        if part["id"] in pm:
            raise ValueError(f"Unreviewed differing behaviour named {part['name']}")
        identities[key] = part["id"]
        pm[part["id"]] = part
        parts.append(part)
        return part

    for (mid, category, index), raw in sorted(rows.items()):
        name = raw["name"]
        key = f"m{mid}-{category}-{index}"
        audit = {"occurrence": key, "name": name, "feature_ids": []}
        assignments.append(audit)

        def bind(part, suffix="", modes=None, modifiers=None, preserve_name=True):
            row = {"id": key + suffix, "monster_id": mid, "category": category,
                   "position": index, "part_id": part["id"]}
            if preserve_name and name != part["name"]:
                row["display_name"] = name
            if modes is not None:
                row["mode_ids"] = modes
            if modifiers:
                row["modifier_ids"] = modifiers
            features.append(row)
            audit["feature_ids"].append(row["id"])
            audit.setdefault("candidate_part_ids", []).append(part["id"])
            audit.setdefault("candidate_modifier_ids", []).extend(modifiers or [])

        if category != "spellcasting" and set(raw) != {"name", "description", "attack"}:
            raise ValueError("Unreviewed feature fields")
        attack = raw.get("attack")
        if attack:
            if set(attack) != {"attack_bonus", "automatic_hit", "damage", "kind", "range_ft", "long_range_ft", "targets"}:
                raise ValueError("Unreviewed attack fields")
            if attack["automatic_hit"] or attack["targets"] != 1:
                raise ValueError("Pilot only supports rolled single-target attack modes")
            part = attack_names[name]
            attack_values.setdefault(mid, []).append(attack["attack_bonus"])
            if part["modes"][0]["damage"]["add_monster_bonus"]:
                damage_values.setdefault(mid, []).append(attack["damage"][0]["bonus"])
            for component in attack["damage"]:
                if set(component) != {"formula", "damage_types", "bonus"} or len(component["damage_types"]) != 1:
                    raise ValueError("Unreviewed damage structure")
            modes = [part["modes"][0]["id"]]
            description = raw["description"] or ""
            modifiers = []
            if name == "Javelin":
                if attack["kind"] not in {"melee_weapon", "ranged_weapon"}:
                    raise ValueError("Unreviewed Javelin mode")
                modes = ["melee" if attack["kind"] == "melee_weapon" else "thrown"]
                if mid in {402, 403}:
                    modes = ["melee", "thrown"]
                if "enlarged" in description or "effect of Enlarge" in description:
                    modifiers.append("enlarged-weapon")
                if description and not re.fullmatch(
                    r"piercing damage(?: in melee or 1d6 \+ [23] piercing damage at range|, or 2d6 \+ [24] piercing damage while (?:enlarged|under the effect of Enlarge))?\.", description
                ):
                    raise ValueError("Unreviewed Javelin description")
            elif name == "Tail" and mid == 106:
                modifiers.append("knock-prone")
            elif description not in {"", "radiant damage.", "force damage."}:
                raise ValueError("Unreviewed additional attack effect")
            for component in attack["damage"][1:]:
                if component["bonus"] != 0:
                    raise ValueError("Unreviewed extra-component flat bonus")
                damage_type = component["damage_types"][0]
                if damage_type == "fire":
                    mapping = fire_mappings.get(key)
                    if (mapping is None or mapping["source_name"] != name
                            or mapping["expected_base_part_id"] != part["id"]
                            or mapping["expected_component"] != component):
                        raise ValueError(f"Unreviewed fire rider at {key}")
                    modifier = mapping["candidate_modifier_id"]
                    used_fire_mappings.add(key)
                else:
                    modifier = damage_type + "-damage"
                if modifier not in pm:
                    raise ValueError("Unreviewed extra damage type")
                modifiers.append(modifier)
            bind(part, modes=modes, modifiers=modifiers)
            continue
        if name == "Legendary Resistances" and not raw["description"]:
            audit["decision"] = "omit empty heading; retain real Legendary Resistance trait"
            continue
        if name == "Unusual Nature":
            refs = ["no-food-or-drink"]
            if "air" in raw["description"]:
                refs.append("no-air")
            if "sleep" in raw["description"]:
                refs.append("no-sleep")
            for ref in refs:
                bind(pm[ref], suffix="-" + ref, preserve_name=False)
            continue
        if name == "Multiattack":
            mapping = multiattack_mappings.get(key)
            if (mapping is None or mapping["source_name"] != name
                    or mapping["source_description"] != raw["description"]):
                raise ValueError(f"Unreviewed Multiattack occurrence at {key}")
            part = pm.get(mapping["candidate_part_id"])
            if part is None:
                raise ValueError(f"Missing mapped Multiattack part at {key}")
            bind(part, preserve_name=False)
            used_multiattack_mappings.add(key)
            continue

        special = {
            "Brute": "brute", "Tail Attack": "tail-attack",
        }.get(name)
        if mid == 106 and category == "legendary_action" and name == "Attack":
            special = "claw-or-tail-attack"
        if mid == 106 and category == "mythic_action" and name == "Bite":
            special = "bite-attack"
        if special:
            bind(pm[special])
            continue
        title, usage = usage_from_name(name, category)
        text = config["description_replacements"].get(title, raw["description"] or "")
        part = {"id": slug(title), "kind": "trait" if category == "trait" else "action",
                "name": title, "rules_text": generic(text, config)}
        if usage:
            part["usage"] = usage
        if category == "spellcasting":
            if set(raw) != {"name", "description", "ability", "footer", "groups", "resource"}:
                raise ValueError("Unreviewed spellcasting fields")
            part["kind"] = "spellcasting"
            part["spellcasting"] = clean_spells({k: raw[k] for k in ("ability", "footer", "groups", "resource")})
        if part["id"] in config["requires_parts"]:
            part["requires_parts"] = config["requires_parts"][part["id"]]
        bind(add_part(part))

    if used_multiattack_mappings != set(multiattack_mappings):
        raise ValueError("Unused or missing Multiattack source mapping")
    if used_fire_mappings != set(fire_mappings):
        raise ValueError("Unused or missing fire-rider source mapping")

    monsters = []
    for mid, name in sorted(names.items()):
        monster = {"id": mid, "name": name, "attack_bonus": modal_bonus(attack_values.get(mid, [])),
                   "damage_bonus": modal_bonus(damage_values.get(mid, []))}
        monster.update(contexts.get(mid, {}))
        monsters.append(monster)
    validate(parts, monsters, features)
    complete = sorted(m["id"] for m in seed["monsters"])
    coverage = {
        "input_sha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (CONFIG, NAME_MAPPING, SEED, REVIEW)},
        "complete_feature_profile_ids": complete,
        "partial_javelin_profile_ids": sorted(set(names) - set(complete)),
        "deduplicated_overlap_count": overlap,
        "input_feature_occurrences": len(rows),
        "assignments": assignments,
        "category_counts": dict(sorted(Counter(f["category"] for f in features).items())),
        "part_count": len(parts), "feature_count": len(features), "monster_count": len(monsters),
        "javelin_source_base_dice_counts": dict(sorted(Counter(o["action"]["attack"]["damage"][0]["formula"] for o in review["occurrences"]).items())),
        "fire_source_dice_counts": dict(sorted(Counter(d["formula"] for raw in rows.values() if raw.get("attack") for d in raw["attack"]["damage"][1:] if d["damage_types"] == ["fire"]).items())),
    }
    return parts, monsters, features, coverage


def validate(parts, monsters, features):
    pm, mm = {p["id"]: p for p in parts}, {m["id"]: m for m in monsters}
    if len(pm) != len(parts) or len(mm) != len(monsters) or len({f["id"] for f in features}) != len(features):
        raise ValueError("Duplicate identifier")
    for part in parts:
        if part["kind"] not in {"weapon", "action", "trait", "modifier", "spellcasting"}:
            raise ValueError("Unknown part kind")
        if set(part) - {"id", "kind", "name", "modes", "effect", "rules_text", "usage", "spellcasting", "requires_parts"}:
            raise ValueError("Unexpected part field")
        if not any(part.get(k) for k in ("modes", "effect", "rules_text", "spellcasting")):
            raise ValueError("Empty part")
        modes = part.get("modes", [])
        if len({m["id"] for m in modes}) != len(modes):
            raise ValueError("Duplicate mode")
        for mode in modes:
            if mode["attack_type"] not in {"melee", "ranged"} or not re.fullmatch(r"[1-9]\d*d[1-9]\d*", mode["damage"]["dice"]):
                raise ValueError("Invalid attack mode")
        for pid in part.get("requires_parts", []):
            if pid not in pm:
                raise ValueError("Missing catalogue dependency")
        effect = part.get("effect", {})
        operation = effect.get("operation")
        if operation == "repeat_attacks":
            if set(effect) - {"operation", "count", "selection", "choices"}:
                raise ValueError("Unexpected repeat-attacks field")
            if not isinstance(effect.get("count"), int) or effect["count"] < 1:
                raise ValueError("Invalid repeat-attacks count")
            selection = effect.get("selection")
            if selection == "listed_attack_modes":
                if not effect.get("choices"):
                    raise ValueError("Listed repeat-attacks need explicit choices")
                for choice in effect["choices"]:
                    validate_catalogue_choice(choice, pm)
            elif selection == "available_action_melee_attack_modes":
                if "choices" in effect:
                    raise ValueError("Dynamic melee selection cannot also list choices")
            else:
                raise ValueError("Unsupported repeat-attacks selection")
        elif operation == "attack_sequence":
            if set(effect) - {"operation", "steps", "optional_prelude_part_id"} or not effect.get("steps"):
                raise ValueError("Invalid attack sequence")
            for step in effect["steps"]:
                if set(step) == {"part_id", "mode_id", "count"}:
                    if not isinstance(step["count"], int) or step["count"] < 1:
                        raise ValueError("Invalid attack sequence count")
                    validate_catalogue_choice({key: step[key] for key in ("part_id", "mode_id")}, pm)
                elif set(step) == {"count", "choices"}:
                    if not isinstance(step["count"], int) or step["count"] < 1 or not step["choices"]:
                        raise ValueError("Invalid attack sequence choice step")
                    for choice in step["choices"]:
                        validate_catalogue_choice(choice, pm)
                else:
                    raise ValueError("Unexpected attack sequence step")
            prelude = effect.get("optional_prelude_part_id")
            if prelude is not None and (prelude not in pm or pm[prelude]["kind"] != "action"):
                raise ValueError("Invalid optional attack-sequence prelude")
        elif operation == "use_attack":
            for choice in effect.get("choices", []):
                validate_catalogue_choice(choice, pm)
    for feature in features:
        if set(feature) - FEATURE_KEYS:
            raise ValueError("Unexpected feature field; overrides are not supported")
        if feature["category"] not in CATEGORIES.values():
            raise ValueError("Unknown feature category")
        if feature["monster_id"] not in mm or feature["part_id"] not in pm:
            raise ValueError("Missing feature reference")
        part = pm[feature["part_id"]]
        if "modes" in part:
            selected = feature.get("mode_ids", [])
            if not selected or len(set(selected)) != len(selected) or not set(selected) <= {m["id"] for m in part["modes"]}:
                raise ValueError("Invalid selected modes")
        elif "mode_ids" in feature:
            raise ValueError("Non-attack part cannot select attack modes")
        if "modifier_ids" in feature and "modes" not in part:
            raise ValueError("Local modifiers require an attack part")
        for pid in feature.get("modifier_ids", []):
            if pid not in pm or pm[pid]["kind"] != "modifier":
                raise ValueError("Invalid modifier reference")
        owned = [f for f in features if f["monster_id"] == feature["monster_id"]]
        for pid in part.get("requires_parts", []):
            if not any(f["part_id"] == pid for f in owned):
                raise ValueError("Monster missing required part")
        effect = part.get("effect", {})
        for choice in recipe_choices(effect):
            if not any(f["category"] == "action" and f["part_id"] == choice["part_id"]
                       and choice["mode_id"] in f.get("mode_ids", []) for f in owned):
                raise ValueError("Monster missing required attack mode")
        if effect.get("operation") == "repeat_attacks" and effect.get("selection") == "available_action_melee_attack_modes":
            if not any(f["category"] == "action" and any(
                    mode["id"] in f.get("mode_ids", []) and mode["attack_type"] == "melee"
                    for mode in pm[f["part_id"]].get("modes", [])) for f in owned):
                raise ValueError("Multiattack has no available melee attacks")
        prelude = effect.get("optional_prelude_part_id")
        if prelude and not any(f["category"] == "action" and f["part_id"] == prelude for f in owned):
            raise ValueError("Monster missing optional attack-sequence prelude")
    return True


def validate_catalogue_choice(choice, parts_by_id):
    if set(choice) != {"part_id", "mode_id"} or choice["part_id"] not in parts_by_id:
        raise ValueError("Invalid attack choice")
    modes = {mode["id"] for mode in parts_by_id[choice["part_id"]].get("modes", [])}
    if choice["mode_id"] not in modes:
        raise ValueError("Missing catalogue attack dependency")


def recipe_choices(effect):
    operation = effect.get("operation")
    if operation == "repeat_attacks" and effect.get("selection") == "listed_attack_modes":
        return effect.get("choices", [])
    if operation == "attack_sequence":
        result = []
        for step in effect["steps"]:
            if "choices" in step:
                result.extend(step["choices"])
            else:
                result.append({"part_id": step["part_id"], "mode_id": step["mode_id"]})
        return result
    if operation == "use_attack":
        return effect.get("choices", [])
    return []


def resolve_attack(monster_id, part_id, mode_id, state=(), *, catalogue, monsters, features):
    """Resolve only pilot attack modes; prose effects remain rules, not executable code."""
    validate(catalogue, monsters, features)
    pm = {p["id"]: p for p in catalogue}
    monster = next(m for m in monsters if m["id"] == monster_id)
    matching = [f for f in features if f["monster_id"] == monster_id and f["category"] == "action" and f["part_id"] == part_id and mode_id in f.get("mode_ids", [])]
    if len(matching) != 1:
        raise ValueError("Attack mode unavailable or ambiguous")
    mode = next(m for m in pm[part_id]["modes"] if m["id"] == mode_id)
    base = mode["damage"]
    number, sides = map(int, base["dice"].split("d"))
    damage = [{"dice": base["dice"], "type": base["type"], "bonus": monster["damage_bonus"] if base["add_monster_bonus"] else 0}]
    modifiers = set(matching[0].get("modifier_ids", []))
    modifiers.update(f["part_id"] for f in features if f["monster_id"] == monster_id and f["category"] == "trait" and pm[f["part_id"]]["kind"] == "modifier")
    applied, rules = [], []
    for pid in sorted(modifiers):
        part = pm[pid]
        effect = part.get("effect", {})
        activation = effect.get("activation", "always")
        if activation != "always" and activation not in state:
            continue
        if effect.get("part_kind", pm[part_id]["kind"]) != pm[part_id]["kind"] or effect.get("attack_type", mode["attack_type"]) != mode["attack_type"]:
            continue
        applied.append(pid)
        if effect.get("operation") == "add_base_damage_dice":
            number += effect["count"]
        elif effect.get("operation") == "add_damage":
            damage.append({"dice": effect["dice"], "type": effect["type"], "bonus": 0})
        elif part.get("rules_text"):
            rules.append(part["rules_text"])
        else:
            raise ValueError("Unsupported attack modifier")
    damage[0]["dice"] = f"{number}d{sides}"
    return {"part_id": part_id, "mode_id": mode_id, "attack_bonus": monster["attack_bonus"],
            "attack_type": mode["attack_type"], "targets": 1,
            **{k: mode[k] for k in ("reach_ft", "range_ft", "long_range_ft") if k in mode},
            "damage": damage, "applied_modifier_ids": applied, "on_hit_rules": rules}


def make_examples(parts, monsters, features):
    kwargs = {"catalogue": parts, "monsters": monsters, "features": features}
    examples = {
        "bugbear_morningstar": resolve_attack(402, "morningstar", "melee", **kwargs),
        "bugbear_javelin_melee": resolve_attack(402, "javelin", "melee", **kwargs),
        "bugbear_javelin_thrown": resolve_attack(402, "javelin", "thrown", **kwargs),
        "duergar_normal": resolve_attack(765, "javelin", "thrown", **kwargs),
        "duergar_enlarged": resolve_attack(765, "javelin", "thrown", state={"enlarged"}, **kwargs),
        "soldier_fire_javelin": resolve_attack(699, "javelin", "thrown", **kwargs),
        "red_dragon_fire_bite": resolve_attack(39, "bite", "melee", **kwargs),
        "zariel_fire_javelin_partial": resolve_attack(2717, "javelin", "thrown", **kwargs),
    }
    name_mapping = json.loads(NAME_MAPPING.read_text(encoding="utf8"))
    pm = {part["id"]: part for part in parts}
    examples["multiattack_recipes"] = {
        entry["occurrence"]: {"part_id": entry["candidate_part_id"],
                              "effect": pm[entry["candidate_part_id"]]["effect"]}
        for entry in name_mapping["multiattacks"]
    }
    demo = {**next(m for m in monsters if m["id"] == 402), "id": "demo", "name": "Frankenstein Demonstration"}
    selected = [("action", "javelin", ["melee", "thrown"]), ("trait", "brute", None),
                ("action", "fire-breath", None), ("trait", "undead-fortitude", None)]
    demo_features = []
    for index, (category, pid, modes) in enumerate(selected):
        binding = {"id": f"demo-{index}", "monster_id": "demo", "category": category, "position": index, "part_id": pid}
        if modes:
            binding["mode_ids"] = modes
        demo_features.append(binding)
    validate(parts, [demo], demo_features)
    examples["frankenstein_demo"] = {
        "note": "Illustration only, not a converted source monster. Morningstar removed; Javelin, Brute, Fire Breath and Undead Fortitude assembled without new parts.",
        "monster": demo, "features": demo_features,
        "melee": resolve_attack("demo", "javelin", "melee", catalogue=parts, monsters=[demo], features=demo_features),
        "thrown": resolve_attack("demo", "javelin", "thrown", catalogue=parts, monsters=[demo], features=demo_features),
    }
    return examples


def outputs():
    parts, monsters, features, coverage = build()
    return {"parts.json": parts, "monsters.json": monsters, "monster_features.json": features,
            "coverage.json": coverage, "examples.json": make_examples(parts, monsters, features)}


if __name__ == "__main__":
    for filename, value in outputs().items():
        (HERE / filename).write_text(encoded(value), encoding="utf8")
