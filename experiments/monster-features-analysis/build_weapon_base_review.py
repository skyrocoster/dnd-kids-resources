"""Generate comparison aids for considering weapon records as action references."""

from __future__ import annotations

import json
from collections import Counter, OrderedDict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIRECTORY = Path(__file__).resolve().parent
WEAPON_SOURCE = ROOT / "data" / "seeds" / "seed_weapons.json"
MONSTER_SOURCE = ROOT / "data" / "seeds" / "seed_monsters.json"
SAMPLE_SOURCE = OUTPUT_DIRECTORY / "seed-sample.json"
WEAPON_LABEL = "data/seeds/seed_weapons.json"
MONSTER_LABEL = "data/seeds/seed_monsters.json"


def _json_key(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def _write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )


def _value_type(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, str):
        return "string"
    if isinstance(value, (int, float)):
        return "number"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


def _value_counts(values: list[Any]) -> dict[str, int]:
    return dict(sorted(Counter(_json_key(value) for value in values).items()))


def _candidate_basis(weapon: dict[str, Any], action_name: str) -> list[str]:
    basis = []
    if weapon.get("name") == action_name:
        basis.append("exact weapons.name string")
    if weapon.get("base_weapon") == action_name:
        basis.append("exact weapons.base_weapon string")
    return basis


def _weapon_table_profile(
    weapons: list[Any],
    exact_name_groups: list[dict[str, Any]],
    base_name_action_occurrences: int,
    base_name_action_group_count: int,
    distinct_base_name_count: int,
) -> dict[str, Any]:
    root_keys: Counter[str] = Counter()
    root_types: dict[str, Counter[str]] = {}
    attack_entries: list[dict[str, Any]] = []
    attack_count_per_weapon: Counter[str] = Counter()
    for position, weapon in enumerate(weapons):
        if not isinstance(weapon, dict):
            raise ValueError(f"Weapon at position {position} is not an object")
        attacks = weapon.get("attack", [])
        if not isinstance(attacks, list):
            raise ValueError(f"Weapon {weapon.get('name')!r} attack is not a list")
        attack_count_per_weapon[str(len(attacks))] += 1
        for key, value in weapon.items():
            root_keys[key] += 1
            root_types.setdefault(key, Counter())[_value_type(value)] += 1
        attack_entries.extend(attack for attack in attacks if isinstance(attack, dict))

    attack_keys: Counter[str] = Counter()
    attack_types: list[Any] = []
    range_forms: Counter[str] = Counter()
    for attack in attack_entries:
        for key, value in attack.items():
            attack_keys[key] += 1
        if "type" in attack:
            attack_types.append(attack["type"])
        if "range" in attack:
            range_forms[_value_type(attack["range"])] += 1

    base_weapon_records = [
        weapon for weapon in weapons if weapon.get("base_weapon") is not None
    ]
    base_labels = Counter(weapon["base_weapon"] for weapon in base_weapon_records)
    return {
        "source": WEAPON_LABEL,
        "database_schema_source": "backend/database/init_database.py: weapons table",
        "seed_weapon_record_count": len(weapons),
        "root_field_names": sorted(root_keys),
        "root_field_presence_counts": dict(sorted(root_keys.items())),
        "root_field_value_type_counts": {
            key: dict(sorted(counts.items())) for key, counts in sorted(root_types.items())
        },
        "weapon_category_value_counts": _value_counts(
            [weapon.get("weapon_category") for weapon in weapons]
        ),
        "rarity_value_counts": _value_counts([weapon.get("rarity") for weapon in weapons]),
        "baseitems_value_counts": _value_counts(
            [weapon.get("baseitems") for weapon in weapons]
        ),
        "base_weapon": {
            "non_null_record_count": len(base_weapon_records),
            "distinct_label_count": len(base_labels),
            "record_count_by_label": dict(sorted(base_labels.items())),
        },
        "attack_profiles": {
            "attack_entry_count": len(attack_entries),
            "profiles_per_weapon_record": dict(sorted(attack_count_per_weapon.items())),
            "weapon_records_with_multiple_profiles": sum(
                len(weapon.get("attack", [])) > 1 for weapon in weapons
            ),
            "field_presence_counts": dict(sorted(attack_keys.items())),
            "type_value_counts": _value_counts(attack_types),
            "range_value_types": dict(sorted(range_forms.items())),
        },
        "exact_action_name_candidate_summary": {
            "matching_action_name_group_count": len(exact_name_groups),
            "matching_action_occurrence_count": sum(
                group["action_occurrence_count"] for group in exact_name_groups
            ),
            "action_names_also_seen_as_base_weapon_labels": base_name_action_group_count,
            "occurrences_whose_names_equal_a_base_weapon_label": base_name_action_occurrences,
            "distinct_base_weapon_labels_in_weapon_seed": distinct_base_name_count,
            "groups": exact_name_groups,
        },
    }


def _exact_name_candidates(
    weapons: list[Any], monsters: list[Any]
) -> tuple[list[dict[str, Any]], int, int]:
    weapon_ids_by_name: dict[str, list[int]] = {}
    base_ids_by_name: dict[str, list[int]] = {}
    for weapon in weapons:
        if isinstance(weapon.get("name"), str):
            weapon_ids_by_name.setdefault(weapon["name"], []).append(weapon["id"])
        if isinstance(weapon.get("base_weapon"), str):
            base_ids_by_name.setdefault(weapon["base_weapon"], []).append(weapon["id"])

    grouped: OrderedDict[str, dict[str, Any]] = OrderedDict()
    base_name_action_occurrences = 0
    for monster_position, monster in enumerate(monsters):
        if not isinstance(monster, dict):
            raise ValueError(f"Monster at position {monster_position} is not an object")
        features = monster.get("features") or {}
        if not isinstance(features, dict):
            raise ValueError(f"Monster at position {monster_position} has invalid features")
        actions = features.get("actions", [])
        if not isinstance(actions, list):
            raise ValueError(f"Monster at position {monster_position} has invalid actions")
        for action_index, action in enumerate(actions):
            if not isinstance(action, dict) or not isinstance(action.get("name"), str):
                continue
            name = action["name"]
            direct_ids = weapon_ids_by_name.get(name, [])
            base_ids = base_ids_by_name.get(name, [])
            if not direct_ids and not base_ids:
                continue
            if base_ids:
                base_name_action_occurrences += 1
            group = grouped.setdefault(
                name,
                {
                    "action_name": name,
                    "weapon_name_record_ids": direct_ids,
                    "base_weapon_record_ids": base_ids,
                    "action_occurrence_count": 0,
                    "strict_full_action_variants": set(),
                    "attack_value_type_counts": Counter(),
                },
            )
            group["action_occurrence_count"] += 1
            group["strict_full_action_variants"].add(_json_key(action))
            group["attack_value_type_counts"][
                "missing" if "attack" not in action else _value_type(action["attack"])
            ] += 1

    groups = []
    for group in grouped.values():
        groups.append(
            {
                "action_name": group["action_name"],
                "weapon_name_record_ids": group["weapon_name_record_ids"],
                "base_weapon_record_ids": group["base_weapon_record_ids"],
                "action_occurrence_count": group["action_occurrence_count"],
                "strict_full_action_variant_count": len(
                    group["strict_full_action_variants"]
                ),
                "attack_value_type_counts": dict(
                    sorted(group["attack_value_type_counts"].items())
                ),
            }
        )
    base_name_action_group_count = sum(bool(group["base_weapon_record_ids"]) for group in groups)
    return (
        groups,
        base_name_action_occurrences,
        base_name_action_group_count,
        len(base_ids_by_name),
    )


def _sample_action_review(
    sample: dict[str, Any], weapons: list[Any]
) -> dict[str, Any]:
    weapon_ids_by_name: dict[str, list[int]] = {}
    base_ids_by_name: dict[str, list[int]] = {}
    for weapon in weapons:
        if isinstance(weapon.get("name"), str):
            weapon_ids_by_name.setdefault(weapon["name"], []).append(weapon["id"])
        if isinstance(weapon.get("base_weapon"), str):
            base_ids_by_name.setdefault(weapon["base_weapon"], []).append(weapon["id"])
    weapons_by_id = {weapon["id"]: weapon for weapon in weapons}

    names_in_sample: OrderedDict[str, None] = OrderedDict()
    matched_actions: list[dict[str, Any]] = []
    for monster in sample["monsters"]:
        actions = monster["features"].get("actions", [])
        for action_index, action in enumerate(actions):
            if not isinstance(action, dict) or not isinstance(action.get("name"), str):
                continue
            name = action["name"]
            direct_ids = weapon_ids_by_name.get(name, [])
            base_ids = base_ids_by_name.get(name, [])
            if not direct_ids and not base_ids:
                continue
            names_in_sample.setdefault(name, None)
            matched_actions.append(
                {
                    "monster_id": monster["id"],
                    "monster_name": monster["name"],
                    "feature_category": "actions",
                    "feature_index": action_index,
                    "action_name": name,
                    "candidate_weapon_name_ids": direct_ids,
                    "candidate_base_weapon_ids": base_ids,
                    "candidate_basis": [
                        label
                        for label, found in (
                            ("exact weapons.name string", direct_ids),
                            ("exact weapons.base_weapon string", base_ids),
                        )
                        if found
                    ],
                    "source_action": action,
                }
            )

    candidates = []
    for name in names_in_sample:
        direct_ids = weapon_ids_by_name.get(name, [])
        base_ids = base_ids_by_name.get(name, [])
        all_ids = list(dict.fromkeys([*direct_ids, *base_ids]))
        candidates.append(
            {
                "action_name": name,
                "candidate_records": [
                    {
                        "candidate_basis": _candidate_basis(
                            weapons_by_id[weapon_id], name
                        ),
                        "source_weapon_record": weapons_by_id[weapon_id],
                    }
                    for weapon_id in all_ids
                ],
            }
        )

    return {
        "monster_source": MONSTER_LABEL,
        "weapon_source": WEAPON_LABEL,
        "selection_rule": (
            "Candidate rows are included only when a sample action name exactly "
            "equals weapons.name or weapons.base_weapon. This is a string-match "
            "review aid, not an asserted weapon/action relationship."
        ),
        "sample_action_occurrence_count_with_candidate_name": len(matched_actions),
        "candidate_name_groups": candidates,
        "sample_action_occurrences": matched_actions,
    }


def build_weapon_base_review(
    weapon_path: Path = WEAPON_SOURCE,
    monster_path: Path = MONSTER_SOURCE,
    sample_path: Path = SAMPLE_SOURCE,
    output_directory: Path = OUTPUT_DIRECTORY,
) -> dict[str, int]:
    weapons = json.loads(weapon_path.read_text(encoding="utf-8"))
    monsters = json.loads(monster_path.read_text(encoding="utf-8"))
    sample = json.loads(sample_path.read_text(encoding="utf-8"))
    if not isinstance(weapons, list) or not isinstance(monsters, list):
        raise ValueError("Weapon and monster seeds must be JSON lists")
    if not isinstance(sample, dict) or not isinstance(sample.get("monsters"), list):
        raise ValueError("The feature sample must contain a monsters list")

    (
        action_name_groups,
        base_occurrence_count,
        base_action_group_count,
        distinct_base_name_count,
    ) = _exact_name_candidates(weapons, monsters)
    output_directory.mkdir(parents=True, exist_ok=True)
    _write_json(
        output_directory / "weapon-table-profile.json",
        _weapon_table_profile(
            weapons,
            action_name_groups,
            base_occurrence_count,
            base_action_group_count,
            distinct_base_name_count,
        ),
    )
    sample_review = _sample_action_review(sample, weapons)
    _write_json(output_directory / "weapon-action-reference-review.json", sample_review)
    return {
        "weapon_records": len(weapons),
        "weapon_attack_profiles": sum(
            len(weapon.get("attack", [])) for weapon in weapons
        ),
        "sample_action_candidates": sample_review[
            "sample_action_occurrence_count_with_candidate_name"
        ],
        "seed_exact_weapon_name_occurrences": sum(
            group["action_occurrence_count"] for group in action_name_groups
        ),
        "seed_name_groups": len(action_name_groups),
    }


def main() -> None:
    counts = build_weapon_base_review()
    print(
        "Wrote weapon review: "
        f"{counts['weapon_records']} weapon records, "
        f"{counts['weapon_attack_profiles']} attack profiles, "
        f"{counts['sample_action_candidates']} sample action candidates, "
        f"{counts['seed_exact_weapon_name_occurrences']} exact-name action occurrences."
    )


if __name__ == "__main__":
    main()
